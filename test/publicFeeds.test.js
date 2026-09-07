const assert = require('node:assert/strict');
const test = require('node:test');
const { buildLlmsTxt, buildRobotsTxt, buildRssXml, buildSitemapXml } = require('../src/publicFeeds');

const publicTools = [
  {
    slug: 'image-enhancer',
    name: 'Image Enhancer',
    resolvedSeoTitle: 'Enhance Images & Photos',
    resolvedSeoDescription: 'Improve image quality <online>.',
    updatedAt: '2026-09-07T08:30:00.000Z',
    seoSources: [{
      label: 'Image Enhancer source',
      url: 'https://example.com/source',
      quote: 'Improve images online'
    }]
  }
];

test('buildSitemapXml includes static pages and current public tool URLs', () => {
  const sitemap = buildSitemapXml('https://imgkit.io/', publicTools);

  assert.match(sitemap, /<loc>https:\/\/imgkit\.io\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/imgkit\.io\/tools\/image-enhancer<\/loc>/);
  assert.match(sitemap, /<lastmod>2026-09-07T08:30:00\.000Z<\/lastmod>/);
  assert.doesNotMatch(sitemap, /admin|member|login/);
});

test('buildRssXml renders escaped metadata for public tools', () => {
  const rss = buildRssXml('https://imgkit.io/', publicTools);

  assert.match(rss, /<title>Enhance Images &amp; Photos<\/title>/);
  assert.match(rss, /<description>Improve image quality &lt;online&gt;\.<\/description>/);
  assert.match(rss, /<link>https:\/\/imgkit\.io\/tools\/image-enhancer<\/link>/);
  assert.match(rss, /<pubDate>Mon, 07 Sep 2026 08:30:00 GMT<\/pubDate>/);
});

test('buildRobotsTxt points crawlers to the dynamic sitemap', () => {
  const robots = buildRobotsTxt('https://imgkit.io/');

  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Disallow: \/admin$/m);
  assert.match(robots, /^Sitemap: https:\/\/imgkit\.io\/sitemap\.xml$/m);
});

test('buildLlmsTxt documents public pages and active tool metadata', () => {
  const llms = buildLlmsTxt('https://imgkit.io/', [{
    slug: 'image-enhancer',
    name: 'Image [Enhancer]',
    resolvedSeoTitle: 'Enhance Images',
    resolvedSeoDescription: 'Improve images online.\nSupports product photos.',
    resolvedSeoKeywords: 'image enhancement, AI images',
    seoSources: [{
      label: 'Image Enhancer source',
      url: 'https://example.com/source',
      quote: 'Improve images online'
    }]
  }]);

  assert.match(llms, /^# ImgKit$/m);
  assert.match(llms, /\[Home\]\(https:\/\/imgkit\.io\//);
  assert.match(llms, /\[Sitemap\]\(https:\/\/imgkit\.io\/sitemap\.xml\)/);
  assert.match(llms, /### \[Enhance Images\]\(https:\/\/imgkit\.io\/tools\/image-enhancer\)/);
  assert.match(llms, /Improve images online\. Supports product photos\./);
  assert.match(llms, /- Keywords: image enhancement, AI images/);
  assert.match(llms, /## Sources and citations/);
  assert.match(llms, /\[Image Enhancer source\]\(https:\/\/example\.com\/source\)/);
  assert.match(llms, /> "Improve images online"/);
  assert.doesNotMatch(llms, /Image \[Enhancer\]/);
});

test('buildLlmsTxt preserves absolute official citation URLs from public tool metadata', () => {
  const llms = buildLlmsTxt('https://imgkit.io/', [{
    slug: 'google-veo-3-1',
    resolvedSeoTitle: 'Veo 3.1 AI Video Generator - ImgKit',
    resolvedSeoDescription: 'Generate cinematic videos.',
    resolvedSeoSources: [{
      label: 'Google AI Developers',
      url: 'https://ai.google.dev/gemini-api/docs/video',
      quote: 'Veo 3.1 for high-fidelity cinematic videos.'
    }]
  }]);

  assert.match(llms, /\[Google AI Developers\]\(https:\/\/ai\.google\.dev\/gemini-api\/docs\/video\)/);
  assert.doesNotMatch(llms, /\[Google AI Developers\]\(https:\/\/imgkit\.io\/tools\/google-veo-3-1\)/);
});

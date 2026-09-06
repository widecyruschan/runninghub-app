const assert = require('node:assert/strict');
const test = require('node:test');
const { buildRobotsTxt, buildRssXml, buildSitemapXml } = require('../src/publicFeeds');

const publicTools = [
  {
    slug: 'image-enhancer',
    name: 'Image Enhancer',
    resolvedSeoTitle: 'Enhance Images & Photos',
    resolvedSeoDescription: 'Improve image quality <online>.',
    updatedAt: '2026-09-07T08:30:00.000Z'
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

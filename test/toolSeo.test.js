const assert = require('node:assert/strict');
const test = require('node:test');
const { createToolPageHtml, createToolSeoMetadata } = require('../src/toolSeo');

test('creates tool SEO metadata with canonical and preview image URLs', () => {
  const metadata = createToolSeoMetadata({
    slug: 'image-enhancer',
    name: 'Image Enhancer',
    seoTitle: 'Enhance Images Online - ImgKit',
    seoDescription: 'Enhance image quality online with ImgKit.',
    previewImageUrl: '/uploads/image-enhancer.webp'
  }, 'https://imgkit.io');

  assert.deepEqual(metadata, {
    title: 'Enhance Images Online - ImgKit',
    description: 'Enhance image quality online with ImgKit.',
    keywords: 'Image Enhancer, AI tool, online AI tool, ImgKit',
    canonicalUrl: 'https://imgkit.io/tools/image-enhancer',
    imageUrl: 'https://imgkit.io/uploads/image-enhancer.webp',
    category: 'MultimediaApplication'
  });
});

test('uses English defaults instead of non-English tool text', () => {
  const metadata = createToolSeoMetadata({
    slug: 'remove-background',
    name: '圖片背景移除',
    shortDescription: '上傳圖片後自動移除背景。'
  }, 'https://imgkit.io');

  assert.equal(metadata.title, 'Remove Image Background Online - ImgKit');
  assert.equal(metadata.description, 'Remove image backgrounds online with AI and download clean transparent PNGs for products, portraits, and design projects.');
  assert.match(metadata.keywords, /remove background/);

  const cyrillicMetadata = createToolSeoMetadata({
    slug: 'cyrillic-tool',
    name: '\u0418\u043d\u0441\u0442\u0440\u0443\u043c\u0435\u043d\u0442',
    shortDescription: '\u041e\u043f\u0438\u0441\u0430\u043d\u0438\u0435'
  }, 'https://imgkit.io');
  assert.equal(cyrillicMetadata.title, 'Cyrillic Tool - ImgKit');
  assert.match(cyrillicMetadata.description, /creative content creation/);
});

test('returns English SEO keywords and replaces non-English keywords', () => {
  const metadata = createToolSeoMetadata({
    slug: 'image-enhancer',
    name: 'Image Enhancer',
    seoKeywords: 'image enhancement, AI image tool'
  }, 'https://imgkit.io');

  assert.equal(metadata.keywords, 'image enhancement, AI image tool');

  const nonEnglishMetadata = createToolSeoMetadata({
    slug: 'non-english-keywords',
    name: 'Image Tool',
    seoKeywords: '圖片工具, AI'
  }, 'https://imgkit.io');
  assert.match(nonEnglishMetadata.keywords, /Image Tool/);
});

test('does not render non-English configured keywords in the keywords meta tag', () => {
  const html = createToolPageHtml('<html><head><title>AI Tools</title></head><body></body></html>', {
    slug: 'non-english-keywords',
    name: 'Image Tool',
    seoKeywords: '圖片工具, AI'
  }, 'https://imgkit.io');

  assert.match(html, /<meta name="keywords" content="Image Tool, AI tool/);
  assert.doesNotMatch(html, /圖片工具/);
});

test('escapes configured SEO text in server-rendered tool HTML', () => {
  const html = createToolPageHtml('<html><head><title>AI Tools</title></head><body></body></html>', {
    slug: 'safe-tool',
    name: 'Safe Tool',
    seoTitle: 'Safe <Tool> & ImgKit',
    seoDescription: 'Create "safe" images & videos.',
    seoKeywords: 'safe <tool>, images & videos'
  }, 'https://imgkit.io');

  assert.match(html, /<title>Safe &lt;Tool&gt; &amp; ImgKit<\/title>/);
  assert.match(html, /content="Create &quot;safe&quot; images &amp; videos\."/);
  assert.match(html, /<meta name="keywords" content="safe &lt;tool&gt;, images &amp; videos">/);
  assert.match(html, /rel="canonical" href="https:\/\/imgkit\.io\/tools\/safe-tool"/);
  assert.match(html, /<script id="tool-structured-data" type="application\/ld\+json">[\s\S]*SoftwareApplication/);
  assert.match(html, /<noscript id="tool-seo-content">[\s\S]*<h1>Safe &lt;Tool&gt; &amp; ImgKit<\/h1>/);

  const structuredDataJson = html.match(/<script id="tool-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  const structuredData = JSON.parse(structuredDataJson);
  assert.equal(structuredData['@type'], 'SoftwareApplication');
  assert.equal(structuredData.url, 'https://imgkit.io/tools/safe-tool');
});

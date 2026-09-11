const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createDatabase } = require('../src/database');
const { createToolRepository } = require('../src/toolRepository');
const { createToolPageHtml } = require('../src/toolSeo');

test('every seeded active tool receives unique, specific SEO metadata', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runninghub-seo-'));
  const database = await createDatabase(path.join(dataDir, 'app.sqlite'));

  try {
    const toolRepository = createToolRepository(database);
    await toolRepository.seedDefaultTools();
    const tools = await toolRepository.listActiveTools();
    const metadata = tools.map((tool) => ({
      slug: tool.slug,
      html: createToolPageHtml(
        '<html><head><title>AI Tools</title></head><body></body></html>',
        tool,
        'https://imgkit.io',
        tools
      )
    }));
    const titles = metadata.map(({ html }) => html.match(/<title>([^<]+)<\/title>/)?.[1] || '');
    const descriptions = metadata.map(({ html }) => html.match(/<meta name="description" content="([^"]+)"/)?.[1] || '');
    const keywords = metadata.map(({ html }) => html.match(/<meta name="keywords" content="([^"]+)"/)?.[1] || '');

    assert.equal(tools.length, 5);
    assert.equal(new Set(titles).size, titles.length);
    assert.equal(new Set(descriptions).size, descriptions.length);
    for (const [index, { slug, html }] of metadata.entries()) {
      assert.notEqual(titles[index], 'AI Tool - ImgKit', `${slug} has generic title`);
      assert.notEqual(descriptions[index], 'Create images, videos, audio, and more with ImgKit AI tools.', `${slug} has generic description`);
      assert.ok(titles[index].length <= 60, `${slug} title is too long`);
      assert.ok(descriptions[index].length <= 160, `${slug} description is too long`);
      assert.ok(keywords[index], `${slug} is missing keywords`);
      assert.match(keywords[index], /^[\x20-\x7e]+$/, `${slug} keywords are not ASCII`);
      assert.match(html, /<script[^>]+type="application\/ld\+json">[\s\S]*<\/script>/, `${slug} is missing structured data`);
      assert.match(html, /Sources and citations/, `${slug} is missing citations`);
      assert.match(html, /<blockquote>[\s\S]+<cite>/, `${slug} is missing a quotation`);
      for (const relatedTool of tools) {
        assert.match(
          html,
          new RegExp(`href="https://imgkit\\.io/tools/${relatedTool.slug}"`),
          `${slug} cannot crawl ${relatedTool.slug}`
        );
      }
    }
  } finally {
    if (typeof database.close === 'function') await database.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

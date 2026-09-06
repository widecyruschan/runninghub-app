const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createDatabase } = require('../src/database');
const { createToolRepository } = require('../src/toolRepository');

async function createTestToolRepository() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'runninghub-tools-'));
  const databasePath = path.join(dataDir, 'app.sqlite');
  const database = await createDatabase(databasePath);
  const toolRepository = createToolRepository(database);

  return {
    async close() {
      if (typeof database.close === 'function') await database.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
    toolRepository
  };
}

function createSeoToolPayload(toolKey, seoTitle, seoDescription) {
  return {
    toolKey,
    name: toolKey,
    slug: toolKey,
    categoryId: 'image',
    shortDescription: `${toolKey} description`,
    seoTitle,
    seoDescription,
    previewImageUrl: `https://example.com/${toolKey}.webp`,
    creditCost: 1,
    workflowId: `workflow-${toolKey}`,
    instanceType: 'default',
    status: 'active',
    sortOrder: 999,
    inputNodes: [
      {
        nodeId: '1',
        fieldName: 'image',
        key: 'sourceImage',
        dataType: 'image',
        label: 'Upload image',
        placeholder: '',
        defaultValue: '',
        required: true,
        options: []
      }
    ],
    outputConfig: {
      outputType: 'image',
      previewMode: 'image',
      fallbackPaths: ['url']
    }
  };
}

test('default seed does not overwrite a custom remove background preview image', async () => {
  const { close, toolRepository } = await createTestToolRepository();
  try {
    await toolRepository.seedDefaultTools();
    const tools = await toolRepository.listTools();
    const originalTool = tools.find((tool) => tool.slug === 'remove-background');
    const customPreviewImageUrl = 'https://example.com/custom-remove-background.webp';

    await toolRepository.saveTool({
      ...originalTool,
      previewImageUrl: customPreviewImageUrl
    });

    await toolRepository.seedDefaultTools();

    const updatedTool = await toolRepository.getToolById(originalTool.id);
    assert.equal(updatedTool.previewImageUrl, customPreviewImageUrl);
  } finally {
    await close();
  }
});

test('deleteTool hides the tool from list but keeps the record retrievable by id', async () => {
  const { close, toolRepository } = await createTestToolRepository();
  try {
    const savedTool = await toolRepository.saveTool({
      toolKey: 'delete-me-tool',
      name: 'Delete Me',
      slug: 'delete-me-tool',
      categoryId: 'image',
      shortDescription: 'Test tool',
      detailHtml: '<p>Test tool</p>',
      previewImageUrl: 'https://example.com/delete-me.webp',
      creditCost: 1,
      workflowId: 'workflow-delete-me',
      instanceType: 'default',
      status: 'draft',
      sortOrder: 999,
      inputNodes: [
        {
          nodeId: '1',
          fieldName: 'image',
          key: 'sourceImage',
          dataType: 'image',
          label: '上傳圖片',
          placeholder: '',
          defaultValue: '',
          required: true,
          options: []
        }
      ],
      outputConfig: {
        outputType: 'image',
        previewMode: 'image',
        fallbackPaths: ['url']
      }
    });

    const deletedTool = await toolRepository.deleteTool(savedTool.id);
    const visibleTools = await toolRepository.listTools();
    const fetchedById = await toolRepository.getToolById(savedTool.id);

    assert.equal(deletedTool.id, savedTool.id);
    assert.ok(fetchedById.deletedAt);
    assert.equal(visibleTools.some((tool) => tool.id === savedTool.id), false);
    assert.equal(await toolRepository.getActiveToolBySlug(savedTool.slug), null);
  } finally {
    await close();
  }
});

test('tools keep independent SEO metadata in admin and public records', async () => {
  const { close, toolRepository } = await createTestToolRepository();

  try {
    const firstTool = await toolRepository.saveTool(createSeoToolPayload(
      'first-seo-tool',
      'First SEO title',
      'First SEO description'
    ));
    await toolRepository.saveTool(createSeoToolPayload(
      'second-seo-tool',
      'Second SEO title',
      'Second SEO description'
    ));

    const adminTool = await toolRepository.getToolById(firstTool.id);
    const publicTool = await toolRepository.getActiveToolBySlug('first-seo-tool');

    assert.equal(adminTool.seoTitle, 'First SEO title');
    assert.equal(adminTool.seoDescription, 'First SEO description');
    assert.equal(publicTool.seoTitle, 'First SEO title');
    assert.equal(publicTool.seoDescription, 'First SEO description');
    assert.equal(publicTool.resolvedSeoTitle, 'First SEO title');
    assert.equal(publicTool.resolvedSeoDescription, 'First SEO description');
  } finally {
    await close();
  }
});

test('saveTool rejects SEO metadata that exceeds database limits', async () => {
  const { close, toolRepository } = await createTestToolRepository();
  try {
    await assert.rejects(
      toolRepository.saveTool(createSeoToolPayload(
        'too-long-seo-tool',
        'x'.repeat(256),
        'SEO description'
      )),
      (error) => error.code === 'TOOL_SEO_TITLE_TOO_LONG'
    );
  } finally {
    await close();
  }
});

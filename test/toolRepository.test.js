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
    close() {
      if (typeof database.close === 'function') database.close();
      fs.rmSync(dataDir, { recursive: true, force: true });
    },
    toolRepository
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
    close();
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
    close();
  }
});

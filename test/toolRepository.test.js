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

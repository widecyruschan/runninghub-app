const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DEFAULT_DATABASE_PATH = path.join(__dirname, '..', 'data', 'app.sqlite');

function createDatabase(databasePath = process.env.DATABASE_PATH || DEFAULT_DATABASE_PATH) {
  const resolvedPath = path.resolve(databasePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const database = new Database(resolvedPath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');

  migrateDatabase(database);

  return database;
}

function migrateDatabase(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tool_categories (
      id TEXT PRIMARY KEY,
      category_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      tool_key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      category_id TEXT NOT NULL DEFAULT 'image',
      short_description TEXT NOT NULL DEFAULT '',
      preview_image_url TEXT NOT NULL DEFAULT '',
      workflow_id TEXT NOT NULL,
      instance_type TEXT NOT NULL DEFAULT 'default',
      status TEXT NOT NULL DEFAULT 'draft',
      last_test_status TEXT NOT NULL DEFAULT 'untested',
      last_test_task_id TEXT NOT NULL DEFAULT '',
      last_test_error TEXT NOT NULL DEFAULT '',
      last_tested_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 100,
      input_nodes_json TEXT NOT NULL DEFAULT '[]',
      output_config_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS execution_tasks (
      id TEXT PRIMARY KEY,
      tool_id TEXT NOT NULL,
      tool_key TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      runninghub_task_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'CREATED',
      input_values_json TEXT NOT NULL DEFAULT '{}',
      node_info_list_json TEXT NOT NULL DEFAULT '[]',
      output_values_json TEXT NOT NULL DEFAULT '[]',
      output_urls_json TEXT NOT NULL DEFAULT '[]',
      error_code TEXT NOT NULL DEFAULT '',
      error_message TEXT NOT NULL DEFAULT '',
      started_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (tool_id) REFERENCES tools(id)
    );

    CREATE INDEX IF NOT EXISTS idx_tools_status_sort
      ON tools(status, sort_order);

    CREATE INDEX IF NOT EXISTS idx_tool_categories_status_sort
      ON tool_categories(status, sort_order);

    CREATE INDEX IF NOT EXISTS idx_execution_tasks_status_updated
      ON execution_tasks(status, updated_at);

    CREATE INDEX IF NOT EXISTS idx_execution_tasks_tool_created
      ON execution_tasks(tool_id, created_at);
  `);

  ensureColumn(database, 'tools', 'category_id', "TEXT NOT NULL DEFAULT 'image'");
  ensureColumn(database, 'tools', 'preview_image_url', "TEXT NOT NULL DEFAULT ''");
  ensureColumn(database, 'tools', 'last_test_status', "TEXT NOT NULL DEFAULT 'untested'");
  ensureColumn(database, 'tools', 'last_test_task_id', "TEXT NOT NULL DEFAULT ''");
  ensureColumn(database, 'tools', 'last_test_error', "TEXT NOT NULL DEFAULT ''");
  ensureColumn(database, 'tools', 'last_tested_at', 'TEXT');
  seedDefaultCategories(database);

  database.prepare(`
    UPDATE tools
    SET preview_image_url = ?
    WHERE tool_key = 'remove-background'
      AND preview_image_url = ''
  `).run('https://images.unsplash.com/photo-1520975682031-a87d82c5b6d8?auto=format&fit=crop&w=900&q=80');

  database.prepare(`
    UPDATE tools
    SET category_id = 'image'
    WHERE category_id = ''
  `).run();
}

function seedDefaultCategories(database) {
  const now = new Date().toISOString();
  const insertCategory = database.prepare(`
    INSERT OR IGNORE INTO tool_categories (
      id,
      category_key,
      name,
      sort_order,
      status,
      created_at,
      updated_at
    )
    VALUES (
      @id,
      @categoryKey,
      @name,
      @sortOrder,
      'active',
      @createdAt,
      @updatedAt
    )
  `);

  [
    { id: 'image', categoryKey: 'image', name: '圖像', sortOrder: 10 },
    { id: 'video', categoryKey: 'video', name: '視頻', sortOrder: 20 },
    { id: 'audio', categoryKey: 'audio', name: '音頻', sortOrder: 30 },
    { id: 'text', categoryKey: 'text', name: '文本', sortOrder: 40 }
  ].forEach((category) => {
    insertCategory.run({
      ...category,
      createdAt: now,
      updatedAt: now
    });
  });
}

function ensureColumn(database, tableName, columnName, columnDefinition) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasColumn = columns.some((column) => column.name === columnName);

  if (!hasColumn) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

module.exports = {
  createDatabase
};

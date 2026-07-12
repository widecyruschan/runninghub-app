const fs = require('fs');
const path = require('path');

const DEFAULT_DATABASE_PATH = path.join(__dirname, '..', 'data', 'app.sqlite');
const DEFAULT_JSON_DATABASE_PATH = path.join(__dirname, '..', 'data', 'app.json');

function createDatabase(databasePath = process.env.DATABASE_PATH || DEFAULT_DATABASE_PATH) {
  const resolvedPath = path.resolve(databasePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const database = createDatabaseAdapter(resolvedPath);

  if (typeof database.pragma === 'function') {
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');
  }

  migrateDatabase(database);

  return database;
}

function createDatabaseAdapter(resolvedPath) {
  if (process.env.DATABASE_DRIVER === 'json') {
    return new JsonFileDatabase(getJsonDatabasePath(resolvedPath));
  }

  const BetterSqliteDatabase = loadBetterSqlite();
  if (!BetterSqliteDatabase) {
    console.warn('better-sqlite3 無法載入，已自動切換到 JSON 檔案資料庫。');
    return new JsonFileDatabase(getJsonDatabasePath(resolvedPath));
  }

  const database = new BetterSqliteDatabase(resolvedPath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');

  return database;
}

function loadBetterSqlite() {
  try {
    return require('better-sqlite3');
  } catch (error) {
    if (process.env.DATABASE_DRIVER === 'sqlite') {
      throw error;
    }

    return null;
  }
}

function getJsonDatabasePath(databasePath) {
  if (process.env.JSON_DATABASE_PATH) {
    return path.resolve(process.env.JSON_DATABASE_PATH);
  }

  if (!databasePath || databasePath === DEFAULT_DATABASE_PATH) {
    return DEFAULT_JSON_DATABASE_PATH;
  }

  return databasePath.replace(/\.[^.]+$/, '') + '.json';
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

class JsonFileDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = this.loadState();
  }

  pragma() {}

  exec() {}

  prepare(sql) {
    return new JsonStatement(sql, this);
  }

  loadState() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    if (!fs.existsSync(this.filePath)) {
      return createEmptyState();
    }

    try {
      const state = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      return {
        tool_categories: Array.isArray(state.tool_categories) ? state.tool_categories : [],
        tools: Array.isArray(state.tools) ? state.tools : [],
        execution_tasks: Array.isArray(state.execution_tasks) ? state.execution_tasks : []
      };
    } catch (error) {
      console.warn('JSON 資料庫讀取失敗，將使用空白資料庫。', error.message);
      return createEmptyState();
    }
  }

  persist() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
  }
}

class JsonStatement {
  constructor(sql, database) {
    this.sql = sql;
    this.normalizedSql = sql.replace(/\s+/g, ' ').trim();
    this.database = database;
  }

  all(...params) {
    if (this.normalizedSql.startsWith('PRAGMA table_info')) {
      const tableName = this.normalizedSql.match(/PRAGMA table_info\(([^)]+)\)/)?.[1];
      return getJsonTableColumns(tableName).map((name) => ({ name }));
    }

    if (this.normalizedSql.includes('FROM tool_categories')) {
      if (this.normalizedSql.includes('WHERE id = ?')) {
        return this.database.state.tool_categories.filter((category) => category.id === params[0]);
      }

      if (this.normalizedSql.includes('WHERE category_key = ?')) {
        return this.database.state.tool_categories.filter((category) => category.category_key === params[0]);
      }

      return [...this.database.state.tool_categories].sort(compareCategoryRecords);
    }

    if (this.normalizedSql.includes('FROM tools')) {
      return this.queryTools(params);
    }

    if (this.normalizedSql.includes('FROM execution_tasks')) {
      return this.database.state.execution_tasks.filter((task) => task.id === params[0]);
    }

    return [];
  }

  get(...params) {
    if (this.normalizedSql === 'SELECT COUNT(*) AS count FROM tools') {
      return { count: this.database.state.tools.length };
    }

    return this.all(...params)[0];
  }

  run(payload) {
    if (this.normalizedSql.startsWith('INSERT OR IGNORE INTO tool_categories')) {
      if (!this.database.state.tool_categories.some((category) => category.id === payload.id)) {
        this.database.state.tool_categories.push(toCategoryRecord(payload));
        this.database.persist();
      }

      return { changes: 1 };
    }

    if (this.normalizedSql.startsWith('UPDATE tools SET preview_image_url')) {
      this.database.state.tools.forEach((tool) => {
        if (tool.tool_key === 'remove-background' && !tool.preview_image_url) {
          tool.preview_image_url = payload;
        }
      });
      this.database.persist();
      return { changes: 1 };
    }

    if (this.normalizedSql.startsWith("UPDATE tools SET category_id = 'image'")) {
      this.database.state.tools.forEach((tool) => {
        if (!tool.category_id) {
          tool.category_id = 'image';
        }
      });
      this.database.persist();
      return { changes: 1 };
    }

    if (this.normalizedSql.startsWith('INSERT INTO tool_categories')) {
      this.ensureUniqueCategory(payload);
      this.database.state.tool_categories.push(toCategoryRecord(payload));
      this.database.persist();
      return { changes: 1 };
    }

    if (this.normalizedSql.startsWith('UPDATE tool_categories')) {
      this.updateRecord('tool_categories', payload.id, toCategoryRecord(payload));
      return { changes: 1 };
    }

    if (this.normalizedSql.startsWith('INSERT INTO tools')) {
      this.ensureUniqueTool(payload);
      this.database.state.tools.push(toToolRecord(payload));
      this.database.persist();
      return { changes: 1 };
    }

    if (this.normalizedSql.startsWith('UPDATE tools SET tool_key')) {
      this.ensureUniqueTool(payload);
      this.updateRecord('tools', payload.id, toToolRecord(payload));
      return { changes: 1 };
    }

    if (this.normalizedSql.startsWith('UPDATE tools SET last_test_status')) {
      const tool = this.findRecord('tools', payload.id);
      if (tool) {
        tool.last_test_status = payload.lastTestStatus;
        tool.last_test_task_id = payload.lastTestTaskId;
        tool.last_test_error = payload.lastTestError;
        tool.last_tested_at = payload.lastTestedAt;
        tool.updated_at = payload.updatedAt;
        this.database.persist();
      }
      return { changes: tool ? 1 : 0 };
    }

    if (this.normalizedSql.startsWith('UPDATE tools SET status')) {
      const tool = this.findRecord('tools', payload.id);
      if (tool) {
        tool.status = payload.status;
        tool.updated_at = payload.updatedAt;
        this.database.persist();
      }
      return { changes: tool ? 1 : 0 };
    }

    if (this.normalizedSql.startsWith('INSERT INTO execution_tasks')) {
      this.database.state.execution_tasks.push(toTaskRecord(payload));
      this.database.persist();
      return { changes: 1 };
    }

    if (this.normalizedSql.startsWith('UPDATE execution_tasks SET runninghub_task_id')) {
      const task = this.findRecord('execution_tasks', payload.id);
      if (task) {
        task.runninghub_task_id = payload.runningHubTaskId;
        task.status = payload.status;
        task.started_at = task.started_at || payload.startedAt;
        task.updated_at = payload.updatedAt;
        this.database.persist();
      }
      return { changes: task ? 1 : 0 };
    }

    if (this.normalizedSql.startsWith('UPDATE execution_tasks SET input_values_json')) {
      const task = this.findRecord('execution_tasks', payload.id);
      if (task) {
        task.input_values_json = payload.inputValuesJson;
        task.node_info_list_json = payload.nodeInfoListJson;
        task.updated_at = payload.updatedAt;
        this.database.persist();
      }
      return { changes: task ? 1 : 0 };
    }

    if (this.normalizedSql.startsWith('UPDATE execution_tasks SET status = @status, output_values_json')) {
      const task = this.findRecord('execution_tasks', payload.id);
      if (task) {
        task.status = payload.status;
        task.output_values_json = payload.outputValuesJson;
        task.output_urls_json = payload.outputUrlsJson;
        task.error_code = '';
        task.error_message = '';
        task.completed_at = payload.completedAt;
        task.updated_at = payload.updatedAt;
        this.database.persist();
      }
      return { changes: task ? 1 : 0 };
    }

    if (this.normalizedSql.startsWith('UPDATE execution_tasks SET status')) {
      const task = this.findRecord('execution_tasks', payload.id);
      if (task) {
        task.status = payload.status;
        task.error_code = payload.errorCode;
        task.error_message = payload.errorMessage;
        task.completed_at = payload.completedAt;
        task.updated_at = payload.updatedAt;
        this.database.persist();
      }
      return { changes: task ? 1 : 0 };
    }

    return { changes: 0 };
  }

  queryTools(params) {
    let tools = this.database.state.tools.map((tool) => withCategoryFields(tool, this.database.state.tool_categories));

    if (this.normalizedSql.includes('WHERE tools.id = ? OR tools.slug = ?')) {
      tools = tools.filter((tool) => tool.id === params[0] || tool.slug === params[1]);
    } else if (this.normalizedSql.includes('WHERE tools.last_test_task_id = ?')) {
      tools = tools.filter((tool) => tool.last_test_task_id === params[0]);
    } else if (this.normalizedSql.includes('WHERE tools.slug = ?')) {
      tools = tools.filter((tool) => tool.slug === params[0]);
    } else if (this.normalizedSql.includes('WHERE tools.id = ?')) {
      tools = tools.filter((tool) => tool.id === params[0]);
    } else if (this.normalizedSql.includes('WHERE tools.status =')) {
      tools = tools.filter((tool) => tool.status === 'active');
    } else if (this.normalizedSql.includes('WHERE tool_key = ?')) {
      tools = tools.filter((tool) => tool.tool_key === params[0]);
    }

    return tools.sort(compareToolRecords);
  }

  findRecord(collectionName, id) {
    return this.database.state[collectionName].find((record) => record.id === id);
  }

  updateRecord(collectionName, id, nextRecord) {
    const index = this.database.state[collectionName].findIndex((record) => record.id === id);
    if (index !== -1) {
      this.database.state[collectionName][index] = {
        ...this.database.state[collectionName][index],
        ...nextRecord
      };
      this.database.persist();
    }
  }

  ensureUniqueCategory(payload) {
    const exists = this.database.state.tool_categories.some((category) => (
      category.id !== payload.id && category.category_key === payload.categoryKey
    ));
    if (exists) throwSqliteUniqueError();
  }

  ensureUniqueTool(payload) {
    const exists = this.database.state.tools.some((tool) => (
      tool.id !== payload.id && tool.tool_key === payload.toolKey
    ));
    if (exists) throwSqliteUniqueError();
  }
}

function createEmptyState() {
  return {
    tool_categories: [],
    tools: [],
    execution_tasks: []
  };
}

function getJsonTableColumns(tableName) {
  const columns = {
    tool_categories: ['id', 'category_key', 'name', 'sort_order', 'status', 'created_at', 'updated_at'],
    tools: [
      'id',
      'tool_key',
      'name',
      'slug',
      'category_id',
      'short_description',
      'preview_image_url',
      'workflow_id',
      'instance_type',
      'status',
      'last_test_status',
      'last_test_task_id',
      'last_test_error',
      'last_tested_at',
      'sort_order',
      'input_nodes_json',
      'output_config_json',
      'created_at',
      'updated_at'
    ],
    execution_tasks: [
      'id',
      'tool_id',
      'tool_key',
      'tool_name',
      'runninghub_task_id',
      'status',
      'input_values_json',
      'node_info_list_json',
      'output_values_json',
      'output_urls_json',
      'error_code',
      'error_message',
      'started_at',
      'completed_at',
      'created_at',
      'updated_at'
    ]
  };

  return columns[tableName] || [];
}

function toCategoryRecord(payload) {
  return {
    id: payload.id,
    category_key: payload.categoryKey,
    name: payload.name,
    sort_order: payload.sortOrder,
    status: payload.status || 'active',
    created_at: payload.createdAt,
    updated_at: payload.updatedAt
  };
}

function toToolRecord(payload) {
  return {
    id: payload.id,
    tool_key: payload.toolKey,
    name: payload.name,
    slug: payload.slug,
    category_id: payload.categoryId,
    short_description: payload.shortDescription,
    preview_image_url: payload.previewImageUrl,
    workflow_id: payload.workflowId,
    instance_type: payload.instanceType,
    status: payload.status,
    last_test_status: payload.lastTestStatus || 'untested',
    last_test_task_id: payload.lastTestTaskId || '',
    last_test_error: payload.lastTestError || '',
    last_tested_at: payload.lastTestedAt || null,
    sort_order: payload.sortOrder,
    input_nodes_json: payload.inputNodesJson,
    output_config_json: payload.outputConfigJson,
    created_at: payload.createdAt,
    updated_at: payload.updatedAt
  };
}

function toTaskRecord(payload) {
  return {
    id: payload.id,
    tool_id: payload.toolId,
    tool_key: payload.toolKey,
    tool_name: payload.toolName,
    runninghub_task_id: payload.runningHubTaskId,
    status: payload.status,
    input_values_json: payload.inputValuesJson,
    node_info_list_json: payload.nodeInfoListJson,
    output_values_json: payload.outputValuesJson,
    output_urls_json: payload.outputUrlsJson,
    error_code: payload.errorCode,
    error_message: payload.errorMessage,
    started_at: payload.startedAt,
    completed_at: payload.completedAt,
    created_at: payload.createdAt,
    updated_at: payload.updatedAt
  };
}

function withCategoryFields(tool, categories) {
  const category = categories.find((item) => item.id === tool.category_id);
  return {
    ...tool,
    category_name: category?.name || '',
    category_key: category?.category_key || tool.category_id
  };
}

function compareCategoryRecords(left, right) {
  return (left.sort_order - right.sort_order) || String(left.created_at).localeCompare(String(right.created_at));
}

function compareToolRecords(left, right) {
  return (left.sort_order - right.sort_order) || String(right.created_at).localeCompare(String(left.created_at));
}

function throwSqliteUniqueError() {
  const error = new Error('UNIQUE constraint failed');
  error.code = 'SQLITE_CONSTRAINT_UNIQUE';
  throw error;
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

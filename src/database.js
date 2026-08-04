const fs = require('fs');
const os = require('os');
const path = require('path');
const { createAdapter } = require('./dbAdapter');

// Hostinger 持久化策略:
//   DATABASE_PATH 環境變量 > $HOME/runninghub-data/ > ../data/ (舊默認)
//   Hostinger 每次部署會替換 public_html/，所以必須把數據庫放在外面
function resolveDefaultDataDir() {
  if (process.env.DATABASE_PATH) return path.dirname(process.env.DATABASE_PATH);
  // 優先使用用戶主目錄（Hostinger 上為 /home/u963014207/，部署不會觸及）
  const home = process.env.HOME || process.env.USERPROFILE;
  if (home) return path.join(home, 'runninghub-data');
  // 最後回退到項目內 data 目錄（本地開發環境）
  return path.join(__dirname, '..', 'data');
}

const DEFAULT_DATA_DIR = resolveDefaultDataDir();
const DEFAULT_DATABASE_PATH = path.join(DEFAULT_DATA_DIR, 'app.sqlite');

async function createDatabase(databasePath = process.env.DATABASE_PATH || DEFAULT_DATABASE_PATH) {
  const adapter = createAdapter(databasePath);

  await migrateDatabase(adapter);

  const backendType = adapter.type;
  console.log(`[database] Backend: ${backendType}, path: ${process.env.DATABASE_PATH || databasePath}`);

  return adapter;
}

async function migrateDatabase(adapter) {
  await adapter.exec(`
    CREATE TABLE IF NOT EXISTS tool_categories (
      id VARCHAR(64) PRIMARY KEY,
      category_key VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(128) NOT NULL,
      sort_order INT NOT NULL DEFAULT 100,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      created_at VARCHAR(32) NOT NULL,
      updated_at VARCHAR(32) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tools (
      id VARCHAR(64) PRIMARY KEY,
      tool_key VARCHAR(128) NOT NULL UNIQUE,
      name VARCHAR(256) NOT NULL,
      slug VARCHAR(256) NOT NULL,
      category_id VARCHAR(64) NOT NULL DEFAULT 'image',
      short_description TEXT NOT NULL,
      top_detail_html TEXT NOT NULL,
      detail_html TEXT NOT NULL,
      preview_image_url TEXT NOT NULL,
      credit_cost INT NOT NULL DEFAULT 1,
      workflow_id VARCHAR(256) NOT NULL,
      instance_type VARCHAR(64) NOT NULL DEFAULT 'default',
      status VARCHAR(16) NOT NULL DEFAULT 'draft',
      last_test_status VARCHAR(16) NOT NULL DEFAULT 'untested',
      last_test_task_id VARCHAR(64) NOT NULL DEFAULT '',
      last_test_error TEXT NOT NULL DEFAULT '',
      last_tested_at VARCHAR(32),
      sort_order INT NOT NULL DEFAULT 100,
      input_nodes_json TEXT NOT NULL,
      output_config_json TEXT NOT NULL,
      created_at VARCHAR(32) NOT NULL,
      updated_at VARCHAR(32) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS execution_tasks (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL DEFAULT '',
      tool_id VARCHAR(64) NOT NULL,
      tool_key VARCHAR(128) NOT NULL,
      tool_name VARCHAR(256) NOT NULL,
      runninghub_task_id VARCHAR(128) NOT NULL DEFAULT '',
      status VARCHAR(16) NOT NULL DEFAULT 'CREATED',
      input_values_json TEXT NOT NULL,
      node_info_list_json TEXT NOT NULL,
      output_values_json TEXT NOT NULL,
      output_urls_json TEXT NOT NULL,
      actual_consume_coins DOUBLE NOT NULL DEFAULT 0,
      charged_credits INT NOT NULL DEFAULT 0,
      error_code VARCHAR(64) NOT NULL DEFAULT '',
      error_message TEXT NOT NULL,
      started_at VARCHAR(32),
      completed_at VARCHAR(32),
      created_at VARCHAR(32) NOT NULL,
      updated_at VARCHAR(32) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(256) NOT NULL UNIQUE,
      display_name VARCHAR(128) NOT NULL,
      role VARCHAR(32) NOT NULL DEFAULT 'free_user',
      membership_group VARCHAR(32) NOT NULL DEFAULT 'free',
      password_hash VARCHAR(256) NOT NULL DEFAULT '',
      credit_balance INT NOT NULL DEFAULT 0,
      last_login_credit_date VARCHAR(16) NOT NULL DEFAULT '',
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      notes TEXT NOT NULL,
      created_at VARCHAR(32) NOT NULL,
      updated_at VARCHAR(32) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS credit_ledger (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      amount INT NOT NULL,
      remaining_amount INT NOT NULL DEFAULT 0,
      balance_after INT NOT NULL,
      reason VARCHAR(512) NOT NULL,
      related_task_id VARCHAR(64) NOT NULL DEFAULT '',
      expires_at VARCHAR(32),
      created_at VARCHAR(32) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_user_sessions (
      id VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      provider VARCHAR(32) NOT NULL DEFAULT 'google',
      provider_subject VARCHAR(256) NOT NULL DEFAULT '',
      expires_at VARCHAR(32) NOT NULL,
      created_at VARCHAR(32) NOT NULL,
      updated_at VARCHAR(32) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_orders (
      id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      provider VARCHAR(32) NOT NULL DEFAULT 'paypal',
      provider_order_id VARCHAR(256) NOT NULL DEFAULT '',
      plan_key VARCHAR(64) NOT NULL,
      billing_cycle VARCHAR(64) NOT NULL DEFAULT '',
      amount_value VARCHAR(32) NOT NULL,
      currency_code VARCHAR(8) NOT NULL DEFAULT 'USD',
      credit_amount INT NOT NULL DEFAULT 0,
      status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
      payment_status VARCHAR(64) NOT NULL DEFAULT '',
      credits_granted INT NOT NULL DEFAULT 0,
      membership_group VARCHAR(32) NOT NULL DEFAULT '',
      raw_response_json TEXT NOT NULL,
      captured_at VARCHAR(32),
      credited_at VARCHAR(32),
      created_at VARCHAR(32) NOT NULL,
      updated_at VARCHAR(32) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_menus (
      id VARCHAR(64) PRIMARY KEY,
      parent_id VARCHAR(64) NOT NULL DEFAULT '',
      menu_key VARCHAR(64) NOT NULL UNIQUE,
      label VARCHAR(128) NOT NULL,
      mark VARCHAR(8) NOT NULL DEFAULT '',
      path VARCHAR(256) NOT NULL DEFAULT '',
      target_type VARCHAR(16) NOT NULL DEFAULT 'route',
      sort_order INT NOT NULL DEFAULT 100,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      created_at VARCHAR(32) NOT NULL,
      updated_at VARCHAR(32) NOT NULL
    );
  `);

  // Indexes: MySQL requires CREATE INDEX IF NOT EXISTS (or we use a stored procedure pattern)
  await createIndexSafely(adapter, 'idx_tools_status_sort', 'tools', 'status, sort_order');
  await createIndexSafely(adapter, 'idx_tool_categories_status_sort', 'tool_categories', 'status, sort_order');
  await createIndexSafely(adapter, 'idx_execution_tasks_status_updated', 'execution_tasks', 'status, updated_at');
  await createIndexSafely(adapter, 'idx_execution_tasks_tool_created', 'execution_tasks', 'tool_id, created_at');
  await createIndexSafely(adapter, 'idx_app_users_role_group', 'app_users', 'role, membership_group');
  await createIndexSafely(adapter, 'idx_credit_ledger_user_created', 'credit_ledger', 'user_id, created_at');
  await createIndexSafely(adapter, 'idx_app_user_sessions_user_expires', 'app_user_sessions', 'user_id, expires_at');
  await createIndexSafely(adapter, 'idx_payment_orders_provider_order', 'payment_orders', 'provider, provider_order_id');
  await createIndexSafely(adapter, 'idx_payment_orders_user_created', 'payment_orders', 'user_id, created_at');
  await createIndexSafely(adapter, 'idx_admin_menus_parent_sort', 'admin_menus', 'parent_id, sort_order');
  await createIndexSafely(adapter, 'idx_execution_tasks_user_created', 'execution_tasks', 'user_id, created_at');
  await createIndexSafely(adapter, 'idx_credit_ledger_user_expiry', 'credit_ledger', 'user_id, expires_at, created_at');

  // Note: The SQLite partial unique index on credit_ledger(user_id, related_task_id) WHERE amount > 0 AND related_task_id != ''
  // is not supported in MySQL. Application-layer check handles the uniqueness constraint in grantCreditsOnce().

  // Column migration (ensureColumn for previous SQLite additions)
  await ensureColumn(adapter, 'tools', 'category_id', "VARCHAR(64) NOT NULL DEFAULT 'image'");
  await ensureColumn(adapter, 'tools', 'preview_image_url', "TEXT NOT NULL");
  await ensureColumn(adapter, 'tools', 'credit_cost', "INT NOT NULL DEFAULT 1");
  await ensureColumn(adapter, 'tools', 'top_detail_html', "TEXT NOT NULL");
  await ensureColumn(adapter, 'tools', 'detail_html', "TEXT NOT NULL");
  await ensureColumn(adapter, 'tools', 'last_test_status', "VARCHAR(16) NOT NULL DEFAULT 'untested'");
  await ensureColumn(adapter, 'tools', 'last_test_task_id', "VARCHAR(64) NOT NULL DEFAULT ''");
  await ensureColumn(adapter, 'tools', 'last_test_error', "TEXT NOT NULL");
  await ensureColumn(adapter, 'tools', 'last_tested_at', 'VARCHAR(32)');
  await ensureColumn(adapter, 'execution_tasks', 'user_id', "VARCHAR(64) NOT NULL DEFAULT ''");
  await ensureColumn(adapter, 'execution_tasks', 'actual_consume_coins', "DOUBLE NOT NULL DEFAULT 0");
  await ensureColumn(adapter, 'execution_tasks', 'charged_credits', "INT NOT NULL DEFAULT 0");
  await ensureColumn(adapter, 'credit_ledger', 'remaining_amount', "INT NOT NULL DEFAULT 0");
  await ensureColumn(adapter, 'credit_ledger', 'expires_at', 'VARCHAR(32)');
  await ensureColumn(adapter, 'app_users', 'password_hash', "VARCHAR(256) NOT NULL DEFAULT ''");
  await ensureColumn(adapter, 'app_users', 'last_login_credit_date', "VARCHAR(16) NOT NULL DEFAULT ''");
  await ensureColumn(adapter, 'payment_orders', 'credits_granted', "INT NOT NULL DEFAULT 0");
  await ensureColumn(adapter, 'payment_orders', 'credit_amount', "INT NOT NULL DEFAULT 0");
  await ensureColumn(adapter, 'payment_orders', 'membership_group', "VARCHAR(32) NOT NULL DEFAULT ''");
  await ensureColumn(adapter, 'payment_orders', 'credited_at', 'VARCHAR(32)');

  // Staff membership_group fix
  const staffUpdate = adapter.prepare(`
    UPDATE app_users
    SET
      membership_group = 'staff',
      credit_balance = 0,
      updated_at = ?
    WHERE role IN ('admin', 'content_editor')
      AND (membership_group != 'staff' OR credit_balance != 0)
  `);
  await staffUpdate.run([new Date().toISOString()]);

  // Seed data
  await seedDefaultCategories(adapter);
  await seedDefaultUsers(adapter);

  // Category fallback fix
  const catFix = adapter.prepare(`
    UPDATE tools
    SET category_id = 'image'
    WHERE category_id = ''
  `);
  await catFix.run([]);

  // Initialize remaining_amount
  const ledgerFix = adapter.prepare(`
    UPDATE credit_ledger
    SET remaining_amount = amount
    WHERE amount > 0
      AND remaining_amount = 0
  `);
  await ledgerFix.run([]);
}

async function createIndexSafely(adapter, indexName, tableName, columns) {
  if (adapter.type === 'mysql') {
    // MySQL: CREATE INDEX IF NOT EXISTS not supported in all versions, use a safe wrapper
    try {
      await adapter.exec(`CREATE INDEX ${indexName} ON ${tableName} (${columns})`);
    } catch (error) {
      // Ignore "Duplicate key name" errors (index already exists)
      if (error.code !== 'ER_DUP_KEYNAME' && error.code !== 'ER_DUP_KEY') {
        throw error;
      }
    }
  } else {
    // SQLite supports IF NOT EXISTS
    await adapter.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columns})`);
  }
}

async function ensureColumn(adapter, tableName, columnName, columnDefinition) {
  let hasColumn = false;

  if (adapter.type === 'mysql') {
    try {
      const dbName = process.env.MYSQL_DATABASE || '';
      const stmt = adapter.prepare(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?
      `);
      const rows = await stmt.all([dbName, tableName, columnName]);
      hasColumn = rows.length > 0;
    } catch (error) {
      // If INFORMATION_SCHEMA fails, try a simpler approach
      try {
        await adapter.exec(`SELECT \`${columnName}\` FROM ${tableName} LIMIT 1`);
        hasColumn = true;
      } catch (selectError) {
        hasColumn = false;
      }
    }
  } else {
    // SQLite: use PRAGMA table_info
    try {
      const rows = await adapter.pragma(`table_info(${tableName})`);
      hasColumn = Array.isArray(rows) && rows.some((col) => col.name === columnName);
    } catch (error) {
      hasColumn = false;
    }
  }

  if (!hasColumn) {
    await adapter.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

async function seedDefaultCategories(adapter) {
  const now = new Date().toISOString();
  const stmt = adapter.prepare(`
    INSERT INTO tool_categories (
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

  const categories = [
    { id: 'image', categoryKey: 'image', name: '圖像', sortOrder: 10 },
    { id: 'video', categoryKey: 'video', name: '視頻', sortOrder: 20 },
    { id: 'audio', categoryKey: 'audio', name: '音頻', sortOrder: 30 },
    { id: 'text', categoryKey: 'text', name: '文本', sortOrder: 40 }
  ];

  for (const category of categories) {
    try {
      await stmt.run({
        ...category,
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      // Ignore duplicate key errors (category already exists)
      if (adapter.type === 'mysql') {
        if (!['ER_DUP_ENTRY', 'ER_DUP_KEY'].includes(error.code)) throw error;
      } else {
        // SQLite constraint error
        if (error.code !== 'SQLITE_CONSTRAINT') throw error;
      }
    }
  }
}

async function seedDefaultUsers(adapter) {
  const countStmt = adapter.prepare('SELECT COUNT(*) AS count FROM app_users');
  const countRow = await countStmt.get([]);
  if (countRow && countRow.count > 0) return;

  const now = new Date().toISOString();
  const insertStmt = adapter.prepare(`
    INSERT INTO app_users (
      id,
      email,
      display_name,
      role,
      membership_group,
      credit_balance,
      status,
      notes,
      created_at,
      updated_at
    )
    VALUES (
      @id,
      @email,
      @displayName,
      @role,
      @membershipGroup,
      @creditBalance,
      @status,
      @notes,
      @createdAt,
      @updatedAt
    )
  `);

  const users = [
    {
      id: 'admin-user',
      email: 'admin@example.com',
      displayName: '管理員',
      role: 'admin',
      membershipGroup: 'staff',
      creditBalance: 5000,
      status: 'active',
      notes: '系統預設管理員資料'
    },
    {
      id: 'editor-user',
      email: 'editor@example.com',
      displayName: '文章錄入員',
      role: 'content_editor',
      membershipGroup: 'staff',
      creditBalance: 100,
      status: 'active',
      notes: '可管理內容，後續接入內容權限'
    },
    {
      id: 'free-user',
      email: 'free@example.com',
      displayName: '免費用戶',
      role: 'free_user',
      membershipGroup: 'free',
      creditBalance: 20,
      status: 'active',
      notes: '普通免費用戶示例'
    },
    {
      id: 'member-user',
      email: 'member@example.com',
      displayName: '會員用戶',
      role: 'member',
      membershipGroup: 'pro_plus',
      creditBalance: 1500,
      status: 'active',
      notes: '會員分組示例'
    }
  ];

  for (const user of users) {
    try {
      await insertStmt.run({
        ...user,
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      // Ignore duplicate key errors
      if (adapter.type === 'mysql') {
        if (!['ER_DUP_ENTRY', 'ER_DUP_KEY'].includes(error.code)) throw error;
      } else {
        if (error.code !== 'SQLITE_CONSTRAINT') throw error;
      }
    }
  }
}

module.exports = {
  createDatabase,
  DEFAULT_DATA_DIR,
  DEFAULT_DATABASE_PATH
};

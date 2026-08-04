/**
 * Unified database adapter for SQLite (better-sqlite3) and MySQL (mysql2).
 *
 * Exposes a better-sqlite3-like API where statement methods return Promises,
 * so repository code can be updated to async/await while keeping the same
 * prepare/run/get/all shape.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

function getEnvDatabaseType() {
  const type = (process.env.DB_TYPE || 'sqlite').toLowerCase();
  return type === 'mysql' ? 'mysql' : 'sqlite';
}

function resolveWritableDatabasePath(databasePath) {
  const requestedPath = path.resolve(
    databasePath || process.env.DATABASE_PATH || path.join(os.homedir(), 'runninghub-data', 'app.sqlite')
  );

  try {
    fs.mkdirSync(path.dirname(requestedPath), { recursive: true });
    fs.accessSync(path.dirname(requestedPath), fs.constants.W_OK);
    return requestedPath;
  } catch (error) {
    const fallbackPath = path.join(os.tmpdir(), 'runninghub-app', path.basename(requestedPath || 'app.sqlite'));
    fs.mkdirSync(path.dirname(fallbackPath), { recursive: true });
    return fallbackPath;
  }
}

/**
 * Convert named placeholders (@name) to positional (?) and build parameter array.
 */
function normalizeNamedParameters(sql, params) {
  if (!params || Array.isArray(params)) {
    return { sql, params: params || [] };
  }

  const names = [];
  const orderedParams = [];
  const normalizedSql = sql.replace(/@(\w+)/g, (match, name) => {
    if (!names.includes(name)) {
      names.push(name);
    }
    return '?';
  });

  names.forEach((name) => {
    orderedParams.push(params[name]);
  });

  return { sql: normalizedSql, params: orderedParams };
}

function createSqliteStatement(db, sql) {
  const stmt = db.prepare(sql);

  return {
    run: (params) => Promise.resolve(stmt.run(params || [])).then((r) => ({
      lastInsertRowid: r.lastInsertRowid,
      changes: r.changes
    })),
    get: (params) => Promise.resolve(stmt.get(params || [])),
    all: (params) => Promise.resolve(stmt.all(params || []))
  };
}

function createSqliteAdapter(databasePath) {
  const resolvedPath = resolveWritableDatabasePath(databasePath);
  const BetterSqliteDatabase = require('better-sqlite3');
  const db = new BetterSqliteDatabase(resolvedPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return {
    type: 'sqlite',
    raw: db,
    pragma: (sql) => Promise.resolve(db.pragma(sql)),
    exec: (sql) => Promise.resolve(db.exec(sql)),
    prepare: (sql) => createSqliteStatement(db, sql),
    transaction: (fn) => db.transaction(fn),
    close: () => Promise.resolve(db.close())
  };
}

function createMysqlAdapter() {
  const mysql = require('mysql2/promise');

  const host = process.env.MYSQL_HOST || 'localhost';
  const port = parseInt(process.env.MYSQL_PORT || '3306', 10);
  const user = process.env.MYSQL_USER || '';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || '';

  if (!user || !database) {
    throw new Error('MySQL adapter requires MYSQL_USER and MYSQL_DATABASE environment variables');
  }

  const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: false,
    timezone: '+00:00'
  });

  async function execute(sql, params) {
    const { sql: normalizedSql, params: normalizedParams } = normalizeNamedParameters(sql, params);
    const [rows] = await pool.execute(normalizedSql, normalizedParams);
    return rows;
  }

  function createStatement(sql) {
    return {
      run: async (params) => {
        const result = await execute(sql, params);
        return {
          lastInsertRowid: result && result.insertId ? BigInt(result.insertId).toString() : '0',
          changes: result && result.affectedRows ? result.affectedRows : 0
        };
      },
      get: async (params) => {
        const rows = await execute(sql, params);
        return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      },
      all: async (params) => {
        const rows = await execute(sql, params);
        return Array.isArray(rows) ? rows : [];
      }
    };
  }

  return {
    type: 'mysql',
    raw: pool,
    pragma: () => Promise.resolve([]),
    exec: async (sql) => {
      const conn = await pool.getConnection();
      try {
        await conn.query(sql);
      } finally {
        conn.release();
      }
    },
    prepare: createStatement,
    transaction: async (fn) => {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const tx = {
          run: async (sql, params) => {
            const { sql: normalizedSql, params: normalizedParams } = normalizeNamedParameters(sql, params);
            const [result] = await conn.execute(normalizedSql, normalizedParams);
            return {
              lastInsertRowid: result && result.insertId ? BigInt(result.insertId).toString() : '0',
              changes: result && result.affectedRows ? result.affectedRows : 0
            };
          },
          get: async (sql, params) => {
            const { sql: normalizedSql, params: normalizedParams } = normalizeNamedParameters(sql, params);
            const [rows] = await conn.execute(normalizedSql, normalizedParams);
            return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
          },
          all: async (sql, params) => {
            const { sql: normalizedSql, params: normalizedParams } = normalizeNamedParameters(sql, params);
            const [rows] = await conn.execute(normalizedSql, normalizedParams);
            return Array.isArray(rows) ? rows : [];
          }
        };
        const result = await fn(tx);
        await conn.commit();
        return result;
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    },
    close: () => pool.end()
  };
}

function createAdapter(databasePath) {
  const type = getEnvDatabaseType();

  if (type === 'mysql') {
    return createMysqlAdapter();
  }

  return createSqliteAdapter(databasePath);
}

module.exports = {
  createAdapter,
  getEnvDatabaseType,
  resolveWritableDatabasePath
};

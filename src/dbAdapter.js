/**
 * Unified database adapter for SQLite (sqlite3) and MySQL (mysql2).
 *
 * Exposes a sqlite3-like API where statement methods return Promises,
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
    // Replace undefined values with null for MySQL compatibility
    const safeParams = (params || []).map((v) => (v === undefined ? null : v));
    return { sql, params: safeParams };
  }

  // If params is a single scalar value (not an object), wrap it in an array
  if (typeof params !== 'object' || params === null) {
    const value = params === undefined ? null : params;
    return { sql, params: [value] };
  }

  // Named parameters (@name) → positional (?)
  const names = [];
  const orderedParams = [];
  const normalizedSql = sql.replace(/@(\w+)/g, (match, name) => {
    if (!names.includes(name)) {
      names.push(name);
    }
    return '?';
  });

  names.forEach((name) => {
    const value = params[name];
    orderedParams.push(value === undefined ? null : value);
  });

  return { sql: normalizedSql, params: orderedParams };
}

function createSqliteStatement(db, sql, statements) {
  const stmt = db.prepare(sql);
  statements.add(stmt);

  return {
    run: (params) => new Promise((resolve, reject) => {
      const { params: safeParams } = normalizeNamedParameters(sql, params);
      stmt.run(safeParams, function (error) {
        if (error) return reject(error);
        resolve({
          lastInsertRowid: this.lastID != null ? this.lastID : 0,
          changes: this.changes != null ? this.changes : 0
        });
      });
    }),
    get: (params) => new Promise((resolve, reject) => {
      const { params: safeParams } = normalizeNamedParameters(sql, params);
      stmt.get(safeParams, (error, row) => {
        if (error) return reject(error);
        resolve(row);
      });
    }),
    all: (params) => new Promise((resolve, reject) => {
      const { params: safeParams } = normalizeNamedParameters(sql, params);
      stmt.all(safeParams, (error, rows) => {
        if (error) return reject(error);
        resolve(rows || []);
      });
    })
  };
}

function createSqliteAdapter(databasePath) {
  const resolvedPath = resolveWritableDatabasePath(databasePath);
  let sqlite3;
  try {
    sqlite3 = require('sqlite3');
  } catch (error) {
    throw new Error(
      'SQLite adapter requires the optional dependency "sqlite3". ' +
      'Install build tools and run "npm install", or switch to MySQL by setting DB_TYPE=mysql. ' +
      `Original error: ${error.message}`
    );
  }
  const db = new sqlite3.Database(resolvedPath);
  const statements = new Set();

  // sqlite3 queues operations until the database is open;
  // run PRAGMAs immediately so they apply before any user queries.
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');

  async function runTransaction(fn) {
    return new Promise((resolve, reject) => {
      db.run('BEGIN', async (beginError) => {
        if (beginError) return reject(beginError);

        const tx = {
          run: (sql, params) => new Promise((res, rej) => {
            const { sql: normalizedSql, params: normalizedParams } = normalizeNamedParameters(sql, params);
            db.run(normalizedSql, normalizedParams, function (error) {
              if (error) return rej(error);
              res({
                lastInsertRowid: this.lastID != null ? this.lastID : 0,
                changes: this.changes != null ? this.changes : 0
              });
            });
          }),
          get: (sql, params) => new Promise((res, rej) => {
            const { sql: normalizedSql, params: normalizedParams } = normalizeNamedParameters(sql, params);
            db.get(normalizedSql, normalizedParams, (error, row) => {
              if (error) return rej(error);
              res(row);
            });
          }),
          all: (sql, params) => new Promise((res, rej) => {
            const { sql: normalizedSql, params: normalizedParams } = normalizeNamedParameters(sql, params);
            db.all(normalizedSql, normalizedParams, (error, rows) => {
              if (error) return rej(error);
              res(rows || []);
            });
          })
        };

        try {
          const result = await fn(tx);
          db.run('COMMIT', (commitError) => {
            if (commitError) return reject(commitError);
            resolve(result);
          });
        } catch (error) {
          db.run('ROLLBACK', () => reject(error));
        }
      });
    });
  }

  return {
    type: 'sqlite',
    raw: db,
    pragma: (sql) => new Promise((resolve, reject) => {
      db.all(`PRAGMA ${sql.replace(/^PRAGMA\s+/i, '')}`, (error, rows) => {
        if (error) return reject(error);
        resolve(rows || []);
      });
    }),
    exec: (sql) => new Promise((resolve, reject) => {
      db.exec(sql, (error) => {
        if (error) return reject(error);
        resolve();
      });
    }),
    prepare: (sql) => createSqliteStatement(db, sql, statements),
    transaction: (fn) => runTransaction(fn),
    close: () => new Promise((resolve, reject) => {
      // Finalize all prepared statements before closing the database,
      // otherwise sqlite3 throws SQLITE_BUSY.
      const pending = Array.from(statements).map((stmt) => new Promise((res, rej) => {
        stmt.finalize((error) => {
          if (error) return rej(error);
          res();
        });
      }));
      Promise.all(pending)
        .then(() => {
          db.close((error) => {
            if (error) return reject(error);
            resolve();
          });
        })
        .catch(reject);
    })
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
    multipleStatements: true,
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
        await conn.query({ sql, multipleStatements: true });
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

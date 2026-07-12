const VALID_CATEGORY_STATUS = new Set(['active', 'inactive']);

function createCategoryRepository(database) {
  const statements = {
    list: database.prepare(`
      SELECT *
      FROM tool_categories
      ORDER BY sort_order ASC, created_at ASC
    `),
    findById: database.prepare(`
      SELECT *
      FROM tool_categories
      WHERE id = ?
    `),
    findByKey: database.prepare(`
      SELECT *
      FROM tool_categories
      WHERE category_key = ?
    `),
    insert: database.prepare(`
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
        @status,
        @createdAt,
        @updatedAt
      )
    `),
    update: database.prepare(`
      UPDATE tool_categories
      SET
        category_key = @categoryKey,
        name = @name,
        sort_order = @sortOrder,
        status = @status,
        updated_at = @updatedAt
      WHERE id = @id
    `)
  };

  function listCategories() {
    return statements.list.all().map(mapCategoryRecord);
  }

  function getCategoryById(id) {
    const record = statements.findById.get(id);
    return record ? mapCategoryRecord(record) : null;
  }

  function getCategoryByKey(categoryKey) {
    const record = statements.findByKey.get(categoryKey);
    return record ? mapCategoryRecord(record) : null;
  }

  function saveCategory(rawCategory) {
    const normalizedCategory = normalizeCategoryPayload(rawCategory);
    const now = new Date().toISOString();
    const existingCategory = normalizedCategory.id ? getCategoryById(normalizedCategory.id) : null;
    const id = existingCategory ? existingCategory.id : normalizedCategory.categoryKey;
    const databasePayload = {
      ...normalizedCategory,
      id,
      createdAt: existingCategory?.createdAt || now,
      updatedAt: now
    };

    try {
      if (existingCategory) {
        statements.update.run(databasePayload);
      } else {
        statements.insert.run(databasePayload);
      }
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throwValidationError('分類識別碼已存在', 'CATEGORY_KEY_EXISTS', 409);
      }

      throw error;
    }

    return getCategoryById(id);
  }

  return {
    getCategoryById,
    getCategoryByKey,
    listCategories,
    saveCategory
  };
}

function normalizeCategoryPayload(rawCategory) {
  const category = rawCategory && typeof rawCategory === 'object' ? rawCategory : {};
  const categoryKey = slugify(String(category.categoryKey || category.key || category.id || ''));
  const status = String(category.status || 'active').trim();

  if (!category.name || !String(category.name).trim()) {
    throwValidationError('分類名稱必填', 'CATEGORY_NAME_REQUIRED', 422);
  }

  if (!categoryKey) {
    throwValidationError('分類識別碼必填', 'CATEGORY_KEY_REQUIRED', 422);
  }

  if (!VALID_CATEGORY_STATUS.has(status)) {
    throwValidationError('分類狀態不正確', 'CATEGORY_STATUS_INVALID', 422);
  }

  return {
    id: category.id ? String(category.id) : '',
    categoryKey,
    name: String(category.name).trim(),
    sortOrder: toInteger(category.sortOrder, 100),
    status
  };
}

function mapCategoryRecord(record) {
  return {
    id: record.id,
    categoryKey: record.category_key,
    key: record.category_key,
    name: record.name,
    sortOrder: record.sort_order,
    status: record.status,
    statusLabel: record.status === 'active' ? '啟用' : '停用',
    statusClass: record.status === 'active' ? 'status-active' : 'status-error',
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toInteger(value, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
}

function throwValidationError(message, code, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}

module.exports = {
  createCategoryRepository
};

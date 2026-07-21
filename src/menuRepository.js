const crypto = require('crypto');

const VALID_MENU_STATUS = new Set(['active', 'inactive']);
const VALID_MENU_TARGET_TYPES = new Set(['route', 'external', 'api']);

function createMenuRepository(database) {
  const statements = {
    list: database.prepare(`
      SELECT *
      FROM admin_menus
      ORDER BY parent_id ASC, sort_order ASC, created_at ASC
    `),
    findById: database.prepare(`
      SELECT *
      FROM admin_menus
      WHERE id = ?
    `),
    findByKey: database.prepare(`
      SELECT *
      FROM admin_menus
      WHERE menu_key = ?
    `),
    insert: database.prepare(`
      INSERT INTO admin_menus (
        id,
        parent_id,
        menu_key,
        label,
        mark,
        path,
        target_type,
        sort_order,
        status,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @parentId,
        @menuKey,
        @label,
        @mark,
        @path,
        @targetType,
        @sortOrder,
        @status,
        @createdAt,
        @updatedAt
      )
    `),
    update: database.prepare(`
      UPDATE admin_menus
      SET
        parent_id = @parentId,
        menu_key = @menuKey,
        label = @label,
        mark = @mark,
        path = @path,
        target_type = @targetType,
        sort_order = @sortOrder,
        status = @status,
        updated_at = @updatedAt
      WHERE id = @id
    `)
  };

  function listMenus() {
    return statements.list.all().map(mapMenuRecord);
  }

  function listActiveMenus() {
    return buildMenuTree(listMenus().filter((menu) => menu.status === 'active'));
  }

  function getMenuById(id) {
    const record = statements.findById.get(id);
    return record ? mapMenuRecord(record) : null;
  }

  function saveMenu(rawMenu) {
    const normalizedMenu = normalizeMenuPayload(rawMenu);
    const now = new Date().toISOString();
    const existingMenu = normalizedMenu.id ? getMenuById(normalizedMenu.id) : null;
    const id = existingMenu ? existingMenu.id : crypto.randomUUID();

    if (normalizedMenu.parentId && normalizedMenu.parentId === id) {
      throwValidationError('父級菜單不可選擇自己', 'MENU_PARENT_SELF_INVALID', 422);
    }

    const databasePayload = {
      ...normalizedMenu,
      id,
      createdAt: existingMenu?.createdAt || now,
      updatedAt: now
    };

    try {
      if (existingMenu) {
        statements.update.run(databasePayload);
      } else {
        statements.insert.run(databasePayload);
      }
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throwValidationError('菜單識別碼已存在', 'MENU_KEY_EXISTS', 409);
      }

      throw error;
    }

    return getMenuById(id);
  }

  function seedDefaultMenus() {
    if (statements.findByKey.get('kie-api')) return;

    saveMenu({
      menuKey: 'kie-api',
      label: 'Kie API',
      mark: 'K',
      path: '/admin/kie-api',
      targetType: 'api',
      sortOrder: 10,
      status: 'active'
    });
  }

  return {
    getMenuById,
    listActiveMenus,
    listMenus,
    saveMenu,
    seedDefaultMenus
  };
}

function normalizeMenuPayload(rawMenu) {
  const menu = rawMenu && typeof rawMenu === 'object' ? rawMenu : {};
  const menuKey = slugify(String(menu.menuKey || menu.key || ''));
  const label = String(menu.label || '').trim();
  const targetType = String(menu.targetType || 'route').trim();
  const status = String(menu.status || 'active').trim();

  if (!label) {
    throwValidationError('菜單名稱必填', 'MENU_LABEL_REQUIRED', 422);
  }

  if (!menuKey) {
    throwValidationError('菜單識別碼必填', 'MENU_KEY_REQUIRED', 422);
  }

  if (!VALID_MENU_TARGET_TYPES.has(targetType)) {
    throwValidationError('菜單目標類型不正確', 'MENU_TARGET_TYPE_INVALID', 422);
  }

  if (!VALID_MENU_STATUS.has(status)) {
    throwValidationError('菜單狀態不正確', 'MENU_STATUS_INVALID', 422);
  }

  const path = normalizeMenuPath(menu.path, targetType, menuKey);

  return {
    id: menu.id ? String(menu.id) : '',
    parentId: String(menu.parentId || menu.parent_id || '').trim(),
    menuKey,
    label,
    mark: String(menu.mark || label.slice(0, 1) || '菜').trim().slice(0, 2),
    path,
    targetType,
    sortOrder: toInteger(menu.sortOrder, 100),
    status
  };
}

function normalizeMenuPath(path, targetType, menuKey) {
  const value = String(path || '').trim();
  if (targetType === 'external') return value || 'https://';
  if (value.startsWith('/admin')) return value;
  return `/admin/${menuKey}`;
}

function mapMenuRecord(record) {
  return {
    id: record.id,
    parentId: record.parent_id || '',
    parent_id: record.parent_id || '',
    menuKey: record.menu_key,
    key: record.menu_key,
    label: record.label,
    mark: record.mark,
    path: record.path,
    targetType: record.target_type,
    targetTypeLabel: getTargetTypeLabel(record.target_type),
    sortOrder: record.sort_order,
    status: record.status,
    statusLabel: record.status === 'active' ? '啟用' : '停用',
    statusClass: record.status === 'active' ? 'status-active' : 'status-error',
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    children: []
  };
}

function buildMenuTree(menus) {
  const menuMap = new Map(menus.map((menu) => [menu.id, { ...menu, children: [] }]));
  const roots = [];

  menuMap.forEach((menu) => {
    const parent = menu.parentId ? menuMap.get(menu.parentId) : null;
    if (parent) {
      parent.children.push(menu);
    } else {
      roots.push(menu);
    }
  });

  const sortMenus = (items) => {
    items.sort((left, right) => (left.sortOrder - right.sortOrder) || left.label.localeCompare(right.label));
    items.forEach((item) => sortMenus(item.children));
    return items;
  };

  return sortMenus(roots);
}

function getTargetTypeLabel(targetType) {
  const labels = {
    route: '後台路由',
    external: '外部連結',
    api: 'API / 功能'
  };

  return labels[targetType] || targetType;
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
  createMenuRepository
};

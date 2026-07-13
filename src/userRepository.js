const crypto = require('crypto');

const VALID_USER_ROLES = new Set(['admin', 'content_editor', 'free_user', 'member']);
const VALID_MEMBERSHIP_GROUPS = new Set(['free', 'pro', 'pro_plus', 'pro_max']);
const VALID_USER_STATUS = new Set(['active', 'disabled']);

function createUserRepository(database) {
  const statements = {
    list: database.prepare(`
      SELECT *
      FROM app_users
      ORDER BY created_at DESC
    `),
    findById: database.prepare(`
      SELECT *
      FROM app_users
      WHERE id = ?
    `),
    insert: database.prepare(`
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
    `),
    update: database.prepare(`
      UPDATE app_users
      SET
        email = @email,
        display_name = @displayName,
        role = @role,
        membership_group = @membershipGroup,
        credit_balance = @creditBalance,
        status = @status,
        notes = @notes,
        updated_at = @updatedAt
      WHERE id = @id
    `),
    insertLedger: database.prepare(`
      INSERT INTO credit_ledger (
        id,
        user_id,
        amount,
        balance_after,
        reason,
        related_task_id,
        created_at
      )
      VALUES (
        @id,
        @userId,
        @amount,
        @balanceAfter,
        @reason,
        @relatedTaskId,
        @createdAt
      )
    `),
    listLedgerByUser: database.prepare(`
      SELECT *
      FROM credit_ledger
      WHERE user_id = ?
      ORDER BY created_at DESC
    `)
  };

  function listUsers() {
    return statements.list.all().map(mapUserRecord);
  }

  function getUserById(id) {
    const record = statements.findById.get(id);
    return record ? mapUserRecord(record) : null;
  }

  function saveUser(rawUser, options = {}) {
    const normalizedUser = normalizeUserPayload(rawUser);
    const existingUser = normalizedUser.id ? getUserById(normalizedUser.id) : null;
    const now = new Date().toISOString();
    const id = existingUser ? existingUser.id : crypto.randomUUID();
    const creditBalance = getSaveUserCreditBalance(normalizedUser, existingUser, options);
    const payload = {
      ...normalizedUser,
      id,
      creditBalance,
      createdAt: existingUser?.createdAt || now,
      updatedAt: now
    };

    try {
      if (existingUser) {
        statements.update.run(payload);
      } else {
        statements.insert.run(payload);
      }
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throwValidationError('用戶 Email 已存在', 'USER_EMAIL_EXISTS', 409);
      }

      throw error;
    }

    return getUserById(id);
  }

  function adjustCredits(userId, amount, reason, relatedTaskId = '') {
    const user = getUserById(userId);
    if (!user) {
      throwValidationError('用戶不存在', 'USER_NOT_FOUND', 404);
    }

    const creditDelta = parseInteger(amount, '積分調整數量不正確', 'USER_CREDIT_AMOUNT_INVALID');
    if (creditDelta === 0) {
      throwValidationError('積分調整數量不能為 0', 'USER_CREDIT_AMOUNT_ZERO', 422);
    }

    const balanceAfter = user.creditBalance + creditDelta;
    if (balanceAfter < 0) {
      throwValidationError('用戶積分不足', 'USER_CREDIT_NOT_ENOUGH', 409);
    }

    const savedUser = saveUser({
      ...user,
      creditBalance: balanceAfter
    }, {
      allowCreditBalanceWrite: true
    });
    const now = new Date().toISOString();

    statements.insertLedger.run({
      id: crypto.randomUUID(),
      userId,
      amount: creditDelta,
      balanceAfter,
      reason: String(reason || '後台調整').trim(),
      relatedTaskId: String(relatedTaskId || ''),
      createdAt: now
    });

    return savedUser;
  }

  function listCreditLedgerByUser(userId) {
    return statements.listLedgerByUser.all(userId).map(mapCreditLedgerRecord);
  }

  return {
    adjustCredits,
    getUserById,
    listCreditLedgerByUser,
    listUsers,
    saveUser
  };
}

function getSaveUserCreditBalance(normalizedUser, existingUser, options) {
  if (existingUser && !options.allowCreditBalanceWrite) {
    return existingUser.creditBalance;
  }

  if (!existingUser && !options.allowInitialCreditBalance) {
    return 0;
  }

  return normalizedUser.creditBalance;
}

function normalizeUserPayload(rawUser) {
  const user = rawUser && typeof rawUser === 'object' ? rawUser : {};
  const role = String(user.role || 'free_user').trim();
  const membershipGroup = String(user.membershipGroup || user.membership_group || 'free').trim();
  const status = String(user.status || 'active').trim();
  const email = String(user.email || '').trim().toLowerCase();
  const creditBalance = parseInteger(
    user.creditBalance ?? user.credit_balance ?? 0,
    '積分餘額不正確',
    'USER_CREDIT_BALANCE_INVALID'
  );

  if (!email || !email.includes('@')) {
    throwValidationError('Email 格式不正確', 'USER_EMAIL_INVALID', 422);
  }

  if (!String(user.displayName || user.display_name || '').trim()) {
    throwValidationError('用戶名稱必填', 'USER_DISPLAY_NAME_REQUIRED', 422);
  }

  if (!VALID_USER_ROLES.has(role)) {
    throwValidationError('用戶角色不正確', 'USER_ROLE_INVALID', 422);
  }

  if (!VALID_MEMBERSHIP_GROUPS.has(membershipGroup)) {
    throwValidationError('會員分組不正確', 'USER_MEMBERSHIP_INVALID', 422);
  }

  if (!VALID_USER_STATUS.has(status)) {
    throwValidationError('用戶狀態不正確', 'USER_STATUS_INVALID', 422);
  }

  if (creditBalance < 0) {
    throwValidationError('積分餘額不可小於 0', 'USER_CREDIT_BALANCE_NEGATIVE', 422);
  }

  return {
    id: user.id ? String(user.id) : '',
    email,
    displayName: String(user.displayName || user.display_name).trim(),
    role,
    membershipGroup,
    creditBalance,
    status,
    notes: String(user.notes || '').trim()
  };
}

function mapUserRecord(record) {
  return {
    id: record.id,
    email: record.email,
    displayName: record.display_name,
    role: record.role,
    roleLabel: getRoleLabel(record.role),
    membershipGroup: record.membership_group,
    membershipGroupLabel: getMembershipGroupLabel(record.membership_group),
    creditBalance: record.credit_balance,
    status: record.status,
    statusLabel: record.status === 'active' ? '啟用' : '停用',
    statusClass: record.status === 'active' ? 'status-active' : 'status-error',
    notes: record.notes || '',
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function mapCreditLedgerRecord(record) {
  return {
    id: record.id,
    userId: record.user_id,
    amount: record.amount,
    balanceAfter: record.balance_after,
    reason: record.reason,
    relatedTaskId: record.related_task_id,
    createdAt: record.created_at
  };
}

function getRoleLabel(role) {
  const labels = {
    admin: '管理員',
    content_editor: '文章錄入員',
    free_user: '普通免費用戶',
    member: '會員用戶'
  };

  return labels[role] || role;
}

function getMembershipGroupLabel(group) {
  const labels = {
    free: '免費組',
    pro: 'PRO',
    pro_plus: 'PRO+',
    pro_max: 'PRO MAX'
  };

  return labels[group] || group;
}

function parseInteger(value, message, code) {
  if (value === '' || value === null || value === undefined) {
    throwValidationError(message, code, 422);
  }

  const number = Number(value);
  if (!Number.isInteger(number)) {
    throwValidationError(message, code, 422);
  }

  return number;
}

function throwValidationError(message, code, statusCode = 422) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  throw error;
}

module.exports = {
  createUserRepository
};

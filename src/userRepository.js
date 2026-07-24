const crypto = require('crypto');

const VALID_USER_ROLES = new Set(['admin', 'content_editor', 'free_user', 'member']);
const BACKEND_USER_ROLES = new Set(['admin', 'content_editor']);
const FRONTEND_USER_ROLES = new Set(['free_user', 'member']);
const MEMBER_PLAN_GROUPS = new Set(['pro', 'pro_plus', 'pro_max']);
const VALID_MEMBERSHIP_GROUPS = new Set(['staff', 'free', 'pro', 'pro_plus', 'pro_max']);
const VALID_USER_STATUS = new Set(['active', 'disabled']);
const REGISTER_BONUS_CREDITS = 100;
const DAILY_LOGIN_BONUS_CREDITS = 50;
const LOGIN_BONUS_EXPIRES_DAYS = 3;

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
    findByEmail: database.prepare(`
      SELECT *
      FROM app_users
      WHERE email = ?
    `),
    insert: database.prepare(`
      INSERT INTO app_users (
        id,
        email,
        display_name,
        role,
        membership_group,
        credit_balance,
        last_login_credit_date,
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
        @lastLoginCreditDate,
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
        last_login_credit_date = @lastLoginCreditDate,
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
        remaining_amount,
        balance_after,
        reason,
        related_task_id,
        expires_at,
        created_at
      )
      VALUES (
        @id,
        @userId,
        @amount,
        @remainingAmount,
        @balanceAfter,
        @reason,
        @relatedTaskId,
        @expiresAt,
        @createdAt
      )
    `),
    listSpendableLedgerByUser: database.prepare(`
      SELECT *
      FROM credit_ledger
      WHERE user_id = ?
        AND remaining_amount > 0
      ORDER BY
        CASE WHEN expires_at IS NULL OR expires_at = '' THEN 1 ELSE 0 END ASC,
        expires_at ASC,
        created_at ASC
    `),
    listLedgerByUser: database.prepare(`
      SELECT *
      FROM credit_ledger
      WHERE user_id = ?
      ORDER BY created_at DESC
    `),
    findPositiveLedgerByRelatedTask: database.prepare(`
      SELECT *
      FROM credit_ledger
      WHERE user_id = ?
        AND related_task_id = ?
        AND amount > 0
    `),
    updateLedgerRemainingAmount: database.prepare(`
      UPDATE credit_ledger
      SET remaining_amount = @remainingAmount
      WHERE id = @id
    `),
    updateLastLoginCreditDate: database.prepare(`
      UPDATE app_users
      SET
        last_login_credit_date = @lastLoginCreditDate,
        updated_at = @updatedAt
      WHERE id = @id
    `)
  };
  const runGrantCreditsOnce = typeof database.transaction === 'function'
    ? database.transaction(grantCreditsOnceInternal)
    : grantCreditsOnceInternal;

  function listUsers() {
    return statements.list.all().map(mapUserRecord);
  }

  function getUserById(id) {
    const record = statements.findById.get(id);
    return record ? mapUserRecord(record) : null;
  }

  function getUserByEmail(email) {
    const record = statements.findByEmail.get(String(email || '').trim().toLowerCase());
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
      lastLoginCreditDate: existingUser?.lastLoginCreditDate || normalizedUser.lastLoginCreditDate || '',
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

  function adjustCredits(userId, amount, reason, relatedTaskId = '', options = {}) {
    const user = getUserById(userId);
    if (!user) {
      throwValidationError('用戶不存在', 'USER_NOT_FOUND', 404);
    }

    if (user.accountType !== 'frontend') {
      throwValidationError('後台帳號不使用前台積分', 'USER_CREDIT_BACKEND_ACCOUNT_INVALID', 422);
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
      remainingAmount: creditDelta > 0 ? creditDelta : 0,
      balanceAfter,
      reason: String(reason || '後台調整').trim(),
      relatedTaskId: String(relatedTaskId || ''),
      expiresAt: options.expiresAt || null,
      createdAt: now
    });

    return savedUser;
  }

  function grantCreditsOnce(userId, amount, reason, relatedTaskId, options = {}) {
    const normalizedRelatedTaskId = String(relatedTaskId || '').trim();
    if (!normalizedRelatedTaskId) {
      throwValidationError('積分發放必須關聯訂單或任務', 'USER_CREDIT_RELATED_ID_REQUIRED', 422);
    }

    return runGrantCreditsOnce(userId, amount, reason, normalizedRelatedTaskId, options);
  }

  function grantCreditsOnceInternal(userId, amount, reason, relatedTaskId, options) {
    const existingRecord = statements.findPositiveLedgerByRelatedTask.get(userId, relatedTaskId);
    if (existingRecord) return getUserById(userId);
    return adjustCredits(userId, amount, reason, relatedTaskId, options);
  }

  function grantRegisterBonus(userId) {
    return grantCreditsIfReasonMissing(userId, REGISTER_BONUS_CREDITS, '註冊贈送積分');
  }

  function grantDailyLoginBonus(userId, todayKey = getTodayKey()) {
    const user = getUserById(userId);
    if (!user || user.lastLoginCreditDate === todayKey) return user;

    const savedUser = adjustCredits(
      userId,
      DAILY_LOGIN_BONUS_CREDITS,
      `每日登入贈送積分 ${todayKey}`,
      '',
      { expiresAt: addDaysIso(new Date(), LOGIN_BONUS_EXPIRES_DAYS) }
    );
    const now = new Date().toISOString();
    statements.updateLastLoginCreditDate.run({
      id: userId,
      lastLoginCreditDate: todayKey,
      updatedAt: now
    });
    return getUserById(savedUser.id);
  }

  function spendCredits(userId, amount, reason, relatedTaskId = '') {
    const spendAmount = parseInteger(amount, '扣減積分不正確', 'USER_CREDIT_SPEND_AMOUNT_INVALID');
    if (spendAmount <= 0) {
      throwValidationError('扣減積分必須大於 0', 'USER_CREDIT_SPEND_AMOUNT_INVALID', 422);
    }

    const user = getUserById(userId);
    if (!user) {
      throwValidationError('用戶不存在', 'USER_NOT_FOUND', 404);
    }

    if (user.accountType !== 'frontend') {
      throwValidationError('後台帳號不使用前台積分', 'USER_CREDIT_BACKEND_ACCOUNT_INVALID', 422);
    }

    const now = new Date();
    const spendableCredits = getSpendableCredits(userId, now);
    if (spendableCredits < spendAmount) {
      throwValidationError('積分不足，請先充值或領取登入獎勵', 'USER_CREDIT_NOT_ENOUGH', 409);
    }

    consumeLedgerCredits(userId, spendAmount, now);
    return adjustCredits(userId, -spendAmount, reason, relatedTaskId);
  }

  function listCreditLedgerByUser(userId) {
    return statements.listLedgerByUser.all(userId).map(mapCreditLedgerRecord);
  }

  return {
    adjustCredits,
    grantCreditsOnce,
    grantDailyLoginBonus,
    grantRegisterBonus,
    getUserByEmail,
    getUserById,
    listCreditLedgerByUser,
    listUsers,
    saveUser,
    spendCredits
  };

  function grantCreditsIfReasonMissing(userId, amount, reason, options = {}) {
    const existingRecord = listCreditLedgerByUser(userId).find((record) => record.reason === reason);
    if (existingRecord) return getUserById(userId);
    return adjustCredits(userId, amount, reason, '', options);
  }

  function getSpendableCredits(userId, now) {
    return getActivePositiveLedger(userId, now).reduce((sum, record) => sum + record.remainingAmount, 0);
  }

  function consumeLedgerCredits(userId, amount, now) {
    let remainingAmount = amount;
    const records = getActivePositiveLedger(userId, now);

    for (const record of records) {
      if (remainingAmount <= 0) break;

      const consumedAmount = Math.min(record.remainingAmount, remainingAmount);
      const nextRemainingAmount = record.remainingAmount - consumedAmount;
      statements.updateLedgerRemainingAmount.run({
        id: record.id,
        remainingAmount: nextRemainingAmount
      });
      remainingAmount -= consumedAmount;
    }
  }

  function getActivePositiveLedger(userId, now) {
    return statements.listSpendableLedgerByUser.all(userId)
      .map(mapCreditLedgerRecord)
      .filter((record) => !record.expiresAt || new Date(record.expiresAt) > now);
  }
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
  const requestedMembershipGroup = String(user.membershipGroup || user.membership_group || '').trim();
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

  const membershipGroup = normalizeMembershipGroup(role, requestedMembershipGroup);
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
    lastLoginCreditDate: String(user.lastLoginCreditDate || user.last_login_credit_date || '').trim(),
    status,
    notes: String(user.notes || '').trim()
  };
}

function mapUserRecord(record) {
  const accountType = getAccountType(record.role);

  return {
    id: record.id,
    email: record.email,
    displayName: record.display_name,
    accountType,
    accountTypeLabel: accountType === 'backend' ? '後台帳號' : '前台用戶',
    role: record.role,
    roleLabel: getRoleLabel(record.role),
    membershipGroup: record.membership_group,
    membershipGroupLabel: getMembershipGroupLabel(record.membership_group),
    creditBalance: record.credit_balance,
    lastLoginCreditDate: record.last_login_credit_date || '',
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
    remainingAmount: Number(record.remaining_amount || 0),
    balanceAfter: record.balance_after,
    reason: record.reason,
    relatedTaskId: record.related_task_id,
    expiresAt: record.expires_at || '',
    createdAt: record.created_at
  };
}

function addDaysIso(date, days) {
  const nextDate = new Date(date.getTime());
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate.toISOString();
}

function getTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function normalizeMembershipGroup(role, requestedMembershipGroup) {
  if (BACKEND_USER_ROLES.has(role)) {
    return 'staff';
  }

  if (role === 'free_user') {
    return 'free';
  }

  if (role === 'member') {
    if (!requestedMembershipGroup) return 'pro';
    if (!MEMBER_PLAN_GROUPS.has(requestedMembershipGroup)) {
      throwValidationError('會員用戶必須選擇會員套餐', 'USER_MEMBER_PLAN_REQUIRED', 422);
    }
    return requestedMembershipGroup;
  }

  return requestedMembershipGroup || 'free';
}

function getAccountType(role) {
  if (BACKEND_USER_ROLES.has(role)) return 'backend';
  if (FRONTEND_USER_ROLES.has(role)) return 'frontend';
  return 'frontend';
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
    staff: '後台人員',
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

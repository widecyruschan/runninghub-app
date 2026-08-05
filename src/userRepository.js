const crypto = require('crypto');

const VALID_USER_ROLES = new Set(['admin', 'content_editor', 'free_user', 'member']);
const BACKEND_USER_ROLES = new Set(['admin', 'content_editor']);
const FRONTEND_USER_ROLES = new Set(['free_user', 'member']);
const MEMBER_PLAN_GROUPS = new Set(['pro', 'pro_plus', 'pro_max']);
const VALID_MEMBERSHIP_GROUPS = new Set(['staff', 'free', 'pro', 'pro_plus', 'pro_max']);
const VALID_USER_STATUS = new Set(['active', 'disabled']);
const REGISTER_BONUS_CREDITS = 100;
const DAILY_LOGIN_BONUS_CREDITS = 20;
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
    findAuthByEmail: database.prepare(`
      SELECT
        id,
        email,
        password_hash,
        status
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
        password_hash,
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
        @passwordHash,
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
      password_hash = @passwordHash,
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
    `),
    findAuthByResetToken: database.prepare(`
      SELECT
        id,
        email,
        display_name,
        reset_token,
        reset_token_expires_at,
        status
      FROM app_users
      WHERE reset_token = ?
    `),
    updateResetToken: database.prepare(`
      UPDATE app_users
      SET
        reset_token = @resetToken,
        reset_token_expires_at = @resetTokenExpiresAt,
        updated_at = @updatedAt
      WHERE id = @id
    `),
    updatePasswordAndClearResetToken: database.prepare(`
      UPDATE app_users
      SET
        password_hash = @passwordHash,
        reset_token = '',
        reset_token_expires_at = '',
        updated_at = @updatedAt
      WHERE id = @id
    `)
  };
  // MySQL transaction is async (immediate), SQLite transaction returns a wrapper function.
  // For MySQL, use the direct approach; for SQLite, use the transaction-wrapped function.
  function runGrantCreditsOnce(userId, amount, reason, relatedTaskId, options) {
    if (database.type === 'mysql') {
      return database.transaction(async (tx) => {
        const rows = await tx.get(
          'SELECT * FROM credit_ledger WHERE user_id = ? AND related_task_id = ? AND amount > 0 LIMIT 1',
          [userId, relatedTaskId]
        );
        if (rows) return getUserById(userId);
        return adjustCredits(userId, amount, reason, relatedTaskId, options);
      });
    }
    return grantCreditsOnceInternal(userId, amount, reason, relatedTaskId, options);
  }

  async function listUsers() {
    const rows = await statements.list.all([]);
    return (rows || []).map(mapUserRecord);
  }

  async function getUserById(id) {
    const record = await statements.findById.get(id);
    return record ? mapUserRecord(record) : null;
  }

  async function getUserByEmail(email) {
    const record = await statements.findByEmail.get(String(email || '').trim().toLowerCase());
    return record ? mapUserRecord(record) : null;
  }

  async function getUserAuthByEmail(email) {
    const record = await statements.findAuthByEmail.get(String(email || '').trim().toLowerCase());
    if (!record) return null;

    return {
      id: record.id,
      email: record.email,
      passwordHash: record.password_hash || '',
      status: record.status
    };
  }

  async function saveUser(rawUser, options = {}) {
    const normalizedUser = normalizeUserPayload(rawUser);
    const existingUser = normalizedUser.id ? await getUserById(normalizedUser.id) : null;
    const now = new Date().toISOString();
    const id = existingUser ? existingUser.id : crypto.randomUUID();
    const creditBalance = getSaveUserCreditBalance(normalizedUser, existingUser, options);
    // Preserve existing password hash when the payload does not intend to change it.
    // This avoids a MySQL collation mismatch in CASE expressions mixing column and parameter collations.
    const passwordHash = normalizedUser.passwordHash || existingUser?.passwordHash || '';
    const payload = {
      ...normalizedUser,
      id,
      passwordHash,
      creditBalance,
      lastLoginCreditDate: existingUser?.lastLoginCreditDate || normalizedUser.lastLoginCreditDate || '',
      createdAt: existingUser?.createdAt || now,
      updatedAt: now
    };

    try {
      console.log('[saveUser] rawUser.passwordHash:', rawUser?.passwordHash?.slice?.(0, 30));
      console.log('[saveUser] normalizedUser.passwordHash:', normalizedUser?.passwordHash?.slice?.(0, 30));
      console.log('[saveUser] payload.passwordHash:', payload?.passwordHash?.slice?.(0, 30));
      if (existingUser) {
        await statements.update.run(payload);
      } else {
        await statements.insert.run(payload);
      }
      const saved = await getUserById(id);
      console.log('[saveUser] saved user password_hash:', saved?.passwordHash?.slice?.(0, 30));
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'ER_DUP_ENTRY') {
        throwValidationError('用戶 Email 已存在', 'USER_EMAIL_EXISTS', 409);
      }

      throw error;
    }

    return await getUserById(id);
  }

  async function adjustCredits(userId, amount, reason, relatedTaskId = '', options = {}) {
    const user = await getUserById(userId);
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

    const savedUser = await saveUser({
      ...user,
      creditBalance: balanceAfter
    }, {
      allowCreditBalanceWrite: true
    });
    const now = new Date().toISOString();

    await statements.insertLedger.run({
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

    if (database.type === 'mysql') {
      return database.transaction(async (tx) => {
        const rows = await tx.get(
          'SELECT * FROM credit_ledger WHERE user_id = ? AND related_task_id = ? AND amount > 0 LIMIT 1',
          [userId, normalizedRelatedTaskId]
        );
        if (rows) return getUserById(userId);
        return adjustCredits(userId, amount, reason, normalizedRelatedTaskId, options);
      });
    }

    return runGrantCreditsOnce(userId, amount, reason, normalizedRelatedTaskId, options);
  }

  function grantCreditsOnceInternal(userId, amount, reason, relatedTaskId, options) {
    const existingRecord = statements.findPositiveLedgerByRelatedTask.get([userId, relatedTaskId]);
    if (existingRecord) return getUserById(userId);
    return adjustCredits(userId, amount, reason, relatedTaskId, options);
  }

  async function grantRegisterBonus(userId) {
    return await grantCreditsIfReasonMissing(userId, REGISTER_BONUS_CREDITS, '註冊贈送積分');
  }

  async function grantDailyLoginBonus(userId, todayKey = getTodayKey()) {
    const user = await getUserById(userId);
    if (!user || user.lastLoginCreditDate === todayKey) return user;

    const savedUser = await adjustCredits(
      userId,
      DAILY_LOGIN_BONUS_CREDITS,
      `每日登入贈送積分 ${todayKey}`,
      '',
      { expiresAt: addDaysIso(new Date(), LOGIN_BONUS_EXPIRES_DAYS) }
    );
    const now = new Date().toISOString();
    await statements.updateLastLoginCreditDate.run({
      id: userId,
      lastLoginCreditDate: todayKey,
      updatedAt: now
    });
    return await getUserById(savedUser.id);
  }

  async function markDailyLoginBonusClaimed(userId, todayKey = getTodayKey()) {
    const user = await getUserById(userId);
    if (!user || user.lastLoginCreditDate === todayKey) return user;

    const now = new Date().toISOString();
    await statements.updateLastLoginCreditDate.run({
      id: userId,
      lastLoginCreditDate: todayKey,
      updatedAt: now
    });
    return await getUserById(userId);
  }

  async function updateUser(userId, fields) {
    const user = await getUserById(userId);
    if (!user) {
      throwValidationError('用戶不存在', 'USER_NOT_FOUND', 404);
    }

    const now = new Date().toISOString();

    if (fields.reset_token !== undefined || fields.reset_token_expires_at !== undefined) {
      await statements.updateResetToken.run({
        id: userId,
        resetToken: fields.reset_token !== undefined ? String(fields.reset_token) : '',
        resetTokenExpiresAt: fields.reset_token_expires_at !== undefined ? String(fields.reset_token_expires_at) : '',
        updatedAt: now
      });
    }

    if (fields.password_hash !== undefined) {
      await statements.updatePasswordAndClearResetToken.run({
        id: userId,
        passwordHash: String(fields.password_hash),
        updatedAt: now
      });
    }

    return await getUserById(userId);
  }

  async function getUserByResetToken(token) {
    const record = await statements.findAuthByResetToken.get(String(token || '').trim());
    if (!record) return null;

    return {
      id: record.id,
      email: record.email,
      display_name: record.display_name,
      reset_token: record.reset_token || '',
      reset_token_expires_at: record.reset_token_expires_at || '',
      status: record.status
    };
  }

  async function spendCredits(userId, amount, reason, relatedTaskId = '') {
    const spendAmount = parseInteger(amount, '扣減積分不正確', 'USER_CREDIT_SPEND_AMOUNT_INVALID');
    if (spendAmount <= 0) {
      throwValidationError('扣減積分必須大於 0', 'USER_CREDIT_SPEND_AMOUNT_INVALID', 422);
    }

    const user = await getUserById(userId);
    if (!user) {
      throwValidationError('用戶不存在', 'USER_NOT_FOUND', 404);
    }

    if (user.accountType !== 'frontend') {
      throwValidationError('後台帳號不使用前台積分', 'USER_CREDIT_BACKEND_ACCOUNT_INVALID', 422);
    }

    const now = new Date();
    const spendableCredits = await getSpendableCredits(userId, now);
    if (spendableCredits < spendAmount) {
      throwValidationError('積分不足，請先充值或領取登入獎勵', 'USER_CREDIT_NOT_ENOUGH', 409);
    }

    await consumeLedgerCredits(userId, spendAmount, now);
    return await adjustCredits(userId, -spendAmount, reason, relatedTaskId);
  }

  async function listCreditLedgerByUser(userId) {
    const rows = await statements.listLedgerByUser.all([userId]);
    return (rows || []).map(mapCreditLedgerRecord);
  }

  return {
    DAILY_LOGIN_BONUS_CREDITS,
    adjustCredits,
    findById: getUserById,
    grantCreditsOnce,
    grantDailyLoginBonus,
    grantRegisterBonus,
    getUserByEmail,
    getUserAuthByEmail,
    getUserByResetToken,
    getUserById,
    listCreditLedgerByUser,
    listUsers,
    markDailyLoginBonusClaimed,
    saveUser,
    spendCredits,
    updateUser,
    updatePassword: async (id, passwordHash) => {
      await statements.updatePasswordAndClearResetToken.run({
        id,
        passwordHash,
        updatedAt: new Date().toISOString()
      });
    }
  };

  async function grantCreditsIfReasonMissing(userId, amount, reason, options = {}) {
    const ledger = await listCreditLedgerByUser(userId);
    const existingRecord = ledger.find((record) => record.reason === reason);
    if (existingRecord) return await getUserById(userId);
    return await adjustCredits(userId, amount, reason, '', options);
  }

  async function getSpendableCredits(userId, now) {
    const records = await getActivePositiveLedger(userId, now);
    return records.reduce((sum, record) => sum + record.remainingAmount, 0);
  }

  async function consumeLedgerCredits(userId, amount, now) {
    let remainingAmount = amount;
    const records = await getActivePositiveLedger(userId, now);

    for (const record of records) {
      if (remainingAmount <= 0) break;

      const consumedAmount = Math.min(record.remainingAmount, remainingAmount);
      const nextRemainingAmount = record.remainingAmount - consumedAmount;
      await statements.updateLedgerRemainingAmount.run({
        id: record.id,
        remainingAmount: nextRemainingAmount
      });
      remainingAmount -= consumedAmount;
    }
  }

  async function getActivePositiveLedger(userId, now) {
    const rows = await statements.listSpendableLedgerByUser.all([userId]);
    return (rows || [])
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
    passwordHash: String(user.passwordHash || user.password_hash || '').trim(),
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

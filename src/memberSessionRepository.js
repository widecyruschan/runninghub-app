const crypto = require('crypto');

function createMemberSessionRepository(database) {
  const statements = {
    insert: database.prepare(`
      INSERT INTO app_user_sessions (
        id,
        user_id,
        provider,
        provider_subject,
        expires_at,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @userId,
        @provider,
        @providerSubject,
        @expiresAt,
        @createdAt,
        @updatedAt
      )
    `),
    findById: database.prepare(`
      SELECT
        app_user_sessions.*,
        app_users.email AS user_email,
        app_users.display_name AS user_display_name,
        app_users.role AS user_role,
        app_users.membership_group AS user_membership_group,
        app_users.credit_balance AS user_credit_balance,
        app_users.status AS user_status
      FROM app_user_sessions
      INNER JOIN app_users
        ON app_users.id = app_user_sessions.user_id
      WHERE app_user_sessions.id = ?
    `),
    deleteById: database.prepare(`
      DELETE FROM app_user_sessions
      WHERE id = ?
    `),
    deleteExpired: database.prepare(`
      DELETE FROM app_user_sessions
      WHERE expires_at <= ?
    `),
    deleteByUserId: database.prepare(`
      DELETE FROM app_user_sessions
      WHERE user_id = ?
    `)
  };

  async function createSession(payload) {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + Number(payload.maxAgeSeconds || 2592000) * 1000).toISOString();
    const id = crypto.randomBytes(32).toString('hex');

    await statements.insert.run({
      id,
      userId: payload.userId,
      provider: payload.provider || 'google',
      providerSubject: payload.providerSubject || '',
      expiresAt,
      createdAt: now,
      updatedAt: now
    });

    return getSessionById(id);
  }

  async function getSessionById(id) {
    const record = await statements.findById.get([id]);
    if (!record) return null;

    if (new Date(record.expires_at).getTime() <= Date.now()) {
      await deleteSession(id);
      return null;
    }

    return mapSessionRecord(record);
  }

  async function deleteSession(id) {
    await statements.deleteById.run([id]);
  }

  async function deleteExpiredSessions() {
    await statements.deleteExpired.run([new Date().toISOString()]);
  }

  async function deleteSessionsByUserId(userId) {
    await statements.deleteByUserId.run([userId]);
  }

  return {
    createSession,
    deleteExpiredSessions,
    deleteSession,
    deleteSessionsByUserId,
    getSessionById
  };
}

function mapSessionRecord(record) {
  return {
    id: record.id,
    userId: record.user_id,
    provider: record.provider,
    providerSubject: record.provider_subject,
    expiresAt: record.expires_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    user: {
      id: record.user_id,
      email: record.user_email,
      displayName: record.user_display_name,
      role: record.user_role,
      membershipGroup: record.user_membership_group,
      creditBalance: record.user_credit_balance,
      status: record.user_status
    }
  };
}

module.exports = {
  createMemberSessionRepository
};

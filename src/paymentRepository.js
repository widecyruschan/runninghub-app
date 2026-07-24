const crypto = require('crypto');

function createPaymentRepository(database) {
  const statements = {
    insert: database.prepare(`
      INSERT INTO payment_orders (
        id,
        user_id,
        provider,
        provider_order_id,
        plan_key,
        billing_cycle,
        amount_value,
        currency_code,
        credit_amount,
        status,
        payment_status,
        credits_granted,
        membership_group,
        raw_response_json,
        captured_at,
        credited_at,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @userId,
        @provider,
        @providerOrderId,
        @planKey,
        @billingCycle,
        @amountValue,
        @currencyCode,
        @creditAmount,
        @status,
        @paymentStatus,
        @creditsGranted,
        @membershipGroup,
        @rawResponseJson,
        @capturedAt,
        @creditedAt,
        @createdAt,
        @updatedAt
      )
    `),
    findById: database.prepare(`
      SELECT *
      FROM payment_orders
      WHERE id = ?
    `),
    findByProviderOrderId: database.prepare(`
      SELECT *
      FROM payment_orders
      WHERE provider_order_id = ?
    `),
    listByUser: database.prepare(`
      SELECT *
      FROM payment_orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `),
    updateProviderOrder: database.prepare(`
      UPDATE payment_orders
      SET
        provider_order_id = @providerOrderId,
        status = @status,
        raw_response_json = @rawResponseJson,
        updated_at = @updatedAt
      WHERE id = @id
    `),
    updateStatus: database.prepare(`
      UPDATE payment_orders
      SET
        status = @status,
        payment_status = @paymentStatus,
        raw_response_json = @rawResponseJson,
        captured_at = @capturedAt,
        updated_at = @updatedAt
      WHERE id = @id
    `),
    markCredited: database.prepare(`
      UPDATE payment_orders
      SET
        credits_granted = @creditsGranted,
        membership_group = @membershipGroup,
        credited_at = @creditedAt,
        updated_at = @updatedAt
      WHERE id = @id
    `)
  };

  function createOrder(payload) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    statements.insert.run({
      id,
      userId: payload.userId,
      provider: payload.provider || 'paypal',
      providerOrderId: payload.providerOrderId || '',
      planKey: payload.planKey,
      billingCycle: payload.billingCycle || '',
      amountValue: String(payload.amountValue),
      currencyCode: String(payload.currencyCode || 'USD').toUpperCase(),
      creditAmount: Number(payload.creditAmount || 0),
      status: payload.status || 'CREATED',
      paymentStatus: payload.paymentStatus || '',
      creditsGranted: 0,
      membershipGroup: payload.membershipGroup || '',
      rawResponseJson: JSON.stringify(payload.rawResponse || {}),
      capturedAt: null,
      creditedAt: null,
      createdAt: now,
      updatedAt: now
    });

    return getOrderById(id);
  }

  function getOrderById(id) {
    const record = statements.findById.get(id);
    return record ? mapPaymentOrderRecord(record) : null;
  }

  function getOrderByProviderOrderId(providerOrderId) {
    const record = statements.findByProviderOrderId.get(providerOrderId);
    return record ? mapPaymentOrderRecord(record) : null;
  }

  function listOrdersByUser(userId) {
    return statements.listByUser.all(userId).map(mapPaymentOrderRecord);
  }

  function saveProviderOrder(id, providerOrderId, rawResponse) {
    statements.updateProviderOrder.run({
      id,
      providerOrderId,
      status: 'CREATED',
      rawResponseJson: JSON.stringify(rawResponse || {}),
      updatedAt: new Date().toISOString()
    });
    return getOrderById(id);
  }

  function saveCapturedOrder(id, paymentStatus, rawResponse) {
    const now = new Date().toISOString();
    statements.updateStatus.run({
      id,
      status: paymentStatus === 'COMPLETED' ? 'CAPTURED' : 'FAILED',
      paymentStatus,
      rawResponseJson: JSON.stringify(rawResponse || {}),
      capturedAt: now,
      updatedAt: now
    });
    return getOrderById(id);
  }

  function markOrderCredited(id, creditsGranted, membershipGroup) {
    const now = new Date().toISOString();
    statements.markCredited.run({
      id,
      creditsGranted,
      membershipGroup: membershipGroup || '',
      creditedAt: now,
      updatedAt: now
    });
    return getOrderById(id);
  }

  return {
    createOrder,
    getOrderById,
    getOrderByProviderOrderId,
    listOrdersByUser,
    markOrderCredited,
    saveCapturedOrder,
    saveProviderOrder
  };
}

function mapPaymentOrderRecord(record) {
  return {
    id: record.id,
    userId: record.user_id,
    provider: record.provider,
    providerOrderId: record.provider_order_id,
    planKey: record.plan_key,
    billingCycle: record.billing_cycle,
    amountValue: record.amount_value,
    currencyCode: record.currency_code,
    creditAmount: Number(record.credit_amount || 0),
    status: record.status,
    paymentStatus: record.payment_status,
    creditsGranted: Number(record.credits_granted || 0),
    membershipGroup: record.membership_group || '',
    rawResponse: parseJson(record.raw_response_json, {}),
    capturedAt: record.captured_at || '',
    creditedAt: record.credited_at || '',
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

module.exports = {
  createPaymentRepository
};

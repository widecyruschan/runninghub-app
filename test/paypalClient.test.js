const test = require('node:test');
const assert = require('node:assert/strict');
const { createPaypalClient } = require('../src/paypalClient');

test('creates a PayPal order with server-side credentials', async (context) => {
  const originalFetch = global.fetch;
  const requests = [];
  context.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async (url, options) => {
    requests.push({ url, options });

    if (url.endsWith('/v1/oauth2/token')) {
      return new Response(JSON.stringify({
        access_token: 'test-access-token',
        expires_in: 3600
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      id: 'PAYPAL-ORDER-1',
      status: 'PAYER_ACTION_REQUIRED',
      links: [
        {
          rel: 'payer-action',
          href: 'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORDER-1'
        }
      ]
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const client = createPaypalClient({
    clientId: 'client-id',
    clientSecret: 'client-secret',
    apiBaseUrl: 'https://api-m.sandbox.paypal.com'
  });
  const order = await client.createOrder({
    amount: '29.99',
    currency: 'USD',
    description: 'Pro - 1500 credits',
    customId: 'local-order-id',
    returnUrl: 'https://api.imgkit.io/member/settings?paypal=return',
    cancelUrl: 'https://api.imgkit.io/member/settings?paypal=cancel'
  });

  assert.equal(order.id, 'PAYPAL-ORDER-1');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].options.headers.Authorization, `Basic ${Buffer.from('client-id:client-secret').toString('base64')}`);
  assert.equal(requests[1].options.headers.Authorization, 'Bearer test-access-token');

  const payload = JSON.parse(requests[1].options.body);
  assert.equal(payload.purchase_units[0].amount.value, '29.99');
  assert.equal(payload.purchase_units[0].custom_id, 'local-order-id');
  assert.equal(payload.payment_source.paypal.experience_context.return_url, 'https://api.imgkit.io/member/settings?paypal=return');
});

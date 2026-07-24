function createPaypalClient(options = {}) {
  const mode = String(options.mode || process.env.PAYPAL_MODE || 'sandbox').trim().toLowerCase();
  const clientId = String(options.clientId || process.env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = String(options.clientSecret || process.env.PAYPAL_CLIENT_SECRET || '').trim();
  const webhookId = String(options.webhookId || process.env.PAYPAL_WEBHOOK_ID || '').trim();
  const apiBaseUrl = normalizeBaseUrl(
    options.apiBaseUrl
      || process.env.PAYPAL_API_BASE_URL
      || (mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com')
  );
  let cachedToken = null;

  async function getAccessToken() {
    ensurePaypalConfigured(clientId, clientSecret);

    if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
      return cachedToken.accessToken;
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetchPaypal(`${apiBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' })
    });
    const payload = await parseResponseJson(response);

    if (!response.ok || !payload.access_token) {
      throwPaypalError(payload?.error_description || payload?.error || 'PayPal token request failed', 'PAYPAL_TOKEN_FAILED', 502);
    }

    cachedToken = {
      accessToken: payload.access_token,
      expiresAt: Date.now() + Number(payload.expires_in || 0) * 1000
    };

    return cachedToken.accessToken;
  }

  async function requestJson(path, options = {}) {
    const accessToken = await getAccessToken();
    const response = await fetchPaypal(`${apiBaseUrl}${path}`, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: options.payload ? JSON.stringify(options.payload) : undefined
    });
    const payload = await parseResponseJson(response);

    if (!response.ok) {
      const issue = payload?.details?.[0]?.issue;
      const message = payload?.message || payload?.error_description || payload?.error || issue || 'PayPal request failed';
      throwPaypalError(message, issue || payload?.name || 'PAYPAL_REQUEST_FAILED', 502);
    }

    return payload;
  }

  return {
    isConfigured: Boolean(clientId && clientSecret),
    hasWebhookVerification: Boolean(webhookId),
    async createOrder({ amount, currency, description, customId, returnUrl, cancelUrl }) {
      return requestJson('/v2/checkout/orders', {
        method: 'POST',
        headers: {
          'PayPal-Request-Id': String(customId || '')
        },
        payload: {
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: String(customId || ''),
              custom_id: String(customId || ''),
              description: String(description || 'IMGKTI purchase').slice(0, 127),
              amount: {
                currency_code: String(currency || 'USD').toUpperCase(),
                value: String(amount)
              }
            }
          ],
          payment_source: {
            paypal: {
              experience_context: {
                brand_name: 'IMGKTI',
                locale: 'en-US',
                shipping_preference: 'NO_SHIPPING',
                user_action: 'PAY_NOW',
                return_url: returnUrl,
                cancel_url: cancelUrl
              }
            }
          }
        }
      });
    },
    async captureOrder(orderId) {
      return requestJson(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
        method: 'POST'
      });
    },
    async getOrder(orderId) {
      return requestJson(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
    },
    async verifyWebhookSignature(headers, webhookEvent) {
      if (!webhookId) {
        throwPaypalError('PayPal webhook verification is not configured', 'PAYPAL_WEBHOOK_ID_MISSING', 500);
      }

      return requestJson('/v1/notifications/verify-webhook-signature', {
        method: 'POST',
        payload: {
          auth_algo: headers['paypal-auth-algo'] || '',
          cert_url: headers['paypal-cert-url'] || '',
          transmission_id: headers['paypal-transmission-id'] || '',
          transmission_sig: headers['paypal-transmission-sig'] || '',
          transmission_time: headers['paypal-transmission-time'] || '',
          webhook_id: webhookId,
          webhook_event: webhookEvent
        }
      });
    }
  };
}

async function fetchPaypal(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    throwPaypalError('PayPal service is temporarily unavailable', 'PAYPAL_NETWORK_ERROR', 502);
  }
}

async function parseResponseJson(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}

function ensurePaypalConfigured(clientId, clientSecret) {
  if (!clientId || !clientSecret) {
    throwPaypalError('PayPal is not configured', 'PAYPAL_NOT_CONFIGURED', 500);
  }
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function throwPaypalError(message, code, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  throw error;
}

module.exports = {
  createPaypalClient
};

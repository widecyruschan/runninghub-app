const crypto = require('crypto');

function createCreemClient(options = {}) {
  const apiKey = String(options.apiKey || process.env.CREEM_API_KEY || '').trim();
  const webhookSecret = String(options.webhookSecret || process.env.CREEM_WEBHOOK_SECRET || '').trim();
  const apiBaseUrl = normalizeBaseUrl(
    options.apiBaseUrl
      || process.env.CREEM_API_BASE_URL
      || 'https://api.creem.io/v1'
  );

  async function requestJson(method, path, payload) {
    ensureCreemConfigured(apiKey);

    const response = await fetchCreem(`${apiBaseUrl}${path}`, {
      method,
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: payload ? JSON.stringify(payload) : undefined
    });
    const data = await parseResponseJson(response);

    if (!response.ok) {
      throwCreemError(data?.error || data?.message || 'Creem request failed', 'CREEM_REQUEST_FAILED', 502);
    }

    return data;
  }

  return {
    isConfigured: Boolean(apiKey),
    hasWebhookVerification: Boolean(webhookSecret),

    async createCheckoutSession({ amount, currency, description, customId, returnUrl, cancelUrl }) {
      const amountInCents = Math.round(Number(amount) * 100);

      return requestJson('POST', '/checkout', {
        currency: String(currency || 'USD').toUpperCase(),
        amount: amountInCents,
        description: String(description || 'IMGKTI purchase').slice(0, 255),
        metadata: {
          order_id: String(customId || '')
        },
        redirect_url: returnUrl,
        cancel_url: cancelUrl
      });
    },

    async getCheckoutSession(sessionId) {
      return requestJson('GET', `/checkout/${encodeURIComponent(sessionId)}`);
    },

    verifyWebhookSignature(signature, rawBody) {
      if (!webhookSecret) {
        throwCreemError('Creem webhook verification is not configured', 'CREEM_WEBHOOK_SECRET_MISSING', 500);
      }

      if (!signature) {
        throwCreemError('Creem webhook signature is missing', 'CREEM_WEBHOOK_SIGNATURE_MISSING', 401);
      }

      const expected = computeHmacSha256(webhookSecret, rawBody);
      if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
        throwCreemError('Creem webhook signature is invalid', 'CREEM_WEBHOOK_SIGNATURE_INVALID', 401);
      }

      return true;
    }
  };
}

async function fetchCreem(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    throwCreemError('Creem service is temporarily unavailable', 'CREEM_NETWORK_ERROR', 502);
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

function ensureCreemConfigured(apiKey) {
  if (!apiKey) {
    throwCreemError('Creem is not configured', 'CREEM_NOT_CONFIGURED', 500);
  }
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function computeHmacSha256(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function throwCreemError(message, code, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  throw error;
}

module.exports = {
  createCreemClient
};

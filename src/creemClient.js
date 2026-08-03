const crypto = require('crypto');

function createCreemClient(options = {}) {
  const apiKey = String(options.apiKey || process.env.CREEM_API_KEY || '').trim();
  const webhookSecret = String(options.webhookSecret || process.env.CREEM_WEBHOOK_SECRET || '').trim();
  const resolvedBaseUrl = resolveApiBaseUrl(apiKey, options.apiBaseUrl);

  async function requestJson(method, path, payload) {
    ensureCreemConfigured(apiKey);

    const response = await fetchCreem(`${resolvedBaseUrl}${path}`, {
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

    async createCheckoutSession({ productId, amount, currency, customId, returnUrl, cancelUrl }) {
      const payload = {
        product_id: String(productId),
        success_url: String(returnUrl || ''),
        metadata: {
          order_id: String(customId || '')
        }
      };

      if (amount) {
        payload.custom_price = Math.round(Number(amount) * 100);
      }

      return requestJson('POST', '/checkouts', payload);
    },

    async getCheckoutSession(sessionId) {
      return requestJson('GET', `/checkouts?checkout_id=${encodeURIComponent(sessionId)}`);
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

function resolveApiBaseUrl(apiKey, explicitBase) {
  if (explicitBase) {
    return normalizeBaseUrl(explicitBase);
  }

  const envBase = process.env.CREEM_API_BASE_URL;
  if (envBase) {
    return normalizeBaseUrl(envBase);
  }

  if (apiKey.startsWith('creem_test_')) {
    return 'https://test-api.creem.io/v1';
  }

  return 'https://api.creem.io/v1';
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

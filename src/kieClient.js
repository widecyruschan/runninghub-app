const crypto = require('crypto');
const dns = require('dns');
const https = require('https');

function createKieClient(options = {}) {
  const apiKey = String(options.apiKey || process.env.KIE_API_KEY || '').trim();
  const apiBaseUrl = normalizeBaseUrl(options.apiBaseUrl || process.env.KIE_API_BASE_URL || 'https://api.kie.ai');
  const fileApiBaseUrl = normalizeBaseUrl(options.fileApiBaseUrl || process.env.KIE_FILE_API_BASE_URL || 'https://kieai.redpandaai.co');

  return {
    isConfigured: Boolean(apiKey),
    getDiagnosticsConfig() {
      return {
        configured: Boolean(apiKey),
        apiBaseUrl,
        fileApiBaseUrl,
        apiKeyFingerprint: createApiKeyFingerprint(apiKey)
      };
    },
    async getCreditBalance() {
      return requestJson({
        apiKey,
        url: `${apiBaseUrl}/api/v1/chat/credit`,
        method: 'GET'
      });
    },
    async getDownloadUrl(url) {
      return requestJson({
        apiKey,
        url: `${apiBaseUrl}/api/v1/common/download-url`,
        method: 'POST',
        payload: { url }
      });
    },
    async uploadBase64File({ base64Data, uploadPath = 'runninghub-app/uploads', fileName = '' }) {
      return requestJson({
        apiKey,
        url: `${fileApiBaseUrl}/api/file-base64-upload`,
        method: 'POST',
        payload: {
          base64Data,
          uploadPath,
          fileName
        }
      });
    },
    async createTask({ model, input, callBackUrl = '' }) {
      return requestJson({
        apiKey,
        url: `${apiBaseUrl}/api/v1/jobs/createTask`,
        method: 'POST',
        payload: {
          model,
          input,
          ...(callBackUrl ? { callBackUrl } : {})
        }
      });
    },
    async createVeoTask(payload) {
      return requestJson({
        apiKey,
        url: `${apiBaseUrl}/api/v1/veo/generate`,
        method: 'POST',
        payload
      });
    },
    async getTaskRecord(taskId) {
      const query = new URLSearchParams({ taskId: String(taskId || '') });
      return requestJson({
        apiKey,
        url: `${apiBaseUrl}/api/v1/jobs/recordInfo?${query.toString()}`,
        method: 'GET'
      });
    },
    async getVeoRecord(taskId) {
      const query = new URLSearchParams({ taskId: String(taskId || '') });
      return requestJson({
        apiKey,
        url: `${apiBaseUrl}/api/v1/veo/record-info?${query.toString()}`,
        method: 'GET'
      });
    },
    async createSunoTask(payload) {
      return requestJson({
        apiKey,
        url: `${apiBaseUrl}/api/v1/suno/generate`,
        method: 'POST',
        payload
      });
    },
    async getSunoRecord(taskId) {
      const query = new URLSearchParams({ taskId: String(taskId || '') });
      return requestJson({
        apiKey,
        url: `${apiBaseUrl}/api/v1/suno/record-info?${query.toString()}`,
        method: 'GET'
      });
    },
    async createSeedanceTask(payload) {
      return requestJson({
        apiKey,
        url: `${apiBaseUrl}/api/v1/seedance/generate`,
        method: 'POST',
        payload
      });
    },
    async getSeedanceRecord(taskId) {
      const query = new URLSearchParams({ taskId: String(taskId || '') });
      return requestJson({
        apiKey,
        url: `${apiBaseUrl}/api/v1/seedance/record-info?${query.toString()}`,
        method: 'GET'
      });
    }
  };
}

async function requestJson({ apiKey, url, method, payload }) {
  ensureKieConfigured(apiKey);

  const requestPayload = payload ? JSON.stringify(payload) : '';
  let responseData;
  try {
    responseData = await requestJsonOverHttps(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(requestPayload ? { 'Content-Type': 'application/json' } : {})
      },
      body: requestPayload
    });
  } catch (error) {
    if (error.code && error.statusCode) throw error;
    throwKieError('KIE 服務暫時無法連線', 'KIE_NETWORK_ERROR', 502);
  }

  if (!responseData.ok || isKieBusinessError(responseData.body)) {
    throwKieError(
      responseData.body?.message || responseData.body?.msg || 'KIE 服務調用失敗',
      responseData.body?.error?.code || responseData.body?.code || 'KIE_REQUEST_FAILED',
      502
    );
  }

  return responseData.body;
}

function requestJsonOverHttps(targetUrl, options) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetUrl);
    const body = options.body || '';
    const request = https.request({
      protocol: parsedUrl.protocol,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      method: options.method,
      family: 4,
      lookup: (hostname, lookupOptions, callback) => {
        dns.lookup(hostname, { ...lookupOptions, family: 4 }, callback);
      },
      headers: {
        ...options.headers,
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
      },
      timeout: 30000
    }, (response) => {
      const chunks = [];

      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const responseText = Buffer.concat(chunks).toString('utf8');
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          statusCode: response.statusCode,
          body: parseJsonText(responseText)
        });
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('KIE request timeout'));
    });
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

function ensureKieConfigured(apiKey) {
  if (!apiKey) {
    throwKieError('後端未配置 KIE_API_KEY', 'KIE_API_KEY_MISSING', 500);
  }
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function createApiKeyFingerprint(apiKey) {
  if (!apiKey) return '';
  return crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 12);
}

function isKieBusinessError(responseData) {
  if (!responseData || typeof responseData !== 'object') return false;
  return responseData.success === false || (Number(responseData.code) >= 400 && Number(responseData.code) !== 200);
}

function parseJsonText(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return { raw: value };
  }
}

function throwKieError(message, code, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  throw error;
}

module.exports = {
  createKieClient
};

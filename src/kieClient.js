function createKieClient(options = {}) {
  const apiKey = String(options.apiKey || process.env.KIE_API_KEY || '').trim();
  const apiBaseUrl = normalizeBaseUrl(options.apiBaseUrl || process.env.KIE_API_BASE_URL || 'https://api.kie.ai');
  const fileApiBaseUrl = normalizeBaseUrl(options.fileApiBaseUrl || process.env.KIE_FILE_API_BASE_URL || 'https://kieai.redpandaai.co');

  return {
    isConfigured: Boolean(apiKey),
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
    }
  };
}

async function requestJson({ apiKey, url, method, payload }) {
  ensureKieConfigured(apiKey);

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(payload ? { 'Content-Type': 'application/json' } : {})
      },
      body: payload ? JSON.stringify(payload) : undefined
    });
  } catch (error) {
    throwKieError('KIE 服務暫時無法連線', 'KIE_NETWORK_ERROR', 502);
  }

  const responseText = await response.text();
  const responseData = parseJsonText(responseText);

  if (!response.ok || isKieBusinessError(responseData)) {
    throwKieError(
      responseData?.message || responseData?.msg || 'KIE 服務調用失敗',
      responseData?.error?.code || responseData?.code || 'KIE_REQUEST_FAILED',
      502
    );
  }

  return responseData;
}

function ensureKieConfigured(apiKey) {
  if (!apiKey) {
    throwKieError('後端未配置 KIE_API_KEY', 'KIE_API_KEY_MISSING', 500);
  }
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
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

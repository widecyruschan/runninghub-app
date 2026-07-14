function createTranslationProvider() {
  const provider = String(process.env.TRANSLATION_PROVIDER || '').trim().toLowerCase();

  if (!provider || provider === 'none') {
    return createDisabledProvider();
  }

  if (provider === 'deepl') {
    return createDeepLProvider();
  }

  return createDisabledProvider();
}

function createDisabledProvider() {
  return {
    name: 'none',
    isConfigured: false,
    async translateText() {
      throwProviderError('翻譯服務尚未配置', 'TRANSLATION_PROVIDER_DISABLED');
    }
  };
}

function createDeepLProvider() {
  const apiKey = String(process.env.DEEPL_API_KEY || '').trim();
  const baseUrl = String(process.env.DEEPL_API_BASE_URL || 'https://api-free.deepl.com/v2').replace(/\/$/, '');

  return {
    name: 'deepl',
    isConfigured: Boolean(apiKey),
    async translateText({ text, sourceLang = 'ZH', targetLang = 'EN-US' }) {
      if (!apiKey) {
        throwProviderError('DeepL API Key 尚未配置', 'DEEPL_API_KEY_MISSING');
      }

      const inputText = String(text || '').trim();
      if (!inputText) return '';

      const response = await fetch(`${baseUrl}/translate`, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          text: inputText,
          source_lang: sourceLang,
          target_lang: targetLang
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throwProviderError(payload.message || 'DeepL 翻譯失敗', 'DEEPL_TRANSLATE_FAILED');
      }

      return payload.translations?.[0]?.text || '';
    }
  };
}

function throwProviderError(message, code) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 500;
  throw error;
}

module.exports = {
  createTranslationProvider
};

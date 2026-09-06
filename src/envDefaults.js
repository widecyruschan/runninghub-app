// 环境变量兜底配置 - 当 Hostinger 面板环境变量未注入时使用
// process.env 已设置的值不会被覆盖
(function applyDefaults() {
  const defaults = {
    PAYPAL_MODE: 'live',
    PAYPAL_API_BASE_URL: 'https://api-m.paypal.com',
    CREEM_API_BASE_URL: 'https://test-api.creem.io/v1',
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM: '',
    PASSWORD_RESET_TOKEN_TTL_MINUTES: '60',
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
})();

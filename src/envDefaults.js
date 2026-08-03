// 环境变量兜底配置 - 当 Hostinger 面板环境变量未注入时使用
// process.env 已设置的值不会被覆盖
(function applyDefaults() {
  const defaults = {
    PAYPAL_MODE: 'live',
    PAYPAL_CLIENT_ID: 'BAAWrJCI0ULGzPDfYne7fRLiX6r9T5-dCcfDnL2apHyg0GhawS-6nk23wTqhmlGVnywczj-opGvqpbrOoM',
    PAYPAL_CLIENT_SECRET: 'ENmGS7ucT62kGzIOdBgXfx-0c55cTeqoi9lhXzwSXDe3Vz_R5PPh-eoD4THDvyuyBThrs4YVEZ6sSu3I',
    PAYPAL_API_BASE_URL: 'https://api-m.paypal.com',
    PAYPAL_WEBHOOK_ID: '64K6657558033082R',
    CREEM_API_KEY: 'creem_test_6bJGOF97qFn3jTWIYxhGL3',
    CREEM_WEBHOOK_SECRET: 'whsec_43xCaU1JLn5PM2n5PDbu5k',
    CREEM_API_BASE_URL: 'https://test-api.creem.io/v1',
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
})();

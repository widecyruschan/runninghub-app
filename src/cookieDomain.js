function getCookieDomainAttributeForHost(hostValue, configuredDomain = '') {
  const hostname = normalizeHostname(hostValue);
  if (isLocalHostname(hostname)) return '';

  const normalizedConfiguredDomain = String(configuredDomain || '')
    .trim()
    .toLowerCase()
    .replace(/^\.+/, '');

  if (normalizedConfiguredDomain) {
    return isMatchingDomain(hostname, normalizedConfiguredDomain)
      ? `Domain=.${normalizedConfiguredDomain}`
      : '';
  }

  return isMatchingDomain(hostname, 'imgkit.io') ? 'Domain=.imgkit.io' : '';
}

function normalizeHostname(hostValue) {
  const host = String(hostValue || '').split(',')[0].trim().toLowerCase();
  if (host.startsWith('[')) {
    const closingBracketIndex = host.indexOf(']');
    return closingBracketIndex >= 0 ? host.slice(1, closingBracketIndex) : host;
  }
  return host.split(':')[0];
}

function isLocalHostname(hostname) {
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1';
}

function isMatchingDomain(hostname, domain) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

module.exports = {
  getCookieDomainAttributeForHost
};

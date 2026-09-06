const assert = require('node:assert/strict');
const test = require('node:test');
const { getCookieDomainAttributeForHost } = require('../src/cookieDomain');

test('local hosts use host-only cookies even when a production domain is configured', () => {
  assert.equal(getCookieDomainAttributeForHost('127.0.0.1:3107', '.imgkit.io'), '');
  assert.equal(getCookieDomainAttributeForHost('localhost:3000', '.imgkit.io'), '');
  assert.equal(getCookieDomainAttributeForHost('[::1]:3000', '.imgkit.io'), '');
});

test('configured cookie domain is used only by matching hosts', () => {
  assert.equal(getCookieDomainAttributeForHost('api.imgkit.io', '.imgkit.io'), 'Domain=.imgkit.io');
  assert.equal(getCookieDomainAttributeForHost('imgkit.io', '.imgkit.io'), 'Domain=.imgkit.io');
  assert.equal(getCookieDomainAttributeForHost('preview.example.com', '.imgkit.io'), '');
});

test('ImgKit production hosts retain the default shared cookie domain', () => {
  assert.equal(getCookieDomainAttributeForHost('www.imgkit.io', ''), 'Domain=.imgkit.io');
});

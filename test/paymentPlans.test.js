const test = require('node:test');
const assert = require('node:assert/strict');
const { getPaymentPlan } = require('../src/paymentPlans');

test('returns annual Pro payment details', () => {
  const plan = getPaymentPlan('pro_plus', 'annual');

  assert.equal(plan.amount, '287.88');
  assert.equal(plan.currency, 'USD');
  assert.equal(plan.credits, 1500);
  assert.equal(plan.membershipGroup, 'pro_plus');
});

test('normalizes Pay As You Go to a one-time payment', () => {
  const plan = getPaymentPlan('pay_as_you_go', 'annual');

  assert.equal(plan.billingCycle, 'once');
  assert.equal(plan.amount, '9.99');
  assert.equal(plan.credits, 500);
  assert.equal(plan.membershipGroup, '');
});

test('rejects unknown plans', () => {
  assert.equal(getPaymentPlan('unknown', 'monthly'), null);
});

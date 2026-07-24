const PAYMENT_PLANS = {
  pro_plus: {
    key: 'pro_plus',
    name: 'Pro',
    type: 'membership',
    membershipGroup: 'pro_plus',
    credits: 1500,
    currency: 'USD',
    prices: {
      monthly: '29.99',
      annual: '287.88'
    }
  },
  pay_as_you_go: {
    key: 'pay_as_you_go',
    name: 'Pay As You Go Credits',
    type: 'credit_pack',
    membershipGroup: '',
    credits: 500,
    currency: 'USD',
    prices: {
      once: '9.99'
    }
  }
};

function getPaymentPlan(planKey, billingCycle = 'monthly') {
  const plan = PAYMENT_PLANS[String(planKey || '').trim()];
  if (!plan) return null;

  const cycle = normalizeBillingCycle(plan, billingCycle);
  const amount = plan.prices[cycle];
  if (!amount) return null;

  return {
    ...plan,
    billingCycle: cycle,
    amount
  };
}

function normalizeBillingCycle(plan, billingCycle) {
  if (plan.type === 'credit_pack') return 'once';

  const cycle = String(billingCycle || 'monthly').trim();
  return cycle === 'annual' ? 'annual' : 'monthly';
}

module.exports = {
  getPaymentPlan,
  PAYMENT_PLANS
};

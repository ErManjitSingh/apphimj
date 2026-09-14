const { maskLeadPhoneUntilOpened, applyAdminPhoneVisibility } = require('../../src/utils/leadQueryFields');

function makeLead(overrides = {}) {
  return {
    _id: 'lead1',
    name: 'Jane Doe',
    phone: '9998887777',
    alternatePhone: '9998887778',
    whatsapp: '9998887777',
    firstOpenedAt: null,
    ...overrides,
  };
}

describe('maskLeadPhoneUntilOpened', () => {
  test('is a no-op — phones stay visible even when never opened', () => {
    const lead = makeLead();
    const result = maskLeadPhoneUntilOpened(lead);

    expect(result.phone).toBe('9998887777');
    expect(result.alternatePhone).toBe('9998887778');
    expect(result.whatsapp).toBe('9998887777');
    expect(result.contactMasked).toBeUndefined();
  });

  test('is a no-op for a falsy input', () => {
    expect(maskLeadPhoneUntilOpened(null)).toBeNull();
    expect(maskLeadPhoneUntilOpened(undefined)).toBeUndefined();
  });
});

describe('applyAdminPhoneVisibility', () => {
  test('never masks for admin (phones always visible)', () => {
    const result = applyAdminPhoneVisibility(makeLead(), 'admin');
    expect(result.phone).toBe('9998887777');
    expect(result.contactMasked).toBeUndefined();
  });

  test('never masks for any non-admin role', () => {
    for (const role of ['sales_manager', 'sales_executive', 'team_leader']) {
      const result = applyAdminPhoneVisibility(makeLead(), role);
      expect(result.phone).toBe('9998887777');
      expect(result.contactMasked).toBeUndefined();
    }
  });

  test('passes arrays through unchanged', () => {
    const leads = [makeLead({ _id: 'a' }), makeLead({ _id: 'b', firstOpenedAt: new Date() })];
    const result = applyAdminPhoneVisibility(leads, 'admin');
    expect(result[0].phone).toBe('9998887777');
    expect(result[1].phone).toBe('9998887777');
  });
});

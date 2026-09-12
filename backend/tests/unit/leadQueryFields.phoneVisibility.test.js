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
  test('masks phone/alternatePhone/whatsapp when the lead has never been opened', () => {
    const lead = makeLead();
    const masked = maskLeadPhoneUntilOpened(lead);

    expect(masked.phone).toBe('XXXX');
    expect(masked.alternatePhone).toBe('XXXX');
    expect(masked.whatsapp).toBe('XXXX');
    expect(masked.contactMasked).toBe(true);
  });

  test('leaves the phone visible once firstOpenedAt is set', () => {
    const lead = makeLead({ firstOpenedAt: new Date() });
    const result = maskLeadPhoneUntilOpened(lead);

    expect(result.phone).toBe('9998887777');
    expect(result.alternatePhone).toBe('9998887778');
    expect(result.contactMasked).toBeUndefined();
  });

  test('does not mutate the original lead object', () => {
    const lead = makeLead();
    maskLeadPhoneUntilOpened(lead);
    expect(lead.phone).toBe('9998887777');
  });

  test('is a no-op for a falsy input', () => {
    expect(maskLeadPhoneUntilOpened(null)).toBeNull();
    expect(maskLeadPhoneUntilOpened(undefined)).toBeUndefined();
  });

  test('never fabricates a phone number that was not present', () => {
    const lead = makeLead({ alternatePhone: '', whatsapp: undefined });
    const masked = maskLeadPhoneUntilOpened(lead);
    expect(masked.alternatePhone).toBe('');
    expect(masked.whatsapp).toBeUndefined();
  });
});

describe('applyAdminPhoneVisibility', () => {
  test('masks an unopened lead for role admin', () => {
    const result = applyAdminPhoneVisibility(makeLead(), 'admin');
    expect(result.phone).toBe('XXXX');
    expect(result.contactMasked).toBe(true);
  });

  test('leaves the phone visible for admin once opened', () => {
    const result = applyAdminPhoneVisibility(makeLead({ firstOpenedAt: new Date() }), 'admin');
    expect(result.phone).toBe('9998887777');
  });

  test('never masks for any non-admin role (sales_manager, sales_executive, team_leader)', () => {
    for (const role of ['sales_manager', 'sales_executive', 'team_leader']) {
      const result = applyAdminPhoneVisibility(makeLead(), role);
      expect(result.phone).toBe('9998887777');
      expect(result.contactMasked).toBeUndefined();
    }
  });

  test('applies across an array of leads, masking only the unopened ones', () => {
    const leads = [makeLead({ _id: 'a' }), makeLead({ _id: 'b', firstOpenedAt: new Date() })];
    const result = applyAdminPhoneVisibility(leads, 'admin');
    expect(result[0].phone).toBe('XXXX');
    expect(result[1].phone).toBe('9998887777');
  });
});

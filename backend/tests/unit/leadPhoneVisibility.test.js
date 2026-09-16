const mongoose = require('mongoose');
const db = require('../setup/db');
const {
  attachPhoneVisibility,
  maskLeadPhone,
  applyPhoneVisibilityGate,
} = require('../../src/utils/leadPhoneVisibility');

let CallNote;

beforeAll(async () => {
  await db.connect();
  CallNote = require('../../src/models/CallNote');
});

afterEach(async () => {
  await db.clearCollections();
});

afterAll(async () => {
  await db.disconnect();
});

function id() {
  return new mongoose.Types.ObjectId();
}

describe('maskLeadPhone', () => {
  test('masks phone/alternatePhone/whatsapp when not visible', () => {
    const lead = { phone: '9998887777', alternatePhone: '9998887778', whatsapp: '9998887777', phoneVisible: false };
    const masked = maskLeadPhone(lead);
    expect(masked.phone).toBe('XXXX');
    expect(masked.alternatePhone).toBe('XXXX');
    expect(masked.whatsapp).toBe('XXXX');
    expect(masked.phoneMasked).toBe(true);
  });

  test('leaves fields untouched when visible', () => {
    const lead = { phone: '9998887777', phoneVisible: true };
    const result = maskLeadPhone(lead);
    expect(result.phone).toBe('9998887777');
    expect(result.phoneMasked).toBeUndefined();
  });

  test('does not mutate the original object and never fabricates an absent field', () => {
    const lead = { phone: '9998887777', alternatePhone: '', phoneVisible: false };
    const masked = maskLeadPhone(lead);
    expect(lead.phone).toBe('9998887777');
    expect(masked.alternatePhone).toBe('');
  });

  test('is a no-op for falsy input', () => {
    expect(maskLeadPhone(null)).toBeNull();
    expect(maskLeadPhone(undefined)).toBeUndefined();
  });

  test('never uses `contactMasked` — that flag means "no access", not "phone pending first call"', () => {
    const masked = maskLeadPhone({ phone: '123', phoneVisible: false });
    expect(masked.contactMasked).toBeUndefined();
  });
});

describe('attachPhoneVisibility — batched, keyed to (leadId, assignedTo)', () => {
  test('true only when a CallNote exists for this exact lead+assignee pair', async () => {
    const leadId = id();
    const execId = id();
    const otherExecId = id();

    await CallNote.create({ leadId, userId: execId, outcome: 'discussed_package' });

    const visible = { _id: leadId, assignedTo: execId };
    const wrongExec = { _id: leadId, assignedTo: otherExecId };
    await attachPhoneVisibility(visible);
    await attachPhoneVisibility(wrongExec);

    expect(visible.phoneVisible).toBe(true);
    expect(wrongExec.phoneVisible).toBe(false);
  });

  test('false with no assignedTo at all', async () => {
    const lead = { _id: id(), assignedTo: null };
    await attachPhoneVisibility(lead);
    expect(lead.phoneVisible).toBe(false);
  });

  test('handles a populated assignedTo object (not just a raw id)', async () => {
    const leadId = id();
    const execId = id();
    await CallNote.create({ leadId, userId: execId, outcome: 'ready_to_book' });

    const lead = { _id: leadId, assignedTo: { _id: execId, name: 'Exec' } };
    await attachPhoneVisibility(lead);
    expect(lead.phoneVisible).toBe(true);
  });

  test('one aggregation query covers an entire page of leads (no N+1)', async () => {
    const leads = Array.from({ length: 20 }, () => ({ _id: id(), assignedTo: id() }));
    // Give every other lead a qualifying call
    await Promise.all(
      leads
        .filter((_, i) => i % 2 === 0)
        .map((l) => CallNote.create({ leadId: l._id, userId: l.assignedTo, outcome: 'discussed_package' }))
    );

    const spy = jest.spyOn(CallNote, 'aggregate');
    await attachPhoneVisibility(leads);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();

    leads.forEach((lead, i) => {
      expect(lead.phoneVisible).toBe(i % 2 === 0);
    });
  });
});

describe('applyPhoneVisibilityGate', () => {
  test('masks an array of leads, only the ones without a qualifying call', async () => {
    const execId = id();
    const calledLeadId = id();
    const uncalledLeadId = id();
    await CallNote.create({ leadId: calledLeadId, userId: execId, outcome: 'discussed_package' });

    const leads = [
      { _id: calledLeadId, phone: '111', assignedTo: execId },
      { _id: uncalledLeadId, phone: '222', assignedTo: execId },
    ];
    const result = await applyPhoneVisibilityGate(leads);
    expect(result[0].phone).toBe('111');
    expect(result[1].phone).toBe('XXXX');
    expect(result[1].phoneMasked).toBe(true);
  });

  test('works for a single lead object (not just an array)', async () => {
    const lead = { _id: id(), phone: '333', assignedTo: id() };
    const result = await applyPhoneVisibilityGate(lead);
    expect(result.phone).toBe('XXXX');
  });
});

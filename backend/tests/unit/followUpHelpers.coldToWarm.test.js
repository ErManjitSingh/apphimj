/**
 * Cold → Warm is no longer a special transition — applyCategoryToLead must treat
 * a Cold lead picking a Warm outcome exactly like any other lead picking Warm.
 */
const { applyCategoryToLead } = require('../../src/utils/followUpHelpers');

function makeLead(overrides = {}) {
  return {
    status: 'follow_up',
    temperature: 'cold',
    statusReason: 'booked_elsewhere',
    coldReason: 'booked_elsewhere',
    assignedTo: 'user-1',
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('applyCategoryToLead — Cold to Warm removal', () => {
  test('Cold lead picking a Warm outcome becomes a normal Warm lead (no working_progress, no cold_to_warm stamp)', async () => {
    const lead = makeLead();

    await applyCategoryToLead(lead, 'warm', undefined, { warmOutcome: 'discussed_package' });

    expect(lead.temperature).toBe('warm');
    expect(lead.isHot).toBe(false);
    expect(lead.coldReason).toBeUndefined();
    expect(lead.status).toBe('contacted');
    expect(lead.statusReason).toBe('discussed_package');
    expect(lead.status).not.toBe('working_progress');
    expect(lead.statusReason).not.toBe('cold_to_warm');
  });

  test('Cold lead picking the CNP-same-day Warm outcome still routes to follow_up, same as any other lead', async () => {
    const coldLead = makeLead();
    const warmLead = makeLead({ status: 'contacted', temperature: 'warm', statusReason: 'requested_callback', coldReason: undefined });

    await applyCategoryToLead(coldLead, 'warm', undefined, { warmOutcome: 'cnp_same_day' });
    await applyCategoryToLead(warmLead, 'warm', undefined, { warmOutcome: 'cnp_same_day' });

    expect(coldLead.status).toBe('follow_up');
    expect(coldLead.statusReason).toBe('cnp_same_day');
    expect(coldLead.status).toBe(warmLead.status);
    expect(coldLead.statusReason).toBe(warmLead.statusReason);
    expect(coldLead.temperature).toBe(warmLead.temperature);
  });

  test('Warm lead picking a Cold outcome becomes Cold', async () => {
    const lead = makeLead({ status: 'contacted', temperature: 'warm', statusReason: 'discussed_package', coldReason: undefined });

    await applyCategoryToLead(lead, 'cold', undefined, { coldReason: 'not_interested' });

    expect(lead.temperature).toBe('cold');
    expect(lead.status).toBe('follow_up');
    expect(lead.statusReason).toBe('not_interested');
  });

  test('Hot lead picking a Warm outcome becomes Warm, same payload as a Cold lead picking the same outcome', async () => {
    const hotLead = makeLead({ status: 'negotiation', temperature: 'hot', statusReason: 'ready_to_book', coldReason: undefined, isHot: true });
    const coldLead = makeLead();

    await applyCategoryToLead(hotLead, 'warm', undefined, { warmOutcome: 'price_negotiation' });
    await applyCategoryToLead(coldLead, 'warm', undefined, { warmOutcome: 'price_negotiation' });

    expect(hotLead.temperature).toBe('warm');
    expect(hotLead.status).toBe(coldLead.status);
    expect(hotLead.statusReason).toBe(coldLead.statusReason);
  });
});

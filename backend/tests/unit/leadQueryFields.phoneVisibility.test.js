/**
 * Superseded by tests/integration/leadPhoneVisibility.test.js.
 *
 * Phone visibility is no longer gated on `firstOpenedAt` ("lead opened") — it's gated on the
 * assigned executive's first recorded call (CallNote), and applies identically to Admin and the
 * Sales Executive. See utils/leadPhoneVisibility.js. `leadQueryFields.applyAdminPhoneVisibility`
 * is now a thin async delegate to that module (kept for its existing admin-only call sites), so
 * it has no interesting behavior of its own left to unit test here.
 */
const { applyAdminPhoneVisibility } = require('../../src/utils/leadQueryFields');

describe('leadQueryFields.applyAdminPhoneVisibility', () => {
  test('is a no-op passthrough for any non-admin role (delegates only for admin)', async () => {
    const lead = { _id: 'lead1', phone: '9998887777', assignedTo: 'exec1' };
    for (const role of ['sales_executive', 'sales_manager', 'team_leader']) {
      // eslint-disable-next-line no-await-in-loop
      const result = await applyAdminPhoneVisibility(lead, role);
      expect(result).toBe(lead);
    }
  });
});

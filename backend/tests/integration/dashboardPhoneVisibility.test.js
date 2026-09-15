/**
 * Closing the remaining Phone Number Visibility gap: dashboard widgets and alternate lead
 * endpoints (search/export/customers) must apply the SAME call-gated rule as the Leads List /
 * Lead Detail APIs (utils/leadPhoneVisibility.js) — no separate gating system, no raw phone
 * before the currently-assigned executive's first qualifying call.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const db = require('../setup/db');

let app;
let User;
let Lead;
let UserSession;
let generateToken;

beforeAll(async () => {
  await db.connect();
  app = require('../../src/server');
  User = require('../../src/models/User');
  Lead = require('../../src/models/Lead');
  UserSession = require('../../src/models/UserSession');
  ({ generateToken } = require('../../src/middleware/auth'));
});

afterEach(async () => {
  await db.clearCollections();
});

afterAll(async () => {
  await db.disconnect();
});

let counter = 0;

async function makeAuthedUser(role) {
  counter += 1;
  const user = await User.create({
    name: `User ${counter}`,
    email: `dashphone${counter}@example.com`,
    password: 'password123',
    role,
  });
  const session = await UserSession.create({
    userId: user._id,
    sessionId: new mongoose.Types.ObjectId().toString(),
    role,
    status: 'active',
    loginAt: new Date(),
    lastActivityAt: new Date(),
  });
  const token = generateToken(user._id, role, session.sessionId);
  return { user, token };
}

async function makeLead(overrides = {}) {
  counter += 1;
  const creator = await User.create({
    name: `Creator ${counter}`,
    email: `dashphone-creator${counter}@example.com`,
    password: 'password123',
    role: 'admin',
  });
  return Lead.create({
    name: `Lead ${counter}`,
    phone: `9${String(6000000000 + counter).slice(0, 9)}`,
    destination: 'Goa',
    createdBy: creator._id,
    ...overrides,
  });
}

function postCallNote(token, leadId, body) {
  return request(app)
    .post(`/api/leads/${leadId}/call-notes`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

// Dashboards are cached (dashboardCacheService, 5-minute TTL) keyed by role+branch — every test
// here creates its own fresh admin/lead, so `?fresh=1` (the endpoint's own existing
// cache-bypass, see dashboardCacheService.wantsFreshData) is required to observe this test's own
// data instead of whatever an earlier test in this file already cached under the same key.
function getAdminDashboard(token) {
  return request(app).get('/api/dashboard/stats?fresh=1').set('Authorization', `Bearer ${token}`);
}

function getExecDashboard(token) {
  return request(app).get('/api/sales-executive/dashboard?fresh=1').set('Authorization', `Bearer ${token}`);
}

describe('Admin Dashboard — Recent/New Leads widgets never leak the real phone', () => {
  test('no qualifying call -> masked in recentLeads/newLeads, and the real number is absent from the raw JSON entirely', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { user: exec } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id, createdAt: new Date() });

    const res = await getAdminDashboard(adminToken);
    expect(res.status).toBe(200);

    const inRecent = res.body.recentLeads.find((l) => String(l._id) === String(lead._id));
    expect(inRecent).toBeTruthy();
    expect(inRecent.phone).toBe('XXXX');
    expect(inRecent.phoneMasked).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain(lead.phone);
  });

  test('qualifying call by the current assignee -> real phone visible in recentLeads', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { user: exec, token: execToken } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id, createdAt: new Date() });

    await postCallNote(execToken, lead._id, { category: 'warm', outcome: 'discussed_package' });

    const res = await getAdminDashboard(adminToken);
    const inRecent = res.body.recentLeads.find((l) => String(l._id) === String(lead._id));
    expect(inRecent.phone).toBe(lead.phone);
    expect(inRecent.phoneMasked).toBeUndefined();
  });

  test('reassigned lead -> new assignee\'s (lack of) calls control visibility, old assignee\'s call does not carry over', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { user: execA, token: execAToken } = await makeAuthedUser('sales_executive');
    const { user: execB } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: execA._id, createdAt: new Date() });

    await postCallNote(execAToken, lead._id, { category: 'warm', outcome: 'discussed_package' });
    const visible = await getAdminDashboard(adminToken);
    expect(visible.body.recentLeads.find((l) => String(l._id) === String(lead._id)).phone).toBe(lead.phone);

    await Lead.updateOne({ _id: lead._id }, { $set: { assignedTo: execB._id } });

    const afterReassign = await getAdminDashboard(adminToken);
    const row = afterReassign.body.recentLeads.find((l) => String(l._id) === String(lead._id));
    expect(row.phone).toBe('XXXX');
    expect(JSON.stringify(afterReassign.body)).not.toContain(lead.phone);
  });

  test('unassigned leads are always masked (no possible assignee call yet)', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const lead = await makeLead({ assignedTo: null, createdAt: new Date() });

    const res = await getAdminDashboard(adminToken);
    const row = res.body.unassignedLeads.find((l) => String(l._id) === String(lead._id));
    expect(row).toBeTruthy();
    expect(row.phone).toBe('XXXX');
  });
});

describe('Sales Executive Dashboard — Cold Call Reminders widget never leaks the real phone', () => {
  test('no qualifying call -> masked', async () => {
    const { user: exec, token: execToken } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({
      assignedTo: exec._id,
      coldCallPending: true,
      coldCallReminderAt: new Date(),
      temperature: 'cold',
    });

    const res = await getExecDashboard(execToken);
    expect(res.status).toBe(200);
    const row = res.body.coldCallReminders.find((l) => String(l._id) === String(lead._id));
    expect(row).toBeTruthy();
    expect(row.phone).toBe('XXXX');
    expect(row.phoneMasked).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain(lead.phone);
  });

  test('qualifying call by the assigned executive -> real phone visible', async () => {
    const { user: exec, token: execToken } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({
      assignedTo: exec._id,
      coldCallPending: true,
      coldCallReminderAt: new Date(),
      temperature: 'cold',
    });

    await postCallNote(execToken, lead._id, { category: 'cold', outcome: 'not_interested' });

    const res = await getExecDashboard(execToken);
    const row = res.body.coldCallReminders.find((l) => String(l._id) === String(lead._id));
    expect(row.phone).toBe(lead.phone);
  });
});

describe('Alternate lead endpoints — search / export / customers', () => {
  test('checkDuplicate never returns a masked lead\'s real phone to Admin', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { user: exec } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id, phone: '9812345678' });

    const res = await request(app)
      .get('/api/leads/check-duplicate')
      .query({ phone: '9812345678' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.isDuplicate).toBe(true);
    const match = res.body.matches.find((m) => String(m._id) === String(lead._id));
    expect(match.phone).toBe('XXXX');
    expect(JSON.stringify(res.body)).not.toContain('9812345678');
  });

  test('checkDuplicate reveals the real phone once the assignee has made a qualifying call', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { user: exec, token: execToken } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id, phone: '9812345679' });
    await postCallNote(execToken, lead._id, { category: 'warm', outcome: 'discussed_package' });

    const res = await request(app)
      .get('/api/leads/check-duplicate')
      .query({ phone: '9812345679' })
      .set('Authorization', `Bearer ${adminToken}`);

    const match = res.body.matches.find((m) => String(m._id) === String(lead._id));
    expect(match.phone).toBe('9812345679');
  });

  test('bulk CSV export never contains the real phone of a masked lead', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { user: exec } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const res = await request(app)
      .post('/api/leads/bulk-export')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ leadIds: [String(lead._id)] });

    expect(res.status).toBe(200);
    expect(res.text).not.toContain(lead.phone);
    expect(res.text).toContain('XXXX');
  });

  test('bulk CSV export shows the real phone once the assignee has called', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { user: exec, token: execToken } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });
    await postCallNote(execToken, lead._id, { category: 'hot', outcome: 'ready_to_book' });

    const res = await request(app)
      .post('/api/leads/bulk-export')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ leadIds: [String(lead._id)] });

    expect(res.text).toContain(lead.phone);
  });

  test('Sales Executive "Customers" quick view masks a not-yet-called converted/repeat lead', async () => {
    const { user: exec, token: execToken } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id, isRepeatCustomer: true });

    const res = await request(app).get('/api/sales-executive/customers').set('Authorization', `Bearer ${execToken}`);
    expect(res.status).toBe(200);
    const row = res.body.find((c) => String(c._id) === String(lead._id));
    expect(row).toBeTruthy();
    expect(row.phone).toBe('XXXX');
    expect(JSON.stringify(res.body)).not.toContain(lead.phone);
  });

  test('Sales Executive "Customers" quick view reveals the real phone once called', async () => {
    const { user: exec, token: execToken } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id, isRepeatCustomer: true });
    await postCallNote(execToken, lead._id, { category: 'warm', outcome: 'discussed_package' });

    const res = await request(app).get('/api/sales-executive/customers').set('Authorization', `Bearer ${execToken}`);
    const row = res.body.find((c) => String(c._id) === String(lead._id));
    expect(row.phone).toBe(lead.phone);
  });
});

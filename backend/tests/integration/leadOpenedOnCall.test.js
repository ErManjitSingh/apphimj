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

async function makeAuthedUser(role = 'sales_executive') {
  counter += 1;
  const user = await User.create({
    name: `User ${counter}`,
    email: `openedoncall${counter}@example.com`,
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
    email: `openedoncallcreator${counter}@example.com`,
    password: 'password123',
    role: 'admin',
  });
  return Lead.create({
    name: `Lead ${counter}`,
    phone: `9${String(2000000000 + counter).slice(0, 9)}`,
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

function postCallAccess(token, leadId) {
  return request(app)
    .post(`/api/sales-executive/leads/${leadId}/call-access`)
    .set('Authorization', `Bearer ${token}`)
    .send();
}

function getAsAdmin(token, url) {
  return request(app).get(url).set('Authorization', `Bearer ${token}`);
}

describe('Lead "Opened" state — direct call must count as opening the lead', () => {
  test('a lead is Not Opened until something touches it', async () => {
    const { user: exec } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });
    const fresh = await Lead.findById(lead._id).select('+firstOpenedAt +firstOpenedBy').lean();
    expect(fresh.firstOpenedAt).toBeNull();
  });

  test('opening Lead Detail first, then calling — still marks Opened exactly once (existing flow, unchanged)', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    await request(app)
      .get(`/api/sales-executive/leads/${lead._id}`)
      .set('Authorization', `Bearer ${token}`);

    const afterOpen = await Lead.findById(lead._id).select('+firstOpenedAt +firstOpenedBy').lean();
    expect(afterOpen.firstOpenedAt).toBeTruthy();
    expect(String(afterOpen.firstOpenedBy)).toBe(String(exec._id));

    const res = await postCallNote(token, lead._id, { category: 'warm', outcome: 'discussed_package' });
    expect(res.status).toBe(201);

    const afterCall = await Lead.findById(lead._id).select('+firstOpenedAt +firstOpenedBy').lean();
    expect(afterCall.firstOpenedAt.getTime()).toBe(afterOpen.firstOpenedAt.getTime());
  });

  test('BUG FIX: clicking Call directly from the Leads list (no detail view first) marks the lead Opened', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const before = await Lead.findById(lead._id).select('+firstOpenedAt +firstOpenedBy').lean();
    expect(before.firstOpenedAt).toBeNull();

    const res = await postCallNote(token, lead._id, { category: 'warm', outcome: 'discussed_package' });
    expect(res.status).toBe(201);

    const after = await Lead.findById(lead._id).select('+firstOpenedAt +firstOpenedBy').lean();
    expect(after.firstOpenedAt).toBeTruthy();
    expect(String(after.firstOpenedBy)).toBe(String(exec._id));
    // Existing call tracking must be unaffected by the fix
    expect(after.callStats.count).toBe(1);
  });

  test('never: direct call leaves the lead Not Opened', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    await postCallNote(token, lead._id, { category: 'hot', outcome: 'ready_to_book' });

    const after = await Lead.findById(lead._id).select('+firstOpenedAt').lean();
    expect(after.firstOpenedAt).not.toBeNull();
  });

  test('idempotent: two direct calls in a row do not create two different open stamps', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    await postCallNote(token, lead._id, { category: 'warm', outcome: 'discussed_package' });
    const firstOpen = await Lead.findById(lead._id).select('+firstOpenedAt +firstOpenedBy').lean();

    await postCallNote(token, lead._id, { category: 'warm', outcome: 'requested_callback' });
    const secondOpen = await Lead.findById(lead._id).select('+firstOpenedAt +firstOpenedBy').lean();

    expect(secondOpen.firstOpenedAt.getTime()).toBe(firstOpen.firstOpenedAt.getTime());
    expect(String(secondOpen.firstOpenedBy)).toBe(String(firstOpen.firstOpenedBy));
    // The call itself was still captured both times
    const withCalls = await Lead.findById(lead._id).lean();
    expect(withCalls.callStats.count).toBe(2);
  });

  test('pre-dial authorization endpoint (authorizeLeadCallAccess) marks Opened and is idempotent', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const res1 = await postCallAccess(token, lead._id);
    expect(res1.status).toBe(200);
    expect(res1.body.opened).toBe(true);
    expect(res1.body.phone).toBe(lead.phone);

    const afterFirst = await Lead.findById(lead._id).select('+firstOpenedAt +firstOpenedBy').lean();
    expect(afterFirst.firstOpenedAt).toBeTruthy();

    const res2 = await postCallAccess(token, lead._id);
    expect(res2.status).toBe(200);
    const afterSecond = await Lead.findById(lead._id).select('+firstOpenedAt +firstOpenedBy').lean();
    expect(afterSecond.firstOpenedAt.getTime()).toBe(afterFirst.firstOpenedAt.getTime());
  });

  test('authorizeLeadCallAccess only opens leads actually assigned to the calling executive', async () => {
    const { token } = await makeAuthedUser('sales_executive');
    const { user: otherExec } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: otherExec._id });

    const res = await postCallAccess(token, lead._id);
    expect(res.status).toBe(404);

    const after = await Lead.findById(lead._id).select('+firstOpenedAt').lean();
    expect(after.firstOpenedAt).toBeNull();
  });
});

describe('Admin phone-number visibility', () => {
  test('Admin always sees the real phone in the lead list (masking disabled)', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { user: exec } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id, phone: '9123456789' });

    const res = await getAsAdmin(adminToken, '/api/leads');
    expect(res.status).toBe(200);
    const row = res.body.data.find((l) => String(l._id) === String(lead._id));
    expect(row.phone).toBe('9123456789');
    expect(row.contactMasked).toBeUndefined();
  });

  test('Admin lead-detail always shows the real phone', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { user: exec } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id, phone: '9123456781' });

    const res = await getAsAdmin(adminToken, `/api/leads/${lead._id}`);
    expect(res.status).toBe(200);
    expect(res.body.phone).toBe('9123456781');
  });

  test('non-admin roles are never phone-masked by this feature', async () => {
    const { user: manager, token: managerToken } = await makeAuthedUser('sales_manager');
    const { user: exec } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id, branchId: manager.branchId });

    const res = await getAsAdmin(managerToken, `/api/leads/${lead._id}`);
    expect(res.status).toBe(200);
    expect(res.body.phone).not.toBe('XXXX');
  });
});

/**
 * Lead Phone Number Visibility / Call-Gating.
 *
 * Rule: the customer's real phone number is hidden — for the assigned Sales Executive AND for
 * Admin — until the assigned Sales Executive has logged a first call (CallNote) for that lead.
 * Visibility is derived live from CallNote history (utils/leadPhoneVisibility), not from a
 * denormalized flag, and is keyed to the CURRENT assignee so reassignment doesn't inherit a
 * previous executive's calls.
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

async function makeAuthedUser(role = 'sales_executive') {
  counter += 1;
  const user = await User.create({
    name: `User ${counter}`,
    email: `phonevis${counter}@example.com`,
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
    email: `phonevis-creator${counter}@example.com`,
    password: 'password123',
    role: 'admin',
  });
  return Lead.create({
    name: `Lead ${counter}`,
    phone: `9${String(1000000000 + counter).slice(0, 9)}`,
    destination: 'Goa',
    createdBy: creator._id,
    ...overrides,
  });
}

function getAdminLead(token, leadId) {
  return request(app).get(`/api/leads/${leadId}`).set('Authorization', `Bearer ${token}`);
}

function getAdminLeadsList(token, query = '') {
  return request(app).get(`/api/leads${query}`).set('Authorization', `Bearer ${token}`);
}

function getExecLead(token, leadId) {
  return request(app)
    .get(`/api/sales-executive/leads/${leadId}`)
    .set('Authorization', `Bearer ${token}`);
}

function getExecLeadsList(token) {
  return request(app).get('/api/sales-executive/leads').set('Authorization', `Bearer ${token}`);
}

function postCallNote(token, leadId, body) {
  return request(app)
    .post(`/api/leads/${leadId}/call-notes`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

describe('Lead phone visibility — gated on the assigned executive\'s first call', () => {
  test('CASE 1/2: new lead assigned to an executive is masked for both the executive and Admin', async () => {
    const { user: admin, token: adminToken } = await makeAuthedUser('admin');
    const { user: exec, token: execToken } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });
    void admin;

    const asExec = await getExecLead(execToken, lead._id);
    expect(asExec.status).toBe(200);
    expect(asExec.body.phone).toBe('XXXX');
    expect(asExec.body.phoneMasked).toBe(true);

    const asAdmin = await getAdminLead(adminToken, lead._id);
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.phone).toBe('XXXX');
    expect(asAdmin.body.phoneMasked).toBe(true);
  });

  test('the real phone number is never present anywhere in the masked API response', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { user: exec, token: execToken } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const asAdmin = await getAdminLead(adminToken, lead._id);
    const asExec = await getExecLead(execToken, lead._id);
    expect(JSON.stringify(asAdmin.body)).not.toContain(lead.phone);
    expect(JSON.stringify(asExec.body)).not.toContain(lead.phone);
  });

  test('CASE 3: no CallNote created -> phone stays masked (viewing the lead is not enough)', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { user: exec, token: execToken } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    // Executive opens Lead Detail (existing "Opened" flow) — must NOT unlock the phone.
    await getExecLead(execToken, lead._id);

    const asExec = await getExecLead(execToken, lead._id);
    const asAdmin = await getAdminLead(adminToken, lead._id);
    expect(asExec.body.phone).toBe('XXXX');
    expect(asAdmin.body.phone).toBe('XXXX');
  });

  test('CASE 4/5/6: a recorded first call unlocks the real number for both the executive and Admin, and it stays visible on refetch', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { user: exec, token: execToken } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const callRes = await postCallNote(execToken, lead._id, { category: 'warm', outcome: 'discussed_package' });
    expect(callRes.status).toBe(201);

    const asExec = await getExecLead(execToken, lead._id);
    expect(asExec.body.phone).toBe(lead.phone);
    expect(asExec.body.phoneMasked).toBeUndefined();

    const asAdmin = await getAdminLead(adminToken, lead._id);
    expect(asAdmin.body.phone).toBe(lead.phone);

    // Refetch ("refresh") — still visible, derived live from CallNote history each time.
    const asExecAgain = await getExecLead(execToken, lead._id);
    const asAdminAgain = await getAdminLead(adminToken, lead._id);
    expect(asExecAgain.body.phone).toBe(lead.phone);
    expect(asAdminAgain.body.phone).toBe(lead.phone);
  });

  test('CASE 9: multiple calls -> phone stays visible, call history is preserved', async () => {
    const { token: execToken, user: exec } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    await postCallNote(execToken, lead._id, { category: 'warm', outcome: 'discussed_package' });
    await postCallNote(execToken, lead._id, { category: 'hot', outcome: 'ready_to_book' });

    const CallNote = require('../../src/models/CallNote');
    const calls = await CallNote.find({ leadId: lead._id }).lean();
    expect(calls.length).toBe(2);

    const asExec = await getExecLead(execToken, lead._id);
    expect(asExec.body.phone).toBe(lead.phone);
  });

  test('CASE 7/8: reassigning to a different executive re-masks the phone — the previous assignee\'s call does not carry over, and history is preserved', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { user: execA, token: execAToken } = await makeAuthedUser('sales_executive');
    const { user: execB, token: execBToken } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: execA._id });

    await postCallNote(execAToken, lead._id, { category: 'warm', outcome: 'discussed_package' });
    const afterFirstCall = await getExecLead(execAToken, lead._id);
    expect(afterFirstCall.body.phone).toBe(lead.phone);

    // Reassign to a different executive (Admin action)
    await Lead.updateOne({ _id: lead._id }, { $set: { assignedTo: execB._id } });

    const asNewExec = await getExecLead(execBToken, lead._id);
    expect(asNewExec.status).toBe(200);
    expect(asNewExec.body.phone).toBe('XXXX');
    expect(asNewExec.body.phoneMasked).toBe(true);

    const asAdmin = await getAdminLead(adminToken, lead._id);
    expect(asAdmin.body.phone).toBe('XXXX');

    // Old assignee's call is still there, untouched
    const CallNote = require('../../src/models/CallNote');
    const calls = await CallNote.find({ leadId: lead._id }).lean();
    expect(calls.length).toBe(1);
    expect(String(calls[0].userId)).toBe(String(execA._id));

    // New executive places their own first call -> unlocks for everyone again
    await postCallNote(execBToken, lead._id, { category: 'hot', outcome: 'ready_to_book' });
    const asNewExecAfterCall = await getExecLead(execBToken, lead._id);
    expect(asNewExecAfterCall.body.phone).toBe(lead.phone);
  });

  test('CASE 10/11: existing leads are derived correctly from history — with a qualifying call visible, without one masked', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { user: execWithCall, token: tokenWithCall } = await makeAuthedUser('sales_executive');
    const { user: execNoCall } = await makeAuthedUser('sales_executive');

    const leadWithHistory = await makeLead({ assignedTo: execWithCall._id });
    const leadWithoutHistory = await makeLead({ assignedTo: execNoCall._id });

    // Simulate a call that was already logged before this feature existed.
    await postCallNote(tokenWithCall, leadWithHistory._id, { category: 'warm', outcome: 'discussed_package' });

    const visible = await getAdminLead(adminToken, leadWithHistory._id);
    const masked = await getAdminLead(adminToken, leadWithoutHistory._id);
    expect(visible.body.phone).toBe(leadWithHistory.phone);
    expect(masked.body.phone).toBe('XXXX');
  });

  test('CASE 12: a different Admin-facing API (the paginated Leads list) never leaks the number before the first call, and does show it after', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { user: exec, token: execToken } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id, destination: 'Uniquestan' });

    const before = await getAdminLeadsList(adminToken, '?destination=Uniquestan');
    expect(before.status).toBe(200);
    const rowBefore = before.body.data.find((l) => String(l._id) === String(lead._id));
    expect(rowBefore.phone).toBe('XXXX');
    expect(JSON.stringify(before.body)).not.toContain(lead.phone);

    await postCallNote(execToken, lead._id, { category: 'warm', outcome: 'discussed_package' });

    const after = await getAdminLeadsList(adminToken, '?destination=Uniquestan');
    const rowAfter = after.body.data.find((l) => String(l._id) === String(lead._id));
    expect(rowAfter.phone).toBe(lead.phone);
  });

  test('the executive\'s own Leads list also masks/unmasks per-lead, matching Lead Detail', async () => {
    const { user: exec, token: execToken } = await makeAuthedUser('sales_executive');
    const leadA = await makeLead({ assignedTo: exec._id });
    const leadB = await makeLead({ assignedTo: exec._id });
    await postCallNote(execToken, leadB._id, { category: 'warm', outcome: 'discussed_package' });

    const list = await getExecLeadsList(execToken);
    expect(list.status).toBe(200);
    const rowA = list.body.data.find((l) => String(l._id) === String(leadA._id));
    const rowB = list.body.data.find((l) => String(l._id) === String(leadB._id));
    expect(rowA.phone).toBe('XXXX');
    expect(rowB.phone).toBe(leadB.phone);
  });

  test('a lead with no assignedTo is masked (no executive can have made a qualifying call)', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const lead = await makeLead({ assignedTo: null });

    const asAdmin = await getAdminLead(adminToken, lead._id);
    expect(asAdmin.body.phone).toBe('XXXX');
  });
});

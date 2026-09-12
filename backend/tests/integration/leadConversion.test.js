const request = require('supertest');
const mongoose = require('mongoose');
const db = require('../setup/db');

let app;
let User;
let Lead;
let Payment;
let UserSession;
let generateToken;

beforeAll(async () => {
  await db.connect();
  app = require('../../src/server');
  User = require('../../src/models/User');
  Lead = require('../../src/models/Lead');
  Payment = require('../../src/models/Payment');
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
    email: `leadconversion${counter}@example.com`,
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
    email: `leadconversioncreator${counter}@example.com`,
    password: 'password123',
    role: 'admin',
  });
  return Lead.create({
    name: `Lead ${counter}`,
    phone: `9${String(3000000000 + counter).slice(0, 9)}`,
    destination: 'Goa',
    budget: 50000,
    status: 'contacted',
    createdBy: creator._id,
    ...overrides,
  });
}

const VALID_SCREENSHOT = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';

function putExecLead(token, leadId, body) {
  return request(app)
    .put(`/api/sales-executive/leads/${leadId}`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

function putAdminLead(token, leadId, body) {
  return request(app)
    .put(`/api/leads/${leadId}`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

describe('Lead conversion — Sales Executive (salesExecutiveController.updateLead)', () => {
  test('SUCCESS: status=converted with total package cost + token amount converts the lead, no proof required', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const res = await putExecLead(token, lead._id, {
      status: 'converted',
      totalPackageCost: 50000,
      tokenAmount: 10000,
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('converted');

    const after = await Lead.findById(lead._id).lean();
    expect(after.status).toBe('converted');
    expect(after.convertedAt).toBeTruthy();

    const payment = await Payment.findOne({ lead: lead._id }).lean();
    expect(payment).toBeTruthy();
    expect(payment.amount).toBe(50000);
    expect(payment.paidAmount).toBe(10000);
  });

  test('SUCCESS: Remaining Amount is computed server-side and persisted on the Booking, not trusted from the client', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    // Deliberately do NOT send a "remainingAmount" field at all — the backend has no such
    // input and always derives it itself (totalPackageCost - tokenAmount). This proves the
    // server-computed value is correct from just the two real inputs, not trusted/echoed from
    // a client-sent number.
    const res = await putExecLead(token, lead._id, {
      status: 'converted',
      totalPackageCost: 80000,
      tokenAmount: 25000,
    });

    expect(res.status).toBe(200);

    const Booking = require('../../src/models/Booking');
    const booking = await Booking.findOne({ lead: lead._id }).lean();
    expect(booking).toBeTruthy();
    expect(booking.totalAmount).toBe(80000);
    expect(booking.advanceReceived).toBe(25000);
    expect(booking.pendingAmount).toBe(80000 - 25000);
  });

  test('FAIL: missing/zero total package cost -> 400, lead NOT converted', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const res = await putExecLead(token, lead._id, {
      status: 'converted',
      tokenAmount: 10000,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/total package cost/i);

    const after = await Lead.findById(lead._id).lean();
    expect(after.status).not.toBe('converted');
    expect(after.status).toBe('contacted');
    expect(after.convertedAt).toBeFalsy();
  });

  test('FAIL: negative token amount -> 400, lead NOT converted', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const res = await putExecLead(token, lead._id, {
      status: 'converted',
      totalPackageCost: 50000,
      tokenAmount: -100,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/token amount received/i);

    const after = await Lead.findById(lead._id).lean();
    expect(after.status).not.toBe('converted');
    expect(after.convertedAt).toBeFalsy();
  });

  test('FAIL: token amount exceeding total package cost -> 400, lead NOT converted', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const res = await putExecLead(token, lead._id, {
      status: 'converted',
      totalPackageCost: 50000,
      tokenAmount: 60000,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/cannot exceed total package cost/i);

    const after = await Lead.findById(lead._id).lean();
    expect(after.status).not.toBe('converted');
    expect(after.convertedAt).toBeFalsy();
  });

  test('conversion no longer requires or reads a payment screenshot for Sales Executive', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    // Deliberately omit any screenshot field — this must succeed where the old flow would 400.
    const res = await putExecLead(token, lead._id, {
      status: 'converted',
      totalPackageCost: 30000,
      tokenAmount: 0,
    });

    expect(res.status).toBe(200);
    const after = await Lead.findById(lead._id).lean();
    expect(after.status).toBe('converted');
  });
});

describe('Lead conversion — Admin (leadController.updateLead)', () => {
  test('SUCCESS: status=converted with advance amount + payment screenshot converts the lead', async () => {
    const { token } = await makeAuthedUser('admin');
    const lead = await makeLead();

    const res = await putAdminLead(token, lead._id, {
      status: 'converted',
      advanceAmount: 15000,
      paymentScreenshotBase64: VALID_SCREENSHOT,
      paymentScreenshotName: 'proof.png',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('converted');

    const after = await Lead.findById(lead._id).lean();
    expect(after.status).toBe('converted');
    expect(after.convertedAt).toBeTruthy();

    const payment = await Payment.findOne({ lead: lead._id }).lean();
    expect(payment).toBeTruthy();
  });

  // Regression test for the exact bug: validation used to run AFTER lead.save(), so a rejected
  // conversion still left the lead persisted as 'converted' in the database.
  test('FAIL: missing advance amount -> 400, and the lead is NEVER persisted as converted (validate-before-save)', async () => {
    const { token } = await makeAuthedUser('admin');
    const lead = await makeLead();

    const res = await putAdminLead(token, lead._id, {
      status: 'converted',
      paymentScreenshotBase64: VALID_SCREENSHOT,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/advance.*token amount/i);

    const after = await Lead.findById(lead._id).lean();
    expect(after.status).not.toBe('converted');
    expect(after.status).toBe('contacted');
    expect(after.convertedAt).toBeFalsy();
  });

  test('FAIL: missing payment screenshot -> 400, and the lead is NEVER persisted as converted (validate-before-save)', async () => {
    const { token } = await makeAuthedUser('admin');
    const lead = await makeLead();

    const res = await putAdminLead(token, lead._id, {
      status: 'converted',
      advanceAmount: 15000,
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/payment screenshot/i);

    const after = await Lead.findById(lead._id).lean();
    expect(after.status).not.toBe('converted');
    expect(after.convertedAt).toBeFalsy();
  });

  test('FAIL: negative advance amount is rejected -> 400, lead NOT converted', async () => {
    const { token } = await makeAuthedUser('admin');
    const lead = await makeLead();

    const res = await putAdminLead(token, lead._id, {
      status: 'converted',
      advanceAmount: -1,
      paymentScreenshotBase64: VALID_SCREENSHOT,
    });

    expect(res.status).toBe(400);
    const after = await Lead.findById(lead._id).lean();
    expect(after.status).not.toBe('converted');
  });

  test('re-converting an already-converted lead does not require proof again (prevStatus === converted skips validation)', async () => {
    const { token } = await makeAuthedUser('admin');
    const lead = await makeLead({ status: 'converted', convertedAt: new Date() });

    // Editing an unrelated field on an already-converted lead must not be blocked by the
    // conversion-proof gate — that gate only fires on the actual Not-Converted -> Converted move.
    const res = await putAdminLead(token, lead._id, { status: 'converted', priority: 'high' });

    expect(res.status).toBe(200);
    const after = await Lead.findById(lead._id).lean();
    expect(after.status).toBe('converted');
  });
});

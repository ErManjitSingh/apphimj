/**
 * End-to-end check that AddFollowUpModal.jsx's actual save sequence — (1) POST the FollowUp,
 * then (2) when the caller passes showLeadOutcome+lead (Leads List / Lead Detail page), PUT the
 * statusUpdate it builds via buildLeadStatusPayload — produces the correct lead state for all
 * four options: Warm, Hot, Cold, Converted. The payload shapes below mirror exactly what the
 * component sends (see frontend/src/components/followups/AddFollowUpModal.jsx handleSubmit and
 * frontend/src/lib/leadTemperatureStatus.js buildLeadStatusPayload).
 */
const request = require('supertest');
const mongoose = require('mongoose');
const db = require('../setup/db');

let app;
let User;
let Lead;
let FollowUp;
let Payment;
let Booking;
let UserSession;
let generateToken;

beforeAll(async () => {
  await db.connect();
  app = require('../../src/server');
  User = require('../../src/models/User');
  Lead = require('../../src/models/Lead');
  FollowUp = require('../../src/models/FollowUp');
  Payment = require('../../src/models/Payment');
  Booking = require('../../src/models/Booking');
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
    email: `addfollowup${counter}@example.com`,
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
    email: `addfollowupcreator${counter}@example.com`,
    password: 'password123',
    role: 'admin',
  });
  return Lead.create({
    name: `Lead ${counter}`,
    phone: `9${String(4000000000 + counter).slice(0, 9)}`,
    destination: 'Goa',
    budget: 20000,
    status: 'new',
    createdBy: creator._id,
    ...overrides,
  });
}

function postFollowUp(token, body) {
  return request(app)
    .post('/api/sales-executive/followups')
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

function putLead(token, leadId, body) {
  return request(app)
    .put(`/api/sales-executive/leads/${leadId}`)
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

/** Simulates AddFollowUpModal's full save sequence for one category/option pick. */
async function saveFollowUpAndStatus({ token, leadId, category, outcome, statusUpdate }) {
  const followUpRes = await postFollowUp(token, {
    lead: leadId,
    type: 'call',
    category,
    scheduledAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    notes: `${category} — ${outcome}`,
    outcome,
    coldReason: category === 'cold' ? outcome : undefined,
    pickedOutcome: category === 'warm' || category === 'hot' ? outcome : undefined,
    warmOutcome: category === 'warm' ? outcome : undefined,
    hotOutcome: category === 'hot' ? outcome : undefined,
  });

  const statusRes = statusUpdate ? await putLead(token, leadId, statusUpdate) : null;
  return { followUpRes, statusRes };
}

describe('AddFollowUpModal — Warm / Hot / Cold / Converted, as actually sent by the modal', () => {
  test('WARM: saves the option as statusReason and moves the lead to contacted/warm', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const { followUpRes, statusRes } = await saveFollowUpAndStatus({
      token,
      leadId: lead._id,
      category: 'warm',
      outcome: 'discussed_package',
      statusUpdate: {
        status: 'contacted',
        statusReason: 'discussed_package',
        temperature: 'warm',
        isHot: false,
      },
    });

    expect(followUpRes.status).toBe(201);
    expect(statusRes.status).toBe(200);

    const after = await Lead.findById(lead._id).lean();
    expect(after.status).toBe('contacted');
    expect(after.temperature).toBe('warm');
    expect(after.statusReason).toBe('discussed_package');
    expect(after.isHot).toBe(false);

    const followUp = await FollowUp.findOne({ lead: lead._id }).lean();
    expect(followUp.category).toBe('warm');
    expect(followUp.outcome).toBe('discussed_package');
  });

  test('WARM (CNP same day): routes status to follow_up, not contacted', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const { statusRes } = await saveFollowUpAndStatus({
      token,
      leadId: lead._id,
      category: 'warm',
      outcome: 'cnp_same_day',
      statusUpdate: {
        status: 'follow_up',
        statusReason: 'cnp_same_day',
        temperature: 'warm',
        isHot: false,
      },
    });

    expect(statusRes.status).toBe(200);
    const after = await Lead.findById(lead._id).lean();
    expect(after.status).toBe('follow_up');
    expect(after.temperature).toBe('warm');
  });

  test('HOT: saves the option as statusReason and moves the lead to negotiation/hot', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const { followUpRes, statusRes } = await saveFollowUpAndStatus({
      token,
      leadId: lead._id,
      category: 'hot',
      outcome: 'ready_to_book',
      statusUpdate: {
        status: 'negotiation',
        statusReason: 'ready_to_book',
        temperature: 'hot',
        isHot: true,
      },
    });

    expect(followUpRes.status).toBe(201);
    expect(statusRes.status).toBe(200);

    const after = await Lead.findById(lead._id).lean();
    expect(after.status).toBe('negotiation');
    expect(after.temperature).toBe('hot');
    expect(after.statusReason).toBe('ready_to_book');
    expect(after.isHot).toBe(true);
  });

  test('COLD: saves the option as statusReason + coldReason and moves the lead to follow_up/cold', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const { followUpRes, statusRes } = await saveFollowUpAndStatus({
      token,
      leadId: lead._id,
      category: 'cold',
      outcome: 'not_interested',
      statusUpdate: {
        status: 'follow_up',
        statusReason: 'not_interested',
        temperature: 'cold',
        coldReason: 'not_interested',
        isHot: false,
      },
    });

    expect(followUpRes.status).toBe(201);
    expect(statusRes.status).toBe(200);

    const after = await Lead.findById(lead._id).lean();
    expect(after.status).toBe('follow_up');
    expect(after.temperature).toBe('cold');
    expect(after.statusReason).toBe('not_interested');
    expect(after.coldReason).toBe('not_interested');

    const followUp = await FollowUp.findOne({ lead: lead._id }).lean();
    expect(followUp.category).toBe('cold');
  });

  test('CONVERTED: collects Total Package Cost + Token Amount, no screenshot, converts through the existing backend flow', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const { followUpRes, statusRes } = await saveFollowUpAndStatus({
      token,
      leadId: lead._id,
      category: 'converted',
      outcome: 'converted',
      statusUpdate: {
        status: 'converted',
        statusReason: 'converted',
        temperature: 'hot',
        isHot: true,
        coldReason: '',
        totalPackageCost: 60000,
        tokenAmount: 15000,
        // Deliberately no paymentScreenshotBase64 / paymentScreenshots — matches what the
        // modal now sends since the screenshot UI was removed.
      },
    });

    expect(followUpRes.status).toBe(201);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe('converted');

    const after = await Lead.findById(lead._id).lean();
    expect(after.status).toBe('converted');
    expect(after.convertedAt).toBeTruthy();

    const payment = await Payment.findOne({ lead: lead._id }).lean();
    expect(payment).toBeTruthy();
    expect(payment.amount).toBe(60000);
    expect(payment.paidAmount).toBe(15000);

    const booking = await Booking.findOne({ lead: lead._id }).lean();
    expect(booking).toBeTruthy();
    expect(booking.totalAmount).toBe(60000);
    expect(booking.advanceReceived).toBe(15000);
    expect(booking.pendingAmount).toBe(60000 - 15000); // Remaining amount, computed server-side
  });

  test('CONVERTED: missing total package cost is rejected (mirrors the modal\'s own pre-submit validation)', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const { statusRes } = await saveFollowUpAndStatus({
      token,
      leadId: lead._id,
      category: 'converted',
      outcome: 'converted',
      statusUpdate: {
        status: 'converted',
        statusReason: 'converted',
        temperature: 'hot',
        isHot: true,
        tokenAmount: 5000,
      },
    });

    expect(statusRes.status).toBe(400);
    expect(statusRes.body.message).toMatch(/total package cost/i);

    const after = await Lead.findById(lead._id).lean();
    expect(after.status).not.toBe('converted');
  });

  test('CONVERTED: token amount exceeding total package cost is rejected', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    const lead = await makeLead({ assignedTo: exec._id });

    const { statusRes } = await saveFollowUpAndStatus({
      token,
      leadId: lead._id,
      category: 'converted',
      outcome: 'converted',
      statusUpdate: {
        status: 'converted',
        statusReason: 'converted',
        temperature: 'hot',
        isHot: true,
        totalPackageCost: 10000,
        tokenAmount: 50000,
      },
    });

    expect(statusRes.status).toBe(400);
    expect(statusRes.body.message).toMatch(/cannot exceed total package cost/i);

    const after = await Lead.findById(lead._id).lean();
    expect(after.status).not.toBe('converted');
  });

  test('all four categories can be created as follow-up notes even without showLeadOutcome (e.g. the embedded Follow-ups widget)', async () => {
    const { user: exec, token } = await makeAuthedUser('sales_executive');
    for (const [category, outcome] of [
      ['warm', 'requested_callback'],
      ['hot', 'ready_to_book'],
      ['cold', 'invalid_number'],
      ['converted', 'converted'],
    ]) {
      const lead = await makeLead({ assignedTo: exec._id }); // eslint-disable-line no-await-in-loop
      const res = await postFollowUp(token, { // eslint-disable-line no-await-in-loop
        lead: lead._id,
        type: 'call',
        category,
        scheduledAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        outcome,
      });
      expect(res.status).toBe(201);
    }
  });
});

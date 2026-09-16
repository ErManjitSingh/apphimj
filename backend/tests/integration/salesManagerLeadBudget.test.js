/**
 * Sales Manager Leads List must show the exact same lead.budget Admin sees — same field, same
 * value, no separate calculation. Both /api/leads (Admin) and /api/sales-manager/leads (Sales
 * Manager) select LEAD_LIST_SELECT (utils/leadQueryFields.js), which already includes `budget` —
 * this test locks in that shared source of truth so it can't silently regress.
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
    email: `budgetcross${counter}@example.com`,
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
    email: `budgetcross-creator${counter}@example.com`,
    password: 'password123',
    role: 'admin',
  });
  return Lead.create({
    name: `Lead ${counter}`,
    phone: `9${String(5000000000 + counter).slice(0, 9)}`,
    destination: 'Goa',
    createdBy: creator._id,
    ...overrides,
  });
}

function getAdminLeadsList(token) {
  return request(app).get('/api/leads').set('Authorization', `Bearer ${token}`);
}

function getManagerLeadsList(token) {
  return request(app).get('/api/sales-manager/leads').set('Authorization', `Bearer ${token}`);
}

describe('Sales Manager Leads List — Budget matches Admin exactly', () => {
  test('same lead -> identical budget value in both APIs, across several budget situations', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { token: managerToken } = await makeAuthedUser('sales_manager');

    const leadNormal = await makeLead({ budget: 50000 });
    const leadOther = await makeLead({ budget: 125000 });
    const leadZero = await makeLead({ budget: 0 });
    const leadMissing = await makeLead();

    const admin = await getAdminLeadsList(adminToken);
    const manager = await getManagerLeadsList(managerToken);
    expect(admin.status).toBe(200);
    expect(manager.status).toBe(200);

    const byId = (res) => new Map(res.body.data.map((l) => [String(l._id), l]));
    const adminById = byId(admin);
    const managerById = byId(manager);

    for (const lead of [leadNormal, leadOther, leadZero, leadMissing]) {
      const adminRow = adminById.get(String(lead._id));
      const managerRow = managerById.get(String(lead._id));
      expect(adminRow).toBeTruthy();
      expect(managerRow).toBeTruthy();
      expect(managerRow.budget).toBe(adminRow.budget);
      expect(managerRow.budget).toBe(lead.budget ?? 0);
    }
  });

  test('Sales Manager Lead Detail also returns the same budget as Admin Lead Detail', async () => {
    const { token: adminToken } = await makeAuthedUser('admin');
    const { token: managerToken } = await makeAuthedUser('sales_manager');
    const lead = await makeLead({ budget: 87500 });

    const admin = await request(app).get(`/api/leads/${lead._id}`).set('Authorization', `Bearer ${adminToken}`);
    const manager = await request(app)
      .get(`/api/sales-manager/leads/${lead._id}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(admin.body.budget).toBe(87500);
    expect(manager.body.budget).toBe(87500);
  });

  test('budget survives pagination and search filtering on the Sales Manager list', async () => {
    const { token: managerToken } = await makeAuthedUser('sales_manager');
    const lead = await makeLead({ budget: 62000, destination: 'BudgetFilterTest' });

    const filtered = await request(app)
      .get('/api/sales-manager/leads?destination=BudgetFilterTest')
      .set('Authorization', `Bearer ${managerToken}`);
    expect(filtered.status).toBe(200);
    const row = filtered.body.data.find((l) => String(l._id) === String(lead._id));
    expect(row.budget).toBe(62000);
  });
});

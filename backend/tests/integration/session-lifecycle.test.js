const request = require('supertest');
const db = require('../setup/db');
const { waitFor } = require('../setup/waitFor');

let app;
let User;
let UserSession;
let sessionReconciliationService;

beforeAll(async () => {
  await db.connect();
  app = require('../../src/server');
  User = require('../../src/models/User');
  UserSession = require('../../src/models/UserSession');
  sessionReconciliationService = require('../../src/services/sessionReconciliationService');
});

afterEach(async () => {
  jest.useRealTimers();
  await db.clearCollections();
});

afterAll(async () => {
  await db.disconnect();
});

async function createExecutive() {
  return User.create({
    name: 'Rahul Sharma',
    email: 'rahul@example.com',
    password: 'password123',
    role: 'sales_executive',
  });
}

describe('Full HTTP session lifecycle (login -> heartbeat -> logout -> old token rejected)', () => {
  test('TEST 10: replaying a logged-out JWT against a protected route returns 401', async () => {
    await createExecutive();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rahul@example.com', password: 'password123' });
    expect(loginRes.status).toBe(200);
    const { token } = loginRes.body;
    expect(token).toBeTruthy();

    const sessionsAfterLogin = await UserSession.find({}).lean();
    expect(sessionsAfterLogin).toHaveLength(1);
    expect(sessionsAfterLogin[0].status).toBe('active');
    const loginAt = sessionsAfterLogin[0].loginAt;

    const heartbeatRes = await request(app)
      .patch('/api/auth/session/heartbeat')
      .set('Authorization', `Bearer ${token}`);
    expect(heartbeatRes.status).toBe(204);

    const afterHeartbeat = await UserSession.findOne({}).lean();
    expect(afterHeartbeat.lastActivityAt.getTime()).toBeGreaterThanOrEqual(loginAt.getTime());

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    const afterLogout = await UserSession.findOne({}).lean();
    expect(afterLogout.status).toBe('logged_out');
    expect(afterLogout.logoutReason).toBe('user_logout');

    const staleRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(staleRes.status).toBe(401);
  });

  test('TEST 6: a beacon alone is NOT proof of logout — the session stays usable', async () => {
    await createExecutive();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rahul@example.com', password: 'password123' });
    const { token } = loginRes.body;

    const beaconRes = await request(app)
      .post('/api/auth/session/beacon')
      .send({ token });
    expect(beaconRes.status).toBe(204);

    // The beacon responds before its background DB write completes (by design — a real
    // page-unload beacon can't be held up), so poll briefly rather than assuming the
    // write has already landed the instant the HTTP response comes back.
    const session = await waitFor(async () => {
      const doc = await UserSession.findOne({}).lean();
      return doc?.disconnectSignalAt ? doc : null;
    });

    // A pagehide/beacon can fire on a mere refresh — the session must remain active
    // and the flag must be a suspicion only, never an immediate logout.
    expect(session.status).toBe('active');
    expect(session.disconnectSignalAt).toBeTruthy();

    // Because it's unconfirmed, the token must still work right after the beacon.
    const stillWorks = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(stillWorks.status).toBe(200);
  });

  test('TEST 6b: real activity after a beacon clears the disconnect suspicion (refresh/bfcache case)', async () => {
    await createExecutive();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rahul@example.com', password: 'password123' });
    const { token } = loginRes.body;

    await request(app).post('/api/auth/session/beacon').send({ token });
    // Wait for the beacon's write to actually land before triggering the "real activity"
    // request below — otherwise the two writes could interleave in the wrong order and
    // leave disconnectSignalAt incorrectly set (or this assertion could race and pass
    // for the wrong reason).
    await waitFor(async () => {
      const doc = await UserSession.findOne({}).lean();
      return doc?.disconnectSignalAt ? doc : null;
    });

    // The page came back (refresh completed) and made a real request.
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    const session = await UserSession.findOne({}).lean();
    expect(session.status).toBe('active');
    expect(session.disconnectSignalAt).toBeNull();
  });

  test('TEST 6c: an unconfirmed beacon disconnect is only closed after the grace period by reconciliation', async () => {
    await createExecutive();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rahul@example.com', password: 'password123' });
    const { token } = loginRes.body;

    await request(app).post('/api/auth/session/beacon').send({ token });

    const { disconnectSignalAt } = await waitFor(async () => {
      const doc = await UserSession.findOne({}).lean();
      return doc?.disconnectSignalAt ? doc : null;
    });
    const pastGrace = new Date(
      disconnectSignalAt.getTime() + sessionReconciliationService.SESSION_DISCONNECT_GRACE_MS + 1000
    );
    const result = await sessionReconciliationService.reconcileSessions(pastGrace);
    expect(result.disconnectClosed).toBe(1);

    const session = await UserSession.findOne({}).lean();
    expect(session.status).toBe('expired');
    expect(session.logoutReason).toBe('connection_timeout');
    expect(session.logoutAt).toBeNull(); // never a fabricated logout timestamp

    const staleRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(staleRes.status).toBe(401);
  });
});

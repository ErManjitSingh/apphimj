const mongoose = require('mongoose');
const request = require('supertest');
const db = require('../setup/db');

let app;
let User;
let UserSession;
let sessionReconciliationService;
let orgTimezone;

beforeAll(async () => {
  await db.connect();
  app = require('../../src/server');
  User = require('../../src/models/User');
  UserSession = require('../../src/models/UserSession');
  sessionReconciliationService = require('../../src/services/sessionReconciliationService');
  orgTimezone = require('../../src/utils/orgTimezone');
});

afterEach(async () => {
  jest.useRealTimers();
  await db.clearCollections();
});

afterAll(async () => {
  await db.disconnect();
});

/** Freeze Date/Date.now to a fixed instant; real timers (DB I/O) keep working. */
function freezeNow(isoWithOffset) {
  jest.useFakeTimers({
    doNotFake: [
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'setImmediate', 'clearImmediate', 'nextTick',
    ],
  });
  jest.setSystemTime(new Date(isoWithOffset));
}

let execCounter = 0;
async function createExecutive(overrides = {}) {
  execCounter += 1;
  return User.create({
    name: `Exec ${execCounter}`,
    email: `sessionwindow${execCounter}@example.com`,
    password: 'password123',
    role: 'sales_executive',
    ...overrides,
  });
}

async function makeSession(user, overrides = {}) {
  return UserSession.create({
    userId: user._id,
    sessionId: new mongoose.Types.ObjectId().toString(),
    role: user.role,
    branchId: user.branchId || null,
    loginAt: overrides.loginAt || new Date(),
    lastActivityAt: overrides.lastActivityAt || overrides.loginAt || new Date(),
    status: overrides.status || 'active',
    logoutAt: overrides.logoutAt || null,
    logoutReason: overrides.logoutReason || null,
  });
}

describe('Sales-executive daily session window (06:30 AM - 08:30 PM IST)', () => {
  describe('Configuration is centralized', () => {
    test('the shared org-timezone config exposes the new boundaries, not the old ones', () => {
      expect(orgTimezone.SESSION_START_HOUR).toBe(6);
      expect(orgTimezone.SESSION_START_MINUTE).toBe(30);
      expect(orgTimezone.EOD_HOUR).toBe(20);
      expect(orgTimezone.EOD_MINUTE).toBe(30);
    });
  });

  describe('New-login start-of-window gate', () => {
    test('login at 06:29 AM IST is rejected', async () => {
      freezeNow('2026-01-15T06:29:00+05:30');
      await createExecutive({ email: 'window1@example.com' });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'window1@example.com', password: 'password123' });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/6:30 AM/);

      const sessions = await UserSession.find({}).lean();
      expect(sessions).toHaveLength(0); // no session/token was ever issued
    });

    test('login at exactly 06:30 AM IST is allowed', async () => {
      freezeNow('2026-01-15T06:30:00+05:30');
      await createExecutive({ email: 'window2@example.com' });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'window2@example.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
    });

    test('login at 10:00 AM IST (normal daytime) is allowed', async () => {
      freezeNow('2026-01-15T10:00:00+05:30');
      await createExecutive({ email: 'window3@example.com' });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'window3@example.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
    });

    test('the start-of-window gate does not apply to other roles (e.g. admin can log in at 3 AM)', async () => {
      freezeNow('2026-01-15T03:00:00+05:30');
      await User.create({
        name: 'Admin Early',
        email: 'earlyadmin@example.com',
        password: 'password123',
        role: 'admin',
      });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'earlyadmin@example.com', password: 'password123' });
      expect(res.status).toBe(200);
    });

    test('an already-open session is NOT terminated merely because the clock is before 06:30 AM', async () => {
      // Session started the previous evening (after that day's EOD, a legitimate
      // night-shift-style login) and is still open when 06:00 AM rolls around.
      // lastActivityAt is kept fresh (heartbeat) to isolate this specific check from
      // the separate, unrelated 20-minute inactivity backstop.
      freezeNow('2026-01-14T21:00:00+05:30');
      const exec = await createExecutive({ email: 'window5@example.com' });
      await makeSession(exec, { loginAt: new Date('2026-01-14T21:00:00+05:30'), status: 'active' });

      freezeNow('2026-01-15T06:00:00+05:30'); // before today's 06:30 window start
      await UserSession.updateOne({ userId: exec._id }, { $set: { lastActivityAt: new Date() } });
      const result = await sessionReconciliationService.reconcileSessions(new Date());
      expect(result.eodClosed).toBe(0);
      expect(result.inactivityClosed).toBe(0);
      const session = await UserSession.findOne({ userId: exec._id }).lean();
      expect(session.status).toBe('active'); // untouched — the start gate only blocks NEW logins
    });
  });

  describe('EOD end-of-window termination at 20:30 IST', () => {
    test('an active session at 20:29 IST remains active', async () => {
      freezeNow('2026-01-15T20:29:00+05:30');
      const exec = await createExecutive();
      await makeSession(exec, {
        loginAt: new Date('2026-01-15T09:00:00+05:30'),
        lastActivityAt: new Date('2026-01-15T20:28:00+05:30'),
        status: 'active',
      });
      const result = await sessionReconciliationService.reconcileSessions(new Date());
      expect(result.eodClosed).toBe(0);
      const session = await UserSession.findOne({ userId: exec._id }).lean();
      expect(session.status).toBe('active');
    });

    test('the session is EOD-terminated at exactly 20:30 IST with the precise cutoff timestamp', async () => {
      freezeNow('2026-01-15T20:30:00+05:30');
      const exec = await createExecutive();
      await makeSession(exec, {
        loginAt: new Date('2026-01-15T09:00:00+05:30'),
        lastActivityAt: new Date('2026-01-15T20:29:00+05:30'),
        status: 'active',
      });
      const result = await sessionReconciliationService.reconcileSessions(new Date());
      expect(result.eodClosed).toBe(1);
      const session = await UserSession.findOne({ userId: exec._id }).lean();
      expect(session.status).toBe('eod_expired');
      expect(session.logoutReason).toBe('eod');
      expect(session.logoutAt.getTime()).toBe(new Date('2026-01-15T20:30:00+05:30').getTime());
      expect(session.logoutAt.getTime()).toBe(orgTimezone.getForcedLogoutCutoff(new Date()).getTime());
    });

    test('two independently-logged-in devices are both terminated at EOD, with no cross-device interference', async () => {
      freezeNow('2026-01-15T21:00:00+05:30');
      const exec = await createExecutive();
      const fresh = new Date('2026-01-15T20:29:00+05:30');
      const deviceA = await makeSession(exec, { loginAt: new Date('2026-01-15T09:00:00+05:30'), lastActivityAt: fresh, status: 'active' });
      const deviceB = await makeSession(exec, { loginAt: new Date('2026-01-15T14:00:00+05:30'), lastActivityAt: fresh, status: 'active' });

      const result = await sessionReconciliationService.reconcileSessions(new Date());
      expect(result.eodClosed).toBe(2);

      const [a, b] = await Promise.all([
        UserSession.findById(deviceA._id).lean(),
        UserSession.findById(deviceB._id).lean(),
      ]);
      [a, b].forEach((session) => {
        expect(session.status).toBe('eod_expired');
        expect(session.logoutReason).toBe('eod');
        expect(session.logoutAt.getTime()).toBe(orgTimezone.getForcedLogoutCutoff(new Date()).getTime());
      });
    });
  });

  describe('Midnight is not a session boundary', () => {
    test('a session may cross 12:00 AM and remain active through the early morning', async () => {
      freezeNow('2026-01-15T21:30:00+05:30'); // after today's 20:30 cutoff — legitimate evening login
      const exec = await createExecutive();
      await makeSession(exec, { loginAt: new Date('2026-01-15T21:30:00+05:30'), status: 'active' });

      freezeNow('2026-01-16T02:00:00+05:30'); // past midnight, well before tomorrow's window/cutoff
      await UserSession.updateOne({ userId: exec._id }, { $set: { lastActivityAt: new Date() } });
      const result = await sessionReconciliationService.reconcileSessions(new Date());
      expect(result.eodClosed).toBe(0);
      const session = await UserSession.findOne({ userId: exec._id }).lean();
      expect(session.status).toBe('active'); // midnight itself did nothing to it
    });

    test('that same midnight-crossing session cannot survive the NEXT 20:30 EOD boundary', async () => {
      freezeNow('2026-01-15T21:30:00+05:30');
      const exec = await createExecutive();
      await makeSession(exec, { loginAt: new Date('2026-01-15T21:30:00+05:30'), status: 'active' });

      freezeNow('2026-01-16T02:00:00+05:30');
      await UserSession.updateOne({ userId: exec._id }, { $set: { lastActivityAt: new Date() } });
      await sessionReconciliationService.reconcileSessions(new Date());

      freezeNow('2026-01-16T20:31:00+05:30'); // past the FOLLOWING day's 20:30 cutoff
      await UserSession.updateOne({ userId: exec._id }, { $set: { lastActivityAt: new Date() } });
      const result = await sessionReconciliationService.reconcileSessions(new Date());
      expect(result.eodClosed).toBe(1);
      const session = await UserSession.findOne({ userId: exec._id }).lean();
      expect(session.status).toBe('eod_expired');
      expect(session.logoutReason).toBe('eod');
      expect(session.logoutAt.getTime()).toBe(new Date('2026-01-16T20:30:00+05:30').getTime());
    });
  });

  describe('No new 30-minute inactivity mechanism was introduced', () => {
    test('the inactivity timeout constant remains 20 minutes, unchanged by this feature', () => {
      expect(sessionReconciliationService.SESSION_INACTIVITY_TIMEOUT_MIN).toBe(20);
      expect(sessionReconciliationService.SESSION_INACTIVITY_TIMEOUT_MIN).not.toBe(30);
    });

    test('a sales-executive session at 25 minutes of inactivity is closed by the existing 20-minute mechanism, not a new 30-minute one', async () => {
      freezeNow('2026-01-15T10:00:00+05:30');
      const exec = await createExecutive();
      await makeSession(exec, { loginAt: new Date('2026-01-15T09:00:00+05:30'), status: 'active' });

      freezeNow('2026-01-15T10:25:00+05:30'); // 25 minutes of silence — past 20, well short of 30
      const result = await sessionReconciliationService.reconcileSessions(new Date());
      expect(result.inactivityClosed).toBe(1);
      const session = await UserSession.findOne({ userId: exec._id }).lean();
      expect(session.status).toBe('inactivity_timeout');
      expect(session.logoutReason).toBe('inactivity');
    });
  });
});

const mongoose = require('mongoose');
const db = require('../setup/db');

let User;
let UserSession;
let ExecutiveActivityLog;
let CallNote;
let executiveActivityService;
let sessionReconciliationService;
let orgTimezone;

beforeAll(async () => {
  await db.connect();
  User = require('../../src/models/User');
  UserSession = require('../../src/models/UserSession');
  ExecutiveActivityLog = require('../../src/models/ExecutiveActivityLog');
  CallNote = require('../../src/models/CallNote');
  executiveActivityService = require('../../src/services/executiveActivityService');
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
async function makeExecutive(overrides = {}) {
  execCounter += 1;
  return User.create({
    name: `Exec ${execCounter}`,
    email: `exec${execCounter}@example.com`,
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

const TODAY_NOON = '2026-01-15T12:00:00+05:30';
const TODAY_START = '2026-01-15T00:00:00+05:30';
const TODAY_END = '2026-01-15T23:59:59+05:30';

describe('Multi-device sessions and EOD reconciliation (service level)', () => {
  test('TEST 1 & 6: single and multi-device raw sessions are both preserved independently', async () => {
    freezeNow(TODAY_NOON);
    const exec = await makeExecutive();
    await makeSession(exec, { loginAt: new Date('2026-01-15T09:00:00+05:30'), logoutAt: new Date('2026-01-15T11:00:00+05:30'), status: 'logged_out', logoutReason: 'user_logout' });
    await makeSession(exec, { loginAt: new Date('2026-01-15T10:00:00+05:30') }); // still active

    const { rows } = await executiveActivityService.getLoginSessions({ userId: exec._id, dateFrom: '2026-01-15', dateTo: '2026-01-15' });
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.source))).toEqual(new Set(['session']));
  });

  test('TEST 4: one device logs out, the other stays active — executive still reports ONLINE', async () => {
    freezeNow(TODAY_NOON);
    const exec = await makeExecutive();
    // Laptop: earlier login, already logged out.
    await makeSession(exec, {
      loginAt: new Date('2026-01-15T09:02:00+05:30'),
      logoutAt: new Date('2026-01-15T09:30:00+05:30'),
      status: 'logged_out',
      logoutReason: 'user_logout',
    });
    // Mobile: later login, still active.
    await makeSession(exec, { loginAt: new Date('2026-01-15T10:21:00+05:30'), status: 'active' });

    const roster = await executiveActivityService.getTeamLoginRoster([{ _id: exec._id, name: exec.name }], { dateFrom: '2026-01-15', dateTo: '2026-01-15' });
    expect(roster[0].status).toBe('online');

    const summary = await executiveActivityService.getTeamLoginSummary([{ _id: exec._id, name: exec.name }], { dateFrom: '2026-01-15', dateTo: '2026-01-15' });
    expect(summary.online).toBe(1);
  });

  test('TEST 5: all devices logged out — executive reports OFFLINE', async () => {
    freezeNow(TODAY_NOON);
    const exec = await makeExecutive();
    await makeSession(exec, {
      loginAt: new Date('2026-01-15T09:00:00+05:30'),
      logoutAt: new Date('2026-01-15T09:30:00+05:30'),
      status: 'logged_out',
      logoutReason: 'user_logout',
    });
    await makeSession(exec, {
      loginAt: new Date('2026-01-15T10:00:00+05:30'),
      logoutAt: new Date('2026-01-15T10:30:00+05:30'),
      status: 'logged_out',
      logoutReason: 'user_logout',
    });

    const roster = await executiveActivityService.getTeamLoginRoster([{ _id: exec._id, name: exec.name }], { dateFrom: '2026-01-15', dateTo: '2026-01-15' });
    expect(roster[0].status).toBe('logged_out');

    const summary = await executiveActivityService.getTeamLoginSummary([{ _id: exec._id, name: exec.name }], { dateFrom: '2026-01-15', dateTo: '2026-01-15' });
    expect(summary.online).toBe(0);
  });

  test('TEST 7: EOD sweep with one device — session ends at cutoff with status eod_expired', async () => {
    freezeNow('2026-01-15T21:00:00+05:30'); // past 20:30 IST cutoff
    const exec = await makeExecutive();
    // lastActivityAt kept fresh (heartbeat/API calls all day) so the inactivity sweep
    // doesn't claim this session before the EOD sweep gets to it.
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
    expect(session.logoutAt.getTime()).toBe(orgTimezone.getForcedLogoutCutoff(new Date()).getTime());
  });

  test('TEST 8: EOD sweep with three concurrent devices — all terminate correctly, no duplicates', async () => {
    freezeNow('2026-01-15T21:00:00+05:30');
    const exec = await makeExecutive();
    const fresh = new Date('2026-01-15T20:29:00+05:30');
    await makeSession(exec, { loginAt: new Date('2026-01-15T09:00:00+05:30'), lastActivityAt: fresh, status: 'active' });
    await makeSession(exec, { loginAt: new Date('2026-01-15T10:00:00+05:30'), lastActivityAt: fresh, status: 'active' });
    await makeSession(exec, { loginAt: new Date('2026-01-15T11:00:00+05:30'), lastActivityAt: fresh, status: 'active' });

    const before = await UserSession.countDocuments({});
    const result = await sessionReconciliationService.reconcileSessions(new Date());
    const after = await UserSession.countDocuments({});

    expect(result.eodClosed).toBe(3);
    expect(after).toBe(before); // no new/duplicate records, only status transitions
    const sessions = await UserSession.find({ userId: exec._id }).lean();
    sessions.forEach((s) => {
      expect(s.status).toBe('eod_expired');
      expect(s.logoutReason).toBe('eod');
    });
  });

  test('TEST 9: re-login after EOD creates a fresh session, does not reuse the old one', async () => {
    freezeNow('2026-01-15T21:00:00+05:30');
    const exec = await makeExecutive();
    await makeSession(exec, {
      loginAt: new Date('2026-01-15T09:00:00+05:30'),
      lastActivityAt: new Date('2026-01-15T20:29:00+05:30'),
      status: 'active',
    });
    await sessionReconciliationService.reconcileSessions(new Date());

    // A fresh login after the cutoff (fresh loginAt, well after 20:30) should not be
    // touched by a reconciliation pass at the same "now".
    await makeSession(exec, { loginAt: new Date('2026-01-15T21:05:00+05:30'), status: 'active' });
    await sessionReconciliationService.reconcileSessions(new Date());

    const sessions = await UserSession.find({ userId: exec._id }).sort({ loginAt: 1 }).lean();
    expect(sessions).toHaveLength(2);
    expect(sessions[0].status).toBe('eod_expired');
    expect(sessions[1].status).toBe('active');
  });

  test('REGRESSION (multi-day EOD, tab genuinely kept open/active): an evening login survives overnight but is force-closed at the very next day\'s cutoff — never a second day', async () => {
    // Day 1: logs in at 9:00 PM — AFTER Day 1's own 20:30 cutoff, so it correctly
    // survives Day 1 (a legitimate evening/night-shift login). The executive's tab
    // stays open with heartbeat/requests keeping lastActivityAt fresh throughout —
    // this isolates the EOD rule from the separate 20-minute inactivity timeout.
    freezeNow('2026-01-15T21:00:00+05:30');
    const exec = await makeExecutive();
    await makeSession(exec, { loginAt: new Date('2026-01-15T21:00:00+05:30'), status: 'active' });

    // Still Day 1, later that night, heartbeat keeps it fresh — must NOT be closed yet.
    freezeNow('2026-01-15T23:30:00+05:30');
    await UserSession.updateOne({ userId: exec._id }, { $set: { lastActivityAt: new Date() } });
    let result = await sessionReconciliationService.reconcileSessions(new Date());
    expect(result.eodClosed).toBe(0);
    let session = await UserSession.findOne({ userId: exec._id }).lean();
    expect(session.status).toBe('active');

    // Day 2, well before Day 2's own cutoff, still heartbeating — still must not close.
    freezeNow('2026-01-16T10:00:00+05:30');
    await UserSession.updateOne({ userId: exec._id }, { $set: { lastActivityAt: new Date() } });
    result = await sessionReconciliationService.reconcileSessions(new Date());
    expect(result.eodClosed).toBe(0);
    session = await UserSession.findOne({ userId: exec._id }).lean();
    expect(session.status).toBe('active');

    // Day 2, just past Day 2's 20:30 cutoff — the reconciliation job (which runs on its
    // own schedule regardless of whether the executive touches the app) closes it here,
    // one full day after login. This is what actually enforces a daily re-login cadence
    // — it does not depend on the user ever making a request themselves.
    freezeNow('2026-01-16T20:35:00+05:30');
    await UserSession.updateOne({ userId: exec._id }, { $set: { lastActivityAt: new Date() } });
    result = await sessionReconciliationService.reconcileSessions(new Date());
    expect(result.eodClosed).toBe(1);
    session = await UserSession.findOne({ userId: exec._id }).lean();
    expect(session.status).toBe('eod_expired');
    expect(session.logoutReason).toBe('eod');
    expect(session.logoutAt.getTime()).toBe(orgTimezone.getForcedLogoutCutoff(new Date()).getTime());

    // Day 3 — already closed, so there is nothing left to do; it categorically cannot
    // still read as "active" on Day 3, proving it never persists past the second cutoff.
    freezeNow('2026-01-17T10:00:00+05:30');
    result = await sessionReconciliationService.reconcileSessions(new Date());
    expect(result.eodClosed).toBe(0);
    session = await UserSession.findOne({ userId: exec._id }).lean();
    expect(session.status).toBe('eod_expired'); // unchanged — still closed from Day 2
  });

  test('REGRESSION (multi-day EOD, tab genuinely abandoned): with zero activity, inactivity_timeout closes it long before a second day\'s EOD would even matter', async () => {
    // Login is deliberately AFTER today's own 20:30 cutoff (an evening login), so this
    // test isolates inactivity from EOD — the very next cutoff isn't until tomorrow.
    freezeNow('2026-01-15T21:00:00+05:30');
    const exec = await makeExecutive();
    await makeSession(exec, { loginAt: new Date('2026-01-15T21:00:00+05:30'), status: 'active' });

    // 1 hour of total silence — no heartbeat, no request, nothing. The 20-minute
    // inactivity backstop (not EOD) is what catches this, well before Day 2 arrives.
    freezeNow('2026-01-15T22:00:00+05:30');
    const result = await sessionReconciliationService.reconcileSessions(new Date());
    expect(result.inactivityClosed).toBe(1);
    expect(result.eodClosed).toBe(0);

    const session = await UserSession.findOne({ userId: exec._id }).lean();
    expect(session.status).toBe('inactivity_timeout');
    expect(session.logoutReason).toBe('inactivity');
    expect(session.logoutAt).toBeNull(); // never a fabricated timestamp
  });

  test('TEST 12: no login in the selected range reports "no_login"', async () => {
    freezeNow(TODAY_NOON);
    const exec = await makeExecutive();

    const roster = await executiveActivityService.getTeamLoginRoster([{ _id: exec._id, name: exec.name }], { dateFrom: '2026-01-15', dateTo: '2026-01-15' });
    expect(roster[0].status).toBe('no_login');
  });

  test('TEST 13: historical range with only legacy ExecutiveActivityLog data is still retrieved', async () => {
    freezeNow(TODAY_NOON);
    const exec = await makeExecutive();
    // No UserSession at all for this user — only legacy login/logout events from "before this shipped".
    await ExecutiveActivityLog.create({ userId: exec._id, type: 'login', createdAt: new Date('2025-06-01T09:00:00+05:30') });
    await ExecutiveActivityLog.create({ userId: exec._id, type: 'logout', createdAt: new Date('2025-06-01T17:00:00+05:30') });

    const { rows } = await executiveActivityService.getLoginSessions({ userId: exec._id, dateFrom: '2025-06-01', dateTo: '2025-06-01' });
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe('legacy');
    expect(rows[0].status).toBe('logged_out');
  });

  test('REGRESSION (legacy carry-in): a session that started yesterday and is still open must not report "no_login" today', async () => {
    freezeNow('2026-01-15T14:00:00+05:30'); // 2pm today, well before the 20:30 cutoff
    const exec = await makeExecutive();
    // Logged in YESTERDAY evening (after yesterday's 20:30 cutoff, so it survived) —
    // no login event exists today at all, only ongoing CRM activity today.
    await ExecutiveActivityLog.create({ userId: exec._id, type: 'login', createdAt: new Date('2026-01-14T21:00:00+05:30') });
    await ExecutiveActivityLog.create({ userId: exec._id, type: 'module_opened', module: 'leads', createdAt: new Date('2026-01-15T09:50:00+05:30') });

    const roster = await executiveActivityService.getTeamLoginRoster([{ _id: exec._id, name: exec.name }], { dateFrom: '2026-01-15', dateTo: '2026-01-15' });
    expect(roster[0].status).not.toBe('no_login');
    expect(roster[0].status).toBe('online');
    expect(roster[0].loginAt.getTime()).toBe(new Date('2026-01-14T21:00:00+05:30').getTime());

    const summary = await executiveActivityService.getTeamLoginSummary([{ _id: exec._id, name: exec.name }], { dateFrom: '2026-01-15', dateTo: '2026-01-15' });
    expect(summary.online).toBe(1);
  });

  test('TEST 14: branch-scoped session retrieval does not leak another branch\'s session', async () => {
    freezeNow(TODAY_NOON);
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    const execA = await makeExecutive({ branchId: branchA });
    const execB = await makeExecutive({ branchId: branchB });
    await makeSession(execA, { loginAt: new Date('2026-01-15T09:00:00+05:30'), status: 'active' });
    await makeSession(execB, { loginAt: new Date('2026-01-15T09:00:00+05:30'), status: 'active' });

    const roster = await executiveActivityService.getTeamLoginRoster(
      [{ _id: execA._id, name: execA.name }, { _id: execB._id, name: execB.name }],
      { branchId: branchA, dateFrom: '2026-01-15', dateTo: '2026-01-15' }
    );

    const rowA = roster.find((r) => String(r._id) === String(execA._id));
    const rowB = roster.find((r) => String(r._id) === String(execB._id));
    expect(rowA.status).toBe('online');
    expect(rowB.status).toBe('no_login'); // branchB's session is filtered out by the branchA scope
  });

  test('TEST 15: a CallNote on a different branch never affects the executive\'s own session data', async () => {
    freezeNow(TODAY_NOON);
    const branchA = new mongoose.Types.ObjectId();
    const branchB = new mongoose.Types.ObjectId();
    const exec = await makeExecutive({ branchId: branchA });
    await makeSession(exec, { loginAt: new Date('2026-01-15T09:00:00+05:30'), status: 'active' });
    // A call logged against a lead belonging to a different branch than the executive.
    await CallNote.create({
      userId: exec._id,
      leadId: new mongoose.Types.ObjectId(),
      branchId: branchB,
      outcome: 'interested',
      duration: 60,
    });

    const { rows } = await executiveActivityService.getLoginSessions({ userId: exec._id, branchId: branchA, dateFrom: '2026-01-15', dateTo: '2026-01-15' });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('online');
  });

  test('REGRESSION (roster ordering): a later device that already logged out must not mask an earlier still-active device', async () => {
    freezeNow(TODAY_NOON);
    const exec = await makeExecutive();
    // Device B: earlier login, still active.
    await makeSession(exec, {
      loginAt: new Date('2026-01-15T09:00:00+05:30'),
      lastActivityAt: new Date('2026-01-15T11:30:00+05:30'),
      status: 'active',
    });
    // Device A: later login, but already logged out.
    await makeSession(exec, {
      loginAt: new Date('2026-01-15T10:00:00+05:30'),
      lastActivityAt: new Date('2026-01-15T11:00:00+05:30'),
      logoutAt: new Date('2026-01-15T11:00:00+05:30'),
      status: 'logged_out',
      logoutReason: 'user_logout',
    });

    const summary = await executiveActivityService.getTeamLoginSummary([{ _id: exec._id, name: exec.name }], { dateFrom: '2026-01-15', dateTo: '2026-01-15' });
    expect(summary.online).toBe(1);

    const roster = await executiveActivityService.getTeamLoginRoster([{ _id: exec._id, name: exec.name }], { dateFrom: '2026-01-15', dateTo: '2026-01-15' });
    expect(roster[0].status).toBe('online');
    // The displayed row must be Device B's (the still-active one), not Device A's logged-out session.
    expect(roster[0].loginAt.getTime()).toBe(new Date('2026-01-15T09:00:00+05:30').getTime());
    expect(roster[0].logoutAt).toBeNull();
  });

  test('REGRESSION (EOD precedence): an EOD-eligible session must resolve to eod, not connection_timeout, even with a stale disconnect signal', async () => {
    freezeNow('2026-01-15T21:00:00+05:30'); // past 20:30 IST cutoff
    const exec = await makeExecutive();
    // A beacon fired at 20:00 (before cutoff); by the time reconciliation runs at 21:00,
    // the 2-minute disconnect grace has long since elapsed — this session is eligible for
    // BOTH the connection_timeout sweep and the EOD sweep in the same reconciliation pass.
    await UserSession.create({
      userId: exec._id,
      sessionId: new mongoose.Types.ObjectId().toString(),
      role: exec.role,
      loginAt: new Date('2026-01-15T09:00:00+05:30'),
      lastActivityAt: new Date('2026-01-15T20:00:00+05:30'),
      disconnectSignalAt: new Date('2026-01-15T20:00:00+05:30'),
      status: 'active',
    });

    const result = await sessionReconciliationService.reconcileSessions(new Date());
    expect(result.eodClosed).toBe(1);
    expect(result.disconnectClosed).toBe(0); // EOD claimed it first — nothing left for the disconnect sweep

    const session = await UserSession.findOne({ userId: exec._id }).lean();
    expect(session.status).toBe('eod_expired');
    expect(session.logoutReason).toBe('eod');
    expect(session.logoutAt.getTime()).toBe(orgTimezone.getForcedLogoutCutoff(new Date()).getTime());
  });
});

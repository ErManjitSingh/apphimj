const UserSession = require('../models/UserSession');
const {
  getForcedLogoutCutoff,
  isPastForcedLogoutTime,
  SESSION_WINDOW_ROLES,
} = require('../utils/orgTimezone');

const SESSION_INACTIVITY_TIMEOUT_MIN = Number(process.env.SESSION_INACTIVITY_TIMEOUT_MIN ?? 20);
const SESSION_INACTIVITY_TIMEOUT_MS = SESSION_INACTIVITY_TIMEOUT_MIN * 60 * 1000;
const SESSION_DISCONNECT_GRACE_MIN = Number(process.env.SESSION_DISCONNECT_GRACE_MIN ?? 2);
const SESSION_DISCONNECT_GRACE_MS = SESSION_DISCONNECT_GRACE_MIN * 60 * 1000;
const SESSION_RECONCILE_INTERVAL_MS = Number(
  process.env.SESSION_RECONCILE_INTERVAL_MS ?? 5 * 60 * 1000
);

/**
 * Backstop sweep for sessions that stop sending any signal (no API calls,
 * no heartbeat, an unconfirmed sendBeacon disconnect). Runs on an interval
 * from server.js so an abandoned tab never shows as "online" forever; also
 * closes any sales-executive session that survives past today's EOD cutoff
 * without ever making another request (protect() handles the common case
 * lazily, this covers the device that never comes back).
 *
 * logoutAt is deliberately left null for every sweep here except EOD: we
 * only ever know the *last confirmed presence* (lastActivityAt /
 * disconnectSignalAt), never the true moment the user actually left, so we
 * never fabricate a logoutAt from it. EOD is the one exception — the cutoff
 * itself is a real, deterministic, already-known instant, not a guess.
 *
 * Every update here is guarded by `status: 'active'`, so it is safe to run
 * concurrently across multiple PM2 workers — the same posture as the
 * existing archiveOldTrips/purgeOldActivityLogs interval jobs.
 */
async function reconcileSessions(now = new Date()) {
  // 1. EOD runs FIRST and takes deterministic precedence at/after the cutoff. EOD is a
  // known, confirmed business-rule boundary — it must never lose a race to the disconnect
  // or inactivity sweeps below just because a beacon/staleness signal happened to also be
  // old enough by the time this reconciliation pass runs. Any session that is still
  // `active` and EOD-eligible at this instant is claimed here before anything else can
  // touch it.
  let eodClosed = 0;
  if (isPastForcedLogoutTime(now)) {
    const cutoff = getForcedLogoutCutoff(now);
    const eodResult = await UserSession.updateMany(
      { role: { $in: SESSION_WINDOW_ROLES }, status: 'active', loginAt: { $lt: cutoff } },
      { $set: { status: 'eod_expired', logoutReason: 'eod', logoutAt: cutoff } }
    );
    eodClosed = eodResult.modifiedCount || 0;
  }

  // 2. Confirm-or-clear beacon disconnect signals for whatever is still active (i.e. not
  // EOD-eligible, or EOD hasn't hit yet) — the most specific signal we have short of EOD.
  const disconnectCutoff = new Date(now.getTime() - SESSION_DISCONNECT_GRACE_MS);
  const disconnectResult = await UserSession.updateMany(
    { status: 'active', disconnectSignalAt: { $ne: null, $lt: disconnectCutoff } },
    { $set: { status: 'expired', logoutReason: 'connection_timeout' } }
  );
  const disconnectClosed = disconnectResult.modifiedCount || 0;

  // 3. Generic inactivity backstop for sessions with no beacon signal at all (browser
  // killed outright, network dropped, laptop lid closed) — no confirmed logoutAt,
  // lastActivityAt already carries "last known presence".
  const inactivityCutoff = new Date(now.getTime() - SESSION_INACTIVITY_TIMEOUT_MS);
  const inactivityResult = await UserSession.updateMany(
    { status: 'active', lastActivityAt: { $lt: inactivityCutoff } },
    { $set: { status: 'inactivity_timeout', logoutReason: 'inactivity' } }
  );
  const inactivityClosed = inactivityResult.modifiedCount || 0;

  return { disconnectClosed, inactivityClosed, eodClosed };
}

module.exports = {
  reconcileSessions,
  SESSION_INACTIVITY_TIMEOUT_MIN,
  SESSION_INACTIVITY_TIMEOUT_MS,
  SESSION_DISCONNECT_GRACE_MIN,
  SESSION_DISCONNECT_GRACE_MS,
  SESSION_RECONCILE_INTERVAL_MS,
};

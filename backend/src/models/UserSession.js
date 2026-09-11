const mongoose = require('mongoose');

/**
 * One row per successful login (one device/browser = one session).
 * This is the authoritative source of truth for authentication-session
 * lifecycle (who is online, when they logged in/out, why a session ended).
 * It never overwrites a prior login and is never deleted — ActivityLog /
 * ExecutiveActivityLog remain the separate event/audit trail.
 */
const SESSION_STATUSES = [
  'active',
  'logged_out',
  'eod_expired',
  'expired',
  'inactivity_timeout',
  'revoked',
];

const LOGOUT_REASONS = [
  'user_logout',
  'eod',
  'session_expired',
  'inactivity',
  'revoked',
  'connection_timeout',
];

const userSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: String, required: true, unique: true },
    role: { type: String, required: true },
    deviceId: { type: String, default: null },
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
    },
    browser: { type: String, default: null },
    operatingSystem: { type: String, default: null },
    userAgent: { type: String, default: null },
    ipAddress: { type: String, default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    loginAt: { type: Date, required: true, default: Date.now },
    /**
     * Only ever set for a CONFIRMED termination — an explicit logout action or the
     * deterministic EOD cutoff. Left null for inferred endings (inactivity timeout,
     * an unconfirmed disconnect signal, a generic expiry) because we do not actually
     * know the moment the user left — only that lastActivityAt is the last confirmed
     * proof of presence. Never backfilled from lastActivityAt.
     */
    logoutAt: { type: Date, default: null },
    /** Last confirmed proof of presence (a real request, or protect()'s own touch). */
    lastActivityAt: { type: Date, required: true, default: Date.now },
    /**
     * Set by navigator.sendBeacon() on pagehide — a best-effort, NON-definitive signal
     * that the tab may have closed. A refresh, back/forward-cache transition, or plain
     * navigation can also fire pagehide, so this alone must never close the session.
     * protect()/heartbeat clear it back to null on any subsequent real activity; the
     * reconciliation sweep only confirms the disconnect (status -> 'expired') once this
     * has stood unconfirmed past a short grace period.
     */
    disconnectSignalAt: { type: Date, default: null },
    status: { type: String, enum: SESSION_STATUSES, default: 'active', index: true },
    logoutReason: { type: String, enum: LOGOUT_REASONS, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserSession', userSessionSchema);
module.exports.SESSION_STATUSES = SESSION_STATUSES;
module.exports.LOGOUT_REASONS = LOGOUT_REASONS;

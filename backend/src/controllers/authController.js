const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserSession = require('../models/UserSession');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  formatUserResponse,
  generateToken,
  getRestrictedSessionMeta,
  createUserSession,
} = require('../middleware/auth');
const { resolveUserPermissions } = require('../services/permissionsService');
const { logActivity, getClientIp } = require('../services/activityService');
const { logExecutiveActivity } = require('../services/executiveActivityService');
const {
  isBeforeSessionWindowStart,
  SESSION_WINDOW_ROLES,
  SESSION_START_HOUR,
  SESSION_START_MINUTE,
  formatClockLabel,
} = require('../utils/orgTimezone');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Please provide email and password');

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || user.status === 'disabled') throw new ApiError(401, 'Invalid email or password');
  if (user.status === 'invited') {
    throw new ApiError(401, 'Account invitation is pending. Ask admin to reset your password.');
  }
  if (!(await user.matchPassword(password))) throw new ApiError(401, 'Invalid email or password');

  // Sales-executive daily session window: a NEW login is only allowed from the window's
  // start onward. This never touches an already-open session — only gates fresh logins —
  // so a session that started yesterday evening and is still open can keep working
  // through the pre-window hours; it's the EOD cutoff (in protect()) that ends it.
  if (SESSION_WINDOW_ROLES.includes(user.role) && isBeforeSessionWindowStart(new Date())) {
    throw new ApiError(
      403,
      `Login is available from ${formatClockLabel(SESSION_START_HOUR, SESSION_START_MINUTE)} IST. Please try again later.`
    );
  }

  user.lastLogin = new Date();
  await user.save();

  await logActivity({
    type: 'login',
    user: user.name,
    userId: user._id,
    action: 'Logged in',
    ip: getClientIp(req),
    branchId: user.branchId || req.branchId || null,
  });
  // ActivityLog auto-deletes after 24h — keep a persistent copy for executives so
  // logins still show up in 7/30-day Executive Activity views.
  if (user.role === 'sales_executive') {
    logExecutiveActivity({
      userId: user._id,
      branchId: user.branchId || req.branchId || null,
      type: 'login',
    }).catch(() => {});
  }

  const session = await createUserSession({ user, req });

  const permissions = await resolveUserPermissions(user);
  const payload = formatUserResponse(user, permissions);
  res.json({
    ...payload,
    token: generateToken(user._id, user.role, session.sessionId),
    ...getRestrictedSessionMeta(user.role),
  });
});

const logout = asyncHandler(async (req, res) => {
  await UserSession.updateOne(
    { sessionId: req.sessionId, userId: req.user._id, status: 'active' },
    { $set: { status: 'logged_out', logoutReason: 'user_logout', logoutAt: new Date() } }
  );

  await logActivity({
    type: 'logout',
    user: req.user.name,
    userId: req.user._id,
    action: 'Logged out',
    ip: getClientIp(req),
    branchId: req.user.branchId || req.branchId || null,
  });
  if (req.user.role === 'sales_executive') {
    logExecutiveActivity({
      userId: req.user._id,
      branchId: req.user.branchId || req.branchId || null,
      type: 'logout',
    }).catch(() => {});
  }
  res.json({ message: 'Logged out' });
});

const getMe = asyncHandler(async (req, res) => {
  const permissions = req.permissions || (await resolveUserPermissions(req.user));
  res.json(formatUserResponse(req.user, permissions));
});

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) throw new ApiError(400, 'Name, email and password required');

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw new ApiError(400, 'User already exists');

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'sales_executive',
  });

  const session = await createUserSession({ user, req });

  const permissions = await resolveUserPermissions(user);
  const payload = formatUserResponse(user, permissions);
  res.status(201).json({
    ...payload,
    token: generateToken(user._id, user.role, session.sessionId),
    ...getRestrictedSessionMeta(user.role),
  });
});

/**
 * Cheap "still open" ping. protect() already refreshed lastActivityAt on this
 * request — this endpoint exists purely so the frontend has a silent, no-op
 * route to call on an interval even when the tab is idle and issuing no other
 * API calls.
 */
const heartbeat = asyncHandler(async (req, res) => {
  res.status(204).end();
});

/**
 * Best-effort tab-close signal via navigator.sendBeacon(). Beacons cannot set
 * an Authorization header, so the token travels in the body instead and is
 * verified here exactly as protect() would. Always responds fast — the
 * browser doesn't read the response — and never throws back to the caller.
 *
 * IMPORTANT: pagehide (what triggers sendBeacon) also fires on a plain page
 * refresh, a back/forward-cache transition, or ordinary navigation — none of
 * which mean the user logged out. This is a NON-definitive "may have
 * disconnected" flag only; it never sets status to logged_out. protect()
 * clears the flag on any subsequent real request, and the reconciliation
 * sweep is what actually confirms and closes the session if nothing follows.
 */
const beacon = asyncHandler(async (req, res) => {
  res.status(204).end();
  const { token } = req.body || {};
  if (!token) return;
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return;
  }
  if (!decoded?.sessionId) return;
  const now = new Date();
  await UserSession.updateOne(
    { sessionId: decoded.sessionId, userId: decoded.id, status: 'active' },
    { $set: { disconnectSignalAt: now, lastActivityAt: now } }
  ).catch(() => {});
});

module.exports = { login, logout, getMe, register, heartbeat, beacon };

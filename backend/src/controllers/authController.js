const User = require('../models/User');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { formatUserResponse, generateToken, getRestrictedSessionMeta } = require('../middleware/auth');
const { resolveUserPermissions } = require('../services/permissionsService');
const { logActivity, getClientIp } = require('../services/activityService');
const { logExecutiveActivity } = require('../services/executiveActivityService');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Please provide email and password');

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || user.status === 'disabled') throw new ApiError(401, 'Invalid email or password');
  if (user.status === 'invited') {
    throw new ApiError(401, 'Account invitation is pending. Ask admin to reset your password.');
  }
  if (!(await user.matchPassword(password))) throw new ApiError(401, 'Invalid email or password');

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

  const permissions = await resolveUserPermissions(user);
  const payload = formatUserResponse(user, permissions);
  res.json({
    ...payload,
    token: generateToken(user._id, user.role),
    ...getRestrictedSessionMeta(user.role),
  });
});

const logout = asyncHandler(async (req, res) => {
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

  const permissions = await resolveUserPermissions(user);
  const payload = formatUserResponse(user, permissions);
  res.status(201).json({
    ...payload,
    token: generateToken(user._id, user.role),
    ...getRestrictedSessionMeta(user.role),
  });
});

module.exports = { login, logout, getMe, register };

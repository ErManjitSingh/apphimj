const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const User = require('../models/User');
const {
  logExecutiveActivity,
  getActivityTimeline,
  getActivitySummary,
  getModuleUsage,
  getTeamActivityOverview,
  getActivityAnalytics,
  getLoginSessions,
  getTeamLoginRoster,
  getTeamLoginSummary,
} = require('../services/executiveActivityService');
const { resolveScopedExecutiveId } = require('../utils/callReportScope');

const getTimeline = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, page, limit } = req.query;
  const executiveId = resolveScopedExecutiveId(req, req.query.executiveId);
  if (!executiveId) throw new ApiError(400, 'executiveId is required');
  res.json(await getActivityTimeline({ userId: executiveId, branchId: req.branchId, dateFrom, dateTo, page, limit }));
});

const getSummary = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const executiveId = resolveScopedExecutiveId(req, req.query.executiveId);
  if (!executiveId) throw new ApiError(400, 'executiveId is required');
  res.json(await getActivitySummary({ userId: executiveId, branchId: req.branchId, dateFrom, dateTo }));
});

const getModuleUsageHandler = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const executiveId = resolveScopedExecutiveId(req, req.query.executiveId);
  if (!executiveId) throw new ApiError(400, 'executiveId is required');
  res.json(await getModuleUsage({ userId: executiveId, branchId: req.branchId, dateFrom, dateTo }));
});

const getTeamOverviewHandler = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const executives = await User.find({
    role: 'sales_executive',
    status: 'active',
    ...(req.branchId ? { branchId: req.branchId } : {}),
  }).select('name email').lean();
  res.json(await getTeamActivityOverview(executives, { branchId: req.branchId, dateFrom, dateTo }));
});

const getAnalyticsHandler = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const executiveId = resolveScopedExecutiveId(req, req.query.executiveId);
  res.json(await getActivityAnalytics({ userId: executiveId || undefined, branchId: req.branchId, dateFrom, dateTo }));
});

/**
 * `resolveScopedExecutiveId` always resolves to the caller's own id for a sales_executive (never
 * '' or 'all'), so the roster branch below — which lists every executive on the branch — is
 * unreachable for that role and only ever runs for Admin/Sales Manager.
 */
const getLoginSessionsHandler = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const executiveId = resolveScopedExecutiveId(req, req.query.executiveId);

  if (executiveId && executiveId !== 'all') {
    const [summary, rows] = await Promise.all([
      getTeamLoginSummary([{ _id: executiveId }], { branchId: req.branchId, dateFrom, dateTo }),
      getLoginSessions({ userId: executiveId, branchId: req.branchId, dateFrom, dateTo }),
    ]);
    return res.json({ mode: 'sessions', summary, rows });
  }

  const executives = await User.find({
    role: 'sales_executive',
    status: 'active',
    ...(req.branchId ? { branchId: req.branchId } : {}),
  }).select('name email').lean();
  const [summary, rows] = await Promise.all([
    getTeamLoginSummary(executives, { branchId: req.branchId, dateFrom, dateTo }),
    getTeamLoginRoster(executives, { branchId: req.branchId, dateFrom, dateTo }),
  ]);
  res.json({ mode: 'roster', summary, rows });
});

/** Self-service beacon: sales executives log their own module opens, never someone else's. */
const logModuleOpened = asyncHandler(async (req, res) => {
  const { module } = req.body;
  if (!module) throw new ApiError(400, 'module is required');
  await logExecutiveActivity({
    userId: req.user._id,
    branchId: req.user.branchId || req.branchId || null,
    type: 'module_opened',
    module,
  });
  res.status(201).json({ ok: true });
});

module.exports = {
  getTimeline,
  getSummary,
  getModuleUsageHandler,
  getTeamOverviewHandler,
  getAnalyticsHandler,
  getLoginSessionsHandler,
  logModuleOpened,
};

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const User = require('../models/User');
const {
  getExecutiveTimeline,
  getExecutiveSummary,
  getTeamOverview,
  getAnalytics,
  getHourlyCallDetail,
} = require('../services/callReportService');
const { resolveScopedExecutiveId } = require('../utils/callReportScope');

const getTimeline = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, page, limit } = req.query;
  const executiveId = resolveScopedExecutiveId(req, req.query.executiveId);
  if (!executiveId) throw new ApiError(400, 'executiveId is required');
  const result = await getExecutiveTimeline({
    userId: executiveId,
    branchId: req.branchId,
    dateFrom,
    dateTo,
    page,
    limit,
  });
  res.json(result);
});

const getSummary = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const executiveId = resolveScopedExecutiveId(req, req.query.executiveId);
  if (!executiveId) throw new ApiError(400, 'executiveId is required');
  const summary = await getExecutiveSummary({
    userId: executiveId,
    branchId: req.branchId,
    dateFrom,
    dateTo,
  });
  res.json(summary);
});

const getTeamOverviewHandler = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const executives = await User.find({
    role: 'sales_executive',
    status: 'active',
    ...(req.branchId ? { branchId: req.branchId } : {}),
  })
    .select('name email')
    .lean();
  const rows = await getTeamOverview(executives, { branchId: req.branchId, dateFrom, dateTo });
  res.json(rows);
});

const getAnalyticsHandler = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo } = req.query;
  const executiveId = resolveScopedExecutiveId(req, req.query.executiveId);
  const analytics = await getAnalytics({
    userId: executiveId || undefined,
    branchId: req.branchId,
    dateFrom,
    dateTo,
  });
  res.json(analytics);
});

const getHourDetail = asyncHandler(async (req, res) => {
  const {
    dateFrom, dateTo, hour, outcome, durationGt, sortBy, sortDir, search, page, limit,
    includeGuestBreakdown,
  } = req.query;
  const executiveId = resolveScopedExecutiveId(req, req.query.executiveId);

  let hourNum;
  if (hour !== undefined && hour !== '') {
    hourNum = Number(hour);
    if (!Number.isInteger(hourNum) || hourNum < 0 || hourNum > 23) {
      throw new ApiError(400, 'hour must be an integer between 0 and 23');
    }
  }

  const result = await getHourlyCallDetail({
    userId: executiveId && executiveId !== 'all' ? executiveId : undefined,
    branchId: req.branchId,
    dateFrom,
    dateTo,
    hour: hourNum,
    outcome,
    durationGt: durationGt !== undefined && durationGt !== '' ? Number(durationGt) : undefined,
    sortBy,
    sortDir,
    search,
    page,
    limit,
    includeGuestBreakdown: includeGuestBreakdown === 'true' || includeGuestBreakdown === true,
  });
  res.json(result);
});

module.exports = { getTimeline, getSummary, getTeamOverviewHandler, getAnalyticsHandler, getHourDetail };

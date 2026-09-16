const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const {
  buildAdminDashboard,
  buildDestinationDetail,
  buildDestinationInsight,
  buildExecutiveInsight,
} = require('../services/dashboardService');
const { getOrSetFresh, cacheKey, DEFAULT_TTL_MS } = require('../services/dashboardCacheService');

const getStats = asyncHandler(async (req, res) => {
  const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : '';
  const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : '';
  const source = typeof req.query.source === 'string' ? req.query.source : '';
  const filterKey = `${dateFrom || 'default'}:${dateTo || 'default'}:${source || 'all'}`;

  const stats = await getOrSetFresh(
    req,
    cacheKey('admin', `dashboard:${req.branchId || 'all'}:${filterKey}`),
    () =>
      buildAdminDashboard({
        branchId: req.branchId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        source: source || undefined,
      }),
    DEFAULT_TTL_MS
  );
  res.json(stats);
});

/** Top Destinations chart drill-down — same date-range semantics as getStats. */
const getDestinationDetail = asyncHandler(async (req, res) => {
  const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : '';
  const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : '';
  const source = typeof req.query.source === 'string' ? req.query.source : '';
  const namesParam = typeof req.query.names === 'string' ? req.query.names : '';
  const names = namesParam
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  if (!names.length) {
    throw new ApiError(400, 'names is required');
  }

  const filterKey = `${[...names].sort().join('|')}:${dateFrom || 'default'}:${dateTo || 'default'}:${source || 'all'}`;

  const result = await getOrSetFresh(
    req,
    cacheKey('admin', `dashboard-destination:${req.branchId || 'all'}:${filterKey}`),
    () =>
      buildDestinationDetail({
        branchId: req.branchId,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        source: source || undefined,
        names,
      }),
    DEFAULT_TTL_MS
  );
  res.json(result);
});

const insightQuery = (req) => {
  const period = typeof req.query.period === 'string' ? req.query.period : 'today';
  const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : '';
  const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : '';
  return { period, dateFrom, dateTo };
};

const getDestinationInsight = asyncHandler(async (req, res) => {
  const { period, dateFrom, dateTo } = insightQuery(req);
  const result = await getOrSetFresh(
    req,
    cacheKey('admin', `dashboard-dest-insight:${req.branchId || 'all'}:${period}:${dateFrom || '-'}:${dateTo || '-'}`),
    () =>
      buildDestinationInsight({
        branchId: req.branchId,
        period,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    DEFAULT_TTL_MS
  );
  res.json(result);
});

const getExecutiveInsight = asyncHandler(async (req, res) => {
  const { period, dateFrom, dateTo } = insightQuery(req);
  const result = await getOrSetFresh(
    req,
    cacheKey('admin', `dashboard-exec-insight:${req.branchId || 'all'}:${period}:${dateFrom || '-'}:${dateTo || '-'}`),
    () =>
      buildExecutiveInsight({
        branchId: req.branchId,
        period,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    DEFAULT_TTL_MS
  );
  res.json(result);
});

module.exports = { getStats, getDestinationDetail, getDestinationInsight, getExecutiveInsight };

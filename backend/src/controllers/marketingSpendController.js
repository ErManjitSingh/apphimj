const asyncHandler = require('../utils/asyncHandler');
const {
  listMarketingSpend,
  createMarketingSpend,
  updateMarketingSpend,
  deleteMarketingSpend,
  getMarketingSpendSummary,
} = require('../services/marketingSpendService');
const { invalidate: invalidateDashboardCache } = require('../services/dashboardCacheService');

const listSpend = asyncHandler(async (req, res) => {
  const { dateFrom, dateTo, channel, campaign, page, limit } = req.query;
  const result = await listMarketingSpend(req, { dateFrom, dateTo, channel, campaign, page, limit });
  res.json(result);
});

const getSummary = asyncHandler(async (req, res) => {
  const summary = await getMarketingSpendSummary(req.branchId);
  res.json(summary);
});

const createSpend = asyncHandler(async (req, res) => {
  const record = await createMarketingSpend(req, req.body);
  invalidateDashboardCache('admin');
  res.status(201).json(record);
});

const updateSpend = asyncHandler(async (req, res) => {
  const record = await updateMarketingSpend(req, req.params.id, req.body);
  invalidateDashboardCache('admin');
  res.json(record);
});

const deleteSpend = asyncHandler(async (req, res) => {
  await deleteMarketingSpend(req, req.params.id);
  invalidateDashboardCache('admin');
  res.json({ message: 'Marketing spend record deleted' });
});

module.exports = { listSpend, getSummary, createSpend, updateSpend, deleteSpend };

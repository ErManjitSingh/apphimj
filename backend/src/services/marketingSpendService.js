const MarketingSpend = require('../models/MarketingSpend');
const ApiError = require('../utils/apiError');
const { withBranch } = require('../utils/branchScope');
const { startOfDay, endOfDay } = require('../utils/queryHelpers');
const { parsePagination, paginatedResponse } = require('../utils/pagination');

const POPULATE = [
  { path: 'createdBy', select: 'name email' },
  { path: 'updatedBy', select: 'name email' },
];

const NOT_DELETED = { isDeleted: { $ne: true } };

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsMatch(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  return new RegExp(escapeRegex(trimmed), 'i');
}

function parseAmount(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new ApiError(400, 'amount must be a positive number');
  }
  return Math.round(value * 100) / 100;
}

function parseSpendDate(spendDate) {
  const date = spendDate ? new Date(spendDate) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, 'spendDate is invalid');
  }
  return date;
}

function parseChannel(channel) {
  const value = String(channel || '').trim();
  if (!value) throw new ApiError(400, 'channel is required');
  return value.slice(0, 80);
}

function buildDateRangeFilter(dateFrom, dateTo) {
  const range = {};
  if (dateFrom) {
    const from = new Date(dateFrom);
    if (Number.isNaN(from.getTime())) throw new ApiError(400, 'dateFrom is invalid');
    range.$gte = startOfDay(from);
  }
  if (dateTo) {
    const to = new Date(dateTo);
    if (Number.isNaN(to.getTime())) throw new ApiError(400, 'dateTo is invalid');
    range.$lte = endOfDay(to);
  }
  return Object.keys(range).length ? { spendDate: range } : {};
}

async function listMarketingSpend(req, { dateFrom, dateTo, channel, campaign, page, limit } = {}) {
  const { page: p, limit: l, skip } = parsePagination({ page, limit }, { defaultLimit: 25, maxLimit: 100 });

  const channelMatch = containsMatch(channel);
  const campaignMatch = containsMatch(campaign);
  const filter = withBranch(
    {
      ...NOT_DELETED,
      ...buildDateRangeFilter(dateFrom, dateTo),
      ...(channelMatch ? { channel: channelMatch } : {}),
      ...(campaignMatch ? { campaign: campaignMatch } : {}),
    },
    req.branchId
  );

  const [rows, total] = await Promise.all([
    MarketingSpend.find(filter)
      .populate(POPULATE)
      .sort({ spendDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(l)
      .lean(),
    MarketingSpend.countDocuments(filter),
  ]);

  return paginatedResponse(rows, { page: p, limit: l, total });
}

async function sumMarketingSpendInRange(branchId, start, end) {
  const rows = await MarketingSpend.aggregate([
    { $match: withBranch({ ...NOT_DELETED, spendDate: { $gte: start, $lte: end } }, branchId) },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return rows[0]?.total || 0;
}

async function getMarketingSpendSummary(branchId) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = startOfDay(new Date(todayStart.getTime() - 24 * 60 * 60 * 1000));
  const yesterdayEnd = endOfDay(new Date(todayStart.getTime() - 1));
  const weekStart = startOfDay(new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000));
  const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));

  const [today, yesterday, week, month] = await Promise.all([
    sumMarketingSpendInRange(branchId, todayStart, todayEnd),
    sumMarketingSpendInRange(branchId, yesterdayStart, yesterdayEnd),
    sumMarketingSpendInRange(branchId, weekStart, todayEnd),
    sumMarketingSpendInRange(branchId, monthStart, todayEnd),
  ]);

  return { today, yesterday, week, month };
}

async function createMarketingSpend(req, payload) {
  const doc = await MarketingSpend.create({
    branchId: req.branchId || req.user?.branchId || null,
    channel: parseChannel(payload.channel),
    campaign: String(payload.campaign || '').trim().slice(0, 120),
    amount: parseAmount(payload.amount),
    spendDate: parseSpendDate(payload.spendDate),
    notes: String(payload.notes || '').trim().slice(0, 500),
    source: 'manual',
    createdBy: req.user._id,
  });

  return MarketingSpend.findById(doc._id).populate(POPULATE).lean();
}

async function findOwnedRecord(req, id) {
  const record = await MarketingSpend.findOne(withBranch({ _id: id, ...NOT_DELETED }, req.branchId));
  if (!record) throw new ApiError(404, 'Marketing spend record not found');
  return record;
}

async function updateMarketingSpend(req, id, payload) {
  const record = await findOwnedRecord(req, id);

  if (payload.channel !== undefined) record.channel = parseChannel(payload.channel);
  if (payload.campaign !== undefined) record.campaign = String(payload.campaign || '').trim().slice(0, 120);
  if (payload.amount !== undefined) record.amount = parseAmount(payload.amount);
  if (payload.spendDate !== undefined) record.spendDate = parseSpendDate(payload.spendDate);
  if (payload.notes !== undefined) record.notes = String(payload.notes || '').trim().slice(0, 500);
  record.updatedBy = req.user._id;

  await record.save();
  return MarketingSpend.findById(record._id).populate(POPULATE).lean();
}

async function deleteMarketingSpend(req, id) {
  const record = await findOwnedRecord(req, id);
  record.isDeleted = true;
  record.updatedBy = req.user._id;
  await record.save();
}

module.exports = {
  listMarketingSpend,
  createMarketingSpend,
  updateMarketingSpend,
  deleteMarketingSpend,
  sumMarketingSpendInRange,
  getMarketingSpendSummary,
};

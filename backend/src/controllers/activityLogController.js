const ActivityLog = require('../models/ActivityLog');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity, getClientIp, ACTIVITY_LOG_RETENTION_MS } = require('../services/activityService');

const listActivityLogs = asyncHandler(async (req, res) => {
  const { type, search } = req.query;
  const since = new Date(Date.now() - ACTIVITY_LOG_RETENTION_MS);
  const filter = { createdAt: { $gte: since } };
  if (req.branchId) filter.branchId = req.branchId;

  if (type) filter.type = type;
  if (search?.trim()) {
    const q = search.trim();
    filter.$or = [
      { user: { $regex: q, $options: 'i' } },
      { action: { $regex: q, $options: 'i' } },
      { target: { $regex: q, $options: 'i' } },
    ];
  }

  // Header ticker only needs a handful; full Activity page can ask for more.
  const limit = Math.min(Math.max(1, Number(req.query.limit) || 40), 100);

  const logs = await ActivityLog.find(filter)
    .select('type user action target createdAt meta.leadId leadId')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json(
    logs.map((l) => ({
      ...l,
      date: l.createdAt,
    }))
  );
});

const createActivityLog = asyncHandler(async (req, res) => {
  const { type, action, target, user, meta } = req.body;
  if (!type || !action) throw new ApiError(400, 'type and action are required');

  const log = await logActivity({
    type,
    user: user || req.user.name,
    userId: req.user._id,
    action,
    target,
    ip: getClientIp(req),
    meta,
    branchId: req.branchId,
  });

  const obj = log.toObject();
  res.status(201).json({ ...obj, date: obj.createdAt });
});

module.exports = { listActivityLogs, createActivityLog };

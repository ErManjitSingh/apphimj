const Lead = require('../models/Lead');
const cacheService = require('./cacheService');

const LEAD_IDS_TTL_MS = 120_000;

async function getExecutiveLeadIds(userId, branchId = null) {
  const key = `exec-leads:${userId}:${branchId || 'all'}`;
  return cacheService.getOrSet(
    key,
    () =>
      Lead.distinct('_id', {
        assignedTo: userId,
        ...(branchId ? { branchId } : {}),
      }),
    LEAD_IDS_TTL_MS
  );
}

function buildExecutiveFollowUpFilter(userId, branchId, _leadIds) {
  // Strict own-queue scope — never another executive's follow-ups.
  return {
    ...(branchId ? { branchId } : {}),
    assignedTo: userId,
  };
}

function buildExecutiveQuotationFilter(userId, branchId, leadIds) {
  return {
    ...(branchId ? { branchId } : {}),
    $or: [{ createdByExecutive: userId }, { lead: { $in: leadIds } }],
  };
}

async function invalidateExecutiveLeadIdsCache(userId, branchId = null) {
  await cacheService.invalidate(`exec-leads:${userId}:${branchId || 'all'}`);
}

module.exports = {
  getExecutiveLeadIds,
  buildExecutiveFollowUpFilter,
  buildExecutiveQuotationFilter,
  invalidateExecutiveLeadIdsCache,
  LEAD_IDS_TTL_MS,
};

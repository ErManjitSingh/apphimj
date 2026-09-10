const Lead = require('../models/Lead');
const LeadNote = require('../models/LeadNote');
const FollowUp = require('../models/FollowUp');
const Quotation = require('../models/Quotation');
const {
  LEAD_DETAIL_SELECT,
  LEAD_DETAIL_POPULATE,
  FOLLOWUP_ON_LEAD_POPULATE,
  QUOTATION_ON_LEAD_POPULATE,
  withManagementFields,
  withManagementPopulate,
} = require('../utils/leadQueryFields');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { DETAIL_RELATED_LIMIT } = require('../constants/detailLimits');

async function loadLeadCore(leadId, { branchId, extraFilter = {}, includeManagementFields = false } = {}) {
  return Lead.findOne({
    _id: leadId,
    isDeleted: { $ne: true },
    ...(branchId ? { branchId } : {}),
    ...extraFilter,
  })
    .select(withManagementFields(LEAD_DETAIL_SELECT, includeManagementFields))
    .populate(withManagementPopulate(LEAD_DETAIL_POPULATE, includeManagementFields))
    .lean();
}

async function loadLeadFollowups(leadId, { branchId, extraFilter = {}, query = {} } = {}) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 50 });
  const filter = {
    lead: leadId,
    ...(branchId ? { branchId } : {}),
    ...extraFilter,
  };

  const [rows, total] = await Promise.all([
    FollowUp.find(filter)
      .populate(FOLLOWUP_ON_LEAD_POPULATE)
      .sort({ scheduledAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FollowUp.countDocuments(filter),
  ]);

  return {
    followups: rows,
    followUpTotal: total,
    pagination: paginatedResponse(rows, { page, limit, total }).pagination,
  };
}

async function loadLeadQuotations(leadId, { branchId, extraFilter = {}, query = {} } = {}) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 50 });
  const filter = {
    lead: leadId,
    ...(branchId ? { branchId } : {}),
    ...extraFilter,
  };

  const [rows, total] = await Promise.all([
    Quotation.find(filter)
      .populate(QUOTATION_ON_LEAD_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Quotation.countDocuments(filter),
  ]);

  return {
    quotations: rows,
    quotationTotal: total,
    pagination: paginatedResponse(rows, { page, limit, total }).pagination,
  };
}

async function loadLeadNotes(leadId, { query = {} } = {}) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { lead: leadId };

  const [rows, total] = await Promise.all([
    LeadNote.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LeadNote.countDocuments(filter),
  ]);

  return {
    notes: rows.map((n) => ({
      _id: n._id,
      message: n.text,
      user: n.user?.name || 'Team',
      date: n.createdAt,
    })),
    notesTotal: total,
    pagination: paginatedResponse(rows, { page, limit, total }).pagination,
  };
}

async function loadLeadRelated(leadId, options = {}) {
  const limit = Math.min(Number(options.followupsLimit) || DETAIL_RELATED_LIMIT, 50);
  const [followups, quotations] = await Promise.all([
    loadLeadFollowups(leadId, { ...options, query: { page: 1, limit } }),
    loadLeadQuotations(leadId, { ...options, query: { page: 1, limit } }),
  ]);
  return {
    followups: followups.followups,
    followUpTotal: followups.followUpTotal,
    quotations: quotations.quotations,
    quotationTotal: quotations.quotationTotal,
  };
}

module.exports = {
  loadLeadCore,
  loadLeadFollowups,
  loadLeadQuotations,
  loadLeadNotes,
  loadLeadRelated,
};

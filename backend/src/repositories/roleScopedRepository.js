const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const { LEAD_LIST_SELECT, withManagementFields, withManagementPopulate } = require('../utils/leadQueryFields');
const FollowUp = require('../models/FollowUp');
const Quotation = require('../models/Quotation');
const { buildLeadListFilter } = require('./leadRepository');
const {
  LEAD_POPULATE,
  LEAD_LIST_POPULATE,
  FOLLOWUP_LIST_POPULATE,
  FOLLOWUP_LIST_SELECT,
  QUOTATION_LIST_POPULATE,
  QUOTATION_LIST_SELECT,
  enrichLead,
  buildLeadSearchFilter,
  buildFollowUpTabFilter,
  buildFollowUpCategoryFilter,
  startOfDay,
  isConvertedListQuery,
  applyConvertedPeriodFilter,
} = require('../utils/queryHelpers');
const {
  parsePagination,
  parseSort,
  paginatedResponse,
  DEEP_PAGE_THRESHOLD,
} = require('../utils/pagination');
const { withBranch } = require('../utils/branchScope');
const { applyListStatusBucket } = require('../utils/listStatusBucketFilter');
const { applyQuotationQueryFilters } = require('./quotationRepository');
const {
  findPackageSharedLeadIds,
  wantsPackageSharedLeads,
} = require('../utils/packageSharedLeads');
const { attachFirstCall } = require('../utils/firstCallInfo');
const { applyPhoneVisibilityGate } = require('../utils/leadPhoneVisibility');

const LIST_PAGINATION = { defaultLimit: 20, maxLimit: 200 };

function parseLocalDayStart(dateStr) {
  const parts = String(dateStr || '').split('-').map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
  }
  return startOfDay(new Date(dateStr));
}

function parseLocalDayEnd(dateStr) {
  const parts = String(dateStr || '').split('-').map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
  }
  const end = new Date(dateStr);
  end.setHours(23, 59, 59, 999);
  return end;
}

function buildDateRange(query = {}) {
  if (!query.dateFrom && !query.dateTo) return null;
  const range = {};
  if (query.dateFrom) range.$gte = parseLocalDayStart(query.dateFrom);
  if (query.dateTo) range.$lte = parseLocalDayEnd(query.dateTo);
  return range;
}

function applyCreatedAtRange(filter, query = {}) {
  const range = buildDateRange(query);
  if (!range) return filter;
  if (isConvertedListQuery(query)) {
    return applyConvertedPeriodFilter(filter, range);
  }
  filter.createdAt = range;
  return filter;
}

function applyPeriodTouch(filter, query = {}) {
  const range = buildDateRange(query);
  if (!range) return filter;
  if (isConvertedListQuery(query)) {
    return applyConvertedPeriodFilter(filter, range);
  }
  const touch = {
    $or: [
      { createdAt: { ...range } },
      { assignedAt: { ...range } },
    ],
  };
  if (Array.isArray(filter.$and)) {
    filter.$and.push(touch);
  } else if (filter.$or) {
    filter.$and = [{ $or: filter.$or }, touch];
    delete filter.$or;
  } else {
    filter.$and = [touch];
  }
  return filter;
}

function withActiveLead(filter = {}) {
  return { ...filter, isDeleted: { $ne: true } };
}

function applyReactivationQueryFilters(mongoFilter, query = {}) {
  const stage = query.reactivationStage || query.stage;
  if (stage) mongoFilter['reactivation.stage'] = stage;
  if (query.status) mongoFilter.status = query.status;
  if (query.executiveId) mongoFilter.assignedTo = query.executiveId;
  const from = query.reactivatedFrom || query.from;
  const to = query.reactivatedTo || query.to;
  if (from || to) {
    mongoFilter['reactivation.reactivatedAt'] = {};
    if (from) mongoFilter['reactivation.reactivatedAt'].$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      mongoFilter['reactivation.reactivatedAt'].$lte = end;
    }
  }
}

function isWorkingProgressFilter(filter) {
  return filter === 'working-progress' || filter === 'working_progress' || filter === 'working';
}

/**
 * Manager-only buckets (lost / reactivated / working-progress) keep their own dedicated
 * logic — Admin's Lead Management has no equivalent list-filter values for these. Every
 * other view (all/unassigned/assigned/hot/returned/arrivals/bookings) delegates to
 * buildLeadListFilter — the exact same filter builder Admin's Lead Management uses — so
 * Sales Manager gets full parity (search/source/destination/budget/executive/team/state/
 * priority/travel-month/connected/date-range routing) instead of a second, drifting
 * implementation of the same rules.
 */
async function buildManagerLeadFilter(query = {}, options = {}) {
  const { filter, search } = query;

  if (isWorkingProgressFilter(filter)) {
    const mongoFilter = {
      ...buildLeadSearchFilter(search),
      status: { $in: ['working_progress', 'follow_up', 'negotiation'] },
    };
    applyCreatedAtRange(mongoFilter, query);
    applyListStatusBucket(mongoFilter, query.listStatus);
    return mongoFilter;
  }
  if (filter === 'lost') {
    const mongoFilter = {
      ...buildLeadSearchFilter(search),
      status: { $in: ['lost', 'booked_from_another_company'] },
    };
    applyCreatedAtRange(mongoFilter, query);
    applyListStatusBucket(mongoFilter, query.listStatus);
    return mongoFilter;
  }
  if (filter === 'reactivated') {
    const mongoFilter = { ...buildLeadSearchFilter(search), 'reactivation.isReactivated': true };
    applyReactivationQueryFilters(mongoFilter, query);
    applyCreatedAtRange(mongoFilter, query);
    applyListStatusBucket(mongoFilter, query.listStatus);
    return mongoFilter;
  }

  return buildLeadListFilter(query, options);
}

/** Accepts only a well-formed Mongo ObjectId string — an untrusted query param must never
 * reach a raw Mongo filter unvalidated (a malformed value would otherwise throw a cast error). */
function parseValidObjectId(value) {
  if (!value) return null;
  const raw = String(value).trim();
  return mongoose.Types.ObjectId.isValid(raw) ? raw : null;
}

function buildExecutiveLeadFilter(filterKey, query = {}) {
  if (filterKey === 'new') {
    const range = buildDateRange(query) || {
      $gte: startOfDay(),
      $lte: (() => {
        const end = startOfDay();
        end.setHours(23, 59, 59, 999);
        return end;
      })(),
    };
    return {
      $or: [
        { createdAt: range },
        { assignedAt: range },
      ],
    };
  }
  // Connected = status contacted only (call picked). WIP is a separate filter.
  if (filterKey === 'contacted') {
    return { status: 'contacted' };
  }
  if (filterKey === 'new-lead' || filterKey === 'new_lead') {
    return { status: { $in: ['new_lead', 'new'] } };
  }
  if (filterKey === 'not-reachable' || filterKey === 'not_reachable') {
    return { status: 'not_reachable' };
  }
  if (filterKey === 'qualified') {
    return { status: { $in: ['qualified', 'contacted'] } };
  }
  if (filterKey === 'package-sent' || filterKey === 'package_sent') {
    return { status: { $in: ['package_sent', 'quotation_sent'] } };
  }
  if (filterKey === 'postponed') {
    return { status: 'postponed' };
  }
  if (filterKey === 'booked') {
    return { status: { $in: ['booked', 'converted'] } };
  }
  if (isWorkingProgressFilter(filterKey)) return { status: 'working_progress' };
  if (filterKey === 'follow-up') return { status: { $in: ['follow_up', 'negotiation'] } };
  if (filterKey === 'converted') return { status: { $in: ['converted', 'booked'] } };
  if (filterKey === 'lost') return { status: { $in: ['lost', 'booked_from_another_company'] } };
  if (filterKey === 'reactivated') {
    return {
      'reactivation.isReactivated': true,
      status: { $nin: ['lost', 'booked_from_another_company', 'converted'] },
    };
  }
  if (filterKey === 'hot') {
    return {
      $or: [{ isHot: true }, { temperature: 'hot' }],
      status: { $nin: ['lost', 'booked_from_another_company', 'converted', 'booked'] },
    };
  }
  if (filterKey === 'duplicates' || filterKey === 'repeated') {
    return { isRepeatCustomer: true };
  }
  if (filterKey === 'returned') {
    return {
      assignmentAcceptance: 'expired',
      assignedTo: null,
    };
  }
  return {};
}

async function findManagerLeadsPaginated(query = {}, options = {}) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query, { createdAt: -1 });

  // Sales Manager's "All Leads" Branch filter is a read-only widening of this list only.
  // Read from `leadBranchId`, NOT `branchId` — the generic `branchId` query param is
  // inspected by the auth middleware (req.branchId resolution) for org-wide branch
  // switching, and a non-org-wide role sending a mismatched `branchId` gets a 403 before
  // this code ever runs. This dedicated param avoids that collision entirely, and never
  // overwrites options.branchId (req.branchId) — every other manager endpoint (assign,
  // quotations, dashboard, notifications, reports...) stays scoped to their own branch
  // exactly as before. No branch picked -> falls back to their own branch, same as today.
  const requestedBranchId = parseValidObjectId(query.leadBranchId);
  const effectiveBranchId = requestedBranchId || options.branchId;

  const built = await buildManagerLeadFilter(query, { branchId: effectiveBranchId });
  const filter = withActiveLead(withBranch(built, effectiveBranchId));

  if (wantsPackageSharedLeads(query)) {
    const ids = await findPackageSharedLeadIds({ branchId: effectiveBranchId });
    filter._id = { $in: ids.length ? ids : [] };
  }

  const needsTotal = page <= DEEP_PAGE_THRESHOLD;

  const [rows, total] = await Promise.all([
    Lead.find(filter)
      .select(withManagementFields(LEAD_LIST_SELECT, options.includeManagementFields))
      .populate(withManagementPopulate(LEAD_LIST_POPULATE, options.includeManagementFields))
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    needsTotal ? Lead.countDocuments(filter) : Promise.resolve(null),
  ]);

  const enriched = rows.map(enrichLead);
  await attachFirstCall(enriched);

  return paginatedResponse(enriched, {
    page,
    limit,
    total,
    hasMore: rows.length === limit,
  });
}

function maskReturnedLeadForExecutive(lead, executiveId) {
  if (!lead || !executiveId) return lead;
  const missedBy = lead.acceptanceMissedBy?._id || lead.acceptanceMissedBy;
  const isReturned =
    lead.assignmentAcceptance === 'expired' &&
    String(missedBy) === String(executiveId) &&
    !lead.assignedTo;
  if (!isReturned) return lead;
  return {
    ...lead,
    phone: 'XXXX',
    alternatePhone: lead.alternatePhone ? 'XXXX' : '',
    whatsapp: lead.whatsapp ? 'XXXX' : '',
    email: lead.email ? 'xxxx@xxxx.com' : '',
    contactMasked: true,
    returnedToPool: true,
  };
}

async function findExecutiveLeadsPaginated(userId, query = {}, options = {}) {
  const filterKey = query.filter || query.paramsFilter;
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(
    query,
    filterKey === 'converted' ? { convertedAt: -1, updatedAt: -1 } : { createdAt: -1 }
  );

  // Expired acceptances are handled by notificationScheduler — not on every list request

  const searchPart = buildLeadSearchFilter(query.search);
  const statusExtras = buildExecutiveLeadFilter(filterKey, query);

  // Dedicated Returned Leads view — leads this exec did not accept in time
  if (filterKey === 'returned') {
    const returnedFilter = withActiveLead({
      acceptanceMissedBy: userId,
      ...statusExtras,
      ...searchPart,
    });
    Object.assign(returnedFilter, withBranch({}, options.branchId));
    const needsTotal = page <= DEEP_PAGE_THRESHOLD;
    const [rows, total] = await Promise.all([
      Lead.find(returnedFilter)
        .select(LEAD_LIST_SELECT)
        .populate(LEAD_LIST_POPULATE)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      needsTotal ? Lead.countDocuments(returnedFilter) : Promise.resolve(null),
    ]);
    const enriched = rows.map((row) => maskReturnedLeadForExecutive(enrichLead(row), userId));
    return paginatedResponse(enriched, {
      page,
      limit,
      total,
      hasMore: rows.length === limit,
    });
  }

  const owned = withActiveLead({
    assignedTo: userId,
  });
  // Avoid clobbering $or when Today filter + search both use it
  const andParts = [];
  if (statusExtras.$or) {
    andParts.push({ $or: statusExtras.$or });
  } else {
    Object.assign(owned, statusExtras);
  }
  if (searchPart.$or) {
    andParts.push({ $or: searchPart.$or });
  } else {
    Object.assign(owned, searchPart);
  }
  Object.assign(owned, withBranch({}, options.branchId));
  if (filterKey !== 'new') applyPeriodTouch(owned, query);

  const isRepeatedView = filterKey === 'duplicates' || filterKey === 'repeated';
  const isTotalView = filterKey === 'all' || !filterKey;
  const isFreshView = filterKey === 'new';
  // Repeated leads only appear under Repeated menu — except Total / Fresh (reassign keeps full data)
  if (!isRepeatedView && !isTotalView && !isFreshView) {
    owned.isRepeatCustomer = { $ne: true };
  }

  if (filterKey === 'hot') {
    owned.isHot = true;
    owned.status = { $nin: ['converted', 'booked', 'lost', 'booked_from_another_company'] };
  }

  if (isTotalView || filterKey === 'package-shared' || filterKey === 'package_shared') {
    // Total Leads = all assigned (any status). Optional status query still applies.
    if (query.status) owned.status = query.status;
    if (query.destination) owned.destination = query.destination;
    if (query.state) owned.state = query.state;
    if (query.statusReason) {
      owned.statusReason = { $regex: String(query.statusReason).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    if (query.priority && query.priority !== 'hot') owned.priority = query.priority;
  }

  // Source / temperature apply on any list view (advanced filter bar)
  if (query.source) {
    const src = String(query.source).trim().toLowerCase();
    const SOURCE_ALIASES = {
      google_ads: ['google_ads', 'google', 'website', 'dpw'],
      facebook_ads: ['facebook_ads', 'facebook', 'meta', 'website_2', 'dpw2', 'portal_lead', 'instagram'],
      website: ['website', 'dpw', 'dpw_wa', 'website_form'],
      organic: ['organic', 'direct', 'website'],
      manual: ['manual', 'manual_entry', 'call_lead', 'referral'],
    };
    const aliases = SOURCE_ALIASES[src];
    if (aliases) owned.source = { $in: aliases };
    else owned.source = query.source;
  }
  if (query.temperature === 'hot' || query.priority === 'hot') {
    andParts.push({ $or: [{ temperature: 'hot' }, { isHot: true }] });
    // Closed leads must never appear in heat buckets (even if temp was left cold historically).
    andParts.push({
      status: { $nin: ['lost', 'booked_from_another_company', 'converted', 'booked'] },
    });
  } else if (query.temperature === 'warm' || query.temperature === 'cold') {
    owned.temperature = query.temperature;
    andParts.push({
      status: { $nin: ['lost', 'booked_from_another_company', 'converted', 'booked'] },
    });
  } else if (query.temperature === 'na') {
    owned.temperature = 'na';
  }
  // Destination / state also useful outside Total view
  if (filterKey && filterKey !== 'all' && filterKey !== 'package-shared' && filterKey !== 'package_shared') {
    if (query.destination) owned.destination = query.destination;
    if (query.state) owned.state = query.state;
  }

  if (andParts.length) {
    owned.$and = [...(owned.$and || []), ...andParts];
  }

  if (isRepeatedView) {
    owned.isRepeatCustomer = true;
    // Show all assigned repeated (any status) so none hide in Total
    delete owned.status;
  }

  if (wantsPackageSharedLeads(query)) {
    const sharedIds = await findPackageSharedLeadIds({ branchId: options.branchId });
    owned._id = { $in: sharedIds.length ? sharedIds : [] };
  }

  const filter = owned;

  const needsTotal = page <= DEEP_PAGE_THRESHOLD;
  const [rows, total] = await Promise.all([
    Lead.find(filter)
      .select(LEAD_LIST_SELECT)
      .populate(LEAD_LIST_POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    needsTotal ? Lead.countDocuments(filter) : Promise.resolve(null),
  ]);

  let enriched = rows.map((row) => maskReturnedLeadForExecutive(enrichLead(row), userId));
  if (filterKey === 'converted' || filter.status === 'converted') {
    const { attachPaymentSummariesToLeads } = require('../services/paymentReceiptService');
    enriched = await attachPaymentSummariesToLeads(enriched);
  }
  // Phones visible to sales executives (call-gating disabled).
  enriched = await applyPhoneVisibilityGate(enriched, {
    viewerRole: 'sales_executive',
  });

  return paginatedResponse(enriched, {
    page,
    limit,
    total,
    hasMore: rows.length === limit,
  });
}

async function findTeamLeaderLeadsPaginated(squadFilter, query = {}, options = {}) {
  const { page, limit, skip } = parsePagination(query);
  const sort = parseSort(query, { createdAt: -1 });
  const extra = {};
  if (query.filter === 'reactivated') {
    extra['reactivation.isReactivated'] = true;
    applyReactivationQueryFilters(extra, query);
  }
  if (isWorkingProgressFilter(query.filter)) extra.status = 'working_progress';
  if (query.filter === 'lost') extra.status = { $in: ['lost', 'booked_from_another_company'] };
  if (query.filter === 'assigned') extra.assignedTo = { $ne: null };
  if (query.filter === 'unassigned') extra.assignedTo = null;
  if (query.filter === 'returned') {
    extra.assignedTo = null;
    extra.assignmentAcceptance = 'expired';
    if (squadFilter?.assignedTo?.$in) {
      extra.acceptanceMissedBy = { $in: squadFilter.assignedTo.$in };
    }
  }
  if (query.filter === 'hot') {
    extra.$or = [{ isHot: true }, { leadScore: 'hot' }];
    extra.status = { $nin: ['converted', 'lost', 'booked_from_another_company'] };
  }
  if (!query.filter || query.filter === 'all' || query.filter === 'package-shared' || query.filter === 'package_shared') {
    if (query.status) extra.status = query.status;
    if (query.destination) extra.destination = query.destination;
    if (query.priority === 'hot') extra.isHot = true;
    else if (query.priority) extra.priority = query.priority;
  }
  const filter = withActiveLead(
    withBranch({ ...squadFilter, ...extra, ...buildLeadSearchFilter(query.search) }, options.branchId)
  );
  applyCreatedAtRange(filter, query);
  applyListStatusBucket(filter, query.listStatus);

  if (wantsPackageSharedLeads(query)) {
    const sharedIds = await findPackageSharedLeadIds({ branchId: options.branchId });
    filter._id = { $in: sharedIds.length ? sharedIds : [] };
  }

  const needsTotal = page <= DEEP_PAGE_THRESHOLD;

  const [rows, total] = await Promise.all([
    Lead.find(filter)
      .select(LEAD_LIST_SELECT)
      .populate(LEAD_LIST_POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    needsTotal ? Lead.countDocuments(filter) : Promise.resolve(null),
  ]);

  return paginatedResponse(rows.map(enrichLead), {
    page,
    limit,
    total,
    hasMore: rows.length === limit,
  });
}

async function resolveLeadIdsForSearch(search, options = {}) {
  if (!search?.trim()) return null;
  const leads = await Lead.find(withBranch(buildLeadSearchFilter(search), options.branchId))
    .select('_id')
    .limit(200)
    .lean();
  return leads.map((l) => l._id);
}

/**
 * Merge Mongo filters without clobbering `$or` / `$and` (e.g. executive scope `$or`
 * must stay when tab filter also uses `$or` for missed pending).
 */
function mergeMongoFilters(base = {}, extra = {}) {
  const out = { ...base };
  for (const [key, value] of Object.entries(extra || {})) {
    if (value === undefined) continue;
    if (key === '$or') {
      if (out.$or) {
        out.$and = [...(out.$and || []), { $or: out.$or }, { $or: value }];
        delete out.$or;
      } else if (Array.isArray(out.$and)) {
        out.$and.push({ $or: value });
      } else {
        out.$or = value;
      }
      continue;
    }
    if (key === '$and') {
      out.$and = [...(out.$and || []), ...(Array.isArray(value) ? value : [value])];
      continue;
    }
    out[key] = value;
  }
  return out;
}

async function findScopedFollowUpsPaginated(baseFilter, query = {}, options = {}) {
  const { page, limit, skip } = parsePagination(query, LIST_PAGINATION);
  const sort = parseSort(query, { scheduledAt: 1 });

  let filter = mergeMongoFilters(
    withBranch(baseFilter, options.branchId),
    buildFollowUpTabFilter(query.tab || query.kpiTab)
  );
  filter = mergeMongoFilters(filter, buildFollowUpCategoryFilter(query.category));

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;

  const leadIds = await resolveLeadIdsForSearch(query.search, options);
  if (leadIds) filter.lead = { $in: leadIds };

  const [rows, total] = await Promise.all([
    FollowUp.find(filter)
      .select(FOLLOWUP_LIST_SELECT)
      .populate(FOLLOWUP_LIST_POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    FollowUp.countDocuments(filter),
  ]);

  return paginatedResponse(rows, { page, limit, total });
}

async function findScopedQuotationsPaginated(baseFilter, query = {}, { mapRow, branchId } = {}) {
  const { page, limit, skip } = parsePagination(query, LIST_PAGINATION);
  const sort = parseSort(query, { createdAt: -1 });
  const filter = await applyQuotationQueryFilters(withBranch(baseFilter, branchId), query, branchId);

  const [rows, total] = await Promise.all([
    Quotation.find(filter)
      .select(QUOTATION_LIST_SELECT)
      .populate(QUOTATION_LIST_POPULATE)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Quotation.countDocuments(filter),
  ]);

  const data = mapRow ? rows.map(mapRow) : rows;
  return paginatedResponse(data, { page, limit, total });
}

async function getFollowUpSummary(baseFilter = {}, options = {}) {
  const scopedBase = withBranch(baseFilter, options.branchId);
  const todayStart = startOfDay();
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);

  const [row] = await FollowUp.aggregate([
    { $match: scopedBase },
    {
      $facet: {
        total: [{ $count: 'n' }],
        today: [
          { $match: { scheduledAt: { $gte: todayStart, $lte: todayEnd } } },
          { $count: 'n' },
        ],
        missed: [
          {
            $match: {
              $or: [{ status: 'missed' }, { status: 'pending', scheduledAt: { $lt: todayStart } }],
            },
          },
          { $count: 'n' },
        ],
        upcoming: [
          { $match: { status: 'pending', scheduledAt: { $gt: todayEnd } } },
          { $count: 'n' },
        ],
        completed: [{ $match: { status: 'completed' } }, { $count: 'n' }],
      },
    },
  ]);

  const facet = row || {};
  const count = (key) => facet?.[key]?.[0]?.n ?? 0;

  return {
    total: count('total'),
    today: count('today'),
    missed: count('missed'),
    upcoming: count('upcoming'),
    completed: count('completed'),
  };
}

async function getQuotationStats(baseFilter = {}, options = {}) {
  const scopedBase = withBranch(baseFilter, options.branchId);
  const [total, sent, approved, pipelineAgg] = await Promise.all([
    Quotation.countDocuments(scopedBase),
    Quotation.countDocuments({ ...scopedBase, status: 'sent' }),
    Quotation.countDocuments({ ...scopedBase, status: 'approved' }),
    Quotation.aggregate([
      { $match: { ...scopedBase, status: { $in: ['sent', 'negotiation', 'pending_approval', 'draft'] } } },
      { $group: { _id: null, value: { $sum: { $ifNull: ['$pricing.total', 0] } } } },
    ]),
  ]);

  return {
    total,
    sent,
    approved,
    value: pipelineAgg[0]?.value || 0,
  };
}

module.exports = {
  findManagerLeadsPaginated,
  findExecutiveLeadsPaginated,
  findTeamLeaderLeadsPaginated,
  findScopedFollowUpsPaginated,
  findScopedQuotationsPaginated,
  getFollowUpSummary,
  getQuotationStats,
  buildExecutiveLeadFilter,
};

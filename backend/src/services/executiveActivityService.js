const mongoose = require('mongoose');
const LeadActivity = require('../models/LeadActivity');
const ExecutiveActivityLog = require('../models/ExecutiveActivityLog');
const CallNote = require('../models/CallNote');
const { bucketOutcome } = require('../models/CallNote');
const { startOfDay, endOfDay } = require('../utils/queryHelpers');
const { parsePagination, paginatedResponse } = require('../utils/pagination');

/** Same convention as callReportService.js — kept local rather than cross-imported. */
function toIdString(value) {
  if (!value) return '';
  return String(value._id || value);
}

function toObjectId(id) {
  if (!id) return null;
  return mongoose.Types.ObjectId.isValid(String(id)) ? new mongoose.Types.ObjectId(String(id)) : null;
}

function resolvePeriod(dateFrom, dateTo) {
  const now = new Date();
  const periodStart = dateFrom ? startOfDay(new Date(dateFrom)) : startOfDay(now);
  const periodEnd = dateTo ? endOfDay(new Date(dateTo)) : endOfDay(dateFrom ? new Date(dateFrom) : now);
  return { periodStart, periodEnd };
}

const ORG_TZ = process.env.ATTENDANCE_TZ || 'Asia/Kolkata';
const INACTIVITY_THRESHOLD_MINUTES = Number(process.env.CRM_ACTIVITY_IDLE_THRESHOLD_MIN ?? 30);
const SOURCE_CAP = 500; // per-source, per-request cap — generous for a single executive/date-range

const MODULE_LABELS = {
  dashboard: 'Dashboard',
  leads: 'Leads',
  quotations: 'Quotations',
  follow_ups: 'Follow-ups',
  calendar: 'Calendar',
  customers: 'Customers',
  notifications: 'Notifications',
  whatsapp: 'WhatsApp',
  email_activity: 'Email Activity',
};

const EXEC_LOG_TITLES = {
  login: 'Logged in',
  logout: 'Logged out',
  lead_viewed: 'Lead viewed',
  leads_list_opened: 'Leads list opened',
  booking_created: 'Booking created',
  booking_updated: 'Booking updated',
};

function dayKeyInTz(date, tz = ORG_TZ) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date(date));
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function normalizeLeadActivity(doc) {
  return {
    id: `la_${doc._id}`,
    type: doc.type,
    at: doc.createdAt,
    title: doc.title,
    description: doc.description || '',
    meta: doc.meta || {},
  };
}

function normalizeExecLog(doc) {
  const title = doc.type === 'module_opened'
    ? `${MODULE_LABELS[doc.module] || doc.module || 'Module'} opened`
    : (EXEC_LOG_TITLES[doc.type] || doc.type);
  const description = doc.meta?.leadName || doc.meta?.bookingNumber || '';
  return {
    id: `ea_${doc._id}`,
    type: doc.type,
    at: doc.createdAt,
    title,
    description,
    meta: { ...(doc.meta || {}), module: doc.module || doc.meta?.module },
  };
}

/** Presentation-only transform — mirrors callReportService.expandToEvents. No new DB writes. */
function expandCallNoteToEvents(note) {
  const bucket = bucketOutcome(note.outcome);
  const leadName = note.leadId?.name || 'Unknown guest';
  const startedAt = note.startedAt || note.createdAt;
  const endedAt = note.endedAt || note.createdAt;
  return [
    {
      id: `cs_${note._id}`,
      type: 'call_started',
      at: startedAt,
      title: 'Call started',
      description: leadName,
      meta: { leadId: note.leadId?._id, leadName },
    },
    {
      id: `ce_${note._id}`,
      type: 'call_ended',
      at: endedAt,
      title: 'Call ended',
      description: leadName,
      meta: { leadId: note.leadId?._id, leadName, duration: note.duration || 0, outcome: note.outcome, outcomeBucket: bucket },
    },
  ];
}

async function fetchMergedEvents({ userId, branchId, periodStart, periodEnd }) {
  const range = { $gte: periodStart, $lte: periodEnd };
  const [leadDocs, execDocs, callDocs] = await Promise.all([
    LeadActivity.find({ actorId: userId, ...(branchId ? { branchId } : {}), createdAt: range })
      .sort({ createdAt: 1 }).limit(SOURCE_CAP).lean(),
    ExecutiveActivityLog.find({ userId, ...(branchId ? { branchId } : {}), createdAt: range })
      .sort({ createdAt: 1 }).limit(SOURCE_CAP).lean(),
    CallNote.find({ userId, ...(branchId ? { branchId } : {}), createdAt: range })
      .sort({ createdAt: 1 }).limit(SOURCE_CAP).populate('leadId', 'name').lean(),
  ]);

  const events = [
    ...leadDocs.map(normalizeLeadActivity),
    ...execDocs.map(normalizeExecLog),
    ...callDocs.flatMap(expandCallNoteToEvents),
  ];
  events.sort((a, b) => new Date(a.at) - new Date(b.at));
  return events;
}

/**
 * Pure function: walk chronological event gaps. A gap under the inactivity threshold
 * counts as active time; a longer gap counts as idle. No mouse/keystroke tracking —
 * only derived from the same merged CRM-activity timeline as everything else here.
 */
function computeActiveIdleTime(events = [], thresholdMinutes = INACTIVITY_THRESHOLD_MINUTES) {
  const sorted = [...events].sort((a, b) => new Date(a.at) - new Date(b.at));
  if (sorted.length < 2) {
    return { activeMs: 0, idleMs: 0, sessionMs: 0, segments: [] };
  }
  const thresholdMs = thresholdMinutes * 60 * 1000;
  let activeMs = 0;
  let idleMs = 0;
  const segments = [];
  for (let i = 1; i < sorted.length; i += 1) {
    const from = new Date(sorted[i - 1].at);
    const to = new Date(sorted[i].at);
    const gap = to - from;
    if (gap <= thresholdMs) {
      activeMs += gap;
      segments.push({ from, to, status: 'active' });
    } else {
      idleMs += gap;
      segments.push({ from, to, status: 'idle' });
    }
  }
  const sessionMs = new Date(sorted[sorted.length - 1].at) - new Date(sorted[0].at);
  return { activeMs, idleMs, sessionMs, segments };
}

async function logExecutiveActivity({ userId, branchId, type, refId = null, module = null, meta = {} }) {
  if (!userId || !type) return null;
  try {
    return await ExecutiveActivityLog.create({ userId, branchId: branchId || null, type, refId, module, meta });
  } catch {
    return null; // logging must never break the real request
  }
}

async function getActivityTimeline({ userId, branchId, dateFrom, dateTo, page, limit }) {
  const { periodStart, periodEnd } = resolvePeriod(dateFrom, dateTo);
  const events = await fetchMergedEvents({ userId, branchId, periodStart, periodEnd });
  const { page: p, limit: l, skip } = parsePagination({ page, limit }, { defaultLimit: 20, maxLimit: 100 });
  const total = events.length;
  const slice = events.slice(skip, skip + l);
  return { events: slice, pagination: paginatedResponse(null, { page: p, limit: l, total }).pagination };
}

async function getActivitySummary({ userId, branchId, dateFrom, dateTo }) {
  const { periodStart, periodEnd } = resolvePeriod(dateFrom, dateTo);
  const events = await fetchMergedEvents({ userId, branchId, periodStart, periodEnd });
  const { activeMs, idleMs, sessionMs } = computeActiveIdleTime(events);
  const countByType = (types) => events.filter((e) => types.includes(e.type)).length;

  const { getExecutiveSummary } = require('./callReportService');
  const callSummary = await getExecutiveSummary({ userId, branchId, dateFrom, dateTo });

  return {
    totalActivities: events.length,
    firstActivityAt: events[0]?.at || null,
    lastActivityAt: events[events.length - 1]?.at || null,
    activeMs,
    idleMs,
    sessionMs,
    inactivityThresholdMinutes: INACTIVITY_THRESHOLD_MINUTES,
    totalCalls: callSummary.totalCalls,
    totalTalkTimeSec: callSummary.totalTalkTimeSec,
    leadsViewed: countByType(['lead_viewed']),
    leadsCreated: countByType(['lead_created']),
    leadsUpdated: countByType(['lead_edited', 'status_changed']),
    quotationsCreated: countByType(['quotation_created']),
    followUpsCreated: countByType(['followup_created']),
    bookingsCreated: countByType(['booking_created']),
  };
}

const LEAD_MODULE_TYPES = [
  'lead_viewed', 'leads_list_opened', 'lead_created', 'lead_edited', 'status_changed',
  'lead_assigned', 'lead_reassigned', 'note_added', 'lead_lost', 'lead_reactivated',
  'lead_converted', 'lead_merged', 'lead_deleted', 'lead_restored',
];

function moduleKeyForEvent(e) {
  if (e.type === 'module_opened') return e.meta?.module || null;
  if (LEAD_MODULE_TYPES.includes(e.type)) return 'leads';
  if (String(e.type).startsWith('quotation_')) return 'quotations';
  if (String(e.type).startsWith('followup_')) return 'follow_ups';
  if (e.type === 'call_started' || e.type === 'call_ended' || e.type === 'call_note_added') return 'calls';
  if (String(e.type).startsWith('booking_') || String(e.type).startsWith('payment_')) return 'bookings';
  if (e.type === 'whatsapp_sent' || e.type === 'whatsapp_contact_initiated') return 'whatsapp';
  if (e.type === 'email_sent') return 'email_activity';
  if (e.type === 'login' || e.type === 'logout') return 'auth';
  return 'other';
}

async function getModuleUsage({ userId, branchId, dateFrom, dateTo }) {
  const { periodStart, periodEnd } = resolvePeriod(dateFrom, dateTo);
  const events = await fetchMergedEvents({ userId, branchId, periodStart, periodEnd });
  const counts = {};
  events.forEach((e) => {
    const key = moduleKeyForEvent(e);
    if (!key || key === 'auth') return; // login/logout aren't a CRM "module" to spend time in
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([module, count]) => ({ module, label: MODULE_LABELS[module] || module, count }))
    .sort((a, b) => b.count - a.count);
}

/** Business actions the executive actually performed — excludes navigation/session events (logins, page opens). */
const ACTION_TYPE_BUCKETS = [
  { key: 'calls', label: 'Calls Made', match: (e) => e.type === 'call_ended' },
  { key: 'followups', label: 'Follow-ups Created', match: (e) => e.type === 'followup_created' },
  { key: 'leads_created', label: 'Leads Created', match: (e) => e.type === 'lead_created' },
  { key: 'leads_updated', label: 'Leads Updated', match: (e) => ['lead_edited', 'status_changed'].includes(e.type) },
  { key: 'leads_viewed', label: 'Leads Viewed', match: (e) => e.type === 'lead_viewed' },
  { key: 'quotations', label: 'Quotations Created', match: (e) => String(e.type).startsWith('quotation_') },
  { key: 'bookings', label: 'Bookings Created', match: (e) => String(e.type).startsWith('booking_') },
];

function buildActionsByType(events = []) {
  const counts = Object.fromEntries(ACTION_TYPE_BUCKETS.map((b) => [b.key, 0]));
  events.forEach((e) => {
    const bucket = ACTION_TYPE_BUCKETS.find((b) => b.match(e));
    if (bucket) counts[bucket.key] += 1;
  });
  return ACTION_TYPE_BUCKETS
    .map((b) => ({ type: b.key, label: b.label, count: counts[b.key] }))
    .sort((a, b) => b.count - a.count);
}

async function getTeamActivityOverview(executives = [], { branchId, dateFrom, dateTo } = {}) {
  if (!executives.length) return [];
  const { periodStart, periodEnd } = resolvePeriod(dateFrom, dateTo);
  const idObjects = executives.map((ex) => new mongoose.Types.ObjectId(String(ex._id)));
  const branchObjectId = toObjectId(branchId);
  const range = { $gte: periodStart, $lte: periodEnd };

  const [leadCounts, execCounts, callCounts, activeIdleEntries] = await Promise.all([
    LeadActivity.aggregate([
      { $match: { actorId: { $in: idObjects }, ...(branchObjectId ? { branchId: branchObjectId } : {}), createdAt: range } },
      { $group: {
        _id: '$actorId',
        total: { $sum: 1 },
        leadsCreated: { $sum: { $cond: [{ $eq: ['$type', 'lead_created'] }, 1, 0] } },
        leadsUpdated: { $sum: { $cond: [{ $in: ['$type', ['lead_edited', 'status_changed']] }, 1, 0] } },
        quotationsCreated: { $sum: { $cond: [{ $eq: ['$type', 'quotation_created'] }, 1, 0] } },
        followUpsCreated: { $sum: { $cond: [{ $eq: ['$type', 'followup_created'] }, 1, 0] } },
      } },
    ]),
    ExecutiveActivityLog.aggregate([
      { $match: { userId: { $in: idObjects }, ...(branchObjectId ? { branchId: branchObjectId } : {}), createdAt: range } },
      { $group: {
        _id: '$userId',
        total: { $sum: 1 },
        leadsViewed: { $sum: { $cond: [{ $eq: ['$type', 'lead_viewed'] }, 1, 0] } },
        bookingsCreated: { $sum: { $cond: [{ $eq: ['$type', 'booking_created'] }, 1, 0] } },
      } },
    ]),
    CallNote.aggregate([
      { $match: { userId: { $in: idObjects }, ...(branchObjectId ? { branchId: branchObjectId } : {}), createdAt: range } },
      { $group: { _id: '$userId', totalCalls: { $sum: 1 }, totalTalkTime: { $sum: '$duration' } } },
    ]),
    Promise.all(executives.map(async (ex) => {
      const events = await fetchMergedEvents({ userId: ex._id, branchId, periodStart, periodEnd });
      return [toIdString(ex._id), computeActiveIdleTime(events)];
    })),
  ]);

  const leadMap = Object.fromEntries(leadCounts.map((r) => [toIdString(r._id), r]));
  const execMap = Object.fromEntries(execCounts.map((r) => [toIdString(r._id), r]));
  const callMap = Object.fromEntries(callCounts.map((r) => [toIdString(r._id), r]));
  const activeIdleMap = Object.fromEntries(activeIdleEntries);

  return executives
    .map((ex) => {
      const key = toIdString(ex._id);
      const l = leadMap[key] || {};
      const e = execMap[key] || {};
      const c = callMap[key] || {};
      const ai = activeIdleMap[key] || { activeMs: 0, idleMs: 0, sessionMs: 0 };
      const totalActivities = (l.total || 0) + (e.total || 0) + (c.totalCalls || 0) * 2;
      return {
        _id: ex._id,
        name: ex.name,
        email: ex.email,
        totalActivities,
        activeMs: ai.activeMs,
        idleMs: ai.idleMs,
        leadsViewed: e.leadsViewed || 0,
        leadsCreated: l.leadsCreated || 0,
        leadsUpdated: l.leadsUpdated || 0,
        quotationsCreated: l.quotationsCreated || 0,
        followUpsCreated: l.followUpsCreated || 0,
        bookingsCreated: e.bookingsCreated || 0,
        totalCalls: c.totalCalls || 0,
        totalTalkTimeSec: c.totalTalkTime || 0,
      };
    })
    .sort((a, b) => b.totalActivities - a.totalActivities);
}

async function getActivityAnalytics({ userId, branchId, dateFrom, dateTo }) {
  const { periodStart, periodEnd } = resolvePeriod(dateFrom, dateTo);
  const branchObjectId = toObjectId(branchId);
  const userObjectId = userId ? toObjectId(userId) : null;
  const range = { $gte: periodStart, $lte: periodEnd };

  const leadMatch = { ...(userObjectId ? { actorId: userObjectId } : {}), ...(branchObjectId ? { branchId: branchObjectId } : {}), createdAt: range };
  const execMatch = { ...(userObjectId ? { userId: userObjectId } : {}), ...(branchObjectId ? { branchId: branchObjectId } : {}), createdAt: range };
  const callMatch = { ...(userObjectId ? { userId: userObjectId } : {}), ...(branchObjectId ? { branchId: branchObjectId } : {}), createdAt: range };

  const [leadAgg, execAgg, callAgg] = await Promise.all([
    LeadActivity.aggregate([
      { $match: leadMatch },
      { $facet: {
        byDay: [{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: ORG_TZ } }, count: { $sum: 1 } } }],
        byHour: [{ $group: { _id: { $hour: { date: '$createdAt', timezone: ORG_TZ } }, count: { $sum: 1 } } }],
        byExecutive: [{ $group: { _id: '$actorId', count: { $sum: 1 } } }],
      } },
    ]),
    ExecutiveActivityLog.aggregate([
      { $match: execMatch },
      { $facet: {
        byDay: [{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: ORG_TZ } }, count: { $sum: 1 } } }],
        byHour: [{ $group: { _id: { $hour: { date: '$createdAt', timezone: ORG_TZ } }, count: { $sum: 1 } } }],
        byExecutive: [{ $group: { _id: '$userId', count: { $sum: 1 } } }],
        byModule: [{ $match: { type: 'module_opened' } }, { $group: { _id: '$module', count: { $sum: 1 } } }],
      } },
    ]),
    CallNote.aggregate([
      { $match: callMatch },
      { $facet: {
        byDay: [{ $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: { $ifNull: ['$startedAt', '$createdAt'] }, timezone: ORG_TZ } }, count: { $sum: 2 } } }],
        byHour: [{ $group: { _id: { $hour: { date: { $ifNull: ['$startedAt', '$createdAt'] }, timezone: ORG_TZ } }, count: { $sum: 2 } } }],
        byExecutive: [{ $group: { _id: '$userId', count: { $sum: 2 } } }],
      } },
    ]),
  ]);

  function mergeCounts(...arrays) {
    const map = {};
    arrays.flat().filter(Boolean).forEach(({ _id, count }) => {
      const key = String(_id);
      map[key] = (map[key] || 0) + count;
    });
    return map;
  }

  const dayMap = mergeCounts(leadAgg[0]?.byDay, execAgg[0]?.byDay, callAgg[0]?.byDay);
  const hourMap = mergeCounts(leadAgg[0]?.byHour, execAgg[0]?.byHour, callAgg[0]?.byHour);
  const execIdMap = mergeCounts(leadAgg[0]?.byExecutive, execAgg[0]?.byExecutive, callAgg[0]?.byExecutive);
  const moduleUsage = (execAgg[0]?.byModule || [])
    .map((r) => ({ module: r._id, label: MODULE_LABELS[r._id] || r._id, count: r.count }))
    .sort((a, b) => b.count - a.count);

  const byDay = Object.entries(dayMap)
    .map(([day, count]) => ({ _id: day, activities: count }))
    .sort((a, b) => a._id.localeCompare(b._id));
  // Zero-fill every hour of the day so gaps in activity are visible, not just absent bars.
  const byHour = Array.from({ length: 24 }, (_, h) => ({ _id: h, count: hourMap[String(h)] || 0 }));

  let byExecutive = [];
  const execIds = Object.keys(execIdMap).filter(Boolean);
  if (execIds.length) {
    const User = require('../models/User');
    const users = await User.find({ _id: { $in: execIds } }).select('name').lean();
    const nameMap = Object.fromEntries(users.map((u) => [toIdString(u._id), u.name]));
    byExecutive = execIds
      .map((id) => ({ userId: id, name: nameMap[id] || 'Unknown', activities: execIdMap[id] }))
      .sort((a, b) => b.activities - a.activities);
  }

  // Active/idle and action-type breakdowns only mean something for one executive's own
  // session, not a merged multi-exec view — both computed from the same fetched events.
  let activeIdleByDay = [];
  let actionsByType = [];
  if (userId) {
    const events = await fetchMergedEvents({ userId, branchId, periodStart, periodEnd });
    const byDayEvents = {};
    events.forEach((e) => {
      const key = dayKeyInTz(e.at);
      (byDayEvents[key] = byDayEvents[key] || []).push(e);
    });
    activeIdleByDay = Object.entries(byDayEvents)
      .map(([day, dayEvents]) => ({ _id: day, ...computeActiveIdleTime(dayEvents) }))
      .sort((a, b) => a._id.localeCompare(b._id));
    actionsByType = buildActionsByType(events);
  }

  return { byDay, byHour, byExecutive, moduleUsage, activeIdleByDay, actionsByType };
}

/**
 * Login/logout session pairing. Never fabricates a logout: a login left open at the end
 * of the range is either 'online' (only when it's the user's globally most-recent login/
 * logout event AND the range includes right now) or 'ended', whose lastSeenAt comes from
 * a real recorded activity event — never a guessed timestamp.
 */
function lastSeenBefore(events, afterAt, beforeAt) {
  const afterMs = new Date(afterAt).getTime();
  const beforeMs = beforeAt ? new Date(beforeAt).getTime() : Infinity;
  let last = null;
  for (const e of events) {
    const t = new Date(e.at).getTime();
    if (t >= afterMs && t <= beforeMs) last = e.at;
  }
  return last;
}

function pairSessions(loginLogoutEvents, { lastSeenEvents = [], isLatestGlobalLogin = false, includesNow = false } = {}) {
  const sessions = [];
  let open = null;

  for (const ev of loginLogoutEvents) {
    if (ev.type === 'login') {
      if (open) {
        const lastSeen = lastSeenBefore(lastSeenEvents, open.loginAt, ev.at) || open.loginAt;
        sessions.push({
          loginAt: open.loginAt, logoutAt: null, lastSeenAt: lastSeen, status: 'ended',
          durationMs: new Date(lastSeen) - new Date(open.loginAt),
        });
      }
      open = { loginAt: ev.at };
    } else if (ev.type === 'logout' && open) {
      sessions.push({
        loginAt: open.loginAt, logoutAt: ev.at, lastSeenAt: null, status: 'logged_out',
        durationMs: new Date(ev.at) - new Date(open.loginAt),
      });
      open = null;
    }
  }

  if (open) {
    if (isLatestGlobalLogin && includesNow) {
      sessions.push({
        loginAt: open.loginAt, logoutAt: null, lastSeenAt: null, status: 'online',
        durationMs: Date.now() - new Date(open.loginAt),
      });
    } else {
      const lastSeen = lastSeenBefore(lastSeenEvents, open.loginAt, null) || open.loginAt;
      sessions.push({
        loginAt: open.loginAt, logoutAt: null, lastSeenAt: lastSeen, status: 'ended',
        durationMs: new Date(lastSeen) - new Date(open.loginAt),
      });
    }
  }
  return sessions;
}

/** All sessions for ONE executive in range — used for the detailed multi-session view. */
async function getLoginSessions({ userId, branchId, dateFrom, dateTo }) {
  const { periodStart, periodEnd } = resolvePeriod(dateFrom, dateTo);
  const includesNow = periodEnd >= new Date();

  const [loginLogoutDocs, latestDoc, allEvents] = await Promise.all([
    ExecutiveActivityLog.find({
      userId, type: { $in: ['login', 'logout'] }, ...(branchId ? { branchId } : {}),
      createdAt: { $gte: periodStart, $lte: periodEnd },
    }).sort({ createdAt: 1 }).limit(SOURCE_CAP).lean(),
    ExecutiveActivityLog.findOne({ userId, type: { $in: ['login', 'logout'] } }).sort({ createdAt: -1 }).lean(),
    fetchMergedEvents({ userId, branchId, periodStart, periodEnd }),
  ]);

  const loginLogoutEvents = loginLogoutDocs.map((d) => ({ type: d.type, at: d.createdAt }));
  return pairSessions(loginLogoutEvents, {
    lastSeenEvents: allEvents,
    isLatestGlobalLogin: latestDoc?.type === 'login',
    includesNow,
  });
}

/** One row per executive (their latest/current session) — used for the "All Executives" roster view. */
async function getTeamLoginRoster(executives = [], { branchId, dateFrom, dateTo } = {}) {
  if (!executives.length) return [];
  const { periodStart, periodEnd } = resolvePeriod(dateFrom, dateTo);
  const includesNow = periodEnd >= new Date();
  const idObjects = executives.map((ex) => new mongoose.Types.ObjectId(String(ex._id)));
  const branchObjectId = toObjectId(branchId);

  const [rangeDocs, latestPerUser] = await Promise.all([
    ExecutiveActivityLog.find({
      userId: { $in: idObjects }, type: { $in: ['login', 'logout'] },
      ...(branchObjectId ? { branchId: branchObjectId } : {}), createdAt: { $gte: periodStart, $lte: periodEnd },
    }).sort({ createdAt: 1 }).lean(),
    ExecutiveActivityLog.aggregate([
      { $match: { userId: { $in: idObjects }, type: { $in: ['login', 'logout'] } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$userId', latestType: { $first: '$type' } } },
    ]),
  ]);

  const latestTypeMap = Object.fromEntries(latestPerUser.map((r) => [toIdString(r._id), r.latestType]));
  const byUser = {};
  rangeDocs.forEach((d) => {
    const key = toIdString(d.userId);
    (byUser[key] = byUser[key] || []).push({ type: d.type, at: d.createdAt });
  });

  return executives
    .map((ex) => {
      const key = toIdString(ex._id);
      const events = byUser[key] || [];
      if (!events.length) {
        return { _id: ex._id, name: ex.name, status: 'no_login', loginAt: null, logoutAt: null, lastSeenAt: null, durationMs: 0, sessionCount: 0 };
      }
      // Roster stays cheap (no per-user merged-event fetch) — an unresolved session's
      // last-seen falls back to its login time rather than an expensive N+1 lookup.
      const sessions = pairSessions(events, { isLatestGlobalLogin: latestTypeMap[key] === 'login', includesNow });
      const last = sessions[sessions.length - 1];
      return { _id: ex._id, name: ex.name, sessionCount: sessions.length, ...last };
    })
    .sort((a, b) => (a.status === 'online' ? 0 : 1) - (b.status === 'online' ? 0 : 1));
}

/** Compact KPI summary — logged in / online / logged out / avg completed-session duration. */
async function getTeamLoginSummary(executives = [], { branchId, dateFrom, dateTo } = {}) {
  if (!executives.length) return { loggedIn: 0, online: 0, loggedOut: 0, avgSessionMs: 0 };
  const { periodStart, periodEnd } = resolvePeriod(dateFrom, dateTo);
  const includesNow = periodEnd >= new Date();
  const idObjects = executives.map((ex) => new mongoose.Types.ObjectId(String(ex._id)));
  const branchObjectId = toObjectId(branchId);

  const [rangeDocs, latestPerUser] = await Promise.all([
    ExecutiveActivityLog.find({
      userId: { $in: idObjects }, type: { $in: ['login', 'logout'] },
      ...(branchObjectId ? { branchId: branchObjectId } : {}), createdAt: { $gte: periodStart, $lte: periodEnd },
    }).sort({ createdAt: 1 }).lean(),
    ExecutiveActivityLog.aggregate([
      { $match: { userId: { $in: idObjects }, type: { $in: ['login', 'logout'] } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$userId', latestType: { $first: '$type' } } },
    ]),
  ]);

  const latestTypeMap = Object.fromEntries(latestPerUser.map((r) => [toIdString(r._id), r.latestType]));
  const byUser = {};
  rangeDocs.forEach((d) => {
    const key = toIdString(d.userId);
    (byUser[key] = byUser[key] || []).push({ type: d.type, at: d.createdAt });
  });

  const loggedInSet = new Set();
  const loggedOutSet = new Set();
  let onlineCount = 0;
  const completedDurations = [];

  executives.forEach((ex) => {
    const key = toIdString(ex._id);
    const events = byUser[key] || [];
    if (!events.length) return;
    if (events.some((e) => e.type === 'login')) loggedInSet.add(key);

    let open = null;
    events.forEach((ev) => {
      if (ev.type === 'login') {
        open = { loginAt: ev.at };
      } else if (ev.type === 'logout' && open) {
        completedDurations.push(new Date(ev.at) - new Date(open.loginAt));
        loggedOutSet.add(key);
        open = null;
      }
    });
    if (open && includesNow && latestTypeMap[key] === 'login') onlineCount += 1;
  });

  const avgSessionMs = completedDurations.length
    ? Math.round(completedDurations.reduce((s, v) => s + v, 0) / completedDurations.length)
    : 0;

  return { loggedIn: loggedInSet.size, online: onlineCount, loggedOut: loggedOutSet.size, avgSessionMs };
}

module.exports = {
  logExecutiveActivity,
  getActivityTimeline,
  getActivitySummary,
  getModuleUsage,
  computeActiveIdleTime,
  getTeamActivityOverview,
  getActivityAnalytics,
  getLoginSessions,
  getTeamLoginRoster,
  getTeamLoginSummary,
  INACTIVITY_THRESHOLD_MINUTES,
};

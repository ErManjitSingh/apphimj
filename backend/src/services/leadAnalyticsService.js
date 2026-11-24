const Lead = require('../models/Lead');
const FollowUp = require('../models/FollowUp');
const User = require('../models/User');
const { withBranch } = require('../utils/branchScope');
const { startOfDay, endOfDay, applyConvertedPeriodFilter } = require('../utils/queryHelpers');
const { leadSourceLabel, expandLeadSourceFilter } = require('../constants/leadSources');
const {
  BOOKED_LEAD_STATUSES,
  LOST_LEAD_STATUSES,
  ACTIVE_LEAD_STATUSES,
} = require('../constants/leadPipeline');

const SOURCE_LABELS = {
  website: 'Website',
  website_2: 'Website 2',
  referral: 'Referral',
  portal_lead: 'Portal Lead',
  call_lead: 'Call Lead',
  dpw: 'Website',
  dpw_wa: 'WhatsApp',
  dpw_call: 'Call Lead',
  dpw2: 'Website 2',
  dpw2_wa: 'WhatsApp',
  dpw2_call: 'Call Lead',
  organic: 'Website',
  google_ads: 'Website',
  facebook_ads: 'Portal Lead',
  website_old: 'Website',
  whatsapp: 'WhatsApp',
  'walk-in': 'Call Lead',
  phone: 'Call Lead',
  social: 'Website 2',
  other: 'Website',
};

const AGING_LABELS = {
  '0_7': '0-7 Days',
  '8_15': '8-15 Days',
  '16_30': '16-30 Days',
  '30_plus': '30+ Days',
};

const AGING_ORDER = ['0_7', '8_15', '16_30', '30_plus'];

/** Touched / progressed past brand-new / unreachable. */
const CONNECTED_STATUSES = [
  'qualified',
  'contacted',
  'package_sent',
  'quotation_sent',
  'follow_up',
  'working_progress',
  'negotiation',
  'reactivated',
  'booked',
  'converted',
  'postponed',
];

const CLOSED_STATUSES = [...BOOKED_LEAD_STATUSES, ...LOST_LEAD_STATUSES];

function branchMatch(branchId) {
  return { isDeleted: { $ne: true }, ...withBranch({}, branchId) };
}

function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

function packageRevenueStages() {
  return [
    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'lead',
        as: 'payments',
      },
    },
    {
      $lookup: {
        from: 'bookings',
        localField: '_id',
        foreignField: 'lead',
        as: 'bookings',
      },
    },
    {
      $addFields: {
        isBooked: { $in: ['$status', BOOKED_LEAD_STATUSES] },
        isLost: { $in: ['$status', LOST_LEAD_STATUSES] },
        isPipeline: { $in: ['$status', ACTIVE_LEAD_STATUSES] },
        isConnected: { $in: ['$status', CONNECTED_STATUSES] },
        packageRevenue: {
          $let: {
            vars: {
              payMax: { $max: { $ifNull: ['$payments.amount', [0]] } },
              bookMax: {
                $max: {
                  $map: {
                    input: { $ifNull: ['$bookings', []] },
                    as: 'b',
                    in: {
                      $cond: [
                        { $gt: [{ $ifNull: ['$$b.opsCosting.packageCost', 0] }, 0] },
                        '$$b.opsCosting.packageCost',
                        { $ifNull: ['$$b.totalAmount', 0] },
                      ],
                    },
                  },
                },
              },
            },
            in: { $max: [{ $ifNull: ['$$payMax', 0] }, { $ifNull: ['$$bookMax', 0] }, 0] },
          },
        },
        collectedCash: {
          $reduce: {
            input: { $ifNull: ['$payments', []] },
            initialValue: 0,
            in: { $add: ['$$value', { $ifNull: ['$$this.paidAmount', 0] }] },
          },
        },
      },
    },
  ];
}

/** Live aging from createdAt — stored agingBucket is often stale. */
function agingBucketExpr() {
  return {
    $let: {
      vars: {
        ageDays: {
          $dateDiff: {
            startDate: '$createdAt',
            endDate: '$$NOW',
            unit: 'day',
          },
        },
      },
      in: {
        $switch: {
          branches: [
            { case: { $lte: ['$$ageDays', 7] }, then: '0_7' },
            { case: { $lte: ['$$ageDays', 15] }, then: '8_15' },
            { case: { $lte: ['$$ageDays', 30] }, then: '16_30' },
          ],
          default: '30_plus',
        },
      },
    },
  };
}

async function getSourceAnalytics(branchId) {
  const match = branchMatch(branchId);
  const rows = await Lead.aggregate([
    { $match: match },
    ...packageRevenueStages(),
    {
      $group: {
        _id: '$source',
        total: { $sum: 1 },
        converted: { $sum: { $cond: ['$isBooked', 1, 0] } },
        lost: { $sum: { $cond: ['$isLost', 1, 0] } },
        pipeline: { $sum: { $cond: ['$isPipeline', 1, 0] } },
        connected: { $sum: { $cond: ['$isConnected', 1, 0] } },
        bookings: { $sum: { $cond: ['$isBooked', 1, 0] } },
        revenue: { $sum: { $cond: ['$isBooked', '$packageRevenue', 0] } },
        collected: { $sum: { $cond: ['$isBooked', '$collectedCash', 0] } },
        avgScore: { $avg: '$smartScore' },
      },
    },
    { $sort: { total: -1 } },
  ]);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  const totalBooked = rows.reduce((s, r) => s + r.converted, 0);
  const totalRevenue = rows.reduce((s, r) => s + (Number(r.revenue) || 0), 0);

  return {
    sources: rows.map((r) => ({
      key: r._id || 'other',
      label: leadSourceLabel(r._id) || SOURCE_LABELS[r._id] || r._id || 'Other',
      total: r.total,
      converted: r.converted,
      connected: r.connected || 0,
      bookings: r.bookings || r.converted || 0,
      lost: r.lost,
      pipeline: r.pipeline,
      conversionRate: r.total ? round1((r.converted / r.total) * 100) : 0,
      sharePct: grandTotal ? Math.round((r.total / grandTotal) * 100) : 0,
      revenue: Math.round(Number(r.revenue) || 0),
      collected: Math.round(Number(r.collected) || 0),
      totalBudget: Math.round(Number(r.revenue) || 0),
      avgScore: Math.round(r.avgScore || 0),
    })),
    totalLeads: grandTotal,
    totalBooked,
    totalRevenue: Math.round(totalRevenue),
    overallConversionRate: grandTotal ? round1((totalBooked / grandTotal) * 100) : 0,
  };
}

function resolvePerformancePeriod(dateFrom, dateTo) {
  const now = new Date();
  const isAllTime = !dateFrom && !dateTo;
  if (isAllTime) {
    return { isAllTime: true, periodStart: null, periodEnd: null };
  }
  return {
    isAllTime: false,
    periodStart: dateFrom ? startOfDay(dateFrom) : startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
    periodEnd: dateTo ? endOfDay(dateTo) : endOfDay(now),
  };
}

function periodTouchFilter(periodStart, periodEnd) {
  if (!periodStart || !periodEnd) return {};
  return {
    $or: [
      { createdAt: { $gte: periodStart, $lte: periodEnd } },
      { assignedAt: { $gte: periodStart, $lte: periodEnd } },
    ],
  };
}

async function getExecutivePerformance(branchId, options = {}) {
  const { dateFrom, dateTo, source } = options;
  const { isAllTime, periodStart, periodEnd } = resolvePerformancePeriod(dateFrom, dateTo);
  const sourceFilter = source ? { source: expandLeadSourceFilter(source) } : {};
  const touch = periodTouchFilter(periodStart, periodEnd);

  const execFilter = {
    role: 'sales_executive',
    status: 'active',
    ...(branchId ? { branchId } : {}),
  };
  const executives = await User.find(execFilter).select('name email').lean();
  const execIds = executives.map((e) => e._id);

  if (!execIds.length) {
    return { executives: [], period: { isAllTime, dateFrom: dateFrom || '', dateTo: dateTo || '' } };
  }

  const baseLeadMatch = {
    ...branchMatch(branchId),
    assignedTo: { $in: execIds },
    ...sourceFilter,
  };
  const periodLeadMatch = isAllTime ? baseLeadMatch : { ...baseLeadMatch, ...touch };
  const convertedMatch = isAllTime
    ? { ...baseLeadMatch, status: { $in: BOOKED_LEAD_STATUSES } }
    : applyConvertedPeriodFilter(
        { ...baseLeadMatch, status: { $in: BOOKED_LEAD_STATUSES } },
        { $gte: periodStart, $lte: periodEnd }
      );
  const quoteMatch = isAllTime
    ? { ...baseLeadMatch, status: { $in: ['package_sent', 'quotation_sent', 'follow_up', 'negotiation'] } }
    : {
        ...baseLeadMatch,
        status: { $in: ['package_sent', 'quotation_sent', 'follow_up', 'negotiation'] },
        ...touch,
      };
  const hotMatch = isAllTime
    ? { ...baseLeadMatch, temperature: 'hot', status: { $in: ACTIVE_LEAD_STATUSES } }
    : {
        ...baseLeadMatch,
        temperature: 'hot',
        status: { $in: ACTIVE_LEAD_STATUSES },
        ...touch,
      };

  const followMatch = {
    ...(branchId ? { branchId } : {}),
    assignedTo: { $in: execIds },
    ...(isAllTime ? {} : { scheduledAt: { $gte: periodStart, $lte: periodEnd } }),
  };

  const [assignedAgg, convertedAgg, followUpAgg, hotAgg, quoteAgg] = await Promise.all([
    Lead.aggregate([
      { $match: periodLeadMatch },
      {
        $group: {
          _id: '$assignedTo',
          assigned: { $sum: 1 },
          pipeline: {
            $sum: { $cond: [{ $in: ['$status', ACTIVE_LEAD_STATUSES] }, 1, 0] },
          },
        },
      },
    ]),
    Lead.aggregate([
      { $match: convertedMatch },
      ...packageRevenueStages(),
      {
        $group: {
          _id: '$assignedTo',
          converted: { $sum: 1 },
          revenue: { $sum: '$packageRevenue' },
          collected: { $sum: '$collectedCash' },
        },
      },
    ]),
    FollowUp.aggregate([
      { $match: followMatch },
      {
        $group: {
          _id: '$assignedTo',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          missed: { $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        },
      },
    ]),
    Lead.aggregate([
      { $match: hotMatch },
      { $group: { _id: '$assignedTo', hot: { $sum: 1 } } },
    ]),
    Lead.aggregate([
      { $match: quoteMatch },
      { $group: { _id: '$assignedTo', quotes: { $sum: 1 } } },
    ]),
  ]);

  const assignedMap = Object.fromEntries(assignedAgg.map((r) => [String(r._id), r]));
  const convertedMap = Object.fromEntries(convertedAgg.map((r) => [String(r._id), r]));
  const fuMap = Object.fromEntries(followUpAgg.map((r) => [String(r._id), r]));
  const hotMap = Object.fromEntries(hotAgg.map((r) => [String(r._id), r.hot]));
  const quoteMap = Object.fromEntries(quoteAgg.map((r) => [String(r._id), r.quotes]));

  const executives_data = executives.map((exec) => {
    const id = String(exec._id);
    const assigned = assignedMap[id]?.assigned || 0;
    const converted = convertedMap[id]?.converted || 0;
    const fu = fuMap[id] || {};
    const fuTotal = fu.total || 0;
    const fuCompleted = fu.completed || 0;
    const conversionRate = assigned ? round1((converted / assigned) * 100) : 0;
    const followUpCompletion = fuTotal ? Math.round((fuCompleted / fuTotal) * 100) : 0;
    let performanceStatus = 'Inactive';
    if (assigned > 0 || fuTotal > 0 || converted > 0) {
      if (conversionRate >= 15 || followUpCompletion >= 80) performanceStatus = 'Excellent';
      else if (conversionRate >= 8 || followUpCompletion >= 60) performanceStatus = 'Good';
      else if (followUpCompletion >= 40 || assigned > 0) performanceStatus = 'Needs Attention';
      else performanceStatus = 'Low';
    }
    return {
      _id: exec._id,
      name: exec.name,
      email: exec.email,
      assigned,
      leads: assigned,
      followUps: fu.pending || 0,
      followUpsTotal: fuTotal,
      quotes: quoteMap[id] || 0,
      bookings: converted,
      converted,
      pipeline: assignedMap[id]?.pipeline || 0,
      revenue: Math.round(convertedMap[id]?.revenue || 0),
      collected: Math.round(convertedMap[id]?.collected || 0),
      conversionRate,
      followUpCompletion,
      missedFollowUps: fu.missed || 0,
      hotLeads: hotMap[id] || 0,
      performanceStatus,
    };
  });

  executives_data.sort(
    (a, b) => b.converted - a.converted || b.revenue - a.revenue || b.conversionRate - a.conversionRate
  );

  return {
    executives: executives_data,
    period: {
      isAllTime,
      dateFrom: dateFrom || '',
      dateTo: dateTo || '',
    },
  };
}

async function getEnterpriseKpis(branchId) {
  const match = branchMatch(branchId);
  const now = new Date();
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60000);

  const [
    agingBuckets,
    temperatureBuckets,
    slaBreached,
    slaAtRisk,
    slaMet,
    avgSmartScore,
    vipCount,
    unassigned,
    totalLeads,
    bookedCount,
    lostCount,
    pipelineCount,
    sourceSummary,
  ] = await Promise.all([
    Lead.aggregate([
      { $match: { ...match, status: { $in: ACTIVE_LEAD_STATUSES } } },
      { $addFields: { agingComputed: agingBucketExpr() } },
      { $group: { _id: '$agingComputed', count: { $sum: 1 } } },
    ]),
    Lead.aggregate([
      {
        $match: {
          ...match,
          status: { $in: ACTIVE_LEAD_STATUSES },
          temperature: { $in: ['hot', 'warm', 'cold'] },
        },
      },
      { $group: { _id: '$temperature', count: { $sum: 1 } } },
    ]),
    Lead.countDocuments({ ...match, slaBreached: true, status: { $in: ACTIVE_LEAD_STATUSES } }),
    // Open new leads waiting for first contact longer than 15 minutes.
    Lead.countDocuments({
      ...match,
      status: { $in: ['new_lead', 'new'] },
      firstContactAt: null,
      createdAt: { $lt: fifteenMinAgo },
    }),
    Lead.countDocuments({
      ...match,
      firstContactAt: { $ne: null },
      status: { $in: ACTIVE_LEAD_STATUSES },
    }),
    Lead.aggregate([{ $match: match }, { $group: { _id: null, avg: { $avg: '$smartScore' } } }]),
    Lead.countDocuments({
      ...match,
      $or: [{ isVip: true }, { temperature: 'vip' }],
      status: { $in: ACTIVE_LEAD_STATUSES },
    }),
    Lead.countDocuments({ ...match, assignedTo: null, status: { $in: ACTIVE_LEAD_STATUSES } }),
    Lead.countDocuments(match),
    Lead.countDocuments({ ...match, status: { $in: BOOKED_LEAD_STATUSES } }),
    Lead.countDocuments({ ...match, status: { $in: LOST_LEAD_STATUSES } }),
    Lead.countDocuments({ ...match, status: { $in: ACTIVE_LEAD_STATUSES } }),
    getSourceAnalytics(branchId),
  ]);

  const agingMap = Object.fromEntries(agingBuckets.map((b) => [b._id, b.count]));
  const aging = AGING_ORDER.map((key) => ({
    key,
    label: AGING_LABELS[key],
    count: agingMap[key] || 0,
  }));

  const tempOrder = ['hot', 'warm', 'cold'];
  const tempMap = Object.fromEntries(temperatureBuckets.map((b) => [b._id, b.count]));
  const temperature = tempOrder.map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    count: tempMap[key] || 0,
  }));

  const conversionRate = totalLeads ? round1((bookedCount / totalLeads) * 100) : 0;

  return {
    aging,
    temperature,
    sla: { breached: slaBreached, atRisk: slaAtRisk, met: slaMet },
    avgSmartScore: Math.round(avgSmartScore[0]?.avg || 0),
    vipCount,
    unassigned,
    totalLeads,
    bookedCount,
    lostCount,
    pipelineCount,
    conversionRate,
    totalRevenue: sourceSummary.totalRevenue || 0,
  };
}

module.exports = {
  getSourceAnalytics,
  getExecutivePerformance,
  getEnterpriseKpis,
  SOURCE_LABELS,
  AGING_LABELS,
};

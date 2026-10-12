const mongoose = require('mongoose');
const Quotation = require('../models/Quotation');
const Lead = require('../models/Lead');

function asObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (mongoose.Types.ObjectId.isValid(String(id))) {
    return new mongoose.Types.ObjectId(String(id));
  }
  return null;
}

function asObjectIdList(ids = []) {
  return (Array.isArray(ids) ? ids : [])
    .map((id) => asObjectId(id))
    .filter(Boolean);
}

function quotationSideMatch({ branchId } = {}) {
  const match = {
    status: 'approved',
  };
  const branchOid = asObjectId(branchId);
  if (branchOid) match.branchId = branchOid;
  return match;
}

/** Approved quotation on converted/booked lead = package turnover fallback. */
function packageQuotationMatch(extraLeadMatch = {}, { statuses } = {}) {
  const statusList = Array.isArray(statuses) && statuses.length
    ? statuses
    : ['converted', 'booked'];
  return {
    'leadDoc.status': statusList.length === 1 ? statusList[0] : { $in: statusList },
    ...extraLeadMatch,
  };
}

function buildExecutiveLeadMatch({ assigneeId, assigneeIds, branchId } = {}) {
  const match = {};
  const one = asObjectId(assigneeId);
  const many = asObjectIdList(assigneeIds);
  if (one) match['leadDoc.assignedTo'] = one;
  if (many.length) match['leadDoc.assignedTo'] = { $in: many };
  const branchOid = asObjectId(branchId);
  if (branchOid) match['leadDoc.branchId'] = branchOid;
  return match;
}

/** Period filter: prefer lead.convertedAt, else lead.updatedAt. */
function buildLeadPeriodMatch({ start, end } = {}) {
  if (!start || !end) return null;
  return {
    $or: [
      { convertedAt: { $gte: start, $lte: end } },
      {
        $and: [
          {
            $or: [
              { convertedAt: null },
              { convertedAt: { $exists: false } },
            ],
          },
          { updatedAt: { $gte: start, $lte: end } },
        ],
      },
    ],
  };
}

function buildConvertedLeadMatch(options = {}) {
  const statuses = Array.isArray(options.statuses) && options.statuses.length
    ? options.statuses
    : ['converted', 'booked'];
  const match = {
    status: statuses.length === 1 ? statuses[0] : { $in: statuses },
    isDeleted: { $ne: true },
  };
  const one = asObjectId(options.assigneeId);
  const many = asObjectIdList(options.assigneeIds);
  if (one) match.assignedTo = one;
  if (many.length) match.assignedTo = { $in: many };
  const branchOid = asObjectId(options.branchId);
  if (branchOid) match.branchId = branchOid;

  const period = buildLeadPeriodMatch(options);
  if (period) {
    match.$and = [...(match.$and || []), period];
  }
  return match;
}

/**
 * Package cost achieved for monthly target:
 * 1) Payment.amount (Total Package Cost on convert)
 * 2) lead.budget
 * 3) booking.totalAmount
 * One amount per converted/booked lead — counts against admin-set target.
 */
async function sumConvertedPackageCost(options = {}) {
  const leadMatch = buildConvertedLeadMatch(options);
  const rows = await Lead.aggregate([
    { $match: leadMatch },
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
        packageCost: {
          $let: {
            vars: {
              payAmounts: {
                $map: {
                  input: { $ifNull: ['$payments', []] },
                  as: 'p',
                  in: { $ifNull: ['$$p.amount', 0] },
                },
              },
              bookingAmounts: {
                $map: {
                  input: { $ifNull: ['$bookings', []] },
                  as: 'b',
                  in: { $ifNull: ['$$b.totalAmount', 0] },
                },
              },
              budget: { $ifNull: ['$budget', 0] },
            },
            in: {
              $max: [
                { $ifNull: [{ $max: '$$payAmounts' }, 0] },
                '$$budget',
                { $ifNull: [{ $max: '$$bookingAmounts' }, 0] },
                0,
              ],
            },
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$packageCost' },
        leads: { $sum: 1 },
      },
    },
  ]);

  return {
    total: Number(rows[0]?.total) || 0,
    leads: Number(rows[0]?.leads) || 0,
  };
}

async function sumConvertedPackageRevenueFromQuotes(options = {}) {
  const pipeline = [
    { $match: quotationSideMatch(options) },
    {
      $lookup: {
        from: 'leads',
        localField: 'lead',
        foreignField: '_id',
        as: 'leadDoc',
      },
    },
    { $unwind: '$leadDoc' },
    {
      $match: packageQuotationMatch(buildExecutiveLeadMatch(options), {
        statuses: options.statuses || ['converted', 'booked'],
      }),
    },
  ];

  if (options.start && options.end) {
    pipeline.push({
      $match: {
        $or: [
          { 'leadDoc.convertedAt': { $gte: options.start, $lte: options.end } },
          {
            $and: [
              {
                $or: [
                  { 'leadDoc.convertedAt': null },
                  { 'leadDoc.convertedAt': { $exists: false } },
                ],
              },
              { 'leadDoc.updatedAt': { $gte: options.start, $lte: options.end } },
            ],
          },
        ],
      },
    });
  }

  pipeline.push(
    { $sort: { updatedAt: -1 } },
    {
      $group: {
        _id: '$lead',
        amount: {
          $first: {
            $ifNull: [
              '$pricing.total',
              {
                $ifNull: [
                  '$costing.grandTotal',
                  { $ifNull: ['$leadDoc.budget', 0] },
                ],
              },
            ],
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    }
  );

  const rows = await Quotation.aggregate(pipeline);
  return Number(rows[0]?.total) || 0;
}

async function sumConvertedPackageRevenue(options = {}) {
  // Primary: convert package cost on Payment / budget / booking
  const fromPayments = await sumConvertedPackageCost(options);
  if (fromPayments.total > 0) {
    return fromPayments.total;
  }

  // Fallback: approved quotation totals (older converts without Payment.amount)
  const fromQuotes = await sumConvertedPackageRevenueFromQuotes(options);
  if (fromQuotes > 0) return fromQuotes;

  return fromPayments.total;
}

async function aggregateConvertedPackageRevenueByMonth(options = {}) {
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const rows = await Lead.aggregate([
    {
      $match: buildConvertedLeadMatch({
        ...options,
        start: undefined,
        end: undefined,
      }),
    },
    {
      $lookup: {
        from: 'payments',
        localField: '_id',
        foreignField: 'lead',
        as: 'payments',
      },
    },
    {
      $addFields: {
        packageCost: {
          $max: [
            {
              $ifNull: [
                {
                  $max: {
                    $map: {
                      input: { $ifNull: ['$payments', []] },
                      as: 'p',
                      in: { $ifNull: ['$$p.amount', 0] },
                    },
                  },
                },
                0,
              ],
            },
            { $ifNull: ['$budget', 0] },
            0,
          ],
        },
        eventAt: { $ifNull: ['$convertedAt', '$updatedAt'] },
      },
    },
    {
      $group: {
        _id: { year: { $year: '$eventAt' }, month: { $month: '$eventAt' } },
        revenue: { $sum: '$packageCost' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return rows.map((r) => ({
    month: MONTH_LABELS[(r._id.month || 1) - 1],
    revenue: r.revenue || 0,
  }));
}

async function sumConvertedPackageRevenueByAssignees({ assigneeIds = [], branchId, statuses } = {}) {
  const many = asObjectIdList(assigneeIds);
  if (!many.length) return {};

  const result = {};
  await Promise.all(
    many.map(async (id) => {
      const total = await sumConvertedPackageRevenue({
        assigneeId: id,
        branchId,
        statuses: statuses || ['converted', 'booked'],
      });
      result[String(id)] = total;
    })
  );
  return result;
}

module.exports = {
  sumConvertedPackageCost,
  sumConvertedPackageRevenue,
  aggregateConvertedPackageRevenueByMonth,
  sumConvertedPackageRevenueByAssignees,
};

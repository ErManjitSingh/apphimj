const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { withBranch } = require('../utils/branchScope');
const { startOfDay, endOfDay } = require('../utils/queryHelpers');

const ACTIVE_STATUSES = [
  'booking_received',
  'pending_verification',
  'pending',
  'confirmed',
  'in_progress',
  'completed',
];

const CLOSED_STATUSES = ['cancelled', 'refund_pending', 'refund_completed', 'postponed'];

function round2(n) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0;
}

function pct(part, whole) {
  const w = Number(whole) || 0;
  if (w <= 0) return 0;
  return Math.round(((Number(part) || 0) / w) * 1000) / 10;
}

function parseDateBound(value, asEnd = false) {
  if (!value) return null;
  const d = asEnd ? endOfDay(value) : startOfDay(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolveCommercial(booking = {}) {
  const costing = booking.opsCosting || {};
  const hotelCost = round2(costing.hotelCost);
  const cabCost = round2(costing.cabCost);
  const otherCost = round2(costing.otherCost);
  const packageCost = round2(
    costing.packageCost > 0 ? costing.packageCost : booking.totalAmount
  );
  const costTotal = round2(hotelCost + cabCost + otherCost);
  // Accounts truth: profit = package − (hotel + cab + other), same as Ops commercial strip.
  const profitAmount = round2(packageCost - costTotal);
  const profitMargin = pct(profitAmount, packageCost);

  return {
    hotelCost,
    cabCost,
    otherCost,
    costTotal,
    packageCost,
    profitAmount,
    profitMargin,
    source: costing.source || (packageCost ? 'quotation' : 'none'),
    hasCosting: Boolean(
      costing &&
        (costing.packageCost ||
          costing.hotelCost ||
          costing.cabCost ||
          costing.otherCost ||
          costing.profitAmount)
    ),
  };
}

function buildDateMatch(dateFrom, dateTo) {
  const from = parseDateBound(dateFrom, false);
  const to = parseDateBound(dateTo, true);
  if (!from && !to) return null;
  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  // Prefer travel window; fall back to createdAt when travelDate missing
  return {
    $or: [
      { travelDate: range },
      {
        $and: [
          { $or: [{ travelDate: null }, { travelDate: { $exists: false } }] },
          { createdAt: range },
        ],
      },
    ],
  };
}

async function buildAccountsCommercialReport({ branchId, dateFrom, dateTo, status } = {}) {
  const filter = withBranch({}, branchId);
  const dateMatch = buildDateMatch(dateFrom, dateTo);
  if (dateMatch) Object.assign(filter, dateMatch);

  const statusKey = String(status || '').trim().toLowerCase();
  if (statusKey === 'active') filter.status = { $in: ACTIVE_STATUSES };
  else if (statusKey === 'closed') filter.status = { $in: CLOSED_STATUSES };
  else if (statusKey && statusKey !== 'all') filter.status = statusKey;

  const bookings = await Booking.find(filter)
    .select(
      'bookingNumber customerName customerPhone destination packageName travelDate returnDate status paymentStatus totalAmount advanceReceived pendingAmount opsCosting createdAt updatedAt executiveName lead'
    )
    .sort({ travelDate: -1, createdAt: -1 })
    .lean();

  const bookingIds = bookings.map((b) => b._id);
  const leadIds = bookings.map((b) => b.lead).filter(Boolean);

  const paymentMatch = withBranch(
    {
      $or: [
        ...(bookingIds.length ? [{ booking: { $in: bookingIds } }] : []),
        ...(leadIds.length ? [{ lead: { $in: leadIds } }] : []),
      ],
      status: { $in: ['paid', 'partial', 'pending', 'refunded'] },
    },
    branchId
  );
  if (!bookingIds.length && !leadIds.length) {
    paymentMatch._id = { $exists: false };
  }

  const payments = await Payment.find(paymentMatch)
    .select('booking lead paidAmount amount status refunds')
    .lean();

  const paidByBooking = new Map();
  const paidByLead = new Map();
  let refundsTotal = 0;
  for (const p of payments) {
    const paid = round2(p.paidAmount || 0);
    if (p.booking) {
      paidByBooking.set(String(p.booking), round2((paidByBooking.get(String(p.booking)) || 0) + paid));
    } else if (p.lead) {
      // Lead-level cash only when payment is not already booking-linked (avoid double count).
      paidByLead.set(String(p.lead), round2((paidByLead.get(String(p.lead)) || 0) + paid));
    }
    for (const r of p.refunds || []) refundsTotal = round2(refundsTotal + Number(r.amount || 0));
  }

  const rows = [];
  const byDestination = new Map();
  const byMonth = new Map();
  const byStatus = new Map();
  const consumedLeadCash = new Set();

  let packageRevenue = 0;
  let hotelCost = 0;
  let cabCost = 0;
  let otherCost = 0;
  let costTotal = 0;
  let profitAmount = 0;
  let collected = 0;
  let pending = 0;
  let withCosting = 0;
  let activeCount = 0;
  let closedCount = 0;

  for (const booking of bookings) {
    const commercial = resolveCommercial(booking);
    const isClosed = CLOSED_STATUSES.includes(booking.status);
    if (isClosed) closedCount += 1;
    else activeCount += 1;

    let collectedCash = paidByBooking.get(String(booking._id));
    if (collectedCash == null && booking.lead) {
      const leadKey = String(booking.lead);
      if (!consumedLeadCash.has(leadKey) && paidByLead.has(leadKey)) {
        collectedCash = paidByLead.get(leadKey);
        consumedLeadCash.add(leadKey);
      }
    }
    if (collectedCash == null) collectedCash = Number(booking.advanceReceived) || 0;
    collectedCash = round2(collectedCash);
    // Always derive due from package − cash (stale booking.pendingAmount ignored).
    const pendingAmount = round2(Math.max(0, (commercial.packageCost || 0) - collectedCash));

    if (commercial.hasCosting) withCosting += 1;

    // Closed tours still show in rows but P&L totals focus on active+completed unless filtered
    const includeInPl = !['cancelled', 'refund_completed'].includes(booking.status);
    if (includeInPl) {
      packageRevenue = round2(packageRevenue + commercial.packageCost);
      hotelCost = round2(hotelCost + commercial.hotelCost);
      cabCost = round2(cabCost + commercial.cabCost);
      otherCost = round2(otherCost + commercial.otherCost);
      costTotal = round2(costTotal + commercial.costTotal);
      profitAmount = round2(profitAmount + commercial.profitAmount);
      collected = round2(collected + collectedCash);
      pending = round2(pending + pendingAmount);
    }

    const dest = booking.destination || 'Other';
    const destAgg = byDestination.get(dest) || {
      destination: dest,
      bookings: 0,
      packageRevenue: 0,
      costTotal: 0,
      profitAmount: 0,
      collected: 0,
    };
    destAgg.bookings += 1;
    destAgg.packageRevenue = round2(destAgg.packageRevenue + commercial.packageCost);
    destAgg.costTotal = round2(destAgg.costTotal + commercial.costTotal);
    destAgg.profitAmount = round2(destAgg.profitAmount + commercial.profitAmount);
    destAgg.collected = round2(destAgg.collected + collectedCash);
    byDestination.set(dest, destAgg);

    const monthKey = (() => {
      const d = booking.travelDate ? new Date(booking.travelDate) : new Date(booking.createdAt);
      if (Number.isNaN(d.getTime())) return 'Unknown';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();
    const monthAgg = byMonth.get(monthKey) || {
      month: monthKey,
      bookings: 0,
      packageRevenue: 0,
      costTotal: 0,
      profitAmount: 0,
      collected: 0,
    };
    monthAgg.bookings += 1;
    monthAgg.packageRevenue = round2(monthAgg.packageRevenue + commercial.packageCost);
    monthAgg.costTotal = round2(monthAgg.costTotal + commercial.costTotal);
    monthAgg.profitAmount = round2(monthAgg.profitAmount + commercial.profitAmount);
    monthAgg.collected = round2(monthAgg.collected + collectedCash);
    byMonth.set(monthKey, monthAgg);

    const st = booking.status || 'unknown';
    byStatus.set(st, (byStatus.get(st) || 0) + 1);

    rows.push({
      _id: booking._id,
      bookingNumber: booking.bookingNumber,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      destination: booking.destination,
      packageName: booking.packageName,
      travelDate: booking.travelDate,
      returnDate: booking.returnDate,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      executiveName: booking.executiveName || '',
      totalAmount: round2(booking.totalAmount),
      advanceReceived: round2(booking.advanceReceived),
      pendingAmount,
      collected: collectedCash,
      ...commercial,
      costingUpdatedAt: booking.opsCosting?.updatedAt || null,
      costingSource: commercial.source,
    });
  }

  const destinations = [...byDestination.values()]
    .map((d) => ({
      ...d,
      profitMargin: pct(d.profitAmount, d.packageRevenue),
    }))
    .sort((a, b) => b.profitAmount - a.profitAmount);

  const monthly = [...byMonth.values()]
    .map((m) => ({
      ...m,
      profitMargin: pct(m.profitAmount, m.packageRevenue),
      label: (() => {
        const [y, mo] = String(m.month).split('-');
        if (!y || !mo) return m.month;
        return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('en-IN', {
          month: 'short',
          year: 'numeric',
        });
      })(),
    }))
    .sort((a, b) => String(a.month).localeCompare(String(b.month)));

  const statusBreakdown = [...byStatus.entries()]
    .map(([statusName, count]) => ({ status: statusName, count }))
    .sort((a, b) => b.count - a.count);

  return {
    period: { dateFrom: dateFrom || null, dateTo: dateTo || null },
    summary: {
      bookings: bookings.length,
      activeBookings: activeCount,
      closedBookings: closedCount,
      withCosting,
      missingCosting: Math.max(0, bookings.length - withCosting),
      packageRevenue,
      hotelCost,
      cabCost,
      otherCost,
      costTotal,
      profitAmount,
      profitMargin: pct(profitAmount, packageRevenue),
      collected,
      pending,
      refunds: round2(refundsTotal),
      collectionRate: pct(collected, packageRevenue),
      avgPackage: (() => {
        const n = bookings.filter((b) => !['cancelled', 'refund_completed'].includes(b.status)).length;
        return n ? round2(packageRevenue / n) : 0;
      })(),
      avgProfit: (() => {
        const n = bookings.filter((b) => !['cancelled', 'refund_completed'].includes(b.status)).length;
        return n ? round2(profitAmount / n) : 0;
      })(),
    },
    costMix: [
      { key: 'hotelCost', label: 'Hotel', amount: hotelCost },
      { key: 'cabCost', label: 'Cab', amount: cabCost },
      { key: 'otherCost', label: 'Other', amount: otherCost },
      { key: 'profitAmount', label: 'Profit', amount: profitAmount },
    ],
    destinations,
    monthly,
    statusBreakdown,
    rows,
  };
}

/** Real profit margin for admin Reports KPI (replaces hardcoded 14.8). */
async function computeOpsProfitMargin(branchId, dateFrom, dateTo) {
  const report = await buildAccountsCommercialReport({ branchId, dateFrom, dateTo, status: 'active' });
  return {
    profitMargin: report.summary.profitMargin,
    profitAmount: report.summary.profitAmount,
    packageRevenue: report.summary.packageRevenue,
    costTotal: report.summary.costTotal,
    withCosting: report.summary.withCosting,
  };
}

module.exports = {
  buildAccountsCommercialReport,
  computeOpsProfitMargin,
  resolveCommercial,
};

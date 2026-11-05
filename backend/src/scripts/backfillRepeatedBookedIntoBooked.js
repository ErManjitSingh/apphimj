/**
 * Move historically booked repeated leads into Booked:
 * 1) Any lead with an ops Booking but not status booked/converted → mark booked
 * 2) Any booked/converted lead with an earlier same-phone sibling → flag isRepeatCustomer
 *
 * Run: node src/scripts/backfillRepeatedBookedIntoBooked.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

function phoneTail(raw = '') {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits.length ? digits : '';
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGO_URI missing');
  await mongoose.connect(uri);

  const Lead = require('../models/Lead');
  const Booking = require('../models/Booking');

  const bookings = await Booking.find({ archivedAt: { $exists: false }, lead: { $exists: true, $ne: null } })
    .select('lead bookingNumber createdAt')
    .lean();

  const leadIdsWithBooking = [...new Set(bookings.map((b) => String(b.lead)).filter(Boolean))];
  console.log('BOOKINGS_WITH_LEAD', leadIdsWithBooking.length);

  let statusFixed = 0;
  for (const id of leadIdsWithBooking) {
    const lead = await Lead.findById(id).select('status convertedAt bookingDate isRepeatCustomer name').lean();
    if (!lead || lead.isDeleted) continue;
    if (lead.status === 'booked' || lead.status === 'converted') continue;

    const booking = bookings.find((b) => String(b.lead) === id);
    const convertedAt = lead.convertedAt || booking?.createdAt || new Date();
    await Lead.findByIdAndUpdate(id, {
      status: 'booked',
      convertedAt,
      bookingDate: lead.bookingDate || convertedAt,
      temperature: 'na',
      isHot: false,
    });
    statusFixed += 1;
    console.log('STATUS_TO_BOOKED', id, lead.name, 'from', lead.status, 'repeat', !!lead.isRepeatCustomer, booking?.bookingNumber);
  }

  // Flag booked leads that are later phone duplicates as repeated (stay in Booked)
  const leads = await Lead.find({ isDeleted: { $ne: true } })
    .select('_id phone alternatePhone status isRepeatCustomer createdAt name')
    .sort({ createdAt: 1 })
    .lean();

  const byPhone = new Map();
  for (const row of leads) {
    const phones = [...new Set([phoneTail(row.phone), phoneTail(row.alternatePhone)].filter((p) => p.length === 10))];
    for (const phone of phones) {
      if (!byPhone.has(phone)) byPhone.set(phone, []);
      byPhone.get(phone).push(row);
    }
  }

  const toFlag = [];
  for (const group of byPhone.values()) {
    if (group.length < 2) continue;
    for (let i = 1; i < group.length; i += 1) {
      const row = group[i];
      if ((row.status === 'booked' || row.status === 'converted') && !row.isRepeatCustomer) {
        toFlag.push(row._id);
      }
    }
  }

  let flagged = 0;
  if (toFlag.length) {
    const res = await Lead.updateMany(
      { _id: { $in: toFlag }, isRepeatCustomer: { $ne: true } },
      { $set: { isRepeatCustomer: true } }
    );
    flagged = res.modifiedCount;
  }

  // Explicit: every isRepeatCustomer that has a booking must be booked status
  const repeats = await Lead.find({
    isRepeatCustomer: true,
    isDeleted: { $ne: true },
    status: { $nin: ['booked', 'converted'] },
    _id: { $in: leadIdsWithBooking },
  })
    .select('_id name status')
    .lean();

  let repeatStatusFixed = 0;
  for (const row of repeats) {
    const booking = bookings.find((b) => String(b.lead) === String(row._id));
    const convertedAt = booking?.createdAt || new Date();
    await Lead.findByIdAndUpdate(row._id, {
      status: 'booked',
      convertedAt,
      bookingDate: convertedAt,
      temperature: 'na',
      isHot: false,
    });
    repeatStatusFixed += 1;
    console.log('REPEAT_STATUS_TO_BOOKED', String(row._id), row.name, 'from', row.status);
  }

  const bookedRepeats = await Lead.countDocuments({
    isRepeatCustomer: true,
    isDeleted: { $ne: true },
    status: { $in: ['booked', 'converted'] },
  });

  console.log(
    JSON.stringify(
      {
        statusFixed,
        flaggedRepeatOnBooked: flagged,
        repeatStatusFixed,
        bookedRepeatsNow: bookedRepeats,
      },
      null,
      2
    )
  );

  try {
    const { invalidate: invalidateDashboardCache } = require('../services/dashboardCacheService');
    ['admin', 'sales_manager', 'team_leader', 'sales_executive', 'nav:'].forEach((k) => {
      invalidateDashboardCache(k);
    });
  } catch (_) {
    /* cache optional */
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

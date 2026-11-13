/**
 * Mirror lead postpone / cancel onto linked bookings so ops portfolios fill in.
 *
 * Usage: node src/scripts/backfillBookingLifecycleFromLeads.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Booking = require('../models/Booking');

const CANCELLED_LEAD_STATUSES = ['lost', 'booked_from_another_company'];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const leads = await Lead.find({
    isDeleted: { $ne: true },
    $or: [
      { status: 'postponed' },
      { postponedAt: { $exists: true, $ne: null } },
      { postponedReason: { $exists: true, $nin: [null, ''] } },
      { status: { $in: CANCELLED_LEAD_STATUSES } },
      { lostReason: 'plan_cancelled' },
      { statusReason: 'plan_cancelled' },
    ],
  })
    .select('_id status postponedAt postponedReason lostReason statusReason')
    .lean();

  let postponed = 0;
  let cancelled = 0;
  let skipped = 0;

  for (const lead of leads) {
    const booking = await Booking.findOne({ lead: lead._id }).sort({ createdAt: -1 });
    if (!booking) {
      skipped += 1;
      continue;
    }
    if (booking.status === 'completed') {
      skipped += 1;
      continue;
    }

    const isCancel =
      CANCELLED_LEAD_STATUSES.includes(String(lead.status || '')) ||
      ['plan_cancelled'].includes(String(lead.lostReason || lead.statusReason || ''));
    const isPostpone =
      !isCancel &&
      (lead.status === 'postponed' ||
        Boolean(lead.postponedAt) ||
        Boolean(String(lead.postponedReason || '').trim()));

    if (isCancel && !['cancelled', 'refund_pending', 'refund_completed'].includes(booking.status)) {
      booking.status = 'cancelled';
      booking.cancelledAt = booking.cancelledAt || new Date();
      booking.cancelReason =
        booking.cancelReason ||
        String(lead.lostReason || lead.statusReason || 'Lead cancelled').trim();
      await booking.save();
      cancelled += 1;
    } else if (isPostpone && booking.status !== 'postponed') {
      booking.status = 'postponed';
      booking.postponedAt = booking.postponedAt || lead.postponedAt || new Date();
      booking.postponedReason =
        booking.postponedReason ||
        String(lead.postponedReason || lead.statusReason || 'Travel postponed').trim();
      await booking.save();
      postponed += 1;
    } else {
      skipped += 1;
    }
  }

  console.log(
    JSON.stringify({
      leadsScanned: leads.length,
      bookingsPostponed: postponed,
      bookingsCancelled: cancelled,
      skipped,
    })
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

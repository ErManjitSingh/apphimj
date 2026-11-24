/**
 * Create ops bookings for booked/converted leads that have a payment but no booking.
 * Run: node src/scripts/backfillMissingOpsBookings.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const { createBookingFromPayment } = require('../services/operationsService');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('No MONGODB_URI');
  await mongoose.connect(uri);

  const leads = await Lead.find({
    status: { $in: ['booked', 'converted'] },
    isDeleted: { $ne: true },
  })
    .select('_id leadId name assignedTo')
    .lean();

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const createdRows = [];

  for (const lead of leads) {
    const existingBooking = await Booking.findOne({ lead: lead._id }).select('_id').lean();
    if (existingBooking) {
      skipped += 1;
      continue;
    }
    const payment = await Payment.findOne({
      lead: lead._id,
      status: { $in: ['paid', 'partial'] },
    })
      .sort({ createdAt: -1 })
      .select('_id')
      .lean();
    if (!payment) {
      skipped += 1;
      continue;
    }
    try {
      const actor = lead.assignedTo ? { _id: lead.assignedTo } : null;
      const booking = await createBookingFromPayment(payment._id, actor);
      if (!booking) {
        failed += 1;
        console.error('MISSING_BOOKING_NULL', lead.leadId, lead.name);
        continue;
      }
      created += 1;
      createdRows.push({
        leadId: lead.leadId,
        name: lead.name,
        bookingNumber: booking.bookingNumber,
      });
      console.log('MISSING_BOOKING_OK', lead.leadId, lead.name, booking.bookingNumber);
    } catch (err) {
      failed += 1;
      console.error('MISSING_BOOKING_FAIL', lead.leadId, err.message);
    }
  }

  console.log(
    JSON.stringify({
      scanned: leads.length,
      created,
      skipped,
      failed,
      createdRows,
    })
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Backfill payment + advance voucher for leads already marked booked/converted
 * without a Payment record (regression: SE path only fired on status=converted).
 *
 * Run from backend/: node src/scripts/backfillBookedLeadPayments.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Payment = require('../models/Payment');
const { onLeadConverted } = require('../services/leadConversionService');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('No MONGODB_URI');
  await mongoose.connect(uri);

  const booked = await Lead.find({
    status: { $in: ['booked', 'converted'] },
    isDeleted: { $ne: true },
  })
    .select('_id name status assignedTo branchId budget convertedAt')
    .lean();

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of booked) {
    const existing = await Payment.findOne({ lead: row._id }).select('_id').lean();
    if (existing) {
      skipped += 1;
      continue;
    }
    try {
      const lead = await Lead.findById(row._id);
      if (!lead) {
        skipped += 1;
        continue;
      }
      const actor = lead.assignedTo ? { _id: lead.assignedTo } : null;
      await onLeadConverted(lead, actor, {
        totalPackageCost: lead.budget || 0,
        advanceAmount: 0,
        sendReceipt: false,
      });
      created += 1;
      console.log('BACKFILL_OK', lead._id.toString(), lead.name);
    } catch (err) {
      failed += 1;
      console.error('BACKFILL_FAIL', row._id.toString(), err.message);
    }
  }

  console.log(
    `BOOKED_PAYMENT_BACKFILL total=${booked.length} created=${created} skipped=${skipped} failed=${failed}`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

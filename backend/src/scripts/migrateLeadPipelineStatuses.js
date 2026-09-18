/**
 * Idempotent migration: old Lead.status → new pipeline statuses.
 * Usage (from backend/): node src/scripts/migrateLeadPipelineStatuses.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const mongoose = require('mongoose');
const { mapLegacyLeadStatus, normalizeTemperature } = require('../constants/leadPipeline');

(async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/travel_crm';
  await mongoose.connect(uri);
  const Lead = require('../models/Lead');

  const legacyFilter = {
    status: {
      $in: [
        'new',
        'contacted',
        'working_progress',
        'quotation_sent',
        'negotiation',
        'reactivated',
        'converted',
        'booked_from_another_company',
      ],
    },
  };

  const cursor = Lead.find(legacyFilter).cursor();
  let scanned = 0;
  let updated = 0;
  const counts = {};

  for await (const lead of cursor) {
    scanned += 1;
    const mapped = mapLegacyLeadStatus(lead.toObject());
    const patch = {
      status: mapped.status,
      temperature: normalizeTemperature(mapped.temperature || lead.temperature),
    };
    if (mapped.lostReason) patch.lostReason = mapped.lostReason;
    if (patch.status === 'booked') {
      if (!lead.convertedAt) patch.convertedAt = lead.updatedAt || new Date();
      if (!lead.bookingDate) patch.bookingDate = lead.convertedAt || patch.convertedAt;
    }
    if (lead.callStats?.count != null && !lead.callAttempts) {
      patch.callAttempts = lead.callStats.count;
    }
    if (lead.temperature === 'vip') patch.temperature = 'hot';

    await Lead.updateOne({ _id: lead._id }, { $set: patch });
    updated += 1;
    counts[`${lead.status}→${patch.status}`] = (counts[`${lead.status}→${patch.status}`] || 0) + 1;
  }

  // Normalize vip temperature on already-new statuses
  const vip = await Lead.updateMany(
    { temperature: 'vip' },
    { $set: { temperature: 'hot', isHot: true } }
  );

  // Sync callAttempts from callStats where missing
  await Lead.collection.updateMany(
    { 'callStats.count': { $gt: 0 }, $or: [{ callAttempts: { $exists: false } }, { callAttempts: 0 }] },
    [{ $set: { callAttempts: '$callStats.count' } }]
  );

  console.log(
    JSON.stringify(
      {
        scanned,
        updated,
        vipTempFixed: vip.modifiedCount,
        counts,
      },
      null,
      2
    )
  );
  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

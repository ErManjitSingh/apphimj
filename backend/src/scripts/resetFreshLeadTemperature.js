/**
 * Reset auto-scored Cold on fresh leads → No status (na).
 * node src/scripts/resetFreshLeadTemperature.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');

async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  const filter = {
    isDeleted: { $ne: true },
    status: { $in: ['new_lead', 'new'] },
    temperature: 'cold',
    $or: [
      { coldReason: { $in: [null, ''] } },
      { coldReason: { $exists: false } },
    ],
    $and: [
      {
        $or: [
          { statusReason: { $in: [null, ''] } },
          { statusReason: { $exists: false } },
        ],
      },
    ],
  };
  const result = await Lead.updateMany(filter, { $set: { temperature: 'na', isHot: false } });
  console.log('matched', result.matchedCount, 'modified', result.modifiedCount);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

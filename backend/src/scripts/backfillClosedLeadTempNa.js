/**
 * Set temperature=na on closed leads so they leave Hot/Warm/Cold buckets.
 * Run from backend/: node src/scripts/backfillClosedLeadTempNa.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('No MONGODB_URI');
  await mongoose.connect(uri);
  const result = await mongoose.connection.db.collection('leads').updateMany(
    {
      status: { $in: ['lost', 'booked_from_another_company', 'booked', 'converted'] },
      temperature: { $ne: 'na' },
    },
    { $set: { temperature: 'na', isHot: false } }
  );
  console.log(`TEMP_NA_BACKFILL matched=${result.matchedCount} modified=${result.modifiedCount}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

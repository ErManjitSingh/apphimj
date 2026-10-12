/**
 * Promote converted-but-stuck bookings to confirmed so ops can mark tours.
 * Run: node src/scripts/backfillConfirmOpsBookings.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('No MONGODB_URI');
  await mongoose.connect(uri);

  const col = mongoose.connection.db.collection('bookings');
  const filter = {
    status: { $in: ['booking_received', 'pending_verification', 'pending'] },
    $or: [
      { advanceReceived: { $gt: 0 } },
      { paymentStatus: { $in: ['partial', 'paid'] } },
    ],
  };

  const result = await col.updateMany(filter, { $set: { status: 'confirmed' } });
  console.log(
    `OPS_CONFIRM_BACKFILL matched=${result.matchedCount} modified=${result.modifiedCount}`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

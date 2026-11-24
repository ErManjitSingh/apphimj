/**
 * Set source = WhatsApp for CRM WhatsApp-channel leads.
 * Run: node src/scripts/backfillWhatsAppLeadSource.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri);

  const filter = {
    $or: [
      { channel: 'whatsapp' },
      { source: { $in: ['whatsapp', 'dpw_wa', 'dpw2_wa'] } },
      { sourceLabel: { $regex: /^whatsapp$/i } },
    ],
  };

  const result = await Lead.updateMany(filter, {
    $set: {
      source: 'whatsapp',
      leadSource: 'whatsapp',
      sourceLabel: 'WhatsApp',
      channel: 'whatsapp',
    },
  });

  console.log(`Updated ${result.modifiedCount} leads (matched ${result.matchedCount})`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

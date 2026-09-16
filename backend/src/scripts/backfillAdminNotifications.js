/**
 * Backfill admin notifications for recent CRM activity.
 * Run on VPS: node src/scripts/backfillAdminNotifications.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { NOTIFICATION_TYPES: T } = require('../constants/notificationTypes');

const DAYS = Number(process.env.BACKFILL_DAYS || 14);

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/travel_crm');

  const admins = await User.find({ role: 'admin', status: 'active' }).select('_id email').lean();
  if (!admins.length) {
    console.log('No active admin users found.');
    process.exit(0);
  }

  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const leads = await Lead.find({ createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .select('name leadId createdAt _id')
    .lean();

  let created = 0;

  for (const admin of admins) {
    for (const lead of leads) {
      const exists = await Notification.findOne({
        user: admin._id,
        type: T.LEAD_CREATED,
        'meta.leadId': lead._id,
      }).select('_id');

      if (exists) continue;

      await Notification.create({
        user: admin._id,
        type: T.LEAD_CREATED,
        title: 'New lead created',
        message: `${lead.name || lead.leadId || 'Lead'} has been added to the CRM`,
        meta: { leadId: lead._id, href: `/leads/${lead._id}` },
        createdAt: lead.createdAt,
      });
      created += 1;
    }
  }

  console.log(`Backfilled ${created} notification(s) for ${admins.length} admin(s) across ${leads.length} recent lead(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

const FollowUp = require('../models/FollowUp');
const Lead = require('../models/Lead');
const Notification = require('../models/Notification');
const { NOTIFICATION_TYPES } = require('../constants/notificationTypes');
const {
  notifyFollowUpReminder,
  notifyFollowUpMissed,
} = require('./notificationService');
const { processFollowUpEscalations } = require('./escalationService');
const { processSlaBreaches } = require('./slaService');
const { processExpiredAcceptances } = require('./leadAcceptanceService');
const { processEndOfDayCheckout } = require('./attendanceService');
const { startOfCalendarDay } = require('../utils/orgTimezone');

const REMINDER_WINDOW_MS = 15 * 60 * 1000;
const TICK_MS = 60 * 1000;
const BATCH_LIMIT = 100;

async function loadNotifiedFollowUpIds(type, followUpIds) {
  if (!followUpIds.length) return new Set();
  const idStrings = followUpIds.flatMap((id) => {
    const value = id?.toString?.() || `${id}`;
    return [id, value];
  });
  const rows = await Notification.find({
    type,
    'meta.followUpId': { $in: idStrings },
    'meta.resolved': { $ne: true },
  })
    .select('meta.followUpId')
    .lean();
  return new Set(rows.map((row) => `${row.meta?.followUpId}`));
}

async function loadNotifiedFollowUpKeys(type, followUps) {
  if (!followUps.length) return new Set();
  const idStrings = followUps.flatMap((fu) => {
    const id = fu._id;
    const value = id?.toString?.() || `${id}`;
    return [id, value];
  });
  const rows = await Notification.find({
    type,
    'meta.followUpId': { $in: idStrings },
    'meta.resolved': { $ne: true },
  })
    .select('meta.followUpId meta.scheduledAt')
    .lean();
  return new Set(
    rows.map((row) => {
      const id = `${row.meta?.followUpId}`;
      const at = row.meta?.scheduledAt ? new Date(row.meta.scheduledAt).toISOString() : '';
      return `${id}::${at}`;
    })
  );
}

function reminderKey(fu) {
  const id = fu._id?.toString?.() || `${fu._id}`;
  const at = fu.scheduledAt ? new Date(fu.scheduledAt).toISOString() : '';
  return `${id}::${at}`;
}

async function processFollowUpReminders() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const dueSoon = await FollowUp.find({
    status: 'pending',
    scheduledAt: { $gte: now, $lte: windowEnd },
  })
    .populate('lead', 'name assignedTo')
    .populate('assignedTo', 'name _id')
    .sort({ scheduledAt: 1 })
    .limit(BATCH_LIMIT)
    .lean();

  const notified = await loadNotifiedFollowUpKeys(
    NOTIFICATION_TYPES.FOLLOWUP_REMINDER,
    dueSoon
  );

  for (const fu of dueSoon) {
    const userId = fu.assignedTo?._id || fu.lead?.assignedTo;
    if (!userId) continue;
    const key = reminderKey(fu);
    if (notified.has(key)) continue;
    await notifyFollowUpReminder(fu, fu.lead);
    notified.add(key);
  }
}

async function processMissedFollowUps() {
  const todayStart = startOfCalendarDay();

  await FollowUp.updateMany(
    { status: 'pending', scheduledAt: { $lt: todayStart } },
    { status: 'missed' }
  );

  const missed = await FollowUp.find({
    status: 'missed',
    scheduledAt: { $lt: todayStart, $gte: new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000) },
  })
    .populate('lead', 'name assignedTo branchId')
    .populate('assignedTo', 'name _id')
    .sort({ scheduledAt: 1 })
    .limit(BATCH_LIMIT)
    .lean();

  const notified = await loadNotifiedFollowUpIds(
    NOTIFICATION_TYPES.FOLLOWUP_MISSED,
    missed.map((fu) => fu._id)
  );

  const { logLeadActivity } = require('./leadActivityService');
  for (const fu of missed) {
    const followUpIdStr = fu._id?.toString?.() || `${fu._id}`;
    if (notified.has(followUpIdStr)) continue;
    await notifyFollowUpMissed(fu, fu.lead);
    notified.add(followUpIdStr);
    if (fu.lead?._id) {
      await logLeadActivity({
        leadId: fu.lead._id,
        branchId: fu.lead.branchId || fu.branchId || null,
        type: 'followup_missed',
        description: `Follow-up missed${fu.scheduledAt ? ` (was ${new Date(fu.scheduledAt).toLocaleString('en-IN', { timeZone: process.env.ATTENDANCE_TZ || 'Asia/Kolkata' })})` : ''}`,
        actor: null,
        meta: { followUpId: fu._id },
      }).catch(() => {});
    }
  }
}

function startNotificationScheduler() {
  const tick = async () => {
    try {
      await processFollowUpReminders();
      await processMissedFollowUps();
      await processFollowUpEscalations();
      await processExpiredAcceptances();
      await processSlaBreaches();
      await processEndOfDayCheckout();
    } catch (err) {
      console.error('[NotificationScheduler]', err.message);
    }
  };

  tick();
  const handle = setInterval(tick, TICK_MS);
  console.log('[NotificationScheduler] Started (reminders, missed, escalations, attendance EOD)');
  return () => clearInterval(handle);
}

module.exports = { startNotificationScheduler };

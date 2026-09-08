const FollowUp = require('../models/FollowUp');
const LeadEscalation = require('../models/LeadEscalation');
const { logLeadActivity } = require('./leadActivityService');
const { notifyFollowUpEscalation } = require('./notificationService');

const LEVELS = [
  { key: '15m', minutes: 15, roles: ['team_leader'] },
  { key: '30m', minutes: 30, roles: ['sales_manager'] },
  { key: '1h', minutes: 60, roles: ['sales_manager'] },
];

const BATCH_LIMIT = 100;
const LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

async function processFollowUpEscalations() {
  const now = Date.now();
  const overdue = await FollowUp.find({
    status: 'pending',
    scheduledAt: {
      $lt: new Date(now),
      $gte: new Date(now - LOOKBACK_MS),
    },
  })
    .populate('lead', 'name branchId assignedTo')
    .populate('assignedTo', 'name')
    .sort({ scheduledAt: 1 })
    .limit(BATCH_LIMIT)
    .lean();

  if (!overdue.length) return;

  const followUpIds = overdue.map((fu) => fu._id);
  const existing = await LeadEscalation.find({ followUpId: { $in: followUpIds } })
    .select('followUpId level')
    .lean();
  const existingKeys = new Set(existing.map((row) => `${row.followUpId}:${row.level}`));

  for (const fu of overdue) {
    const overdueMs = now - new Date(fu.scheduledAt).getTime();
    const overdueMin = Math.floor(overdueMs / 60000);

    for (const level of LEVELS) {
      if (overdueMin < level.minutes) continue;
      if (existingKeys.has(`${fu._id}:${level.key}`)) continue;

      // Atomic upsert on the same {followUpId, level} the unique index enforces — this is what
      // makes concurrent scheduler ticks (setInterval doesn't wait for a slow previous tick to
      // finish, so overlap is expected under load) safe: MongoDB guarantees only one concurrent
      // upsert against the same key actually inserts, every other one just matches the existing
      // doc. The try/catch is defense in depth for the rare case a duplicate-key error still
      // surfaces from the race window inside the upsert itself — either way, "already exists" is
      // treated as already scheduled, never as an application error, and never aborts the rest of
      // this batch.
      let inserted = false;
      try {
        const result = await LeadEscalation.findOneAndUpdate(
          { followUpId: fu._id, level: level.key },
          {
            $setOnInsert: {
              leadId: fu.lead?._id || fu.lead,
              followUpId: fu._id,
              branchId: fu.branchId || fu.lead?.branchId,
              level: level.key,
              minutesOverdue: overdueMin,
              notifiedRoles: level.roles,
              meta: { leadName: fu.lead?.name, executiveName: fu.assignedTo?.name },
            },
          },
          { upsert: true, includeResultMetadata: true }
        );
        inserted = Boolean(result?.lastErrorObject?.upserted);
      } catch (err) {
        if (err.code === 11000) {
          inserted = false; // lost the race to a concurrent tick — already scheduled, not an error
        } else {
          throw err;
        }
      }

      existingKeys.add(`${fu._id}:${level.key}`);
      if (!inserted) continue; // already existed (this run or a concurrent one) — nothing new to notify

      await logLeadActivity({
        leadId: fu.lead?._id || fu.lead,
        branchId: fu.branchId,
        type: 'escalation_created',
        description: `Follow-up overdue by ${overdueMin} min — escalated (${level.key})`,
        actor: { name: 'System' },
        meta: { followUpId: fu._id, level: level.key },
      });

      await notifyFollowUpEscalation({
        followUp: fu,
        lead: fu.lead,
        level: level.key,
        minutesOverdue: overdueMin,
        notifyRoles: level.roles,
      });
    }
  }
}

module.exports = { processFollowUpEscalations, LEVELS };

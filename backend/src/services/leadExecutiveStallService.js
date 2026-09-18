const Lead = require('../models/Lead');
const { computeFirstContactDeadline } = require('./salesSopService');

const STALL_MINUTES = 20;
const TERMINAL_STATUSES = ['lost', 'booked_from_another_company', 'booked', 'converted'];

function stampExecutiveAssignment(target = {}) {
  const now = new Date();
  target.assignedAt = now;
  target.executiveLastViewedAt = null;
  return target;
}

/** Assignment stamp only — accept SLA disabled (leads stay with assignee immediately). */
function stampPendingAcceptance(target = {}, leadLike = {}) {
  const now = new Date();
  stampExecutiveAssignment(target);
  target.assignmentAcceptance = 'not_required';
  target.assignmentAcceptBy = null;
  target.acceptedAt = null;
  target.acceptanceMissedBy = null;
  target.acceptanceMissedName = '';
  target.acceptanceMissedAt = null;
  target.firstContactDeadline = computeFirstContactDeadline(
    { ...leadLike, ...target, assignedAt: target.assignedAt || now },
    target.assignedAt || now
  );
  return target;
}

/**
 * Fired every time the assigned executive opens Lead Detail — or accesses the lead's protected
 * phone number some other way (e.g. clicking Call directly from the Leads list, see
 * salesExecutiveController.authorizeLeadCallAccess / enterpriseLeadController.addCallNote).
 * Stamps `executiveLastViewedAt` (existing stall-tracking field, overwritten each open) and,
 * only the very first time, also stamps `firstOpenedAt`/`firstOpenedBy` for the management-only
 * "Opened" timeline entry — the `firstOpenedAt: null` filter on the second update makes that
 * stamp set-once, never overwritten, so calling this repeatedly for an already-opened lead never
 * creates a duplicate open event. No-ops (matches nothing) if `executiveId` isn't the lead's
 * assignedTo — safe to call from any role without an extra ownership check at the call site.
 *
 * Returns `{ firstOpened }` — true only when this call is the one that just transitioned the
 * lead from Not Opened to Opened, for callers that want to know/log that specifically.
 */
async function markLeadViewedByExecutive(leadId, executiveId) {
  const now = new Date();
  const [, firstOpenResult] = await Promise.all([
    Lead.updateOne(
      { _id: leadId, assignedTo: executiveId },
      { $set: { executiveLastViewedAt: now } }
    ),
    Lead.updateOne(
      { _id: leadId, assignedTo: executiveId, firstOpenedAt: null },
      { $set: { firstOpenedAt: now, firstOpenedBy: executiveId } }
    ),
  ]);
  return { firstOpened: Boolean(firstOpenResult?.modifiedCount) };
}

function computeExecutiveStallFlags(lead, now = new Date()) {
  const inactive = {
    executiveStallActive: false,
    executiveStallReason: null,
    executiveStallMinutes: 0,
  };

  if (!lead?.assignedTo) return inactive;
  if (TERMINAL_STATUSES.includes(lead.status)) return inactive;
  if (lead.lastFollowUp || lead.nextFollowUp) return inactive;

  const assignedAt = lead.assignedAt || lead.createdAt;
  if (!assignedAt) return inactive;

  const msSinceAssignment = now.getTime() - new Date(assignedAt).getTime();
  if (msSinceAssignment < STALL_MINUTES * 60 * 1000) return inactive;

  const lastViewed = lead.executiveLastViewedAt ? new Date(lead.executiveLastViewedAt) : null;
  const notViewedInWindow =
    !lastViewed || now.getTime() - lastViewed.getTime() >= STALL_MINUTES * 60 * 1000;

  if (!notViewedInWindow) return inactive;

  const minutesSinceView = lastViewed
    ? Math.floor((now.getTime() - lastViewed.getTime()) / 60000)
    : Math.floor(msSinceAssignment / 60000);

  const executiveName = lead.assignedTo?.name || 'Executive';

  return {
    executiveStallActive: true,
    executiveStallReason: lastViewed
      ? `${executiveName} has not viewed this lead in ${minutesSinceView} minutes and no follow-up has been added`
      : `${executiveName} has not viewed this lead yet and no follow-up has been added`,
    executiveStallMinutes: minutesSinceView,
  };
}

function buildExecutiveStallQuery(now = new Date()) {
  const assignedCutoff = new Date(now.getTime() - STALL_MINUTES * 60 * 1000);
  const viewCutoff = assignedCutoff;
  return {
    assignedTo: { $ne: null },
    status: { $nin: TERMINAL_STATUSES },
    lastFollowUp: null,
    nextFollowUp: null,
    $expr: {
      $and: [
        { $lte: [{ $ifNull: ['$assignedAt', '$createdAt'] }, assignedCutoff] },
        {
          $or: [
            { $eq: [{ $ifNull: ['$executiveLastViewedAt', null] }, null] },
            { $lte: ['$executiveLastViewedAt', viewCutoff] },
          ],
        },
      ],
    },
  };
}

module.exports = {
  STALL_MINUTES,
  TERMINAL_STATUSES,
  stampExecutiveAssignment,
  stampPendingAcceptance,
  markLeadViewedByExecutive,
  computeExecutiveStallFlags,
  buildExecutiveStallQuery,
};

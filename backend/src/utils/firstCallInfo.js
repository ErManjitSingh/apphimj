const CallNote = require('../models/CallNote');

/**
 * Batched (one query for the whole page, never per-lead) lookup of each lead's FIRST actual
 * call — the earliest CallNote by its authoritative start time, with that same record's duration.
 *
 * Every CallNote already represents one completed call outcome (this schema has no separate
 * dialing/cancelled/in-progress state — see enterpriseLeadController.addCallNote, which only ever
 * creates a CallNote once an outcome is logged), so every record counts as a real call.
 *
 * `startedAt` is optional on CallNote; falling back to `createdAt` when absent mirrors the exact
 * convention Call Report already uses (executiveActivityService.expandCallNoteToEvents).
 */
async function attachFirstCall(leads = []) {
  if (!leads.length) return leads;
  const leadIds = leads.map((l) => l._id).filter(Boolean);
  if (!leadIds.length) return leads;

  const rows = await CallNote.aggregate([
    { $match: { leadId: { $in: leadIds } } },
    { $addFields: { effectiveStart: { $ifNull: ['$startedAt', '$createdAt'] } } },
    { $sort: { leadId: 1, effectiveStart: 1 } },
    {
      $group: {
        _id: '$leadId',
        at: { $first: '$effectiveStart' },
        durationSeconds: { $first: '$duration' },
      },
    },
  ]);

  const byLead = new Map(rows.map((r) => [String(r._id), { at: r.at, durationSeconds: r.durationSeconds ?? 0 }]));
  leads.forEach((lead) => {
    lead.firstCall = byLead.get(String(lead._id)) || null;
  });
  return leads;
}

module.exports = { attachFirstCall };

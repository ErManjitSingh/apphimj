const mongoose = require('mongoose');
const CallNote = require('../models/CallNote');

/**
 * Lead Phone Number Visibility / Call-Gating rule.
 *
 * Source of truth: has the CURRENTLY ASSIGNED Sales Executive logged at least one CallNote
 * (`CallNote.leadId` + `CallNote.userId`) for this lead? Nothing else — not "lead opened", not
 * "follow-up created", not "call button clicked", not the viewer's role — unlocks the number.
 * See enterpriseLeadController.addCallNote: a CallNote is only ever created once a call outcome
 * is actually logged, so its mere existence is exactly "a real call happened" (same convention
 * firstCallInfo.attachFirstCall already relies on for the unrelated "first call" badge).
 *
 * Keyed by (leadId, assignedTo) rather than "any call ever on this lead" so a reassignment can
 * never inherit a previous assignee's calls — the new assignee must place their own first call
 * before the number unlocks for anyone, while the previous assignee's call history is preserved
 * untouched for reporting/audit.
 *
 * Applies identically regardless of viewer role (Admin included) — visibility is a property of
 * the lead/assignment, not of who is asking.
 */

const PHONE_PROTECTED_FIELDS = ['phone', 'alternatePhone', 'whatsapp'];

function pairKey(leadId, execId) {
  return `${leadId}_${execId}`;
}

function extractExecutiveId(lead) {
  const assignedTo = lead?.assignedTo;
  if (!assignedTo) return null;
  return String(assignedTo._id || assignedTo);
}

/**
 * Batched (one aggregation for the whole page, never per-lead) attach of `lead.phoneVisible`.
 * Mutates and returns the same array/object that was passed in.
 */
async function attachPhoneVisibility(leadOrList) {
  const list = Array.isArray(leadOrList) ? leadOrList : [leadOrList].filter(Boolean);
  if (!list.length) return leadOrList;

  const leadIds = [...new Set(list.map((l) => String(l._id)).filter(Boolean))];
  if (!leadIds.length) {
    list.forEach((lead) => { lead.phoneVisible = false; });
    return leadOrList;
  }

  const objectIds = leadIds
    .map((id) => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const rows = objectIds.length
    ? await CallNote.aggregate([
        { $match: { leadId: { $in: objectIds } } },
        { $group: { _id: { leadId: '$leadId', userId: '$userId' } } },
      ])
    : [];

  const calledPairs = new Set(
    rows.map((r) => pairKey(String(r._id.leadId), String(r._id.userId)))
  );

  list.forEach((lead) => {
    const execId = extractExecutiveId(lead);
    lead.phoneVisible = Boolean(execId) && calledPairs.has(pairKey(String(lead._id), execId));
  });

  return leadOrList;
}

/**
 * Mask the protected fields on a lead that isn't phone-visible yet. Sets `phone: 'XXXX'` (every
 * phone-display component already falls back to treating an exact 'XXXX' value as masked — see
 * ExecContactCell/MobileExecutiveLeads) plus a distinct `phoneMasked: true` flag.
 *
 * Deliberately NOT `contactMasked` — that flag means "no access to this lead at all" elsewhere
 * (roleScopedRepository.maskReturnedLeadForExecutive: a lead returned to the pool / reassigned
 * away, where View/Edit/Follow-up/Call are ALL blocked). A lead pending its first call is fully
 * usable — assigned, viewable, editable — only the digits are hidden and Call must stay enabled
 * (it's the action that unlocks them), so it needs its own flag that UI access-gates never key
 * off of. See LeadActionsMenu's `phonePending` vs `locked`.
 */
function maskLeadPhone(lead) {
  if (!lead || lead.phoneVisible) return lead;
  const masked = { ...lead };
  PHONE_PROTECTED_FIELDS.forEach((field) => {
    if (masked[field]) masked[field] = 'XXXX';
  });
  masked.phoneMasked = true;
  return masked;
}

/**
 * Convenience: attach visibility + mask in one call, for a single lead or an array. Requires
 * `assignedTo` to be present on each lead (either populated or a raw id) — every lead list/detail
 * select already includes it.
 */
async function applyPhoneVisibilityGate(leadOrList) {
  if (!leadOrList) return leadOrList;
  await attachPhoneVisibility(leadOrList);
  return Array.isArray(leadOrList) ? leadOrList.map(maskLeadPhone) : maskLeadPhone(leadOrList);
}

module.exports = {
  PHONE_PROTECTED_FIELDS,
  attachPhoneVisibility,
  maskLeadPhone,
  applyPhoneVisibilityGate,
};

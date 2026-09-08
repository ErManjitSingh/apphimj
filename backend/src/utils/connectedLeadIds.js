const CallNote = require('../models/CallNote');
const { withBranch } = require('./branchScope');

/** Canonical "connected" outcomes — derived from CallNote.OUTCOME_BUCKETS so this
 * never drifts from the bucketing logic used by Call Report / Executive Activity. */
const CONNECTED_OUTCOMES = Object.keys(CallNote.OUTCOME_BUCKETS).filter(
  (outcome) => CallNote.OUTCOME_BUCKETS[outcome] === 'connected'
);

/** Lead IDs with at least one CallNote whose outcome is in the canonical "connected" bucket. */
async function findConnectedLeadIds({ branchId } = {}) {
  const filter = withBranch({ outcome: { $in: CONNECTED_OUTCOMES } }, branchId);
  const ids = await CallNote.distinct('leadId', filter);
  return ids.filter(Boolean);
}

function wantsConnectedFilter(query = {}) {
  const flag = query.connected;
  return flag === '1' || flag === 'true' || flag === true;
}

module.exports = { findConnectedLeadIds, wantsConnectedFilter, CONNECTED_OUTCOMES };

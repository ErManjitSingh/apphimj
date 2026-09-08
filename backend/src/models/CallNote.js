const mongoose = require('mongoose');

const CALL_OUTCOMES = [
  // Warm / Hot / Cold (current)
  'discussed_package',
  'requested_callback',
  'cnp_same_day',
  'price_negotiation',
  'ready_to_book',
  'booked_elsewhere',
  'language_barrier',
  'not_interested',
  'invalid_number',
  'budget_issues',
  // legacy
  'interested',
  'need_better_hotel',
  'budget_issue',
  'call_back_later',
  'call_back_tomorrow',
  'no_answer',
  'busy',
  'other',
];

const callNoteSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    outcome: { type: String, enum: CALL_OUTCOMES, required: true },
    notes: { type: String, default: '', trim: true },
    /** Call talk time in seconds */
    duration: { type: Number, default: 0, min: 0 },
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

callNoteSchema.index({ leadId: 1, createdAt: -1 });

/**
 * Call Report bucketing: "connected" = guest answered (regardless of sales outcome),
 * "no_answer" = rang without pickup, "failed" = technical/unclassified.
 */
const OUTCOME_BUCKETS = {
  discussed_package: 'connected',
  requested_callback: 'connected',
  price_negotiation: 'connected',
  ready_to_book: 'connected',
  language_barrier: 'connected',
  not_interested: 'connected',
  budget_issues: 'connected',
  booked_elsewhere: 'connected',
  cnp_same_day: 'no_answer',
  busy: 'no_answer',
  no_answer: 'no_answer',
  invalid_number: 'failed',
  other: 'failed',
  // legacy
  interested: 'connected',
  need_better_hotel: 'connected',
  budget_issue: 'connected',
  call_back_later: 'connected',
  call_back_tomorrow: 'connected',
};

function bucketOutcome(outcome) {
  return OUTCOME_BUCKETS[outcome] || 'failed';
}

module.exports = mongoose.model('CallNote', callNoteSchema);
module.exports.CALL_OUTCOMES = CALL_OUTCOMES;
module.exports.OUTCOME_BUCKETS = OUTCOME_BUCKETS;
module.exports.bucketOutcome = bucketOutcome;

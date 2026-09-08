/** Keep in sync with backend/src/models/CallNote.js OUTCOME_BUCKETS */
export const OUTCOME_BUCKETS = {
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
  interested: 'connected',
  need_better_hotel: 'connected',
  budget_issue: 'connected',
  call_back_later: 'connected',
  call_back_tomorrow: 'connected',
};

export function bucketOutcome(outcome) {
  return OUTCOME_BUCKETS[outcome] || 'failed';
}

export const OUTCOME_LABELS = {
  discussed_package: 'Discussed package',
  requested_callback: 'Requested callback',
  price_negotiation: 'Price negotiation',
  ready_to_book: 'Ready to book',
  language_barrier: 'Language barrier',
  not_interested: 'Not interested',
  budget_issues: 'Budget issues',
  booked_elsewhere: 'Booked elsewhere',
  cnp_same_day: 'Could not pick up',
  busy: 'Busy',
  no_answer: 'No answer',
  invalid_number: 'Invalid number',
  other: 'Other',
  interested: 'Interested',
  need_better_hotel: 'Need better hotel',
  budget_issue: 'Budget issue',
  call_back_later: 'Call back later',
  call_back_tomorrow: 'Call back tomorrow',
};

export function outcomeLabel(outcome) {
  return OUTCOME_LABELS[outcome] || (outcome ? String(outcome).replace(/_/g, ' ') : 'Unknown');
}

export const BUCKET_LABELS = {
  connected: 'Connected',
  no_answer: 'No answer',
  failed: 'Failed',
};

export const BUCKET_STYLES = {
  connected: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  no_answer: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

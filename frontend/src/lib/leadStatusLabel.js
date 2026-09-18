/**
 * Canonical lead status labels — pipeline stage (+ temperature when useful).
 */
import { pipelineStatusLabel, normalizeLeadStatus, isBookedStatus } from './leadPipeline';

const STATUS_MEANINGS = {
  new_lead: 'Received — agent has not contacted yet',
  not_reachable: 'Contact attempted but no conversation',
  qualified: 'Meaningful conversation — enough info to offer',
  package_sent: 'Customized package / quotation shared',
  follow_up: 'Booking pending after package',
  booked: 'Booking / token / payment confirmed',
  postponed: 'Interested but travel plan deferred',
  lost: 'No longer an active booking opportunity',
  hot: 'Booking ke close',
  warm: 'Interested, decision pending',
  cold: 'Low intent / unclear timeline',
};

export function getLeadStatusLabel(status) {
  if (!status) return 'New Lead';
  if (isBookedStatus(status)) return 'Booked';
  return pipelineStatusLabel(status);
}

export function getLeadStatusMeaning(status) {
  const key = normalizeLeadStatus(status);
  return STATUS_MEANINGS[key] || STATUS_MEANINGS.new_lead;
}

export const STATUS_LABELS = {
  new_lead: 'New Lead',
  not_reachable: 'Not Reachable',
  qualified: 'Qualified',
  package_sent: 'Package Sent',
  follow_up: 'Follow-up',
  booked: 'Booked',
  postponed: 'Postponed',
  lost: 'Lost',
  converted: 'Booked',
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
};

export { STATUS_MEANINGS };

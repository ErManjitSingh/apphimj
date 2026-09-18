import {
  normalizeLeadStatus as normalizePipelineStatus,
  isLockedPipelineStatus,
  isBookedStatus,
} from '../lib/leadPipeline';

const map = {
  new: 'new_lead',
  new_lead: 'new_lead',
  contacted: 'qualified',
  working_progress: 'follow_up',
  qualified: 'qualified',
  follow_up: 'follow_up',
  proposal: 'package_sent',
  quotation_sent: 'package_sent',
  package_sent: 'package_sent',
  negotiation: 'follow_up',
  reactivated: 'follow_up',
  won: 'booked',
  converted: 'booked',
  booking: 'booked',
  booked: 'booked',
  postponed: 'postponed',
  lost: 'lost',
  booked_from_another_company: 'lost',
  not_reachable: 'not_reachable',
};

export function normalizeLeadStatus(status) {
  if (map[status]) return map[status];
  return normalizePipelineStatus(status);
}

/** Lead is closed — no further status changes in UI or API */
export const LOCKED_LEAD_STATUSES = ['booked', 'converted', 'lost', 'booked_from_another_company'];

export function isLeadStatusLocked(status) {
  return isLockedPipelineStatus(status) || LOCKED_LEAD_STATUSES.includes(normalizeLeadStatus(status));
}

export { isBookedStatus };

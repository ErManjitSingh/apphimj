/**
 * Canonical lead sales pipeline (status) — independent of temperature & call outcome.
 */
const LEAD_STATUSES = [
  'new_lead',
  'not_reachable',
  'qualified',
  'package_sent',
  'follow_up',
  'booked',
  'postponed',
  'lost',
];

/** Accepted on write for one release; normalized to LEAD_STATUSES. */
const LEGACY_STATUS_ALIASES = {
  new: 'new_lead',
  contacted: 'qualified',
  working_progress: 'follow_up',
  quotation_sent: 'package_sent',
  negotiation: 'follow_up',
  reactivated: 'follow_up',
  converted: 'booked',
  booked_from_another_company: 'lost',
  // already-new keys pass through
  new_lead: 'new_lead',
  not_reachable: 'not_reachable',
  qualified: 'qualified',
  package_sent: 'package_sent',
  follow_up: 'follow_up',
  booked: 'booked',
  postponed: 'postponed',
  lost: 'lost',
};

/** Mongoose enum: new + legacy so unmigrated docs can still save once. */
const LEAD_STATUS_ENUM = [
  ...LEAD_STATUSES,
  'new',
  'contacted',
  'working_progress',
  'quotation_sent',
  'negotiation',
  'reactivated',
  'converted',
  'booked_from_another_company',
];

const LOCKED_LEAD_STATUSES = ['booked', 'lost', 'converted', 'booked_from_another_company'];

const ACTIVE_LEAD_STATUSES = [
  'new_lead',
  'not_reachable',
  'qualified',
  'package_sent',
  'follow_up',
  'postponed',
  // legacy during migrate
  'new',
  'contacted',
  'working_progress',
  'quotation_sent',
  'negotiation',
  'reactivated',
];

const LOST_LEAD_STATUSES = ['lost', 'booked_from_another_company'];

const BOOKED_LEAD_STATUSES = ['booked', 'converted'];

const LEAD_TEMPERATURES = ['hot', 'warm', 'cold'];

const CALL_OUTCOMES = [
  'connected',
  'not_picked',
  'busy',
  'switched_off',
  'wrong_number',
  'callback_requested',
  'whatsapp_sent',
];

const NOT_REACHABLE_CALL_OUTCOMES = [
  'not_picked',
  'busy',
  'switched_off',
  'wrong_number',
];

const TERMINAL_LOST_REASONS = [
  'booked_elsewhere',
  'competitor_booked',
  'price_issue',
  'budget_issues',
  'not_interested',
  'plan_cancelled',
  'no_response',
  'invalid_number',
  'language_barrier',
  'other',
];

function normalizeLeadStatus(raw) {
  if (raw == null || raw === '') return 'new_lead';
  const key = String(raw).trim().toLowerCase();
  return LEGACY_STATUS_ALIASES[key] || (LEAD_STATUSES.includes(key) ? key : 'new_lead');
}

function normalizeTemperature(raw) {
  const key = String(raw || '').trim().toLowerCase();
  if (key === 'vip') return 'hot';
  if (LEAD_TEMPERATURES.includes(key)) return key;
  return 'cold';
}

function normalizeCallOutcome(raw) {
  const key = String(raw || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (CALL_OUTCOMES.includes(key)) return key;
  const aliases = {
    no_answer: 'not_picked',
    not_answered: 'not_picked',
    cnp: 'not_picked',
    cnp_same_day: 'not_picked',
    switchedoff: 'switched_off',
    callback: 'callback_requested',
    whatsapp: 'whatsapp_sent',
  };
  return aliases[key] || '';
}

function isBookedStatus(status) {
  return BOOKED_LEAD_STATUSES.includes(normalizeLeadStatus(status));
}

function isLostStatus(status) {
  return LOST_LEAD_STATUSES.includes(String(status)) || normalizeLeadStatus(status) === 'lost';
}

function isLockedStatus(status) {
  return LOCKED_LEAD_STATUSES.includes(String(status)) || LOCKED_LEAD_STATUSES.includes(normalizeLeadStatus(status));
}

/**
 * Map a single lead document's old status → new (for migration).
 */
function mapLegacyLeadStatus(lead = {}) {
  const status = String(lead.status || '').trim();
  const reason = String(lead.statusReason || lead.coldReason || '').toLowerCase();

  if (status === 'contacted') {
    if (
      reason.includes('cnp') ||
      reason.includes('not_picked') ||
      reason.includes('no_answer') ||
      reason.includes('not_reachable') ||
      reason.includes('busy') ||
      reason.includes('switched')
    ) {
      return { status: 'not_reachable' };
    }
    return { status: 'qualified' };
  }

  if (status === 'booked_from_another_company') {
    return { status: 'lost', lostReason: lead.lostReason || 'booked_elsewhere' };
  }

  if (status === 'negotiation') {
    return { status: 'follow_up', temperature: lead.temperature === 'cold' ? 'hot' : lead.temperature || 'hot' };
  }

  const mapped = normalizeLeadStatus(status);
  return { status: mapped };
}

module.exports = {
  LEAD_STATUSES,
  LEAD_STATUS_ENUM,
  LEGACY_STATUS_ALIASES,
  LOCKED_LEAD_STATUSES,
  ACTIVE_LEAD_STATUSES,
  LOST_LEAD_STATUSES,
  BOOKED_LEAD_STATUSES,
  LEAD_TEMPERATURES,
  CALL_OUTCOMES,
  NOT_REACHABLE_CALL_OUTCOMES,
  TERMINAL_LOST_REASONS,
  normalizeLeadStatus,
  normalizeTemperature,
  normalizeCallOutcome,
  isBookedStatus,
  isLostStatus,
  isLockedStatus,
  mapLegacyLeadStatus,
};

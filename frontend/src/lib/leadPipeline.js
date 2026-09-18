/**
 * Canonical lead pipeline — Status (stage) independent of Temperature & Call Outcome.
 */

export const LEAD_PIPELINE_STATUSES = [
  { value: 'new_lead', label: 'New Lead', short: 'New' },
  { value: 'not_reachable', label: 'Not Reachable', short: 'Not Reachable' },
  { value: 'qualified', label: 'Qualified', short: 'Qualified' },
  { value: 'package_sent', label: 'Package Sent', short: 'Package Sent' },
  { value: 'follow_up', label: 'Follow-up', short: 'Follow-up' },
  { value: 'booked', label: 'Booked', short: 'Booked' },
  { value: 'postponed', label: 'Postponed', short: 'Postponed' },
  { value: 'lost', label: 'Lost', short: 'Lost' },
];

export const LEAD_PIPELINE_STATUS_VALUES = LEAD_PIPELINE_STATUSES.map((s) => s.value);

export const LEGACY_STATUS_ALIASES = {
  new: 'new_lead',
  contacted: 'qualified',
  working_progress: 'follow_up',
  quotation_sent: 'package_sent',
  negotiation: 'follow_up',
  reactivated: 'follow_up',
  converted: 'booked',
  booked_from_another_company: 'lost',
};

export const LEAD_TEMPERATURE_OPTIONS = [
  { value: 'hot', label: 'Hot', emoji: '🔥' },
  { value: 'warm', label: 'Warm', emoji: '🟡' },
  { value: 'cold', label: 'Cold', emoji: '🔵' },
];

export const CALL_OUTCOME_OPTIONS = [
  { value: 'connected', label: 'Connected' },
  { value: 'not_picked', label: 'Not Picked' },
  { value: 'busy', label: 'Busy' },
  { value: 'switched_off', label: 'Switched Off' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'callback_requested', label: 'Callback Requested' },
  { value: 'whatsapp_sent', label: 'WhatsApp Sent' },
];

export const LOCKED_PIPELINE_STATUSES = ['booked', 'lost', 'converted', 'booked_from_another_company'];

export const LOST_REASON_OPTIONS = [
  { value: 'competitor_booked', label: 'Competitor se booked' },
  { value: 'booked_elsewhere', label: 'Booked elsewhere' },
  { value: 'price_issue', label: 'Price issue' },
  { value: 'budget_issues', label: 'Budget issues' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'plan_cancelled', label: 'Plan cancelled' },
  { value: 'no_response', label: 'No response after follow-up cycle' },
  { value: 'invalid_number', label: 'Invalid number' },
  { value: 'language_barrier', label: 'Language barrier' },
  { value: 'other', label: 'Other' },
];

export function normalizeLeadStatus(raw) {
  if (raw == null || raw === '') return 'new_lead';
  const key = String(raw).trim().toLowerCase();
  if (LEAD_PIPELINE_STATUS_VALUES.includes(key)) return key;
  return LEGACY_STATUS_ALIASES[key] || 'new_lead';
}

export function pipelineStatusLabel(status) {
  const key = normalizeLeadStatus(status);
  return LEAD_PIPELINE_STATUSES.find((s) => s.value === key)?.label || key;
}

export function isBookedStatus(status) {
  const key = String(status || '');
  return key === 'booked' || key === 'converted' || normalizeLeadStatus(status) === 'booked';
}

export function isLostStatus(status) {
  const key = String(status || '');
  return key === 'lost' || key === 'booked_from_another_company' || normalizeLeadStatus(status) === 'lost';
}

export function isLockedPipelineStatus(status) {
  return LOCKED_PIPELINE_STATUSES.includes(String(status || '')) || LOCKED_PIPELINE_STATUSES.includes(normalizeLeadStatus(status));
}

/** Build API payload when agent updates pipeline status (and optional related fields). */
export function buildPipelineStatusPayload({
  status,
  temperature,
  callOutcome,
  lostReason,
  postponedReason,
  postponedAt,
  comment = '',
} = {}) {
  const next = normalizeLeadStatus(status);
  const note = String(comment || '').trim();
  const payload = {
    status: next,
  };
  if (temperature) {
    payload.temperature = temperature === 'vip' ? 'hot' : temperature;
    payload.isHot = payload.temperature === 'hot';
  }
  if (callOutcome) payload.callOutcome = callOutcome;
  if (note) payload.statusReason = note;

  if (next === 'lost') {
    payload.lostReason = lostReason || note || 'other';
    payload.statusReason = payload.lostReason;
    payload.temperature = payload.temperature || 'cold';
    payload.isHot = false;
  }
  if (next === 'postponed') {
    payload.postponedReason = postponedReason || note || 'Postponed';
    if (postponedAt) payload.postponedAt = postponedAt;
    else payload.postponedAt = new Date().toISOString();
  }
  if (next === 'booked') {
    payload.temperature = 'hot';
    payload.isHot = true;
  }
  return payload;
}

/** Temperature-only update — does not change pipeline status. */
export function buildTemperaturePayload(temperature, comment = '') {
  const temp = temperature === 'vip' ? 'hot' : temperature;
  const note = String(comment || '').trim();
  return {
    temperature: temp,
    isHot: temp === 'hot',
    ...(note ? { statusReason: note } : {}),
  };
}

/**
 * Backward-compat: old Warm/Hot/Cold category picker → new independent fields.
 * Prefer Status + Temperature UI going forward.
 */
export function buildLeadStatusPayload(category, option, comment = '', lead = null) {
  const note = String(comment || '').trim();
  const current = normalizeLeadStatus(lead?.status);

  if (category === 'converted') {
    return {
      status: 'booked',
      statusReason: note ? `converted — ${note}` : 'converted',
      temperature: 'hot',
      isHot: true,
    };
  }

  if (category === 'hot') {
    return {
      status: current === 'new_lead' || current === 'not_reachable' ? current : current,
      temperature: 'hot',
      isHot: true,
      statusReason: note ? `${option} — ${note}` : option,
    };
  }

  if (category === 'cold') {
    const terminal = [
      'booked_elsewhere',
      'not_interested',
      'invalid_number',
      'budget_issues',
      'plan_cancelled',
      'no_response',
      'language_barrier',
    ];
    if (terminal.includes(option)) {
      return {
        status: 'lost',
        lostReason: option,
        temperature: 'cold',
        isHot: false,
        coldReason: option,
        statusReason: note ? `${option} — ${note}` : option,
      };
    }
    return {
      temperature: 'cold',
      isHot: false,
      coldReason: option,
      statusReason: note ? `${option} — ${note}` : option,
    };
  }

  // warm
  if (option === 'cnp_same_day') {
    return {
      status: current === 'new_lead' || current === 'new' ? 'not_reachable' : current,
      temperature: 'warm',
      isHot: false,
      callOutcome: 'not_picked',
      statusReason: note ? `${option} — ${note}` : option,
    };
  }
  return {
    temperature: 'warm',
    isHot: false,
    statusReason: note ? `${option} — ${note}` : option,
  };
}

export function pipelineStatusToTemperatureLabel(status) {
  // Legacy helper used by StatusBadge — prefer temperature field when available
  const key = normalizeLeadStatus(status);
  if (key === 'booked') return 'Booked';
  if (key === 'lost') return 'Lost';
  return pipelineStatusLabel(key);
}

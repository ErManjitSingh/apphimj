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
  { value: 'na', label: 'N/A', emoji: '⚪', hint: 'Closed deals — not mix with pipeline heat' },
];

export function normalizeLeadTemperature(raw, status) {
  const key = String(raw || '').trim().toLowerCase();
  if (key === 'vip') return 'hot';
  if (['hot', 'warm', 'cold', 'na'].includes(key)) return key;
  if (isBookedStatus(status) || isLostStatus(status)) return 'na';
  return 'warm';
}

export function temperatureLabel(raw, status) {
  const key = normalizeLeadTemperature(raw, status);
  return LEAD_TEMPERATURE_OPTIONS.find((t) => t.value === key)?.label || key;
}

export function temperatureTone(raw, status) {
  const key = normalizeLeadTemperature(raw, status);
  if (key === 'hot') return 'bg-rose-50 text-rose-600 ring-rose-200';
  if (key === 'cold') return 'bg-sky-50 text-sky-600 ring-sky-200';
  if (key === 'na') return 'bg-slate-100 text-slate-500 ring-slate-200';
  return 'bg-amber-50 text-amber-700 ring-amber-200';
}

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
  { value: 'too_expensive', label: 'Too Expensive' },
  { value: 'not_travelling', label: 'Not Travelling' },
  { value: 'booked_elsewhere', label: 'Booked Elsewhere' },
  { value: 'no_response', label: 'No Response' },
  { value: 'date_changed', label: 'Date Changed' },
  { value: 'budget_issue', label: 'Budget Issue / Costing Issue' },
  { value: 'destination_changed', label: 'Destination Changed' },
  { value: 'duplicate_lead', label: 'Repeated Lead' },
  { value: 'invalid_number', label: 'Invalid number / wrong' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'lost_contacted', label: 'Lost contacted' },
  { value: 'does_not_exist', label: 'Does not exist' },
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

  // Not-picked / busy / switched-off on a New Lead → Not Reachable status
  const unreachable = ['not_picked', 'busy', 'switched_off', 'wrong_number'];
  if (
    unreachable.includes(String(callOutcome || '').toLowerCase()) &&
    (next === 'new_lead' || next === 'new')
  ) {
    payload.status = 'not_reachable';
  }

  if (next === 'lost' || payload.status === 'lost') {
    const reasonKey = lostReason || note || 'other';
    payload.lostReason = reasonKey;
    // Backend accepts `key` or `key — comment`; attach optional remarks as comment
    payload.statusReason = note && lostReason ? `${lostReason} — ${note}` : reasonKey;
    payload.temperature = 'na';
    payload.isHot = false;
  }
  if (next === 'postponed') {
    payload.postponedReason = postponedReason || note || 'Postponed';
    if (postponedAt) payload.postponedAt = postponedAt;
    else payload.postponedAt = new Date().toISOString();
  }
  if (next === 'booked') {
    payload.temperature = 'na';
    payload.isHot = false;
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

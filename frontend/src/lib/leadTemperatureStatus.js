/**
 * Canonical CRM lead status = Warm / Hot / Cold / Converted.
 * Sub-options are the only selectable outcomes across the CRM.
 */
import {
  WARM_OUTCOMES,
  HOT_OUTCOMES,
  COLD_OUTCOMES,
  CONVERTED_OUTCOMES,
  FOLLOWUP_CATEGORY_OPTIONS,
  getOutcomesForCategory,
} from '../components/followups/constants';
export {
  WARM_OUTCOMES,
  HOT_OUTCOMES,
  COLD_OUTCOMES,
  CONVERTED_OUTCOMES,
  FOLLOWUP_CATEGORY_OPTIONS,
  getOutcomesForCategory,
};

/** Lead list / filter chips — Warm, Hot, Cold only (Converted has its own Bookings filter) */
export const LEAD_TEMPERATURE_FILTERS = [
  { value: 'cold', label: 'Cold' },
  { value: 'warm', label: 'Warm' },
  { value: 'hot', label: 'Hot' },
];

/** All selectable outcomes (for dropdowns that list every option) */
export const ALL_LEAD_STATUS_OUTCOMES = [
  ...WARM_OUTCOMES.map((o) => ({ ...o, category: 'warm', temperature: 'warm' })),
  ...HOT_OUTCOMES.map((o) => ({ ...o, category: 'hot', temperature: 'hot' })),
  ...COLD_OUTCOMES.map((o) => ({ ...o, category: 'cold', temperature: 'cold' })),
  ...CONVERTED_OUTCOMES.map((o) => ({ ...o, category: 'converted', temperature: 'hot' })),
];

/**
 * Map Warm/Hot/Cold/Converted + option → API lead update payload.
 * The selected outcome becomes the lead's current temperature directly —
 * a Cold lead picking a Warm outcome is just Warm, same as any other Warm pick.
 * Converted requires payment screenshot + advanceAmount on the request (added by UI).
 */
export function buildLeadStatusPayload(category, option, comment = '', lead = null) {
  const note = String(comment || '').trim();
  const statusReason = note ? `${option} — ${note}` : option;

  if (category === 'warm') {
    return {
      status: option === 'cnp_same_day' ? 'follow_up' : 'contacted',
      statusReason,
      temperature: 'warm',
      isHot: false,
    };
  }

  if (category === 'hot') {
    return {
      status: 'negotiation',
      statusReason,
      temperature: 'hot',
      isHot: true,
    };
  }

  if (category === 'cold') {
    return {
      status: 'follow_up',
      statusReason,
      temperature: 'cold',
      coldReason: option,
      isHot: false,
    };
  }

  if (category === 'converted') {
    return {
      status: 'converted',
      statusReason: note ? `converted — ${note}` : 'converted',
      temperature: 'hot',
      isHot: true,
      coldReason: '',
    };
  }

  return null;
}

/** Map raw pipeline status → display when no lead/statusReason is available. */
export function pipelineStatusToTemperatureLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'converted') return 'Converted';
  if (s === 'working_progress') return 'No status';
  if (s === 'warm') return 'Warm';
  if (s === 'hot') return 'Hot';
  if (s === 'cold') return 'Cold';
  return 'No status';
}

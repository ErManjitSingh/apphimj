/**
 * Lead temperature helpers + backward-compatible Warm/Hot/Cold payload builder.
 * Pipeline status lives in leadPipeline.js — keep temperature independent of status.
 */
import {
  WARM_OUTCOMES,
  HOT_OUTCOMES,
  COLD_OUTCOMES,
  CONVERTED_OUTCOMES,
  FOLLOWUP_CATEGORY_OPTIONS,
  getOutcomesForCategory,
} from '../components/followups/constants';
import {
  buildLeadStatusPayload,
  buildPipelineStatusPayload,
  buildTemperaturePayload,
  pipelineStatusToTemperatureLabel,
  LEAD_TEMPERATURE_OPTIONS,
  normalizeLeadStatus,
  isBookedStatus,
} from './leadPipeline';

export {
  WARM_OUTCOMES,
  HOT_OUTCOMES,
  COLD_OUTCOMES,
  CONVERTED_OUTCOMES,
  FOLLOWUP_CATEGORY_OPTIONS,
  getOutcomesForCategory,
  buildLeadStatusPayload,
  buildPipelineStatusPayload,
  buildTemperaturePayload,
  pipelineStatusToTemperatureLabel,
  LEAD_TEMPERATURE_OPTIONS,
  normalizeLeadStatus,
  isBookedStatus,
};

/** Lead list / filter chips — Warm, Hot, Cold temperature only */
export const LEAD_TEMPERATURE_FILTERS = [
  { value: 'cold', label: 'Cold' },
  { value: 'warm', label: 'Warm' },
  { value: 'hot', label: 'Hot' },
];

/** All selectable legacy outcomes (for dropdowns that still list every option) */
export const ALL_LEAD_STATUS_OUTCOMES = [
  ...WARM_OUTCOMES.map((o) => ({ ...o, category: 'warm', temperature: 'warm' })),
  ...HOT_OUTCOMES.map((o) => ({ ...o, category: 'hot', temperature: 'hot' })),
  ...COLD_OUTCOMES.map((o) => ({ ...o, category: 'cold', temperature: 'cold' })),
  ...CONVERTED_OUTCOMES.map((o) => ({ ...o, category: 'converted', temperature: 'hot' })),
];

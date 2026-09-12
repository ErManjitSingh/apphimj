/**
 * Canonical lead status labels — Warm / Hot / Cold when selected; else No status.
 */
import { pipelineStatusToTemperatureLabel } from './leadTemperatureStatus';

const STATUS_LABELS = {
  warm: 'Warm',
  hot: 'Hot',
  cold: 'Cold',
  converted: 'Converted',
  new: 'No status',
  // Old pipeline keys no longer map to Warm/Hot/Cold by themselves
  contacted: 'No status',
  working_progress: 'No status',
  auto_connected_24h: 'No status',
  qualified: 'No status',
  quotation_sent: 'No status',
  follow_up: 'No status',
  negotiation: 'No status',
  reactivated: 'No status',
  lost: 'No status',
  booked_from_another_company: 'No status',
};

const STATUS_MEANINGS = {
  warm: 'Package discussed / callback / CNP / price negotiation',
  hot: 'Ready to Book',
  cold: 'Booked elsewhere / language / not interested / invalid / budget',
  working_progress: 'Not a Warm/Hot/Cold selection',
  auto_connected_24h: 'Auto-moved after being connected',
  new: 'No Warm / Hot / Cold option selected yet',
  converted: 'Customer has confirmed / paid',
};

export function getLeadStatusLabel(status) {
  if (!status) return 'No status';
  if (STATUS_LABELS[status] !== undefined) return STATUS_LABELS[status];
  const mapped = pipelineStatusToTemperatureLabel(status);
  // pipeline helper still returns Warm/Hot/Cold for old keys — force No status
  if (['Warm', 'Hot', 'Cold'].includes(mapped) && !['warm', 'hot', 'cold'].includes(status)) {
    return 'No status';
  }
  return mapped || 'No status';
}

export function getLeadStatusMeaning(status) {
  if (!status) return STATUS_MEANINGS.new;
  if (status === 'working_progress') return STATUS_MEANINGS.working_progress;
  const label = getLeadStatusLabel(status);
  if (label === 'Converted' || label === 'Booking') return STATUS_MEANINGS.converted;
  if (label === 'No status') return STATUS_MEANINGS.new;
  const key = String(label).toLowerCase();
  return STATUS_MEANINGS[key] || STATUS_MEANINGS.new;
}

export { STATUS_LABELS, STATUS_MEANINGS };

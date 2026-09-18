import { getLeadStatusLabel } from './leadStatusLabel';
import { LEAD_FOLLOW_UP_OUTCOMES } from '../constants/leadFollowUpOutcomes';
import {
  getAllOptionEntries,
  bucketFromOptionKey,
} from './leadStatusOptionsStore';
import { isBookedStatus } from './leadPipeline';

function currentOptionLabels() {
  return [...getAllOptionEntries(), ...LEAD_FOLLOW_UP_OUTCOMES];
}

function optionKeysByLength() {
  return currentOptionLabels()
    .map((o) => o.value)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
}

/** Internal/system markers that are never a real user-selected option. */
function isSystemReasonKey(key) {
  const k = String(key || '').trim();
  return !k || k === 'working_progress' || k === 'auto_connected_24h';
}

function extractReasonKey(statusReason) {
  const raw = String(statusReason || '').trim();
  if (!raw) return '';
  const cleaned = raw.replace(/^not_connected:/i, '').trim();
  const parts = cleaned.split(/\s*[—–]\s*|\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  const head = (parts[0] || '').replace(/:$/, '').trim();
  const keys = optionKeysByLength();
  if (keys.includes(head)) return head;
  const found = keys.find(
    (key) =>
      cleaned === key ||
      cleaned.startsWith(`${key} `) ||
      cleaned.startsWith(`${key}—`) ||
      cleaned.startsWith(`${key}–`) ||
      cleaned.startsWith(`${key}:`) ||
      cleaned.includes(` ${key} `) ||
      cleaned.endsWith(` ${key}`)
  );
  return found || '';
}

function findOptionLabel(key) {
  if (!key) return '';
  const hit = currentOptionLabels().find((o) => o.value === key || o.lostReason === key);
  if (hit?.label) return hit.label;
  // Also match when statusReason stored the human label instead of key
  const byLabel = currentOptionLabels().find(
    (o) => String(o.label || '').toLowerCase() === String(key).toLowerCase()
  );
  return byLabel?.label || '';
}

function resolveListReasonKey(lead) {
  const reason = String(lead?.statusReason || '').trim();
  const coldReason = String(lead?.coldReason || '').trim();
  const followUpOutcome = String(lead?.lastFollowUpOutcome || lead?.followUpOutcome || '').trim();
  const candidates = [
    extractReasonKey(reason),
    extractReasonKey(coldReason),
    extractReasonKey(followUpOutcome),
  ].filter((key) => key && !isSystemReasonKey(key));
  if (candidates.length) return candidates[0];
  // Match full reason / outcome against option labels (older free-text saves)
  const rawSources = [reason, coldReason, followUpOutcome].filter(
    (raw) => raw && !isSystemReasonKey(raw.split(/\s*[—–]\s*|\s+-\s+/)[0]?.trim())
  );
  const raw = rawSources[0] || '';
  if (!raw) return '';
  const head = raw.split(/\s*[—–]\s*|\s+-\s+/)[0]?.replace(/:$/, '').trim() || '';
  if (!head || isSystemReasonKey(head)) return '';
  const byLabel = currentOptionLabels().find(
    (o) => String(o.label || '').toLowerCase() === head.toLowerCase()
  );
  if (byLabel?.value) return byLabel.value;
  // Only keep legacy keys that map to a Warm/Hot/Cold bucket (e.g. cnp)
  if (bucketFromOptionKey(head) || /^cnp$/i.test(head)) return head;
  return '';
}

function bucketFromReasonKey(reasonKey) {
  return bucketFromOptionKey(reasonKey);
}

/**
 * Exact selected option label — or "No status" when none of the current options is set.
 */
export function getExecutiveSetStatusDisplay(lead) {
  const status = lead?.status || 'new';
  const pipelineLabel = getLeadStatusLabel(status);
  const reasonKey = resolveListReasonKey(lead);
  const optionLabel = findOptionLabel(reasonKey);
  const bucket = bucketFromReasonKey(reasonKey);

  if (status === 'converted' || status === 'booked' || isBookedStatus(status)) {
    return {
      label: 'Booked',
      detail: '',
      pipelineLabel: 'Booked',
      title: 'Booked',
      bucket: 'converted',
    };
  }

  if (optionLabel && bucket) {
    return {
      label: optionLabel,
      detail: '',
      pipelineLabel,
      title: `${optionLabel} · ${bucket.charAt(0).toUpperCase()}${bucket.slice(1)}`,
      bucket,
      subLabel: '',
    };
  }

  return {
    label: 'No status',
    detail: '',
    pipelineLabel,
    title: 'No status',
    bucket: 'new',
    subLabel: '',
  };
}

/** Lead-list buckets only. */
export const LIST_STATUS_STYLES = {
  cold: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/25',
  warm: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-amber-500/25',
  hot: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/25',
  new: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/25',
  converted: 'bg-emerald-600/10 text-emerald-800 dark:text-emerald-300 ring-emerald-600/25',
};

const LIST_STATUS_DOT = {
  cold: 'bg-slate-500',
  warm: 'bg-amber-500',
  hot: 'bg-rose-500',
  new: 'bg-sky-500',
  converted: 'bg-emerald-600',
};

function humanizeReasonKey(key) {
  if (!key) return '';
  const known = findOptionLabel(key);
  if (known) return known;
  const raw = String(key).trim();
  if (!raw || isSystemReasonKey(raw)) return '';
  if (/^cnp$/i.test(raw)) return 'CNP';
  return raw
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Status display for leads — pipeline stage as label, temperature as color bucket.
 */
export function getLeadListStatusDisplay(lead) {
  const status = lead?.status || 'new_lead';
  const tempRaw = String(lead?.temperature || '').toLowerCase();
  const temp = tempRaw === 'vip' ? 'hot' : tempRaw;
  const reasonKey = resolveListReasonKey(lead);
  const optionLabel = findOptionLabel(reasonKey) || humanizeReasonKey(reasonKey);

  let bucket = 'new';
  if (isBookedStatus(status) || status === 'converted' || status === 'booked') {
    bucket = 'converted';
  } else if (temp === 'hot' || temp === 'warm' || temp === 'cold') {
    bucket = temp;
  } else if (status === 'lost' || status === 'booked_from_another_company') {
    bucket = 'cold';
  }

  const pipelineKey =
    status === 'converted' || status === 'booked'
      ? 'booked'
      : status === 'new'
        ? 'new_lead'
        : status === 'quotation_sent'
          ? 'package_sent'
          : status;

  const PIPELINE_LABELS = {
    new_lead: 'New Lead',
    not_reachable: 'Not Reachable',
    qualified: 'Qualified',
    package_sent: 'Package Sent',
    follow_up: 'Follow-up',
    booked: 'Booked',
    postponed: 'Postponed',
    lost: 'Lost',
    new: 'New Lead',
    converted: 'Booked',
    quotation_sent: 'Package Sent',
    contacted: 'Qualified',
    negotiation: 'Follow-up',
    working_progress: 'Follow-up',
    reactivated: 'Follow-up',
    booked_from_another_company: 'Lost',
  };

  const label = PIPELINE_LABELS[pipelineKey] || PIPELINE_LABELS[status] || 'New Lead';
  const tempLabel = temp === 'hot' ? 'Hot' : temp === 'warm' ? 'Warm' : temp === 'cold' ? 'Cold' : '';

  return {
    bucket,
    listBucket: bucket,
    label,
    mainLabel: label,
    subLabel: tempLabel,
    categoryLabel: tempLabel || label,
    exactLabel: optionLabel || label,
    reasonLabel: optionLabel,
    pipelineLabel: label,
    detail: tempLabel,
    title: tempLabel ? `${label} · ${tempLabel}` : label,
    className: LIST_STATUS_STYLES[bucket] || LIST_STATUS_STYLES.new,
    listClassName: LIST_STATUS_STYLES[bucket] || LIST_STATUS_STYLES.new,
    dotClass: LIST_STATUS_DOT[bucket] || LIST_STATUS_DOT.new,
    listDotClass: LIST_STATUS_DOT[bucket] || LIST_STATUS_DOT.new,
    animateLabel: bucket === 'hot',
  };
}

export function listStatusTextClass(display) {
  return display?.animateLabel ? 'inline-block origin-center animate-hot-text' : undefined;
}

export const LIST_STATUS_FILTERS = [
  {
    value: 'cold',
    label: 'Cold',
    activeClass: 'bg-slate-700 text-white shadow-sm shadow-slate-500/30 ring-slate-800/20',
    idleClass: 'bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200/80',
  },
  {
    value: 'warm',
    label: 'Warm',
    activeClass: 'bg-amber-500 text-white shadow-sm shadow-amber-500/30 ring-amber-600/20',
    idleClass: 'bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100',
  },
  {
    value: 'hot',
    label: 'Hot',
    activeClass: 'bg-rose-600 text-white shadow-sm shadow-rose-500/30 ring-rose-700/20',
    idleClass: 'bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100',
  },
];

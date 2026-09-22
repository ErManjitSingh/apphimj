import API from '../../api/axios';
import { localDateTimeToIso } from '../../lib/localDateTime';

/** Create follow-up (sales executive only). */
export async function createExecutiveFollowUp(payload) {
  const res = await API.post('/sales-executive/followups', payload, { skipErrorToast: true });
  return res.data;
}

export async function updateExecutiveFollowUp(id, payload) {
  const res = await API.put(`/sales-executive/followups/${id}`, payload, { skipErrorToast: true });
  return res.data;
}

export function normalizeScheduledAt(value) {
  if (!value) return null;
  const raw = String(value);
  // Naive local datetime from older callers — convert with local wall-clock fields.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw) && !/[zZ]|[+-]\d{2}:\d{2}$/.test(raw)) {
    const [datePart, timePart] = raw.split('T');
    return localDateTimeToIso(datePart, (timePart || '00:00').slice(0, 5));
  }
  const scheduledDate = new Date(value);
  return Number.isNaN(scheduledDate.getTime()) ? null : scheduledDate.toISOString();
}

export function buildFollowUpPayload(form) {
  return {
    lead: form.lead,
    type: form.type || 'call',
    category: form.category || 'warm',
    // Converted sends no next-follow-up date/time — backend logs it as resolved history.
    scheduledAt: normalizeScheduledAt(form.scheduledAt),
    notes: form.notes || form.remarks || '',
    priority: form.priority || 'medium',
    outcome: form.outcome || '',
    coldReason: form.coldReason || undefined,
    notPickedReason: form.notPickedReason || undefined,
    pickedOutcome: form.pickedOutcome || undefined,
    warmOutcome: form.warmOutcome || undefined,
    hotOutcome: form.hotOutcome || undefined,
    lostReason: form.lostReason || undefined,
    statusReason: form.statusReason || undefined,
  };
}

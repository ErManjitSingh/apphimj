import API from '../../api/axios';

/** Create follow-up (sales executive only). */
export async function createExecutiveFollowUp(payload) {
  const res = await API.post('/sales-executive/followups', payload, { skipErrorToast: true });
  return res.data;
}

export async function updateExecutiveFollowUp(id, payload) {
  const res = await API.put(`/sales-executive/followups/${id}`, payload, { skipErrorToast: true });
  return res.data;
}

export function buildFollowUpPayload(form) {
  const scheduledDate = form.scheduledAt ? new Date(form.scheduledAt) : null;
  return {
    lead: form.lead,
    type: form.type || 'call',
    category: form.category || 'warm',
    // Converted sends no next-follow-up date/time — the backend logs it as an already-resolved
    // historical entry instead of an active follow-up. See followUpHelpers.normalizeFollowUpPayload.
    scheduledAt:
      scheduledDate && !Number.isNaN(scheduledDate.getTime()) ? scheduledDate.toISOString() : null,
    notes: form.notes || form.remarks || '',
    priority: form.priority || 'medium',
    outcome: form.outcome || '',
    coldReason: form.coldReason || undefined,
    notPickedReason: form.notPickedReason || undefined,
    pickedOutcome: form.pickedOutcome || undefined,
    warmOutcome: form.warmOutcome || undefined,
    hotOutcome: form.hotOutcome || undefined,
    lostReason: form.lostReason || undefined,
    // Exact option key / "key — note" so list shows what executive selected
    statusReason: form.statusReason || undefined,
  };
}

import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import AppModal from '../ui/AppModal';
import { FOLLOWUP_PRIORITIES, FOLLOWUP_TYPES } from './constants';
import {
  LEAD_PIPELINE_STATUSES,
  LEAD_TEMPERATURE_OPTIONS,
  CALL_OUTCOME_OPTIONS,
  LOST_REASON_OPTIONS,
  buildPipelineStatusPayload,
  normalizeLeadStatus,
  isBookedStatus,
} from '../../lib/leadPipeline';
import { cn } from '../../lib/utils';

const emptyForm = {
  lead: '',
  type: 'call',
  status: 'follow_up',
  temperature: 'warm',
  callOutcome: '',
  lostReason: '',
  postponedReason: '',
  postponedAt: '',
  date: '',
  time: '10:00',
  priority: 'medium',
  remarks: '',
  totalPackageCost: '',
  tokenAmount: '',
};

export default function AddFollowUpModal({
  open,
  onClose,
  onSubmit,
  leads = [],
  editData = null,
  fixedLeadId = null,
  fixedLeadName = null,
  /** When true, also pushes lead pipeline status / temperature / call outcome */
  showLeadOutcome = false,
  lead = null,
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editData) {
      const d = new Date(editData.scheduledAt);
      const pad2 = (n) => String(n).padStart(2, '0');
      const localDate = Number.isNaN(d.getTime())
        ? ''
        : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      const localTime = Number.isNaN(d.getTime())
        ? '10:00'
        : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
      const temp =
        editData.category === 'hot' || editData.category === 'cold' || editData.category === 'warm'
          ? editData.category
          : lead?.temperature || 'warm';
      setForm({
        lead: editData.lead?._id || fixedLeadId || '',
        type: editData.type || 'call',
        status: normalizeLeadStatus(lead?.status || editData.status || 'follow_up'),
        temperature: temp === 'vip' ? 'hot' : temp,
        callOutcome: editData.callOutcome || lead?.callOutcome || '',
        lostReason: lead?.lostReason || '',
        postponedReason: lead?.postponedReason || '',
        postponedAt: lead?.postponedAt ? String(lead.postponedAt).slice(0, 10) : '',
        date: localDate,
        time: localTime,
        priority: editData.priority || 'medium',
        remarks: editData.notes || '',
        totalPackageCost: '',
        tokenAmount: '',
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      setForm({
        ...emptyForm,
        lead: fixedLeadId || '',
        date: today,
        status: normalizeLeadStatus(lead?.status || 'follow_up'),
        temperature: lead?.temperature === 'vip' ? 'hot' : lead?.temperature || 'warm',
        callOutcome: lead?.callOutcome || '',
      });
    }
  }, [editData, open, fixedLeadId, lead]);

  const isBooked = form.status === 'booked' || isBookedStatus(form.status);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isBooked && !form.date) {
      setError('Please select follow-up date');
      return;
    }
    if (!fixedLeadId && !editData && !form.lead) {
      setError('Please select a lead');
      return;
    }
    if (showLeadOutcome && form.status === 'lost' && !form.lostReason) {
      setError('Select a lost reason');
      return;
    }
    if (showLeadOutcome && form.status === 'postponed' && !form.postponedReason.trim()) {
      setError('Enter postponed reason');
      return;
    }
    if (showLeadOutcome && isBooked) {
      const total = Number(form.totalPackageCost);
      if (!Number.isFinite(total) || total <= 0) {
        setError('Enter total package cost (₹)');
        return;
      }
      const token = Number(form.tokenAmount);
      if (!Number.isFinite(token) || token < 0) {
        setError('Enter token amount received (₹)');
        return;
      }
      if (token > total) {
        setError('Token amount received cannot exceed total package cost');
        return;
      }
    }

    setSaving(true);
    try {
      const statusLabel =
        LEAD_PIPELINE_STATUSES.find((s) => s.value === form.status)?.label || form.status;
      const tempLabel =
        LEAD_TEMPERATURE_OPTIONS.find((t) => t.value === form.temperature)?.label || form.temperature;
      let remarks = form.remarks?.trim() || '';
      const prefix = showLeadOutcome
        ? `${statusLabel} · ${tempLabel}${form.callOutcome ? ` · ${form.callOutcome}` : ''}`
        : `${tempLabel} follow-up`;
      remarks = remarks ? `${prefix}. ${remarks}` : prefix;

      const statusUpdate = showLeadOutcome
        ? buildPipelineStatusPayload({
            status: form.status,
            temperature: form.temperature,
            callOutcome: form.callOutcome || undefined,
            lostReason: form.status === 'lost' ? form.lostReason : undefined,
            postponedReason: form.status === 'postponed' ? form.postponedReason : undefined,
            postponedAt: form.status === 'postponed' ? form.postponedAt || undefined : undefined,
            comment: form.remarks,
          })
        : null;

      if (statusUpdate && isBooked) {
        statusUpdate.totalPackageCost = Number(form.totalPackageCost);
        statusUpdate.tokenAmount = Number(form.tokenAmount);
      }

      // FollowUp document category stays temperature-based for legacy reports
      const category = isBooked ? 'converted' : form.temperature || 'warm';

      await onSubmit({
        ...form,
        lead: fixedLeadId || form.lead,
        date: isBooked ? null : form.date,
        time: isBooked ? null : form.time,
        scheduledAt: isBooked ? null : `${form.date}T${form.time}:00`,
        notes: remarks,
        category,
        outcome: form.callOutcome || undefined,
        callOutcome: form.callOutcome || undefined,
        statusUpdate,
      });
      if (!editData) {
        const today = new Date().toISOString().split('T')[0];
        setForm({ ...emptyForm, lead: fixedLeadId || '', date: today });
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save follow-up');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal open={open} onClose={onClose} size="lg" className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-content-primary">
            {editData ? 'Update Follow-up' : 'Lead follow up'}
          </h3>
          <p className="text-xs text-content-muted">
            {fixedLeadName ||
              (showLeadOutcome
                ? 'Status + Temperature + schedule'
                : 'Schedule next follow-up')}
          </p>
        </div>
        <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-surface-elevated">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {!editData && !fixedLeadId && (
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">Lead *</label>
            <select
              value={form.lead}
              onChange={(e) => setForm({ ...form, lead: e.target.value })}
              required
              className="input-premium w-full h-11 rounded-xl"
            >
              <option value="">Select lead</option>
              {leads.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.name} — {l.destination}
                </option>
              ))}
            </select>
          </div>
        )}

        {showLeadOutcome && (
          <>
            <div>
              <label className="text-xs font-medium text-content-muted mb-1 block">Lead Status *</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {LEAD_PIPELINE_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, status: s.value }))}
                    className={cn(
                      'rounded-xl border px-2 py-2.5 text-xs font-bold transition-colors',
                      form.status === s.value
                        ? 'border-violet-500 bg-violet-500 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-content-muted mb-1 block">Temperature *</label>
              <div className="flex flex-wrap gap-2">
                {LEAD_TEMPERATURE_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, temperature: t.value }))}
                    className={cn(
                      'h-10 px-4 rounded-xl border text-sm font-bold transition',
                      form.temperature === t.value
                        ? t.value === 'hot'
                          ? 'border-rose-400 bg-rose-50 text-rose-700'
                          : t.value === 'warm'
                            ? 'border-amber-400 bg-amber-50 text-amber-800'
                            : 'border-sky-400 bg-sky-50 text-sky-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-content-muted mb-1 block">Call Outcome</label>
              <select
                value={form.callOutcome}
                onChange={(e) => setForm((prev) => ({ ...prev, callOutcome: e.target.value }))}
                className="input-premium w-full h-11 rounded-xl"
              >
                <option value="">Optional</option>
                {CALL_OUTCOME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {form.status === 'lost' && (
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">Lost Reason *</label>
                <select
                  required
                  value={form.lostReason}
                  onChange={(e) => setForm((prev) => ({ ...prev, lostReason: e.target.value }))}
                  className="input-premium w-full h-11 rounded-xl"
                >
                  <option value="">Select reason</option>
                  {LOST_REASON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.status === 'postponed' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-content-muted mb-1 block">Postponed date</label>
                  <input
                    type="date"
                    value={form.postponedAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, postponedAt: e.target.value }))}
                    className="input-premium w-full h-11 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-content-muted mb-1 block">Reason *</label>
                  <input
                    required
                    value={form.postponedReason}
                    onChange={(e) => setForm((prev) => ({ ...prev, postponedReason: e.target.value }))}
                    className="input-premium w-full h-11 rounded-xl"
                    placeholder="Travel later…"
                  />
                </div>
              </div>
            )}

            {isBooked ? (
              <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                <p className="text-xs font-medium text-emerald-900">
                  Booked starts the booking — enter total package cost and token amount received.
                </p>
                <div>
                  <label className="text-xs font-medium text-content-muted mb-1 block">
                    Total package cost (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.totalPackageCost}
                    onChange={(e) => setForm((prev) => ({ ...prev, totalPackageCost: e.target.value }))}
                    placeholder="e.g. 50000"
                    className="input-premium w-full h-11 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-content-muted mb-1 block">
                    Token amount received (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.tokenAmount}
                    onChange={(e) => setForm((prev) => ({ ...prev, tokenAmount: e.target.value }))}
                    placeholder="e.g. 10000"
                    className="input-premium w-full h-11 rounded-xl"
                  />
                </div>
                <p className="text-xs font-semibold text-emerald-900">
                  Remaining amount: ₹
                  {Math.max(
                    0,
                    (Number(form.totalPackageCost) || 0) - (Number(form.tokenAmount) || 0)
                  ).toLocaleString('en-IN')}
                </p>
              </div>
            ) : null}
          </>
        )}

        {!showLeadOutcome && (
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">Temperature</label>
            <div className="flex flex-wrap gap-2">
              {LEAD_TEMPERATURE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, temperature: t.value }))}
                  className={cn(
                    'h-10 px-4 rounded-xl border text-sm font-bold transition',
                    form.temperature === t.value
                      ? t.value === 'hot'
                        ? 'border-rose-400 bg-rose-50 text-rose-700'
                        : t.value === 'warm'
                          ? 'border-amber-400 bg-amber-50 text-amber-800'
                          : 'border-sky-400 bg-sky-50 text-sky-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="input-premium w-full h-11 rounded-xl"
            >
              {FOLLOWUP_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">Intent</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="input-premium w-full h-11 rounded-xl"
            >
              {FOLLOWUP_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!isBooked && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-content-muted mb-1 block">Date *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                className="input-premium w-full h-11 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-content-muted mb-1 block">Time *</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                required
                className="input-premium w-full h-11 rounded-xl"
              />
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-content-muted mb-1 block">Comments (optional)</label>
          <textarea
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            rows={3}
            className="input-premium w-full rounded-xl resize-none"
            placeholder="Optional notes…"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="secondary" className="flex-1 rounded-xl" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="violet" className="flex-1 rounded-xl" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}

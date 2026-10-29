import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import AppModal from '../ui/AppModal';
import API from '../../api/axios';
import { FOLLOWUP_PRIORITIES, FOLLOWUP_TYPES } from './constants';
import {
  LEAD_PIPELINE_STATUSES,
  LEAD_TEMPERATURE_OPTIONS,
  CALL_OUTCOME_OPTIONS,
  LOST_REASON_OPTIONS,
  buildPipelineStatusPayload,
  normalizeLeadStatus,
  isBookedStatus,
  isLostStatus,
} from '../../lib/leadPipeline';
import { cn } from '../../lib/utils';
import { localTodayInput, localTimeInput, localDateTimeToIso } from '../../lib/localDateTime';

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
  quotationId: '',
};

function quoteLabel(q) {
  const num = q.quoteNumber || String(q._id || '').slice(-6);
  const pkg = q.packageSnapshot?.name || q.title || 'Package';
  const amount = Number(q.pricing?.total || q.costing?.grandTotal || 0);
  const amt = amount > 0 ? ` · ₹${amount.toLocaleString('en-IN')}` : '';
  return `${num} · ${q.status || 'draft'} · ${pkg}${amt}`;
}

function preferDefaultQuoteId(rows = []) {
  const rank = (s) => {
    const status = String(s || '');
    if (status === 'approved') return 1;
    if (status === 'sent' || status === 'viewed' || status === 'negotiation') return 2;
    if (status === 'pending_approval') return 3;
    return 9;
  };
  const sorted = [...rows].sort((a, b) => {
    const d = rank(a.status) - rank(b.status);
    if (d !== 0) return d;
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });
  return sorted[0]?._id ? String(sorted[0]._id) : '';
}

export default function AddFollowUpModal({
  open,
  onClose,
  onSubmit,
  leads = [],
  editData = null,
  fixedLeadId = null,
  fixedLeadName = null,
  /** When true, also pushes lead pipeline status / temperature / call outcome.
   * Default ON so Sales Executive sees the same Status + Temp + Call Outcome form as admin. */
  showLeadOutcome = true,
  lead = null,
}) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [quotations, setQuotations] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editData) {
      const d = new Date(editData.scheduledAt);
      const localDate = Number.isNaN(d.getTime()) ? '' : localTodayInput(d);
      const localTime = Number.isNaN(d.getTime()) ? '10:00' : localTimeInput(d);
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
        quotationId: '',
      });
    } else {
      setForm({
        ...emptyForm,
        lead: fixedLeadId || '',
        date: localTodayInput(),
        status: normalizeLeadStatus(lead?.status || 'follow_up'),
        temperature: lead?.temperature === 'vip' ? 'hot' : lead?.temperature || 'warm',
        callOutcome: lead?.callOutcome || '',
      });
    }
  }, [editData, open, fixedLeadId, lead]);

  const isBooked = form.status === 'booked' || isBookedStatus(form.status);
  const isLost = isLostStatus(form.status);
  /** Lost / booked — no next follow-up to schedule */
  const skipFollowUpSchedule = isBooked || isLost;

  const leadIdForQuotes = fixedLeadId || form.lead || lead?._id || '';

  useEffect(() => {
    if (!open || !isBooked || !leadIdForQuotes) {
      setQuotations([]);
      return undefined;
    }
    let cancelled = false;
    setLoadingQuotes(true);
    const paths = [
      `/sales-executive/leads/${leadIdForQuotes}/quotations`,
      `/leads/${leadIdForQuotes}/quotations`,
    ];
    (async () => {
      let rows = [];
      for (const path of paths) {
        try {
          const { data } = await API.get(path, { skipErrorToast: true, skipSuccessToast: true });
          rows = Array.isArray(data) ? data : data?.data || data?.quotations || [];
          if (rows.length || path.includes('sales-executive')) break;
        } catch {
          /* try next */
        }
      }
      if (cancelled) return;
      setQuotations(rows);
      setForm((prev) => {
        if (prev.quotationId) return prev;
        const nextId = preferDefaultQuoteId(rows);
        if (!nextId) return prev;
        const selected = rows.find((q) => String(q._id) === String(nextId));
        const amount = Number(selected?.pricing?.total || selected?.costing?.grandTotal || 0);
        return {
          ...prev,
          quotationId: nextId,
          totalPackageCost: prev.totalPackageCost || (amount > 0 ? String(amount) : prev.totalPackageCost),
        };
      });
      setLoadingQuotes(false);
    })().catch(() => {
      if (!cancelled) {
        setQuotations([]);
        setLoadingQuotes(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, isBooked, leadIdForQuotes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!skipFollowUpSchedule && !form.date) {
      setError('Please select follow-up date');
      return;
    }
    if (!fixedLeadId && !editData && !form.lead) {
      setError('Please select a lead');
      return;
    }
    if (showLeadOutcome && isLost && !form.lostReason) {
      setError('Select a lost reason');
      return;
    }
    if (showLeadOutcome && isLost && form.lostReason === 'other' && !form.remarks?.trim()) {
      setError('Add a short comment for “Other” lost reason');
      return;
    }
    if (showLeadOutcome && form.status === 'postponed' && !form.postponedReason.trim()) {
      setError('Enter postponed reason');
      return;
    }
    if (showLeadOutcome && isBooked) {
      if (quotations.length > 0 && !form.quotationId) {
        setError('Select the final quotation for Operations');
        return;
      }
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

      const leadAlreadyBooked = isBookedStatus(lead?.status);

      // Already-booked leads must not send status updates (causes lock errors).
      // Parent handlers open the commercial / advance form instead.
      let statusUpdate =
        showLeadOutcome && !leadAlreadyBooked
          ? buildPipelineStatusPayload({
              status: form.status,
              temperature: isLost || isBooked ? 'na' : form.temperature,
              callOutcome: form.callOutcome || undefined,
              lostReason: isLost ? form.lostReason : undefined,
              postponedReason: form.status === 'postponed' ? form.postponedReason : undefined,
              postponedAt: form.status === 'postponed' ? form.postponedAt || undefined : undefined,
              comment: form.remarks,
            })
          : null;

      if (statusUpdate && isBooked) {
        statusUpdate.totalPackageCost = Number(form.totalPackageCost);
        statusUpdate.tokenAmount = Number(form.tokenAmount);
        if (form.quotationId) statusUpdate.quotationId = form.quotationId;
      }

      const category = isBooked ? 'converted' : isLost ? 'lost' : form.temperature || 'warm';

      await onSubmit({
        ...form,
        lead: fixedLeadId || form.lead,
        date: skipFollowUpSchedule ? null : form.date,
        time: skipFollowUpSchedule ? null : form.time,
        scheduledAt: skipFollowUpSchedule ? null : localDateTimeToIso(form.date, form.time),
        notes: remarks,
        category,
        outcome: form.callOutcome || undefined,
        callOutcome: form.callOutcome || undefined,
        statusUpdate,
        skipFollowUp: isLost || leadAlreadyBooked,
        leadAlreadyBooked,
      });
      if (!editData) {
        setForm({ ...emptyForm, lead: fixedLeadId || '', date: localTodayInput() });
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
            {editData
              ? 'Update Follow-up'
              : showLeadOutcome
                ? 'Update Status / Follow-up'
                : 'Lead follow up'}
          </h3>
          <p className="text-xs text-black/80">
            {fixedLeadName ||
              (showLeadOutcome
                ? 'Same form for status change and next follow-up'
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
            <label className="text-xs font-semibold text-black mb-1 block">Lead *</label>
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
              <label className="text-xs font-semibold text-black mb-1 block">Lead Status *</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {LEAD_PIPELINE_STATUSES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        status: s.value,
                        temperature:
                          isLostStatus(s.value) || isBookedStatus(s.value) ? 'na' : prev.temperature === 'na' ? 'warm' : prev.temperature,
                      }))
                    }
                    className={cn(
                      'rounded-xl border px-2 py-2.5 text-xs font-bold transition-colors',
                      form.status === s.value
                        ? s.value === 'lost'
                          ? 'border-red-600 bg-red-600 text-white'
                          : s.value === 'booked'
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-violet-500 bg-violet-500 text-white'
                        : s.value === 'lost'
                          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-black mb-1 block">Temperature *</label>
              <div className="flex flex-wrap gap-2">
                {(isLost || isBooked
                  ? LEAD_TEMPERATURE_OPTIONS.filter((t) => t.value === 'na')
                  : LEAD_TEMPERATURE_OPTIONS.filter((t) => t.value !== 'na')
                ).map((t) => (
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
                            : t.value === 'na'
                              ? 'border-slate-400 bg-slate-100 text-slate-700'
                              : 'border-sky-400 bg-sky-50 text-sky-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>
            </div>

            {!isLost && (
            <div>
              <label className="text-xs font-semibold text-black mb-1 block">Call Outcome</label>
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
            )}

            {isLost && (
              <div>
                <label className="text-xs font-semibold text-black mb-1 block">Lost Reason *</label>
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
                  <label className="text-xs font-semibold text-black mb-1 block">Postponed date</label>
                  <input
                    type="date"
                    value={form.postponedAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, postponedAt: e.target.value }))}
                    className="input-premium w-full h-11 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-black mb-1 block">Reason *</label>
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
                  Booked starts Operations — pick the final quotation, then enter package cost &amp; token.
                </p>
                <div>
                  <label className="text-xs font-semibold text-black mb-1 block">
                    Final quotation for Operations *
                  </label>
                  <select
                    value={form.quotationId}
                    disabled={loadingQuotes || quotations.length === 0}
                    onChange={(e) => {
                      const quotationId = e.target.value;
                      const selected = quotations.find((q) => String(q._id) === String(quotationId));
                      const amount = Number(selected?.pricing?.total || selected?.costing?.grandTotal || 0);
                      setForm((prev) => ({
                        ...prev,
                        quotationId,
                        totalPackageCost: amount > 0 ? String(amount) : prev.totalPackageCost,
                      }));
                    }}
                    className="input-premium w-full h-11 rounded-xl"
                    required={quotations.length > 0}
                  >
                    <option value="">
                      {loadingQuotes
                        ? 'Loading quotations…'
                        : quotations.length
                          ? 'Select final quotation…'
                          : 'No quotation on this lead'}
                    </option>
                    {quotations.map((q) => (
                      <option key={q._id} value={q._id}>
                        {quoteLabel(q)}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-emerald-800/80">
                    Same quotation will open in the Operations booking panel (itinerary, hotels, cabs).
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-black mb-1 block">
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
                  <label className="text-xs font-semibold text-black mb-1 block">
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
            <label className="text-xs font-semibold text-black mb-1 block">Temperature</label>
            <div className="flex flex-wrap gap-2">
              {LEAD_TEMPERATURE_OPTIONS.filter((t) => t.value !== 'na').map((t) => (
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

        {!skipFollowUpSchedule && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-black mb-1 block">Type</label>
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
                <label className="text-xs font-semibold text-black mb-1 block">Intent</label>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-black mb-1 block">Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="input-premium w-full h-11 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-black mb-1 block">Time *</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  required
                  className="input-premium w-full h-11 rounded-xl"
                />
              </div>
            </div>
          </>
        )}

        {isLost && (
          <p className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-xs font-medium text-rose-800">
            Lost leads close the pipeline — no follow-up date is needed.
          </p>
        )}

        <div>
          <label className="text-xs font-semibold text-black mb-1 block">Comments (optional)</label>
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
            {saving ? 'Saving…' : isLost ? 'Mark as Lost' : 'Save'}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import AppModal from '../ui/AppModal';
import { Button } from '../ui/button';
import {
  LEAD_PIPELINE_STATUSES,
  LEAD_TEMPERATURE_OPTIONS,
  CALL_OUTCOME_OPTIONS,
  LOST_REASON_OPTIONS,
  normalizeLeadStatus,
  buildPipelineStatusPayload,
  isLockedPipelineStatus,
} from '../../lib/leadPipeline';
import { cn } from '../../lib/utils';

/**
 * Update pipeline Status + Temperature + Call Outcome independently.
 */
export default function LeadPipelineUpdateModal({
  open,
  onClose,
  lead,
  saving = false,
  onSave,
}) {
  const [status, setStatus] = useState('new_lead');
  const [temperature, setTemperature] = useState('cold');
  const [callOutcome, setCallOutcome] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [postponedReason, setPostponedReason] = useState('');
  const [postponedAt, setPostponedAt] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !lead) return;
    setStatus(normalizeLeadStatus(lead.status));
    setTemperature(lead.temperature === 'vip' ? 'hot' : lead.temperature || 'cold');
    setCallOutcome(lead.callOutcome || '');
    setLostReason(lead.lostReason || '');
    setPostponedReason(lead.postponedReason || '');
    setPostponedAt(
      lead.postponedAt ? String(lead.postponedAt).slice(0, 10) : ''
    );
    setComment('');
    setError('');
  }, [open, lead]);

  const locked = isLockedPipelineStatus(lead?.status);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (status === 'lost' && !lostReason) {
      setError('Select a lost reason');
      return;
    }
    if (status === 'postponed' && !postponedReason.trim()) {
      setError('Enter postponed reason');
      return;
    }
    const payload = buildPipelineStatusPayload({
      status,
      temperature,
      callOutcome: callOutcome || undefined,
      lostReason: status === 'lost' ? lostReason : undefined,
      postponedReason: status === 'postponed' ? postponedReason : undefined,
      postponedAt: status === 'postponed' ? postponedAt || undefined : undefined,
      comment,
    });
    try {
      await onSave?.(payload);
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to update');
    }
  };

  return (
    <AppModal open={open} onClose={onClose} size="md" className="overflow-hidden">
      <form onSubmit={handleSubmit}>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Update lead pipeline</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Status = sales stage · Temperature = intent · Call outcome = last dial result
          </p>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {locked && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              This lead is locked ({normalizeLeadStatus(lead?.status)}). Status cannot change.
            </p>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
              Lead Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LEAD_PIPELINE_STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  disabled={locked && s.value !== normalizeLeadStatus(lead?.status)}
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition',
                    status === s.value
                      ? 'border-violet-400 bg-violet-50 text-violet-800 ring-2 ring-violet-200'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700',
                    locked && 'opacity-60'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
              Temperature
            </label>
            <div className="flex flex-wrap gap-2">
              {LEAD_TEMPERATURE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTemperature(t.value)}
                  className={cn(
                    'h-10 px-4 rounded-xl border text-sm font-bold transition',
                    temperature === t.value
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
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
              Call Outcome
            </label>
            <select
              value={callOutcome}
              onChange={(e) => setCallOutcome(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
            >
              <option value="">No change</option>
              {CALL_OUTCOME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {lead?.callAttempts != null || lead?.callStats?.count != null ? (
              <p className="text-[11px] text-slate-500 mt-1.5">
                Call attempts: {lead.callAttempts ?? lead.callStats?.count ?? 0}
              </p>
            ) : null}
          </div>

          {status === 'lost' && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                Lost Reason *
              </label>
              <select
                required
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
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

          {status === 'postponed' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  Postponed date
                </label>
                <input
                  type="date"
                  value={postponedAt}
                  onChange={(e) => setPostponedAt(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
                  Reason *
                </label>
                <input
                  required
                  value={postponedReason}
                  onChange={(e) => setPostponedReason(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
                  placeholder="Travel later / family decision…"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">
              Note
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none"
              placeholder="Optional note…"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="rounded-xl gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </form>
    </AppModal>
  );
}

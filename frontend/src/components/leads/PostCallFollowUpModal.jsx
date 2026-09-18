import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import AppModal from '../ui/AppModal';
import { Button } from '../ui/button';
import { addCallNote } from '../../services/leadEnterpriseApi';
import { formatCallDurationExact } from '../../lib/callSession';
import {
  CALL_OUTCOME_OPTIONS,
  LEAD_TEMPERATURE_OPTIONS,
  LEAD_PIPELINE_STATUSES,
  normalizeLeadStatus,
} from '../../lib/leadPipeline';
import { cn } from '../../lib/utils';

/** Canonical call outcomes for logging UIs */
export const CALL_OUTCOMES = CALL_OUTCOME_OPTIONS;
/** @deprecated older imports — same as CALL_OUTCOMES */
export const CALL_PICKED_OUTCOMES = CALL_OUTCOME_OPTIONS.filter((o) =>
  ['connected', 'callback_requested', 'whatsapp_sent'].includes(o.value)
);

export default function PostCallFollowUpModal({
  open,
  session,
  onClose,
  onSaved,
}) {
  const [callOutcome, setCallOutcome] = useState('');
  const [temperature, setTemperature] = useState('warm');
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !session) return;
    setCallOutcome('');
    setTemperature(session.leadTemperature === 'vip' ? 'hot' : session.leadTemperature || 'warm');
    setStatus(session.leadStatus ? normalizeLeadStatus(session.leadStatus) : '');
    setNotes('');
    setError('');
  }, [open, session]);

  if (!session) return null;

  const durationSeconds = Math.max(0, Math.round(Number(session.durationSeconds) || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!callOutcome) {
      setError('Select a call outcome');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const saved = await addCallNote(session.leadId, {
        outcome: callOutcome,
        callOutcome,
        temperature,
        status: status || undefined,
        notes: notes.trim(),
        durationSeconds,
        startedAt: session.startedAt ? new Date(session.startedAt).toISOString() : undefined,
        endedAt: session.endedAt ? new Date(session.endedAt).toISOString() : new Date().toISOString(),
        scheduleNextCall: true,
        statusReason: notes.trim() ? `${callOutcome} — ${notes.trim()}` : callOutcome,
      });
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save call');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal open={open} onClose={() => !saving && onClose?.()} size="md">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white">
            <Phone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-content-primary">Call follow-up</h3>
            <p className="text-sm text-content-muted">{session.leadName}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-sky-700">
              Duration: {formatCallDurationExact(durationSeconds)}
            </p>
            <p className="mt-1 text-[11px] font-medium text-violet-600">
              Set call outcome + temperature. Next reminder in 2 hours.
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-content-muted">
            Call Outcome *
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CALL_OUTCOME_OPTIONS.map((item) => {
              const selected = callOutcome === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setCallOutcome(item.value)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors',
                    selected
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-subtle bg-white text-content-secondary hover:border-blue-300'
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-content-muted">
            Temperature *
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
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-content-muted">
            Pipeline Status (optional)
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border border-subtle bg-white p-3 text-sm font-medium"
          >
            <option value="">Keep current</option>
            {LEAD_PIPELINE_STATUSES.filter((s) => !['booked', 'lost'].includes(s.value)).map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-content-muted">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-subtle bg-white px-3 py-2 text-sm outline-none focus:border-blue-400"
            placeholder="Anything useful from the call…"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" disabled={saving} onClick={() => onClose?.()}>
            Skip
          </Button>
          <Button type="submit" disabled={saving || !callOutcome} className="bg-blue-600 text-white hover:bg-blue-500">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}

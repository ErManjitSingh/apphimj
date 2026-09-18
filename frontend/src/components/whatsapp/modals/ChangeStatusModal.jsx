import { useEffect, useState } from 'react';
import AppModal from '../../ui/AppModal';
import { Button } from '../../ui/button';
import {
  LEAD_PIPELINE_STATUSES,
  LEAD_TEMPERATURE_OPTIONS,
  CALL_OUTCOME_OPTIONS,
  LOST_REASON_OPTIONS,
  normalizeLeadStatus,
  buildPipelineStatusPayload,
  isLockedPipelineStatus,
} from '../../../lib/leadPipeline';
import PaymentScreenshotField from '../../leads/PaymentScreenshotField';
import { toast } from '../../../context/ToastContext';
import { cn } from '../../../lib/utils';

export default function ChangeStatusModal({ open, onClose, onSubmit, currentStatus, lead = null }) {
  const [status, setStatus] = useState('new_lead');
  const [temperature, setTemperature] = useState('cold');
  const [callOutcome, setCallOutcome] = useState('');
  const [lostReason, setLostReason] = useState('');
  const [postponedReason, setPostponedReason] = useState('');
  const [postponedAt, setPostponedAt] = useState('');
  const [comment, setComment] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [shotFiles, setShotFiles] = useState([]);

  useEffect(() => {
    if (!open) return;
    setStatus(normalizeLeadStatus(lead?.status || currentStatus));
    setTemperature(lead?.temperature === 'vip' ? 'hot' : lead?.temperature || 'cold');
    setCallOutcome(lead?.callOutcome || '');
    setLostReason(lead?.lostReason || '');
    setPostponedReason(lead?.postponedReason || '');
    setPostponedAt(lead?.postponedAt ? String(lead.postponedAt).slice(0, 10) : '');
    setComment('');
    setAdvanceAmount('');
    setShotFiles([]);
  }, [open, currentStatus, lead]);

  const locked = isLockedPipelineStatus(lead?.status || currentStatus);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (status === 'lost' && !lostReason) {
      toast.error('Select a lost reason');
      return;
    }
    if (status === 'postponed' && !postponedReason.trim()) {
      toast.error('Enter postponed reason');
      return;
    }
    if (status === 'booked') {
      const advance = Number(advanceAmount);
      if (!Number.isFinite(advance) || advance < 0) {
        toast.error('Enter advance / token amount received (₹)');
        return;
      }
      if (!shotFiles.length) {
        toast.error('Upload payment screenshot (UPI / bank transfer proof)');
        return;
      }
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

    if (status === 'booked') {
      payload.advanceAmount = Number(advanceAmount);
      payload.paymentScreenshots = shotFiles.map((f) => ({ base64: f.base64, name: f.name }));
      payload.paymentScreenshotBase64 = shotFiles[0]?.base64;
      payload.paymentScreenshotName = shotFiles[0]?.name;
    }

    onSubmit(payload);
    onClose();
  };

  const canSubmit =
    !locked &&
    (status !== 'lost' || Boolean(lostReason)) &&
    (status !== 'postponed' || Boolean(postponedReason.trim())) &&
    (status !== 'booked' ||
      (Number.isFinite(Number(advanceAmount)) && Number(advanceAmount) >= 0 && shotFiles.length > 0));

  return (
    <AppModal open={open} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <div>
          <h3 className="text-lg font-semibold text-content-primary">Update lead pipeline</h3>
          <p className="text-sm text-content-secondary mt-1">
            Status = stage · Temperature = intent · Call outcome = dial result
          </p>
        </div>

        {locked && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            This lead is locked ({normalizeLeadStatus(lead?.status || currentStatus)}).
          </p>
        )}

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Lead Status *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {LEAD_PIPELINE_STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                disabled={locked}
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
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
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
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Call Outcome
          </label>
          <select
            value={callOutcome}
            onChange={(e) => setCallOutcome(e.target.value)}
            className="w-full rounded-xl border border-subtle bg-white p-3 text-sm"
          >
            <option value="">No change</option>
            {CALL_OUTCOME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {status === 'lost' && (
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Lost Reason *
            </label>
            <select
              required
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="w-full rounded-xl border border-subtle bg-white p-3 text-sm"
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
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Postponed date
              </label>
              <input
                type="date"
                value={postponedAt}
                onChange={(e) => setPostponedAt(e.target.value)}
                className="w-full rounded-xl border border-subtle bg-white p-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Reason *
              </label>
              <input
                required
                value={postponedReason}
                onChange={(e) => setPostponedReason(e.target.value)}
                className="w-full rounded-xl border border-subtle bg-white p-3 text-sm"
                placeholder="Travel later…"
              />
            </div>
          </div>
        )}

        {status === 'booked' ? (
          <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Advance / token amount (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                placeholder="e.g. 10000"
                className="w-full rounded-xl border border-subtle bg-white p-3 text-sm"
              />
            </div>
            <PaymentScreenshotField
              required
              value={shotFiles}
              onChange={({ files, error }) => {
                setShotFiles(files || []);
                if (error) toast.error(error);
              }}
            />
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Comment
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Optional note…"
            className="w-full rounded-xl border border-subtle bg-white p-3 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="emerald" disabled={!canSubmit}>
            {status === 'booked' ? 'Book lead' : 'Update'}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}

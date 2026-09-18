import { useEffect, useState } from 'react';
import AppModal from '../ui/AppModal';
import { Button } from '../ui/button';
import {
  LEAD_PIPELINE_STATUSES,
  LEAD_TEMPERATURE_OPTIONS,
  buildPipelineStatusPayload,
} from '../../lib/leadPipeline';
import { toast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';

/** Bulk update — pipeline status + temperature (Booked needs payment proof per lead). */
const BULK_STATUSES = LEAD_PIPELINE_STATUSES.filter((s) => s.value !== 'booked');

export default function BulkStatusModal({ open, onClose, count, onSubmit }) {
  const [status, setStatus] = useState('follow_up');
  const [temperature, setTemperature] = useState('warm');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStatus('follow_up');
    setTemperature('warm');
    setComment('');
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = buildPipelineStatusPayload({ status, temperature, comment });
    if (!payload?.status) {
      toast.error('Select a status');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(payload);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal open={open} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-content-primary">Bulk Update Status</h3>
          <p className="text-sm text-content-secondary mt-1">
            Update {count} selected lead{count !== 1 ? 's' : ''}. Booked needs payment proof — convert one lead at a time.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Pipeline Status *
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-xl border border-subtle bg-white p-3 text-sm font-medium"
          >
            {BULK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
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
                  'h-10 px-3 rounded-xl border text-sm font-bold',
                  temperature === t.value
                    ? 'border-violet-400 bg-violet-50 text-violet-800'
                    : 'border-slate-200 text-slate-600'
                )}
              >
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Note
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-subtle bg-white p-3 text-sm resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="rounded-xl">
            {submitting ? 'Updating…' : 'Update'}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}

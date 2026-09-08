import { PhoneCall } from 'lucide-react';
import { formatCallDuration } from '../../../lib/callSession';
import { outcomeLabel, BUCKET_LABELS, BUCKET_STYLES } from '../../../lib/callOutcomeLabels';

function formatTime(at) {
  if (!at) return '—';
  return new Date(at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

const CARD_BG = {
  connected: 'border-emerald-100 bg-emerald-50/40',
  no_answer: 'border-amber-100 bg-amber-50/40',
  failed: 'border-red-100 bg-red-50/40',
};

const ICON_WRAP = {
  connected: 'bg-emerald-100 text-emerald-600',
  no_answer: 'bg-amber-100 text-amber-600',
  failed: 'bg-red-100 text-red-600',
};

/** One card per actual call (start + end merged — see callReportService.normalizeCallEvent). */
export default function TimelineEventRow({ event, onClick }) {
  const hasEndTime = Boolean(event.endedAt);

  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        CARD_BG[event.outcomeBucket] || CARD_BG.failed
      }`}
    >
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
        ICON_WRAP[event.outcomeBucket] || ICON_WRAP.failed
      }`}
      >
        <PhoneCall className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold tabular-nums text-content-primary">
            {formatTime(event.startedAt)}
            {hasEndTime && <> <span className="text-content-muted">→</span> {formatTime(event.endedAt)}</>}
          </p>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BUCKET_STYLES[event.outcomeBucket] || BUCKET_STYLES.failed}`}>
            {hasEndTime ? (BUCKET_LABELS[event.outcomeBucket] || 'Failed') : 'Incomplete'}
          </span>
        </div>
        <p className="mt-1 text-sm font-semibold text-content-primary">{event.leadName}</p>
        <p className="truncate text-xs text-content-muted">
          {event.leadPhone || 'No phone'}
          {event.leadDestination ? ` · ${event.leadDestination}` : ''}
        </p>
        <p className="mt-1 text-xs text-content-secondary">
          Duration: <span className="font-semibold tabular-nums">{formatCallDuration(event.duration || 0)}</span>
          {' · '}Outcome: <span className="font-semibold">{outcomeLabel(event.outcome)}</span>
        </p>
      </div>
    </button>
  );
}

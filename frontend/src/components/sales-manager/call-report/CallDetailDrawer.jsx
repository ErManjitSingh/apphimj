import { X, Phone, MapPin, Clock, User } from 'lucide-react';
import AppDrawer from '../../ui/AppDrawer';
import { formatCallDuration } from '../../../lib/callSession';
import { outcomeLabel, BUCKET_LABELS, BUCKET_STYLES } from '../../../lib/callOutcomeLabels';

function formatDateTime(at) {
  if (!at) return '—';
  return new Date(at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatTime(at) {
  if (!at) return '—';
  return new Date(at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function CallDetailDrawer({ event, onClose }) {
  const hasEndTime = !!event?.endedAt;

  return (
    <AppDrawer open={!!event} onClose={onClose} className="max-w-[400px] border-l border-subtle bg-white shadow-2xl dark:bg-slate-900">
      {event && (
        <>
          <div className="shrink-0 border-b border-subtle p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-violet-600">Call detail</p>
                <h2 className="mt-1 text-xl font-bold text-content-primary">{event.leadName}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-content-muted hover:bg-surface-elevated"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm text-content-secondary">
              <Phone className="h-4 w-4 text-content-muted" />
              {event.leadPhone || 'No phone on file'}
            </div>
            {event.leadDestination && (
              <div className="flex items-center gap-2 text-sm text-content-secondary">
                <MapPin className="h-4 w-4 text-content-muted" />
                {event.leadDestination}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-content-secondary">
              <User className="h-4 w-4 text-content-muted" />
              Handled by {event.userName || 'Unknown executive'}
            </div>
            <div className="flex items-center gap-2 text-sm text-content-secondary">
              <Clock className="h-4 w-4 text-content-muted" />
              {hasEndTime ? (
                <span>{formatDateTime(event.startedAt)} <span className="text-content-muted">→</span> {formatTime(event.endedAt)}</span>
              ) : (
                formatDateTime(event.startedAt)
              )}
            </div>

            <div className="rounded-xl border border-subtle bg-surface-elevated/50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-content-muted">Status</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BUCKET_STYLES[event.outcomeBucket] || BUCKET_STYLES.failed}`}>
                  {hasEndTime ? (BUCKET_LABELS[event.outcomeBucket] || 'Failed') : 'Incomplete'}
                </span>
              </div>
              <p className="text-sm font-semibold text-content-primary">{outcomeLabel(event.outcome)}</p>
              <div className="flex items-center justify-between text-sm text-content-secondary">
                <span>Duration</span>
                <span className="font-semibold tabular-nums text-content-primary">{formatCallDuration(event.duration || 0)}</span>
              </div>
              {event.notes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Notes</p>
                  <p className="mt-1 text-sm text-content-secondary">{event.notes}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppDrawer>
  );
}

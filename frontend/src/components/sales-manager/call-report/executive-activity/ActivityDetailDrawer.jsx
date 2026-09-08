import { X, Clock, Tag } from 'lucide-react';
import AppDrawer from '../../../ui/AppDrawer';
import { formatCallDuration } from '../../../../lib/callSession';
import { formatDateTime } from './activityFormat';

export default function ActivityDetailDrawer({ event, onClose }) {
  return (
    <AppDrawer open={!!event} onClose={onClose} className="max-w-[400px] border-l border-subtle bg-white shadow-2xl">
      {event && (
        <>
          <div className="shrink-0 border-b border-subtle p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-teal-600">Activity detail</p>
                <h2 className="mt-1 text-xl font-bold text-content-primary">{event.title}</h2>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-content-muted hover:bg-surface-elevated">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm text-content-secondary">
              <Clock className="h-4 w-4 text-content-muted" />
              {formatDateTime(event.at)}
            </div>
            <div className="flex items-center gap-2 text-sm text-content-secondary">
              <Tag className="h-4 w-4 text-content-muted" />
              {event.type?.replace(/_/g, ' ')}
            </div>
            {event.description && (
              <div className="rounded-xl border border-subtle bg-surface-elevated/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Details</p>
                <p className="mt-1 text-sm text-content-secondary">{event.description}</p>
              </div>
            )}
            {event.type === 'call_ended' && (
              <div className="rounded-xl border border-subtle bg-surface-elevated/50 p-4 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Call outcome</p>
                <p className="text-sm font-semibold text-content-primary">{(event.meta?.outcome || '').replace(/_/g, ' ')}</p>
                <p className="text-sm text-content-secondary">
                  Duration: <span className="font-semibold tabular-nums text-content-primary">{formatCallDuration(event.meta?.duration || 0)}</span>
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </AppDrawer>
  );
}

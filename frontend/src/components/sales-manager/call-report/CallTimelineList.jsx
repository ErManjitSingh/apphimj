import { Clock3, PhoneOff } from 'lucide-react';
import TablePagination from '../../ui/TablePagination';
import TimelineEventRow from './TimelineEventRow';

export default function CallTimelineList({ events, pagination, pageIndex, onPageChange, loading, onSelectEvent }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/60 to-white p-3.5 shadow-sm dark:bg-slate-900/80">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500 text-white">
          <Clock3 className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-violet-700">Call Timeline</h3>
          <p className="text-[11px] text-violet-600/80">Sorted by actual call start time</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-xl bg-white/70" />
          ))}
        </div>
      ) : !events.length ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-violet-100 bg-white py-16 text-center">
          <PhoneOff className="h-8 w-8 text-content-muted" />
          <p className="text-sm font-semibold text-content-primary">No calls logged for this period</p>
          <p className="text-xs text-content-muted">Try a different date range or executive</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            {events.map((event) => (
              <TimelineEventRow key={event.callId} event={event} onClick={onSelectEvent} />
            ))}
          </div>
          {pagination && (
            <div className="rounded-xl border border-violet-100 bg-white">
              <TablePagination
                pageIndex={pageIndex}
                pageSize={pagination.limit}
                pageCount={pagination.totalPages || 1}
                total={pagination.total}
                onPageChange={onPageChange}
                totalLabel="calls"
                accent="violet"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

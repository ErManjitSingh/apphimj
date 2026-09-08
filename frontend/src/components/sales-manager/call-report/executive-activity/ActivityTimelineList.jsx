import { Activity } from 'lucide-react';
import TablePagination from '../../../ui/TablePagination';
import ActivityTimelineRow from './ActivityTimelineRow';

export default function ActivityTimelineList({ events, pagination, pageIndex, onPageChange, loading, onSelectEvent }) {
  return (
    <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/60 to-white p-3.5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-white">
          <Activity className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-teal-700">Activity Timeline</h3>
          <p className="text-[11px] text-teal-600/80">Everything this executive did, in order</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[68px] animate-pulse rounded-xl bg-white/70" />
          ))}
        </div>
      ) : !events.length ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-teal-100 bg-white py-16 text-center">
          <Activity className="h-8 w-8 text-content-muted" />
          <p className="text-sm font-semibold text-content-primary">No CRM activity for this period</p>
          <p className="text-xs text-content-muted">Try a different date range or executive</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            {events.map((event) => (
              <ActivityTimelineRow key={event.id} event={event} onClick={onSelectEvent} />
            ))}
          </div>
          {pagination && (
            <div className="rounded-xl border border-teal-100 bg-white">
              <TablePagination
                pageIndex={pageIndex}
                pageSize={pagination.limit}
                pageCount={pagination.totalPages || 1}
                total={pagination.total}
                onPageChange={onPageChange}
                totalLabel="activities"
                accent="violet"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

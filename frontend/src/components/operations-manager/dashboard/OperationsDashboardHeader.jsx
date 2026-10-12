import { motion } from 'framer-motion';
import { BadgeCheck, Calendar, RefreshCw } from 'lucide-react';
import { formatDateRangeLabel } from '../bookings/bookingListUtils';

function relativeUpdated(iso) {
  if (!iso) return 'Just now';
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'Just now';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `Updated ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Updated ${hrs}h ago`;
  return `Updated ${Math.floor(hrs / 24)}d ago`;
}

export default function OperationsDashboardHeader({
  dateFrom,
  dateTo,
  generatedAt,
  onRefresh,
  refreshing = false,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5"
    >
      <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
        <span>Operations Manager</span>
        <span>&gt;</span>
        <span className="font-medium text-slate-600">Dashboard</span>
      </nav>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-md shadow-sky-500/25">
              <BadgeCheck className="h-5 w-5" strokeWidth={2.25} />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
              Operations Command Center
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Real-time overview of operations, bookings &amp; trip execution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Calendar className="h-4 w-4 text-slate-400" />
            {formatDateRangeLabel(dateFrom, dateTo)}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-60"
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>Live Data</span>
            <span className="font-medium text-emerald-600/80">{relativeUpdated(generatedAt)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

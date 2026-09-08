import { Zap, MoonStar, Timer, Info } from 'lucide-react';
import { formatDurationMs } from './activityFormat';

export default function ActiveIdleSummaryCard({ summary, loading }) {
  if (loading) {
    return <div className="h-[132px] animate-pulse rounded-2xl border border-slate-200 bg-white" />;
  }
  if (!summary) return null;

  const { activeMs = 0, idleMs = 0, sessionMs = 0 } = summary;
  const activePct = sessionMs ? Math.round((activeMs / sessionMs) * 100) : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-content-muted">CRM Active Time</p>
            <div className="inline-flex rounded-xl bg-emerald-500 p-1.5 text-white"><Zap className="h-3.5 w-3.5" strokeWidth={2.75} /></div>
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-emerald-700">{formatDurationMs(activeMs)}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-content-muted">Idle</p>
            <div className="inline-flex rounded-xl bg-amber-500 p-1.5 text-white"><MoonStar className="h-3.5 w-3.5" strokeWidth={2.75} /></div>
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-amber-700">{formatDurationMs(idleMs)}</p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50 p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-content-muted">Session Duration</p>
            <div className="inline-flex rounded-xl bg-sky-500 p-1.5 text-white"><Timer className="h-3.5 w-3.5" strokeWidth={2.75} /></div>
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-sky-700">{formatDurationMs(sessionMs)}</p>
        </div>
      </div>

      {sessionMs > 0 && (
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-amber-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${activePct}%` }} />
        </div>
      )}

      <div className="mt-3 flex items-start gap-1.5 text-[11px] text-content-muted">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        <p>
          <span className="font-semibold">CRM Active Time</span> reflects activity observed inside the CRM only
          (logins, lead/quotation/follow-up/booking actions, calls) — it is not a record of employee working hours,
          since the CRM cannot see what happens outside it.
        </p>
      </div>
    </div>
  );
}

import { LayoutGrid } from 'lucide-react';

const BAR_COLORS = ['bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-fuchsia-500', 'bg-rose-500', 'bg-teal-500', 'bg-indigo-500'];

export default function ModuleUsagePanel({ rows, loading }) {
  const total = (rows || []).reduce((s, r) => s + (r.count || 0), 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500 text-white">
          <LayoutGrid className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-bold text-content-primary">Module Usage</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-surface-elevated/50" />)}
        </div>
      ) : !rows?.length ? (
        <p className="py-6 text-center text-xs text-content-muted">No module activity in this period</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((row, i) => {
            const pct = total ? Math.round((row.count / total) * 100) : 0;
            return (
              <div key={row.module}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-content-primary">{row.label || row.module}</span>
                  <span className="tabular-nums text-content-muted">{row.count}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                  <div className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

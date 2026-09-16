const BAR_COLORS = ['#FB923C', '#38BDF8', '#4ADE80', '#FACC15', '#A78BFA', '#94A3B8'];

export default function TopLeadSourcesCard({ data = [] }) {
  const rows = (Array.isArray(data) ? data : [])
    .map((item, i) => ({
      name: item.name || item.label || item.key || 'Other',
      value: Number(item.value ?? item.total ?? item.leads ?? 0),
      pct: Number(item.pct || 0),
      color: item.color || BAR_COLORS[i % BAR_COLORS.length],
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  const withPct = rows.map((row) => ({
    ...row,
    pct: row.pct || Math.round((row.value / total) * 1000) / 10,
  }));
  const maxPct = Math.max(...withPct.map((r) => r.pct), 1);

  return (
    <div className="h-full rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-slate-900">Top Lead Sources</h2>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-100">
          This Month
        </span>
      </div>
      {withPct.length ? (
        <ul className="space-y-3.5">
          {withPct.map((row) => (
            <li key={row.name}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                <span className="truncate font-medium text-slate-600">{row.name}</span>
                <span className="tabular-nums font-semibold text-slate-800">{Math.round(row.pct)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.max(6, (row.pct / maxPct) * 100)}%`,
                    background: row.color,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex h-[160px] items-center justify-center text-sm text-slate-400">No source data</p>
      )}
    </div>
  );
}

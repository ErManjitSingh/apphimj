import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import DashboardPanel from './DashboardPanel';

const COLORS = ['#7C3AED', '#059669', '#F97316', '#EC4899', '#0EA5E9', '#EAB308', '#94A3B8'];

function leadCount(row = {}) {
  return Number(row.queries ?? row.count ?? row.leads ?? row.value ?? 0);
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-slate-800">{row.name}</p>
      <p className="text-violet-600">
        {Number(row.queries || 0).toLocaleString('en-IN')} leads · {row.pct}%
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400">Click to view details</p>
    </div>
  );
}

/**
 * Each rendered slice/legend row is clickable and carries `constituents`: the full list of
 * backend Top Destinations rollup names (states, or the "Other" bucket) it represents. A
 * top-5 slice constituents is just its own name; the synthesized "Others" slice (rank 6+,
 * merged for chart readability) constituents is every name it absorbed, so a click always
 * maps back to exactly the same grouping the chart itself used — never a re-derived one.
 */
export default function TopDestinationsDonut({ data = [], onSelect }) {
  const normalized = (Array.isArray(data) ? data : [])
    .map((d) => ({
      name: String(d?.name || 'Unknown').trim() || 'Unknown',
      queries: leadCount(d),
    }))
    .filter((d) => d.queries > 0)
    .sort((a, b) => b.queries - a.queries);

  const total = normalized.reduce((s, d) => s + d.queries, 0);
  const top = normalized.slice(0, 5);
  const rest = normalized.slice(5);
  const restTotal = rest.reduce((s, r) => s + r.queries, 0);

  const rows = top.map((d, i) => ({
    name: d.name,
    queries: d.queries,
    constituents: [d.name],
    pct: total ? Math.round((d.queries / total) * 1000) / 10 : 0,
    color: COLORS[i % (COLORS.length - 1)],
  }));

  if (restTotal > 0) {
    const restNames = rest.map((r) => r.name);
    const otherIdx = rows.findIndex((r) => /^others?$/i.test(r.name));
    if (otherIdx >= 0) {
      const mergedQueries = rows[otherIdx].queries + restTotal;
      rows[otherIdx] = {
        ...rows[otherIdx],
        queries: mergedQueries,
        constituents: [...rows[otherIdx].constituents, ...restNames],
        pct: total ? Math.round((mergedQueries / total) * 1000) / 10 : 0,
        color: COLORS[COLORS.length - 1],
      };
    } else {
      rows.push({
        name: 'Others',
        queries: restTotal,
        constituents: restNames,
        pct: total ? Math.round((restTotal / total) * 1000) / 10 : 0,
        color: COLORS[COLORS.length - 1],
      });
    }
  }

  const handleSelect = (row) => {
    if (!onSelect || !row?.constituents?.length) return;
    onSelect(row);
  };

  return (
    <DashboardPanel
      title="Top Destinations"
      subtitle="By leads in selected period"
      className="h-full"
    >
      {!rows.length ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm font-medium text-slate-500">No destinations in this period</p>
          <p className="text-xs text-slate-400">Try All Time or a wider date range</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-[168px] w-[168px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="queries"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={74}
                  paddingAngle={2}
                  strokeWidth={0}
                  onClick={onSelect ? (entry) => handleSelect(entry) : undefined}
                  className={onSelect ? 'cursor-pointer' : undefined}
                >
                  {rows.map((row) => (
                    <Cell
                      key={row.name}
                      fill={row.color}
                      style={onSelect ? { cursor: 'pointer' } : undefined}
                    />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Leads
              </p>
              <p className="text-lg font-bold tabular-nums text-slate-900">
                {total.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <ul className="w-full space-y-2">
            {rows.map((row) => (
              <li
                key={row.name}
                className={
                  onSelect
                    ? 'flex cursor-pointer items-center gap-2 rounded-lg px-1 -mx-1 text-[12px] transition-colors hover:bg-slate-50'
                    : 'flex items-center gap-2 text-[12px]'
                }
                role={onSelect ? 'button' : undefined}
                tabIndex={onSelect ? 0 : undefined}
                onClick={() => handleSelect(row)}
                onKeyDown={
                  onSelect
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelect(row);
                        }
                      }
                    : undefined
                }
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: row.color }}
                />
                <span className="min-w-0 flex-1 truncate font-medium text-slate-700" title={row.name}>
                  {row.name}
                </span>
                <span className="shrink-0 tabular-nums text-slate-500">{row.pct}%</span>
                <span className="w-10 shrink-0 text-right font-bold tabular-nums text-slate-900">
                  {row.queries.toLocaleString('en-IN')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardPanel>
  );
}

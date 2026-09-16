import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

const FALLBACK_COLORS = {
  new: '#F97316',
  contacted: '#14B8A6',
  interested: '#EAB308',
  quotation: '#3B82F6',
  converted: '#22C55E',
  lost: '#EF4444',
};

function bucketStatus(items = []) {
  const byKey = Object.fromEntries((items || []).map((i) => [i.key, i]));
  const pick = (...keys) =>
    keys.reduce((sum, key) => sum + Number(byKey[key]?.value || 0), 0);

  const rows = [
    { name: 'New Leads', key: 'new', value: pick('new'), color: FALLBACK_COLORS.new },
    { name: 'Contacted', key: 'contacted', value: pick('contacted'), color: FALLBACK_COLORS.contacted },
    {
      name: 'Interested',
      key: 'interested',
      value: pick('working', 'qualified', 'follow_up', 'negotiation', 'reactivated'),
      color: FALLBACK_COLORS.interested,
    },
    { name: 'Quotation Sent', key: 'quotation', value: pick('quotation'), color: FALLBACK_COLORS.quotation },
    { name: 'Converted', key: 'converted', value: pick('converted'), color: FALLBACK_COLORS.converted },
    { name: 'Lost', key: 'lost', value: pick('lost'), color: FALLBACK_COLORS.lost },
  ];
  return rows;
}

export default function LeadStatusOverviewCard({ stats }) {
  const items = stats?.report?.statusDistribution || [];
  const rows = bucketStatus(items);
  const total = rows.reduce((s, r) => s + r.value, 0) || Number(stats?.report?.kpis?.totalLeads?.value || 0);
  const pieRows = rows.filter((r) => r.value > 0);
  const chartRows = pieRows.length ? pieRows : [{ name: 'Empty', value: 1, color: '#E2E8F0' }];
  const period = 'This Month';

  return (
    <div className="h-full rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-slate-900">Lead Status Overview</h2>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-100">
          {period}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-[150px] w-[150px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartRows}
                dataKey="value"
                innerRadius={48}
                outerRadius={70}
                paddingAngle={2}
                stroke="none"
              >
                {chartRows.map((row) => (
                  <Cell key={row.name} fill={row.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[22px] font-bold leading-none text-slate-900">{total.toLocaleString('en-IN')}</p>
            <p className="mt-1 text-[11px] text-slate-400">Total Leads</p>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-2">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                <span className="truncate text-slate-600">{row.name}</span>
              </span>
              <span className="tabular-nums font-semibold text-slate-800">{row.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

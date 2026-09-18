import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const FALLBACK_COLORS = {
  new: '#94A3B8',
  not_reachable: '#F97316',
  qualified: '#8B5CF6',
  package_sent: '#3B82F6',
  follow_up: '#F59E0B',
  booked: '#22C55E',
  postponed: '#64748B',
  lost: '#EF4444',
  converted: '#22C55E',
};

export default function LeadStatusOverviewCard({ statusBreakdown = [] }) {
  const pick = (...keys) =>
    keys.reduce((sum, key) => {
      const hit = statusBreakdown.find((r) => r.key === key || r.name?.toLowerCase?.().includes(key));
      return sum + (Number(hit?.value || hit?.count || 0) || 0);
    }, 0);

  const data = [
    { name: 'New Lead', key: 'new_lead', value: pick('new_lead', 'new'), color: FALLBACK_COLORS.new },
    { name: 'Not Reachable', key: 'not_reachable', value: pick('not_reachable'), color: FALLBACK_COLORS.not_reachable },
    { name: 'Qualified', key: 'qualified', value: pick('qualified', 'contacted'), color: FALLBACK_COLORS.qualified },
    { name: 'Package Sent', key: 'package_sent', value: pick('package_sent', 'quotation', 'quotation_sent'), color: FALLBACK_COLORS.package_sent },
    { name: 'Follow-up', key: 'follow_up', value: pick('follow_up', 'working', 'negotiation'), color: FALLBACK_COLORS.follow_up },
    { name: 'Booked', key: 'booked', value: pick('booked', 'converted'), color: FALLBACK_COLORS.booked },
    { name: 'Postponed', key: 'postponed', value: pick('postponed'), color: FALLBACK_COLORS.postponed },
    { name: 'Lost', key: 'lost', value: pick('lost'), color: FALLBACK_COLORS.lost },
  ].filter((d) => d.value > 0);

  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900 mb-1">Lead Pipeline</h3>
      <p className="text-xs text-slate-500 mb-3">Status stages (temperature is separate)</p>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">No lead data</p>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="h-44 w-full sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2}>
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} (${Math.round((v / total) * 100)}%)`, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex-1 space-y-1.5 w-full">
            {data.map((row) => (
              <li key={row.key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                  {row.name}
                </span>
                <span className="tabular-nums font-bold text-slate-900">{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

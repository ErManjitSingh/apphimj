import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import DashboardPanel from '../dashboard/DashboardPanel';
import { formatINR } from './reportUtils';

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-subtle bg-surface px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-content-primary mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.name === 'ROI' ? `${p.value}%` : p.name.includes('Revenue') || p.name.includes('Cost') ? formatINR(p.value) : p.value}</p>
      ))}
    </div>
  );
}

export default function LeadSourceAnalytics({ data }) {
  const { isDark } = useTheme();
  const grid = isDark ? '#1f2937' : '#f1f5f9';
  const tick = isDark ? '#64748b' : '#94a3b8';

  return (
    <DashboardPanel title="Lead Source Analytics" subtitle="Leads, conversions, package value & marketing ROI by channel" className="h-full">
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-subtle text-left">
              {['Source', 'Leads', 'Conversions', 'Package Value', 'Cost/Lead', 'ROI / Conv%'].map((h) => (
                <th key={h} className="pb-2 pr-4 text-[11px] uppercase font-semibold text-content-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {data.map((row) => (
              <tr key={row.source} className="hover:bg-surface-elevated/40">
                <td className="py-2.5 pr-4 font-medium text-content-primary">{row.source}</td>
                <td className="py-2.5 pr-4 metric-tabular">{row.leads}</td>
                <td className="py-2.5 pr-4 metric-tabular text-emerald-600">{row.conversions}</td>
                <td className="py-2.5 pr-4 metric-tabular font-semibold">{formatINR(row.revenue)}</td>
                <td className="py-2.5 pr-4 metric-tabular">{row.costPerLead ? formatINR(row.costPerLead) : '—'}</td>
                <td className="py-2.5 metric-tabular">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-bold">
                    {row.roi}%{row.hasSpend ? ' ROI' : ' conv'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
            <XAxis dataKey="source" tick={{ fill: tick, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: tick, fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<Tip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Leads" />
            <Bar dataKey="conversions" fill="#10b981" radius={[4, 4, 0, 0]} name="Conversions" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </DashboardPanel>
  );
}

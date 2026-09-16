import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const bookings = payload.find((p) => p.dataKey === 'bookings')?.value || 0;
  return (
    <div className="rounded-xl bg-orange-500 px-3 py-1.5 text-[12px] font-semibold text-white shadow-lg">
      {bookings} Bookings
      <div className="text-[10px] font-medium text-orange-100">{label}</div>
    </div>
  );
}

export default function BookingsTrendCard({ stats }) {
  const rows = useMemo(() => {
    const monthly = stats?.report?.revenueVsBookings || stats?.report?.monthlyLeadTrend || [];
    return (monthly || []).map((row) => ({
      label: String(row.label || row.month || '').replace(/ .*/, '') || row.label,
      bookings: Number(row.bookings ?? row.convertedLeads ?? 0),
    }));
  }, [stats]);

  return (
    <div className="h-full rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-slate-900">Bookings Trend</h2>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-100">
          Monthly
        </span>
      </div>
      <div className="h-[190px]">
        {rows.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#94A3B8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(249,115,22,0.06)' }} />
              <Bar dataKey="bookings" fill="#FED7AA" radius={[6, 6, 0, 0]} barSize={18} />
              <Line
                type="monotone"
                dataKey="bookings"
                stroke="#F97316"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#F97316', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-400">No booking trend yet</p>
        )}
      </div>
    </div>
  );
}

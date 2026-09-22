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
import { MapPin } from 'lucide-react';

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

  const byLocation = useMemo(() => {
    const dests = stats?.report?.topDestinations || [];
    return dests
      .map((row) => ({
        name: row.name || row.destination || 'Unknown',
        bookings: Number(row.conversions ?? row.bookings ?? row.converted ?? 0),
        queries: Number(row.queries ?? row.value ?? 0),
      }))
      .filter((row) => row.bookings > 0)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 8);
  }, [stats]);

  const maxBookings = Math.max(...byLocation.map((r) => r.bookings), 1);
  const totalLocationBookings = byLocation.reduce((s, r) => s + r.bookings, 0);

  return (
    <div className="h-full rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-slate-900">Bookings Trend</h2>
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-100">
          Monthly
        </span>
      </div>
      <div className="h-[160px]">
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

      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-800">
            <MapPin className="h-3.5 w-3.5 text-orange-500" />
            Bookings by location
          </p>
          {totalLocationBookings > 0 ? (
            <span className="text-[11px] font-medium tabular-nums text-slate-400">
              {totalLocationBookings.toLocaleString('en-IN')} total
            </span>
          ) : null}
        </div>
        {byLocation.length ? (
          <ul className="max-h-[140px] space-y-1.5 overflow-auto pr-1">
            {byLocation.map((row) => {
              const width = Math.max(8, (row.bookings / maxBookings) * 100);
              return (
                <li key={row.name} className="rounded-xl px-1 py-1">
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="truncate font-medium text-slate-700">{row.name}</span>
                    <span className="shrink-0 tabular-nums font-bold text-slate-900">
                      {row.bookings.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  {row.queries > 0 ? (
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {row.queries.toLocaleString('en-IN')} queries ·{' '}
                      {Math.round((row.bookings / row.queries) * 100)}% convert
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-3 text-center text-[12px] text-slate-400">No location bookings yet</p>
        )}
      </div>
    </div>
  );
}

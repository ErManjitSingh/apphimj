import { Users, Trophy } from 'lucide-react';
import { formatDurationMs } from './activityFormat';

export default function ActivityTeamOverviewTable({ rows, loading, onSelectExecutive }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white p-3.5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white">
          <Users className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-blue-700">Team Activity Overview</h3>
          <p className="text-[11px] text-blue-600/80">Compare CRM engagement across every executive</p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-white/70" />
      ) : !rows.length ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white py-16 text-center">
          <Users className="h-8 w-8 text-content-muted" />
          <p className="text-sm font-semibold text-content-primary">No executives found</p>
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto overflow-x-auto rounded-xl border border-blue-100 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-blue-600">
              <tr>
                {['Executive', 'Activities', 'Active Time', 'Idle', 'Calls', 'Leads Viewed', 'Quotations', 'Follow-ups', 'Bookings'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {rows.map((row, i) => (
                <tr
                  key={row._id}
                  onClick={() => onSelectExecutive?.(row._id)}
                  className="cursor-pointer transition hover:bg-blue-50/60"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-violet-700 hover:underline">
                    <span className="inline-flex items-center gap-1.5">
                      {i === 0 && row.totalActivities > 0 && <Trophy className="h-3.5 w-3.5 text-amber-500" />}
                      {row.name}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums font-semibold text-slate-700">{row.totalActivities}</td>
                  <td className="px-3 py-2.5 tabular-nums text-emerald-600">{formatDurationMs(row.activeMs)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-amber-600">{formatDurationMs(row.idleMs)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-teal-600">{row.totalCalls}</td>
                  <td className="px-3 py-2.5 tabular-nums text-sky-600">{row.leadsViewed}</td>
                  <td className="px-3 py-2.5 tabular-nums text-fuchsia-600">{row.quotationsCreated}</td>
                  <td className="px-3 py-2.5 tabular-nums text-amber-600">{row.followUpsCreated}</td>
                  <td className="px-3 py-2.5 tabular-nums text-rose-600">{row.bookingsCreated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

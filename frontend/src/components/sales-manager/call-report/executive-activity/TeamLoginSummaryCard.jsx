import { LogIn, Radio, LogOut, Timer } from 'lucide-react';
import { formatDurationMs } from './activityFormat';

const TILES = [
  { key: 'loggedIn', label: 'Logged In', icon: LogIn, cardBg: 'bg-sky-50 border-sky-100', iconSolid: 'bg-sky-500 text-white', valueColor: 'text-sky-700' },
  { key: 'online', label: 'Currently Online', icon: Radio, cardBg: 'bg-emerald-50 border-emerald-100', iconSolid: 'bg-emerald-500 text-white', valueColor: 'text-emerald-700' },
  { key: 'loggedOut', label: 'Logged Out', icon: LogOut, cardBg: 'bg-slate-100 border-slate-200', iconSolid: 'bg-slate-500 text-white', valueColor: 'text-slate-700' },
  { key: 'avgSessionMs', label: 'Avg Session', icon: Timer, cardBg: 'bg-violet-50 border-violet-100', iconSolid: 'bg-violet-500 text-white', valueColor: 'text-violet-700', format: formatDurationMs },
];

export default function TeamLoginSummaryCard({ summary, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TILES.map((t) => <div key={t.key} className="h-[84px] animate-pulse rounded-2xl border border-subtle bg-surface-elevated/50" />)}
      </div>
    );
  }
  if (!summary) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-bold text-content-primary">Team Login Summary</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TILES.map(({ key, label, icon: Icon, cardBg, iconSolid, valueColor, format }) => (
          <div key={key} className={`rounded-xl border p-3 ${cardBg}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-content-muted leading-tight">{label}</p>
              <div className={`inline-flex p-1.5 rounded-lg ${iconSolid}`}>
                <Icon className="h-3.5 w-3.5" strokeWidth={2.75} />
              </div>
            </div>
            <p className={`mt-2 text-xl font-bold tabular-nums ${valueColor}`}>
              {format ? format(summary[key] || 0) : (summary[key] ?? 0)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

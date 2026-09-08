import {
  Activity, Eye, UserPlus, Pencil, FileText, CalendarClock, Hotel, PhoneCall, Clock, Sparkles,
} from 'lucide-react';
import { formatCallDuration } from '../../../../lib/callSession';
import { formatDateTime } from './activityFormat';

const CARDS = [
  { key: 'totalActivities', label: 'Total Activities', icon: Activity, cardBg: 'bg-violet-50 border-violet-100', iconSolid: 'bg-violet-500 text-white', valueColor: 'text-violet-700' },
  { key: 'leadsViewed', label: 'Leads Viewed', icon: Eye, cardBg: 'bg-sky-50 border-sky-100', iconSolid: 'bg-sky-500 text-white', valueColor: 'text-sky-700' },
  { key: 'leadsCreated', label: 'Leads Created', icon: UserPlus, cardBg: 'bg-emerald-50 border-emerald-100', iconSolid: 'bg-emerald-500 text-white', valueColor: 'text-emerald-700' },
  { key: 'leadsUpdated', label: 'Leads Updated', icon: Pencil, cardBg: 'bg-indigo-50 border-indigo-100', iconSolid: 'bg-indigo-500 text-white', valueColor: 'text-indigo-700' },
  { key: 'quotationsCreated', label: 'Quotations Created', icon: FileText, cardBg: 'bg-fuchsia-50 border-fuchsia-100', iconSolid: 'bg-fuchsia-500 text-white', valueColor: 'text-fuchsia-700' },
  { key: 'followUpsCreated', label: 'Follow-ups Created', icon: CalendarClock, cardBg: 'bg-amber-50 border-amber-100', iconSolid: 'bg-amber-500 text-white', valueColor: 'text-amber-700' },
  { key: 'bookingsCreated', label: 'Bookings Created', icon: Hotel, cardBg: 'bg-rose-50 border-rose-100', iconSolid: 'bg-rose-500 text-white', valueColor: 'text-rose-700' },
  { key: 'totalCalls', label: 'Calls Made', icon: PhoneCall, cardBg: 'bg-teal-50 border-teal-100', iconSolid: 'bg-teal-500 text-white', valueColor: 'text-teal-700' },
  { key: 'totalTalkTimeSec', label: 'Talk Time', icon: Clock, cardBg: 'bg-orange-50 border-orange-100', iconSolid: 'bg-orange-500 text-white', valueColor: 'text-orange-700', format: formatCallDuration },
];

export default function ActivitySummaryCards({ summary, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {CARDS.map((c) => (
          <div key={c.key} className="h-[92px] animate-pulse rounded-2xl border border-subtle bg-surface-elevated/50" />
        ))}
      </div>
    );
  }
  if (!summary) return null;

  return (
    <div className="space-y-3">
      {(summary.firstActivityAt || summary.lastActivityAt) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-content-secondary">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          <span>First activity: <span className="font-semibold text-content-primary">{formatDateTime(summary.firstActivityAt)}</span></span>
          <span className="text-content-muted">·</span>
          <span>Last activity: <span className="font-semibold text-content-primary">{formatDateTime(summary.lastActivityAt)}</span></span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {CARDS.map(({ key, label, icon: Icon, cardBg, iconSolid, valueColor, format }) => (
          <div key={key} className={`rounded-2xl border p-3.5 shadow-sm ${cardBg}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-content-muted leading-tight">{label}</p>
              <div className={`inline-flex p-1.5 rounded-xl shadow-sm ${iconSolid}`}>
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

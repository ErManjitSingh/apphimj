import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Phone, PhoneCall, PhoneMissed, PhoneOff, Clock, Timer, TrendingUp, TrendingDown, Users, Repeat, ChevronRight,
  Target, CheckCircle2, Percent,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatCallDuration, formatDurationHuman } from '../../../lib/callSession';
import KpiDrilldownModal from './KpiDrilldownModal';

const CARDS = [
  {
    key: 'totalCalls', label: 'Total Calls', icon: Phone, cardBg: 'bg-sky-50 border-sky-100', iconSolid: 'bg-sky-500 text-white', valueColor: 'text-sky-700',
    drill: { mode: 'calls', title: 'All Calls' },
  },
  {
    key: 'connectedCalls', label: 'Connected', icon: PhoneCall, cardBg: 'bg-emerald-50 border-emerald-100', iconSolid: 'bg-emerald-500 text-white', valueColor: 'text-emerald-700',
    drill: { mode: 'calls', title: 'Connected Calls', outcome: 'connected' },
  },
  {
    key: 'noAnswerCalls', label: 'No Answer', icon: PhoneMissed, cardBg: 'bg-amber-50 border-amber-100', iconSolid: 'bg-amber-500 text-white', valueColor: 'text-amber-700',
    drill: { mode: 'calls', title: 'No Answer Calls', outcome: 'no_answer' },
  },
  {
    key: 'failedCalls', label: 'Failed / Cancelled', icon: PhoneOff, cardBg: 'bg-red-50 border-red-100', iconSolid: 'bg-red-500 text-white', valueColor: 'text-red-700',
    drill: { mode: 'calls', title: 'Failed / Cancelled Calls', outcome: 'failed' },
  },
  {
    key: 'totalTalkTimeSec', label: 'Total Talk Time', icon: Clock, cardBg: 'bg-indigo-50 border-indigo-100', iconSolid: 'bg-indigo-500 text-white', valueColor: 'text-indigo-700', format: (v) => formatDurationHuman(v, { includeSeconds: true }),
    drill: { mode: 'calls', title: 'Total Talk Time' },
  },
  {
    key: 'avgCallDurationSec', label: 'Avg Call Duration', icon: Timer, cardBg: 'bg-violet-50 border-violet-100', iconSolid: 'bg-violet-500 text-white', valueColor: 'text-violet-700', format: formatCallDuration,
    drill: { mode: 'calls', title: 'Avg Call Duration', outcome: 'connected', durationGt: 0 },
  },
  {
    key: 'longestCallSec', label: 'Longest Call', icon: TrendingUp, cardBg: 'bg-teal-50 border-teal-100', iconSolid: 'bg-teal-500 text-white', valueColor: 'text-teal-700', format: formatCallDuration,
    drill: { mode: 'single', title: 'Longest Call', outcome: 'connected', durationGt: 0, sortBy: 'duration', sortDir: 'desc' },
  },
  {
    key: 'shortestCallSec', label: 'Shortest Call', icon: TrendingDown, cardBg: 'bg-orange-50 border-orange-100', iconSolid: 'bg-orange-500 text-white', valueColor: 'text-orange-700', format: formatCallDuration,
    drill: { mode: 'single', title: 'Shortest Call', outcome: 'connected', durationGt: 0, sortBy: 'duration', sortDir: 'asc' },
  },
  {
    key: 'uniqueGuestsContacted', label: 'Unique Guests', icon: Users, cardBg: 'bg-fuchsia-50 border-fuchsia-100', iconSolid: 'bg-fuchsia-500 text-white', valueColor: 'text-fuchsia-700',
    drill: { mode: 'guests', title: 'Unique Guests' },
  },
  {
    key: 'avgCallsPerGuest', label: 'Avg Calls / Guest', icon: Repeat, cardBg: 'bg-rose-50 border-rose-100', iconSolid: 'bg-rose-500 text-white', valueColor: 'text-rose-700',
    drill: { mode: 'guests', title: 'Avg Calls / Guest' },
  },
  {
    key: 'connectionRate', label: 'Connection Rate', icon: Percent, cardBg: 'bg-cyan-50 border-cyan-100', iconSolid: 'bg-cyan-500 text-white', valueColor: 'text-cyan-700',
    format: (v) => `${v}%`,
  },
  {
    // Same fixed 2h/day target computed server-side by getExecutiveSummary (daysInPeriod × 2h) —
    // no separate target calculation here.
    key: 'targetTalkTimeSec', label: 'Target', icon: Target, cardBg: 'bg-slate-50 border-slate-200', iconSolid: 'bg-slate-500 text-white', valueColor: 'text-slate-700',
    format: (v) => formatDurationHuman(v),
  },
  {
    // Status is driven solely by summary.targetMet (talk time only) — rendered as the badge below.
    key: 'targetMet', label: 'Status', icon: CheckCircle2, cardBg: 'bg-slate-50 border-slate-200', iconSolid: 'bg-slate-500 text-white', valueColor: 'text-slate-700',
    isStatus: true,
  },
];

export default function ExecutiveSummaryCards({ summary, loading, executiveId, executiveName, dateFrom, dateTo }) {
  const [selectedKpi, setSelectedKpi] = useState(null);

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
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {CARDS.map(({ key, label, icon: Icon, cardBg, iconSolid, valueColor, format, drill, isStatus }, i) => {
          const targetMet = Boolean(summary?.targetMet);
          return (
            <motion.button
              key={key}
              type="button"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => drill && setSelectedKpi({ ...drill, key })}
              disabled={!drill}
              className={cn(
                'group relative rounded-2xl border p-3.5 text-left shadow-sm transition',
                drill && 'hover:-translate-y-0.5 hover:shadow-md hover:ring-1 hover:ring-black/5',
                !drill && 'cursor-default',
                cardBg
              )}
            >
              {drill && (
                <ChevronRight className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-content-muted/40 transition group-hover:translate-x-0.5 group-hover:text-content-muted" />
              )}
              <div className="flex items-start justify-between gap-2 pr-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-content-muted leading-tight">{label}</p>
                <div className={`inline-flex p-1.5 rounded-xl shadow-sm ${iconSolid}`}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.75} />
                </div>
              </div>
              {isStatus ? (
                <span
                  className={cn(
                    'mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold',
                    targetMet ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  )}
                >
                  {targetMet ? 'Target Met' : 'Not Met'}
                </span>
              ) : (
                <p className={`mt-2 text-xl font-bold tabular-nums ${valueColor}`}>
                  {format ? format(summary[key] || 0) : (summary[key] ?? 0)}
                </p>
              )}
            </motion.button>
          );
        })}
      </div>

      <KpiDrilldownModal
        open={selectedKpi !== null}
        kpi={selectedKpi}
        executiveId={executiveId}
        executiveName={executiveName}
        dateFrom={dateFrom}
        dateTo={dateTo}
        summary={summary}
        onClose={() => setSelectedKpi(null)}
      />
    </>
  );
}

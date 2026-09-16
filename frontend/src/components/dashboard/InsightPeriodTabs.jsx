import { cn } from '../../lib/utils';

export const INSIGHT_PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'total', label: 'Total' },
  { key: 'custom', label: 'Custom' },
];

export default function InsightPeriodTabs({
  period,
  onPeriodChange,
  dateFrom,
  dateTo,
  onDateFrom,
  onDateTo,
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <div className="inline-flex rounded-full bg-slate-100/90 p-0.5 ring-1 ring-slate-200/80">
        {INSIGHT_PERIODS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onPeriodChange(item.key)}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
              period === item.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFrom(e.target.value)}
            className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          />
          <span className="text-[10px] text-slate-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateTo(e.target.value)}
            className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-700 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
          />
        </div>
      )}
    </div>
  );
}

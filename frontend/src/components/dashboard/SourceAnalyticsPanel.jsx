import { motion } from 'framer-motion';
import DashboardPanel from './DashboardPanel';

const VISIBLE_ROWS = 5;

const SOURCE_COLORS = [
  'bg-brand-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-sky-500',
  'bg-indigo-500',
  'bg-teal-500',
];

function formatINRCompact(n) {
  const amount = Number(n || 0);
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2).replace(/\.00$/, '')}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  if (!amount) return '—';
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function SourceAnalyticsPanel({ data }) {
  const sources = data?.sources || [];
  if (!sources.length) {
    return (
      <DashboardPanel title="Source Analytics" subtitle="Conversion by lead source">
        <p className="text-sm text-content-muted py-6 text-center">No source data yet</p>
      </DashboardPanel>
    );
  }

  const maxTotal = Math.max(...sources.map((s) => s.total), 1);
  const overall =
    data?.overallConversionRate != null
      ? `${data.overallConversionRate}% overall · ${data.totalBooked || 0} booked`
      : 'Leads, booked rate & package value by source';

  return (
    <DashboardPanel title="Source Analytics" subtitle={overall}>
      <div
        className="space-y-4 overflow-y-auto scrollbar-thin pr-1"
        style={{ maxHeight: `${VISIBLE_ROWS * 6.25}rem` }}
      >
        {sources.map((src, i) => (
          <motion.div
            key={src.key}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="group"
          >
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-content-primary">{src.label}</p>
                <p className="text-xs text-content-muted">
                  {src.total} leads · {src.sharePct}% share
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-emerald-600">{src.conversionRate}%</p>
                <p className="text-[10px] text-content-muted">{src.converted} booked</p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
              <div
                className={`h-full rounded-full ${SOURCE_COLORS[i % SOURCE_COLORS.length]} transition-all`}
                style={{ width: `${(src.total / maxTotal) * 100}%` }}
              />
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-content-muted">
              <span>{src.pipeline} open</span>
              <span>{src.lost} lost</span>
              <span>{src.connected} connected</span>
              <span className="font-semibold text-amber-700">{formatINRCompact(src.revenue)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardPanel>
  );
}

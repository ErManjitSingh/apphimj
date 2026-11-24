import DashboardPanel from './DashboardPanel';

const BUCKET_COLORS = {
  '0_7': 'bg-emerald-500',
  '8_15': 'bg-brand-500',
  '16_30': 'bg-amber-500',
  '30_plus': 'bg-rose-500',
};

export default function AgingChartPanel({ aging = [] }) {
  const max = Math.max(...aging.map((b) => b.count), 1);

  return (
    <DashboardPanel title="Lead Aging" subtitle="Open pipeline age from lead created date (IST)">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(aging.length ? aging : [
          { key: '0_7', label: '0-7 Days', count: 0 },
          { key: '8_15', label: '8-15 Days', count: 0 },
          { key: '16_30', label: '16-30 Days', count: 0 },
          { key: '30_plus', label: '30+ Days', count: 0 },
        ]).map((bucket) => (
          <div
            key={bucket.key}
            className="rounded-xl border border-subtle bg-surface-elevated/40 p-4 text-center"
          >
            <div className="mb-2 flex h-16 items-end justify-center">
              <div
                className={`w-10 rounded-t-lg ${BUCKET_COLORS[bucket.key] || 'bg-slate-400'} transition-all`}
                style={{ height: `${Math.max(12, (bucket.count / max) * 100)}%` }}
              />
            </div>
            <p className="text-2xl font-bold text-content-primary metric-tabular">{bucket.count}</p>
            <p className="mt-1 text-xs text-content-muted">{bucket.label}</p>
          </div>
        ))}
      </div>
    </DashboardPanel>
  );
}

import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Target } from 'lucide-react';
import DashboardPanel from '../dashboard/DashboardPanel';
import { formatINR } from './reportUtils';

export default function ForecastPanel({ forecast }) {
  const data = forecast || {};
  const upcoming = Array.isArray(data.upcomingBookings) ? data.upcomingBookings : [];

  return (
    <DashboardPanel
      title="Pipeline Forecast"
      subtitle="Balance due on upcoming trips + open sales pipeline"
      variant="muted"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="p-4 rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 to-teal-500/5">
          <TrendingUp className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-xs font-semibold uppercase text-emerald-700">Balance Due (Upcoming)</p>
          <p className="text-2xl font-black text-emerald-800 dark:text-emerald-300 metric-tabular mt-1">{formatINR(data.expectedRevenue)}</p>
        </div>
        <div className="p-4 rounded-xl border border-violet-400/30 bg-gradient-to-br from-violet-500/15 to-purple-500/5">
          <Target className="w-5 h-5 text-violet-600 mb-2" />
          <p className="text-xs font-semibold uppercase text-violet-700">Open Pipeline Leads</p>
          <p className="text-2xl font-black text-violet-800 dark:text-violet-300 metric-tabular mt-1">{Number(data.expectedConversions || 0).toLocaleString('en-IN')}</p>
        </div>
      </div>
      <p className="text-xs font-semibold uppercase text-content-muted mb-2 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Upcoming Bookings</p>
      <div className="space-y-2">
        {upcoming.length === 0 ? (
          <p className="py-6 text-center text-sm text-content-muted">No upcoming confirmed trips</p>
        ) : null}
        {upcoming.map((b, i) => (
          <motion.div key={`${b.customer}-${b.date}-${i}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center justify-between p-3 rounded-xl border border-subtle bg-surface hover:bg-surface-elevated/50">
            <div>
              <p className="text-sm font-semibold text-content-primary">{b.customer}</p>
              <p className="text-xs text-content-muted">{b.destination} · {b.date ? new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</p>
            </div>
            <span className="text-sm font-bold text-amber-700 metric-tabular">{formatINR(b.value)}</span>
          </motion.div>
        ))}
      </div>
    </DashboardPanel>
  );
}

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  FileText,
  IndianRupee,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { withPeriodParams } from '../../lib/periodFilters';
import MiniSparkline from './MiniSparkline';

function formatValue(value, { currency, suffix } = {}) {
  const n = Number(value || 0);
  if (currency) {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
  }
  if (suffix === '%') return `${Math.round(n)}%`;
  return n.toLocaleString('en-IN');
}

const CARDS = [
  {
    key: 'totalLeads',
    label: 'Total Leads',
    icon: Users,
    path: '/leads',
    sparkKey: 'totalLeads',
    spark: '#F43F5E',
    iconBg: 'from-rose-400 to-rose-600',
    iconShadow: 'shadow-rose-500/35',
    wash: 'from-rose-50/90 via-white to-white',
    blob: 'bg-rose-400/25',
    bar: 'from-rose-400 to-orange-400',
    ring: 'hover:ring-rose-200',
  },
  {
    key: 'bookings',
    label: 'Total Bookings',
    icon: CalendarDays,
    path: '/leads/converted',
    sparkKey: 'converted',
    spark: '#3B82F6',
    iconBg: 'from-sky-400 to-blue-600',
    iconShadow: 'shadow-blue-500/35',
    wash: 'from-sky-50/90 via-white to-white',
    blob: 'bg-sky-400/25',
    bar: 'from-sky-400 to-indigo-500',
    ring: 'hover:ring-sky-200',
  },
  {
    key: 'revenue',
    label: 'Revenue',
    icon: IndianRupee,
    path: '/payments',
    currency: true,
    sparkKey: 'revenue',
    spark: '#10B981',
    iconBg: 'from-emerald-400 to-teal-600',
    iconShadow: 'shadow-emerald-500/35',
    wash: 'from-emerald-50/90 via-white to-white',
    blob: 'bg-emerald-400/25',
    bar: 'from-emerald-400 to-teal-500',
    ring: 'hover:ring-emerald-200',
  },
  {
    key: 'customers',
    label: 'Active Customers',
    icon: UserRound,
    path: '/leads/converted',
    sparkKey: 'converted',
    spark: '#8B5CF6',
    iconBg: 'from-violet-400 to-purple-600',
    iconShadow: 'shadow-violet-500/35',
    wash: 'from-violet-50/90 via-white to-white',
    blob: 'bg-violet-400/25',
    bar: 'from-violet-400 to-fuchsia-500',
    ring: 'hover:ring-violet-200',
  },
  {
    key: 'quotations',
    label: 'Quotations Sent',
    icon: FileText,
    path: '/quotations',
    sparkKey: 'converted',
    spark: '#F59E0B',
    iconBg: 'from-amber-400 to-orange-600',
    iconShadow: 'shadow-amber-500/35',
    wash: 'from-amber-50/90 via-white to-white',
    blob: 'bg-amber-400/25',
    bar: 'from-amber-400 to-orange-500',
    ring: 'hover:ring-amber-200',
  },
  {
    key: 'conversionRate',
    label: 'Conversion Rate',
    icon: Target,
    path: '/reports',
    suffix: '%',
    sparkKey: 'conversionRate',
    spark: '#EC4899',
    iconBg: 'from-pink-400 to-rose-600',
    iconShadow: 'shadow-pink-500/35',
    wash: 'from-pink-50/90 via-white to-white',
    blob: 'bg-pink-400/25',
    bar: 'from-pink-400 to-rose-500',
    ring: 'hover:ring-pink-200',
  },
];

function kpiMeta(kpis, key) {
  const raw = kpis?.[key];
  if (raw && typeof raw === 'object' && 'value' in raw) return raw;
  return { value: Number(raw || 0), change: 0, changeType: 'neutral' };
}

export default function PastelKpiStrip({ stats, filters }) {
  const kpis = stats?.report?.kpis || {};
  const sparks = stats?.kpiSparklines || {};
  const customers = {
    value: Number(stats?.convertedLeads || kpis.bookings?.value || 0),
    change: kpis.bookings?.change || 0,
    changeType: kpis.bookings?.changeType || 'neutral',
  };

  return (
    <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-6">
      {CARDS.map((cfg, index) => {
        const meta = cfg.key === 'customers' ? customers : kpiMeta(kpis, cfg.key);
        const isUp = meta.changeType === 'up';
        const isDown = meta.changeType === 'down';
        const Icon = cfg.icon;
        const Trend = isDown ? TrendingDown : TrendingUp;
        const href = withPeriodParams(cfg.path, filters);
        const changeAbs = Math.abs(Number(meta.change || 0));

        return (
          <motion.div
            key={cfg.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: index * 0.04 }}
          >
            <Link
              to={href}
              className={cn(
                'group relative flex min-h-[82px] flex-col overflow-hidden rounded-2xl bg-gradient-to-br p-2.5 shadow-sm ring-1 ring-black/[0.04]',
                'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
                cfg.wash,
                cfg.ring
              )}
            >
              <span className={cn('absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r', cfg.bar)} />
              <span className={cn('pointer-events-none absolute -right-5 -top-6 h-16 w-16 rounded-full blur-2xl', cfg.blob)} />

              <div className="relative flex items-start justify-between gap-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md',
                      cfg.iconBg,
                      cfg.iconShadow
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {cfg.label}
                    </p>
                    <p className="metric-tabular mt-0.5 truncate text-[18px] font-bold leading-none tracking-tight text-slate-900">
                      {formatValue(meta.value, cfg)}
                    </p>
                  </div>
                </div>

                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                    isDown
                      ? 'bg-rose-50 text-rose-500'
                      : isUp
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-50 text-slate-400'
                  )}
                >
                  <Trend className="h-2.5 w-2.5" />
                  {isDown ? '' : isUp ? '+' : ''}
                  {changeAbs}%
                </span>
              </div>

              <div className="mt-auto flex items-end justify-between gap-2 pt-1.5">
                <p className="text-[9px] font-medium text-slate-400">vs last week</p>
                <MiniSparkline
                  data={sparks[cfg.sparkKey] || []}
                  color={cfg.spark}
                  width={64}
                  height={18}
                  fill
                />
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

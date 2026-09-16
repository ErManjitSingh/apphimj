import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Inbox,
  UserCheck,
  CalendarClock,
  XCircle,
  Star,
  Copy,
  Users,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import API from '../../api/axios';
import { LIST_STALE_MS, GC_TIME_MS } from '../../lib/queryConfig';
import { cn } from '../../lib/utils';

const CARDS = [
  {
    label: 'Total Leads',
    key: 'totalLeads',
    icon: Users,
    href: '/leads',
    iconBg: 'from-rose-400 to-rose-600',
    iconShadow: 'shadow-rose-500/35',
    wash: 'from-rose-50/90 via-white to-white',
    blob: 'bg-rose-400/25',
    bar: 'from-rose-400 to-orange-400',
    ring: 'hover:ring-rose-200',
  },
  {
    label: 'New Leads',
    key: 'todayLeads',
    fallbackKey: 'newLeads',
    icon: Sparkles,
    href: '/leads/new-leads',
    iconBg: 'from-sky-400 to-blue-600',
    iconShadow: 'shadow-blue-500/35',
    wash: 'from-sky-50/90 via-white to-white',
    blob: 'bg-sky-400/25',
    bar: 'from-sky-400 to-indigo-500',
    ring: 'hover:ring-sky-200',
  },
  {
    label: 'Unassigned',
    key: 'unassignedLeads',
    icon: Inbox,
    href: '/leads/unassigned',
    iconBg: 'from-amber-400 to-orange-600',
    iconShadow: 'shadow-amber-500/35',
    wash: 'from-amber-50/90 via-white to-white',
    blob: 'bg-amber-400/25',
    bar: 'from-amber-400 to-orange-500',
    ring: 'hover:ring-amber-200',
  },
  {
    label: 'Assigned',
    key: 'assignedLeads',
    icon: UserCheck,
    href: '/leads/assigned',
    iconBg: 'from-violet-400 to-purple-600',
    iconShadow: 'shadow-violet-500/35',
    wash: 'from-violet-50/90 via-white to-white',
    blob: 'bg-violet-400/25',
    bar: 'from-violet-400 to-fuchsia-500',
    ring: 'hover:ring-violet-200',
  },
  {
    label: 'Follow-ups',
    key: 'followUpPending',
    icon: CalendarClock,
    href: '/followups',
    iconBg: 'from-orange-400 to-rose-500',
    iconShadow: 'shadow-orange-500/35',
    wash: 'from-orange-50/90 via-white to-white',
    blob: 'bg-orange-400/25',
    bar: 'from-orange-400 to-rose-400',
    ring: 'hover:ring-orange-200',
  },
  {
    label: 'Lost Leads',
    key: 'lostLeads',
    icon: XCircle,
    href: '/leads/lost',
    iconBg: 'from-red-400 to-rose-600',
    iconShadow: 'shadow-red-500/35',
    wash: 'from-red-50/90 via-white to-white',
    blob: 'bg-red-400/25',
    bar: 'from-red-400 to-rose-500',
    ring: 'hover:ring-red-200',
  },
  {
    label: 'Converted',
    key: 'convertedLeads',
    icon: Star,
    href: '/leads/converted',
    iconBg: 'from-emerald-400 to-teal-600',
    iconShadow: 'shadow-emerald-500/35',
    wash: 'from-emerald-50/90 via-white to-white',
    blob: 'bg-emerald-400/25',
    bar: 'from-emerald-400 to-teal-500',
    ring: 'hover:ring-emerald-200',
  },
  {
    label: 'Repeated',
    key: 'duplicateLeads',
    icon: Copy,
    href: '/leads/duplicates',
    iconBg: 'from-slate-500 to-slate-700',
    iconShadow: 'shadow-slate-500/35',
    wash: 'from-slate-50/90 via-white to-white',
    blob: 'bg-slate-400/25',
    bar: 'from-slate-400 to-slate-600',
    ring: 'hover:ring-slate-200',
  },
];

export default function LeadKpiStrip() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['leads', 'list-kpis'],
    queryFn: async () => {
      const { data } = await API.get('/leads/list-kpis', { skipSuccessToast: true });
      return data;
    },
    staleTime: LIST_STALE_MS,
    gcTime: GC_TIME_MS,
    placeholderData: (prev) => prev,
  });

  if (isLoading && !stats) {
    return (
      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-8">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-[78px] animate-pulse rounded-2xl bg-gradient-to-br from-slate-50 to-white ring-1 ring-slate-100"
          />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-8">
      {CARDS.map((cfg, index) => {
        const Icon = cfg.icon;
        const value = Number(stats[cfg.key] ?? stats[cfg.fallbackKey] ?? 0);
        return (
          <motion.div
            key={cfg.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: index * 0.03 }}
          >
            <Link
              to={cfg.href}
              className={cn(
                'group relative flex min-h-[78px] items-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-br p-2.5 shadow-sm ring-1 ring-black/[0.04]',
                'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg',
                cfg.wash,
                cfg.ring
              )}
            >
              <span className={cn('absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r', cfg.bar)} />
              <span className={cn('pointer-events-none absolute -right-5 -top-6 h-16 w-16 rounded-full blur-2xl', cfg.blob)} />
              <span
                className={cn(
                  'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md',
                  cfg.iconBg,
                  cfg.iconShadow
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2.4} />
              </span>
              <div className="relative min-w-0">
                <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {cfg.label}
                </p>
                <p className="metric-tabular mt-0.5 truncate text-[20px] font-bold leading-none tracking-tight text-slate-900">
                  {value.toLocaleString('en-IN')}
                </p>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

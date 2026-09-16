import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Droplets, CalendarDays, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import API from '../../api/axios';
import { LIST_STALE_MS, GC_TIME_MS } from '../../lib/queryConfig';
import { cn } from '../../lib/utils';

const CARDS = [
  {
    label: 'Total Leads',
    key: 'totalLeads',
    href: '/leads',
    icon: Users,
    iconWrap: 'bg-orange-50 text-orange-500',
  },
  {
    label: 'New Leads',
    key: 'statusNewLeads',
    fallbackKey: 'newLeads',
    href: '/leads/inbox/new',
    icon: Droplets,
    iconWrap: 'bg-sky-50 text-sky-500',
  },
  {
    label: 'Follow-ups',
    key: 'followUpPending',
    fallbackKey: 'followUpLeads',
    href: '/followups',
    icon: CalendarDays,
    iconWrap: 'bg-violet-50 text-violet-500',
  },
  {
    label: 'Converted',
    key: 'convertedLeads',
    href: '/leads/converted',
    icon: CheckCircle2,
    iconWrap: 'bg-emerald-50 text-emerald-500',
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
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-2xl border border-slate-100 bg-white" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {CARDS.map((cfg, index) => {
        const Icon = cfg.icon;
        const value = Number(stats[cfg.key] ?? stats[cfg.fallbackKey] ?? 0);
        return (
          <motion.div
            key={cfg.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: index * 0.04 }}
          >
            <Link
              to={cfg.href}
              className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full', cfg.iconWrap)}>
                <Icon className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-slate-400">{cfg.label}</p>
                <p className="metric-tabular mt-0.5 text-[26px] font-bold leading-none tracking-tight text-slate-900">
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

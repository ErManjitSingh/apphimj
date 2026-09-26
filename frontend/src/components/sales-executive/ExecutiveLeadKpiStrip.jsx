import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Sparkles,
  UserPlus,
  PhoneOff,
  BadgeCheck,
  FileText,
  CalendarClock,
  Trophy,
  PauseCircle,
  XCircle,
} from 'lucide-react';
import { useSidebarCounts } from '../../hooks/useSidebarCounts';
import { cn } from '../../lib/utils';

/** Pipeline stage KPI strip — clean CRM cards (accent icon, readable numbers). */
const CARDS = [
  {
    key: 'all',
    label: 'Total leads',
    path: '/sales-executive/leads/all',
    icon: Users,
    accent: 'bg-[#5D5FEF]/10 text-[#5D5FEF]',
    rail: 'bg-[#5D5FEF]',
    ringActive: 'ring-[#5D5FEF]/35 border-[#5D5FEF]/40',
  },
  {
    key: 'fresh',
    label: "Today's Fresh",
    path: '/sales-executive/leads/new',
    icon: Sparkles,
    accent: 'bg-[#5D5FEF]/10 text-[#5D5FEF]',
    rail: 'bg-[#5D5FEF]',
    ringActive: 'ring-[#5D5FEF]/35 border-[#5D5FEF]/40',
  },
  {
    key: 'newLead',
    label: 'New Leads',
    path: '/sales-executive/leads/new-lead',
    icon: UserPlus,
    accent: 'bg-sky-50 text-sky-600',
    rail: 'bg-sky-500',
    ringActive: 'ring-sky-300/50 border-sky-300',
  },
  {
    key: 'notReachable',
    label: 'Not Reachable',
    path: '/sales-executive/leads/not-reachable',
    icon: PhoneOff,
    accent: 'bg-amber-50 text-amber-600',
    rail: 'bg-amber-500',
    ringActive: 'ring-amber-300/50 border-amber-300',
  },
  {
    key: 'qualified',
    label: 'Qualified',
    path: '/sales-executive/leads/qualified',
    icon: BadgeCheck,
    accent: 'bg-teal-50 text-teal-600',
    rail: 'bg-teal-500',
    ringActive: 'ring-teal-300/50 border-teal-300',
  },
  {
    key: 'packageSent',
    label: 'Package Sent',
    path: '/sales-executive/leads/package-sent',
    icon: FileText,
    accent: 'bg-indigo-50 text-indigo-600',
    rail: 'bg-indigo-500',
    ringActive: 'ring-indigo-300/50 border-indigo-300',
  },
  {
    key: 'followUp',
    label: 'Follow-up',
    path: '/sales-executive/leads/follow-up',
    icon: CalendarClock,
    accent: 'bg-orange-50 text-orange-600',
    rail: 'bg-orange-500',
    ringActive: 'ring-orange-300/50 border-orange-300',
  },
  {
    key: 'booked',
    label: 'Booked',
    path: '/sales-executive/leads/converted',
    icon: Trophy,
    accent: 'bg-emerald-50 text-emerald-600',
    rail: 'bg-emerald-500',
    ringActive: 'ring-emerald-300/50 border-emerald-300',
  },
  {
    key: 'postponed',
    label: 'Postponed',
    path: '/sales-executive/leads/postponed',
    icon: PauseCircle,
    accent: 'bg-slate-100 text-slate-600',
    rail: 'bg-slate-400',
    ringActive: 'ring-slate-300/50 border-slate-300',
  },
  {
    key: 'lost',
    label: 'Lost',
    path: '/sales-executive/leads/lost',
    icon: XCircle,
    accent: 'bg-red-50 text-red-600',
    rail: 'bg-red-500',
    ringActive: 'ring-red-300/50 border-red-300',
  },
];

function getCount(counts, key) {
  if (!counts) return 0;
  if (key === 'fresh') return counts.leads?.fresh ?? counts.leads?.new ?? 0;
  if (key === 'booked') return counts.leads?.booked ?? counts.leads?.converted ?? 0;
  return counts.leads?.[key] ?? 0;
}

export default function ExecutiveLeadKpiStrip() {
  const counts = useSidebarCounts();
  const { pathname } = useLocation();

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 w-full">
      {CARDS.map(({ key, label, path, icon: Icon, accent, rail, ringActive }, i) => {
        const value = getCount(counts, key);
        const active = pathname === path || pathname.startsWith(`${path}/`);

        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
          >
            <Link
              to={path}
              className={cn(
                'group relative flex min-h-[88px] flex-col overflow-hidden rounded-2xl border bg-white p-3 shadow-sm transition-all',
                'hover:-translate-y-0.5 hover:shadow-md',
                active
                  ? cn('ring-2 shadow-md', ringActive)
                  : 'border-slate-100/90 hover:border-slate-200'
              )}
            >
              <span
                className={cn(
                  'absolute inset-y-0 left-0 w-[3px] rounded-l-2xl transition-opacity',
                  rail,
                  active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
                )}
              />
              <div className="flex items-start justify-between gap-2 pl-1">
                <div
                  className={cn(
                    'inline-flex h-8 w-8 items-center justify-center rounded-xl',
                    accent
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                </div>
              </div>
              <p className="mt-2.5 pl-1 text-[11px] font-semibold leading-tight text-slate-500">
                {label}
              </p>
              <p className="mt-1 pl-1 text-[22px] font-bold tabular-nums leading-none tracking-tight text-slate-900">
                {value}
              </p>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

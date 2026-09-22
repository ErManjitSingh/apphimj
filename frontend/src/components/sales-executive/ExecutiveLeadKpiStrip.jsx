import { Link } from 'react-router-dom';
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

/** Exact pipeline stage metric cards (Manohar / Agent CRM Total Leads). */
const CARDS = [
  {
    key: 'all',
    label: 'Total leads',
    path: '/sales-executive/leads/all',
    icon: Users,
    card: 'bg-gradient-to-br from-slate-700 via-slate-800 to-violet-900 shadow-slate-700/30',
  },
  {
    key: 'fresh',
    label: "Today's Fresh",
    path: '/sales-executive/leads/new',
    icon: Sparkles,
    card: 'bg-gradient-to-br from-[#5D5FEF] via-[#6D5FF0] to-[#7C3AED] shadow-[#5D5FEF]/30',
  },
  {
    key: 'newLead',
    label: 'New Leads',
    path: '/sales-executive/leads/new-lead',
    icon: UserPlus,
    card: 'bg-gradient-to-br from-sky-500 via-sky-500 to-blue-600 shadow-sky-500/30',
  },
  {
    key: 'notReachable',
    label: 'Not Reachable',
    path: '/sales-executive/leads/not-reachable',
    icon: PhoneOff,
    card: 'bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 shadow-amber-500/30',
  },
  {
    key: 'qualified',
    label: 'Qualified',
    path: '/sales-executive/leads/qualified',
    icon: BadgeCheck,
    card: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 shadow-emerald-500/30',
  },
  {
    key: 'packageSent',
    label: 'Package Sent',
    path: '/sales-executive/leads/package-sent',
    icon: FileText,
    card: 'bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 shadow-indigo-500/30',
  },
  {
    key: 'followUp',
    label: 'Follow-up',
    path: '/sales-executive/leads/follow-up',
    icon: CalendarClock,
    card: 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-600 shadow-orange-500/30',
  },
  {
    key: 'booked',
    label: 'Booked',
    path: '/sales-executive/leads/converted',
    icon: Trophy,
    card: 'bg-gradient-to-br from-emerald-600 via-green-500 to-teal-600 shadow-emerald-600/30',
  },
  {
    key: 'postponed',
    label: 'Postponed',
    path: '/sales-executive/leads/postponed',
    icon: PauseCircle,
    card: 'bg-gradient-to-br from-slate-500 via-zinc-500 to-neutral-600 shadow-slate-500/30',
  },
  {
    key: 'lost',
    label: 'Lost',
    path: '/sales-executive/leads/lost',
    icon: XCircle,
    card: 'bg-gradient-to-br from-rose-600 via-red-500 to-orange-600 shadow-rose-500/30',
  },
];

function getCount(counts, key) {
  if (!counts) return 0;
  // fresh = today's new (legacy key `new`); booked prefers booked then converted
  if (key === 'fresh') return counts.leads?.fresh ?? counts.leads?.new ?? 0;
  if (key === 'booked') return counts.leads?.booked ?? counts.leads?.converted ?? 0;
  return counts.leads?.[key] ?? 0;
}

export default function ExecutiveLeadKpiStrip() {
  const counts = useSidebarCounts();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 w-full">
      {CARDS.map(({ key, label, path, icon: Icon, card }, i) => {
        const value = getCount(counts, key);
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
                'relative block cursor-pointer overflow-hidden rounded-xl p-2.5 min-h-[76px] shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg text-white',
                card
              )}
            >
              <div className="pointer-events-none absolute -right-4 -top-4 h-14 w-14 rounded-full bg-white/15" />
              <div className="relative z-[1]">
                <div className="mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                </div>
                <p className="text-[10px] font-semibold leading-tight text-white/85">{label}</p>
                <p className="mt-0.5 text-xl font-bold tabular-nums leading-none tracking-tight">
                  {value}
                </p>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

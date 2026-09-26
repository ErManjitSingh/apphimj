import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  CalendarClock,
  Phone,
  Trophy,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

const CARDS = [
  {
    key: 'myLeads',
    label: 'Total Leads',
    icon: Users,
    iconWrap: 'bg-[#5D5FEF]/10 text-[#5D5FEF]',
    rail: 'bg-[#5D5FEF]',
    path: '/sales-executive/leads/all',
  },
  {
    key: 'hotLeads',
    label: 'Hot Leads',
    icon: Flame,
    iconWrap: 'bg-rose-50 text-rose-500',
    rail: 'bg-rose-400',
    path: '/sales-executive/leads/hot',
  },
  {
    key: 'todayFollowups',
    label: 'Follow-ups Today',
    icon: CalendarClock,
    iconWrap: 'bg-sky-50 text-sky-500',
    rail: 'bg-sky-400',
    path: '/sales-executive/follow-ups',
  },
  {
    key: 'connectedLeads',
    label: 'Connected',
    icon: Phone,
    iconWrap: 'bg-emerald-50 text-emerald-500',
    rail: 'bg-emerald-500',
    path: '/sales-executive/leads/contacted',
  },
  {
    key: 'convertedLeads',
    label: 'Booked',
    icon: Trophy,
    iconWrap: 'bg-emerald-50 text-emerald-600',
    rail: 'bg-emerald-500',
    path: '/sales-executive/leads/converted',
  },
];

function TrendLine({ trend }) {
  if (!trend) {
    return <p className="mt-1 text-[11px] font-medium text-emerald-500">+0% vs last week</p>;
  }
  const change = Number(trend.change || 0);
  const Icon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const tone =
    change > 0 ? 'text-emerald-500' : change < 0 ? 'text-rose-500' : 'text-slate-400';
  return (
    <p className={`mt-1 flex items-center gap-1 text-[11px] font-medium ${tone}`}>
      <Icon className="h-3 w-3" />
      {change > 0 ? '+' : ''}
      {change}% {trend.period || 'vs last week'}
    </p>
  );
}

export default function ExecutiveHeroKpis({ kpis, trends }) {
  if (!kpis) return null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {CARDS.map(({ key, label, icon: Icon, iconWrap, rail, path }, index) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
        >
          <Link
            to={path}
            className="group relative flex h-full items-start gap-3 overflow-hidden rounded-2xl border border-slate-100/90 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md"
          >
            <span
              className={`absolute inset-y-0 left-0 w-[3px] rounded-l-2xl opacity-70 transition-opacity group-hover:opacity-100 ${rail}`}
            />
            <div className={`ml-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}>
              <Icon className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-slate-500">{label}</p>
              <p className="mt-0.5 text-[22px] font-bold tabular-nums tracking-tight text-slate-900">
                {kpis[key] ?? 0}
              </p>
              <TrendLine trend={trends?.[key]} />
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

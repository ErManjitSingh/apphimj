import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  CalendarClock,
  Phone,
  Handshake,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

const CARDS = [
  {
    key: 'myLeads',
    label: 'Total Leads',
    icon: Users,
    iconWrap: 'bg-orange-50 text-orange-500',
    path: '/sales-executive/leads/all',
  },
  {
    key: 'todayFollowups',
    label: 'Follow-ups Today',
    icon: CalendarClock,
    iconWrap: 'bg-sky-50 text-sky-500',
    path: '/sales-executive/follow-ups',
  },
  {
    key: 'connectedLeads',
    label: 'Connected',
    icon: Phone,
    iconWrap: 'bg-emerald-50 text-emerald-500',
    path: '/sales-executive/leads/contacted',
  },
  {
    key: 'workingProgress',
    label: 'Meetings',
    icon: Handshake,
    iconWrap: 'bg-violet-50 text-violet-500',
    path: '/sales-executive/leads/working-progress',
  },
  {
    key: 'convertedLeads',
    label: 'Converted',
    icon: Trophy,
    iconWrap: 'bg-rose-50 text-rose-500',
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
      {CARDS.map(({ key, label, icon: Icon, iconWrap, path }, index) => (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
        >
          <Link
            to={path}
            className="flex h-full items-start gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-slate-500">{label}</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
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

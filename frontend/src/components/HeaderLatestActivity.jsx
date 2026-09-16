import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ChevronDown,
  FileText,
  LogIn,
  LogOut,
  Pencil,
  Shield,
  UserPlus,
} from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from './ui/dropdown-menu';
import { cn } from '../lib/utils';

const TYPE_META = {
  login: { icon: LogIn, wrap: 'bg-emerald-500/15 text-emerald-600', label: 'Login' },
  logout: { icon: LogOut, wrap: 'bg-slate-500/15 text-slate-600', label: 'Logout' },
  lead_created: { icon: UserPlus, wrap: 'bg-orange-500/15 text-orange-600', label: 'New lead' },
  lead_updated: { icon: Pencil, wrap: 'bg-violet-500/15 text-violet-600', label: 'Lead update' },
  quotation_created: { icon: FileText, wrap: 'bg-amber-500/15 text-amber-600', label: 'Quotation' },
  user_action: { icon: Shield, wrap: 'bg-rose-500/15 text-rose-600', label: 'Team' },
};

function typeMeta(type) {
  return TYPE_META[type] || { icon: Activity, wrap: 'bg-sky-500/15 text-sky-600', label: 'Activity' };
}

function timeAgo(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const mins = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function normalizeLog(log) {
  const leadId = log.meta?.leadId || log.leadId;
  return {
    id: String(log._id || `${log.type}-${log.date || log.createdAt}`),
    type: log.type || 'user_action',
    user: log.user || 'Team',
    action: log.action || typeMeta(log.type).label,
    target: log.target && log.target !== '—' ? log.target : '',
    date: log.date || log.createdAt,
    href: leadId ? `/leads/${leadId}` : log.type?.startsWith('quotation') ? '/quotations' : '/leads',
  };
}

function ActivityLine({ item, compact = false }) {
  const meta = typeMeta(item.type);
  const Icon = meta.icon;
  return (
    <div className={cn('flex min-w-0 items-center gap-2', compact && 'gap-1.5')}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md',
          compact ? 'h-5 w-5' : 'h-7 w-7',
          meta.wrap
        )}
      >
        <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </span>
      <p className={cn('min-w-0 flex-1 truncate text-slate-700', compact ? 'text-[12px] leading-none' : 'text-[13px]')}>
        <span className="font-semibold text-slate-800">{item.user}</span>{' '}
        <span className="text-slate-500">{item.action}</span>
        {item.target ? <span className="font-medium text-orange-600"> · {item.target}</span> : null}
      </p>
      <span className={cn('shrink-0 font-medium text-slate-400', compact ? 'text-[10px]' : 'text-[11px]')}>
        {timeAgo(item.date)}
      </span>
    </div>
  );
}

export default function HeaderLatestActivity() {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const { data: logs = [] } = useQuery({
    queryKey: ['header-activity'],
    queryFn: async () => {
      const { data } = await API.get('/activity-logs', {
        skipSuccessToast: true,
        skipErrorToast: true,
      });
      const rows = Array.isArray(data) ? data : [];
      if (rows.length) return rows.slice(0, 12).map(normalizeLog);

      const leadsRes = await API.get('/leads', {
        params: { page: 1, limit: 6 },
        skipSuccessToast: true,
        skipErrorToast: true,
      });
      const leads = leadsRes.data?.data || leadsRes.data?.leads || [];
      return (Array.isArray(leads) ? leads : []).slice(0, 6).map((lead) =>
        normalizeLog({
          _id: lead._id,
          type: 'lead_created',
          user: lead.assignedTo?.name || 'System',
          action: 'New lead',
          target: lead.name,
          createdAt: lead.createdAt,
          meta: { leadId: lead._id },
        })
      );
    },
    enabled: Boolean(user),
    refetchInterval: 25000,
    staleTime: 15000,
  });

  const items = useMemo(() => logs, [logs]);

  useEffect(() => {
    if (paused || items.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [paused, items.length]);

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [index, items.length]);

  const current = items[index];
  const canViewTeam = user?.role === 'admin';

  return (
    <DropdownMenuRoot>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className={cn(
            'group relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg',
            'h-8 px-2 sm:px-2.5 text-left',
            'bg-white/75 ring-1 ring-orange-100/90',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]',
            'transition hover:ring-orange-200 hover:bg-orange-50/60',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40'
          )}
        >
          <span className="pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-orange-400 to-amber-500" />
          <span className="hidden shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 ring-1 ring-emerald-100 sm:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              Live
            </span>
          </span>
          <div className="min-w-0 flex-1">
            {current ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                >
                  <ActivityLine item={current} compact />
                </motion.div>
              </AnimatePresence>
            ) : (
              <p className="truncate text-[12px] text-slate-400">No activity yet today</p>
            )}
          </div>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 transition group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(440px,calc(100vw-2rem))] p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-orange-50 to-white px-3.5 py-2.5">
          <div>
            <p className="text-[13px] font-semibold text-slate-900">Latest activity</p>
            <p className="text-[11px] text-slate-400">Live team updates from the last 24 hours</p>
          </div>
          {canViewTeam && (
            <Link
              to="/teams"
              className="text-[11px] font-semibold text-orange-600 hover:underline"
            >
              View all
            </Link>
          )}
        </div>
        <div className="max-h-[360px] overflow-y-auto py-1">
          {items.length ? (
            items.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="block px-3.5 py-2.5 hover:bg-orange-50/70"
              >
                <ActivityLine item={item} />
              </Link>
            ))
          ) : (
            <p className="px-4 py-8 text-center text-sm text-slate-400">No recent activity</p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenuRoot>
  );
}

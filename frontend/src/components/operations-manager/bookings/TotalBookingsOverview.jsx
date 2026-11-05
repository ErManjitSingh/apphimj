import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Ban,
  CheckCircle2,
  CircleCheck,
  Clock,
  Plane,
  Ticket,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatINRCompact } from './bookingListUtils';

const PIPELINE = [
  {
    key: 'statusPending',
    label: 'Pending',
    to: '/operations-manager/bookings/pending',
    icon: Clock,
    accent: 'from-amber-500/15 to-amber-500/5',
    bar: 'bg-amber-500',
    text: 'text-amber-700',
  },
  {
    key: 'statusConfirmed',
    label: 'Confirmed',
    to: '/operations-manager/bookings/confirmed',
    icon: CheckCircle2,
    accent: 'from-teal-500/15 to-teal-500/5',
    bar: 'bg-teal-500',
    text: 'text-teal-700',
  },
  {
    key: 'statusActive',
    label: 'On Trip',
    to: '/operations-manager/bookings/active',
    icon: Plane,
    accent: 'from-emerald-500/15 to-emerald-500/5',
    bar: 'bg-emerald-500',
    text: 'text-emerald-700',
  },
  {
    key: 'statusCompleted',
    label: 'Completed',
    to: '/operations-manager/bookings/completed',
    icon: CircleCheck,
    accent: 'from-slate-500/15 to-slate-500/5',
    bar: 'bg-slate-500',
    text: 'text-slate-700',
  },
  {
    key: 'statusCancelled',
    label: 'Cancelled',
    to: '/operations-manager/bookings/cancelled',
    icon: Ban,
    accent: 'from-rose-500/15 to-rose-500/5',
    bar: 'bg-rose-500',
    text: 'text-rose-700',
  },
];

function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

export default function TotalBookingsOverview({ summary, loading }) {
  const total = summary?.count || 0;
  const collected = summary?.advanceReceived || 0;
  const pendingPay = summary?.pendingAmount || 0;
  const revenue = summary?.totalAmount || 0;

  if (loading && !summary) {
    return (
      <div className="mb-5 rounded-2xl border border-subtle bg-white p-5 animate-pulse h-40" />
    );
  }

  if (!summary) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 overflow-hidden rounded-2xl border border-subtle bg-white shadow-sm"
    >
      <div className="relative px-5 pt-5 pb-4 border-b border-subtle/80 bg-gradient-to-br from-sky-50/80 via-white to-teal-50/40">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Ticket className="w-5 h-5" strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700/80">
                Portfolio overview
              </p>
              <p className="text-2xl font-bold text-content-primary metric-tabular tracking-tight">
                {total.toLocaleString('en-IN')}{' '}
                <span className="text-base font-semibold text-content-muted">bookings</span>
              </p>
              <p className="text-sm text-content-secondary mt-0.5">
                Full pipeline across pending setup → trip → closure
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 min-w-0 lg:max-w-xl w-full lg:w-auto">
            <div className="rounded-xl bg-white/80 border border-subtle px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-content-muted">Revenue</p>
              <p className="text-sm font-bold text-content-primary metric-tabular mt-0.5">
                {formatINRCompact(revenue)}
              </p>
            </div>
            <div className="rounded-xl bg-white/80 border border-subtle px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-content-muted">Collected</p>
              <p className="text-sm font-bold text-emerald-700 metric-tabular mt-0.5">
                {formatINRCompact(collected)}
              </p>
            </div>
            <div className="rounded-xl bg-white/80 border border-subtle px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-content-muted">Pending pay</p>
              <p className="text-sm font-bold text-amber-700 metric-tabular mt-0.5">
                {formatINRCompact(pendingPay)}
              </p>
            </div>
          </div>
        </div>

        {total > 0 && (
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
            {PIPELINE.map((stage) => {
              const n = summary[stage.key] || 0;
              if (!n) return null;
              return (
                <div
                  key={stage.key}
                  className={cn('h-full transition-all', stage.bar)}
                  style={{ width: `${pct(n, total)}%` }}
                  title={`${stage.label}: ${n}`}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 divide-x divide-y xl:divide-y-0 divide-subtle">
        {PIPELINE.map((stage, i) => {
          const Icon = stage.icon;
          const n = summary[stage.key] || 0;
          return (
            <Link
              key={stage.key}
              to={stage.to}
              className={cn(
                'group relative px-4 py-3.5 bg-gradient-to-b hover:bg-slate-50/80 transition-colors',
                stage.accent
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', stage.text)}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
                  {stage.label}
                </span>
                <span className="text-[10px] font-bold text-content-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  Open →
                </span>
              </div>
              <p className="text-xl font-bold text-content-primary metric-tabular leading-none">
                {n.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] text-content-muted mt-1">
                {pct(n, total)}% of portfolio
              </p>
              <span
                className={cn(
                  'absolute inset-x-3 bottom-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-full',
                  stage.bar
                )}
                style={{ animationDelay: `${i * 40}ms` }}
              />
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}

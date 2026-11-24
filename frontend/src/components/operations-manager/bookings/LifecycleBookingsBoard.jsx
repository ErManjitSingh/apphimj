import { motion } from 'framer-motion';
import {
  Ban,
  CalendarClock,
  MessageCircle,
  PauseCircle,
  Phone,
  Wallet,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatINR, formatPax } from '../operationsUtils';
import { BOOKING_STATUS_CONFIG } from '../constants';
import {
  formatTravelDateWithDay,
  getAvatarColor,
  getDestinationFlag,
  getInitials,
} from './bookingListUtils';

function formatHoldDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysSince(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}

function resolveReason(booking, mode) {
  if (mode === 'postponed') {
    return String(booking.postponedReason || booking.leadPostponedReason || '').trim();
  }
  return String(booking.cancelReason || booking.leadCancelReason || '').trim();
}

function resolveEventAt(booking, mode) {
  if (mode === 'postponed') {
    return booking.postponedAt || booking.updatedAt || booking.createdAt;
  }
  return booking.cancelledAt || booking.updatedAt || booking.createdAt;
}

function buildInsights(bookings, mode) {
  const withReason = bookings.filter((b) => resolveReason(b, mode)).length;
  const amount = bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);
  const due = bookings.reduce((sum, b) => sum + Number(b.pendingAmount || 0), 0);
  return { withReason, amount, due, total: bookings.length };
}

const THEME = {
  postponed: {
    Icon: PauseCircle,
    accent: 'amber',
    label: 'On hold',
    emptyTitle: 'No postponed bookings',
    emptyDesc: 'When a tour is postponed, it will land here with the reason and hold date.',
    rail: 'from-amber-400 to-orange-500',
    shell: 'border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40',
    chip: 'bg-amber-100 text-amber-900 ring-amber-200/80',
    reasonBox: 'border-amber-200/80 bg-amber-50/90 text-amber-950',
    reasonLabel: 'Postponed reason',
    insight: 'bg-amber-500/10 text-amber-900 ring-amber-200/70',
    cta: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  cancelled: {
    Icon: Ban,
    accent: 'rose',
    label: 'Cancelled',
    emptyTitle: 'No cancelled bookings',
    emptyDesc: 'Cancelled or refunded tours will show here with the closure reason.',
    rail: 'from-rose-400 to-rose-600',
    shell: 'border-rose-200/70 bg-gradient-to-br from-rose-50/90 via-white to-rose-50/30',
    chip: 'bg-rose-100 text-rose-900 ring-rose-200/80',
    reasonBox: 'border-rose-200/80 bg-rose-50/90 text-rose-950',
    reasonLabel: 'Cancellation reason',
    insight: 'bg-rose-500/10 text-rose-900 ring-rose-200/70',
    cta: 'bg-rose-600 hover:bg-rose-700 text-white',
  },
};

function InsightPill({ label, value, hint }) {
  return (
    <div className="min-w-[120px] rounded-2xl border border-white/70 bg-white/80 px-3.5 py-2.5 shadow-sm backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-content-muted">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums text-content-primary leading-tight">{value}</p>
      {hint ? <p className="text-[11px] text-content-muted mt-0.5">{hint}</p> : null}
    </div>
  );
}

function LifecycleCard({ booking, mode, onOpen, index }) {
  const theme = THEME[mode];
  const reason = resolveReason(booking, mode);
  const eventAt = resolveEventAt(booking, mode);
  const heldDays = daysSince(eventAt);
  const statusCfg = BOOKING_STATUS_CONFIG[booking.status] || BOOKING_STATUS_CONFIG.pending;
  const phoneDigits = String(booking.customerPhone || '').replace(/\D/g, '');

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.24) }}
      onClick={() => onOpen(booking)}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_rgba(15,23,42,0.05)] transition duration-200',
        'hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(15,23,42,0.1)]',
        theme.shell
      )}
    >
      <div className={cn('absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b', theme.rail)} />

      <div className="pl-5 pr-4 py-4 sm:pl-6 sm:pr-5 sm:py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch xl:gap-5">
          {/* Customer + booking */}
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm',
                getAvatarColor(booking.customerName)
              )}
            >
              {getInitials(booking.customerName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-[15px] font-bold text-content-primary">
                  {booking.customerName || 'Customer'}
                </h3>
                <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1', theme.chip)}>
                  {theme.label}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-secondary">
                <span className="font-mono font-semibold text-sky-700">{booking.bookingNumber}</span>
                {booking.customerPhone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3 opacity-70" />
                    {booking.customerPhone}
                  </span>
                ) : null}
                {phoneDigits ? (
                  <a
                    href={`https://wa.me/${phoneDigits}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-600"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className={cn('rounded-md px-2 py-0.5 font-semibold ring-1 ring-inset', statusCfg.className)}>
                  {statusCfg.label}
                </span>
                {heldDays != null ? (
                  <span className="rounded-md bg-white/80 px-2 py-0.5 font-semibold text-content-secondary ring-1 ring-black/5">
                    {heldDays === 0 ? 'Updated today' : `${heldDays}d on this list`}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Trip */}
          <div className="min-w-[180px] rounded-xl border border-white/80 bg-white/70 px-3.5 py-3 xl:w-[210px]">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-content-primary">
              <span className="text-base leading-none">{getDestinationFlag(booking.destination)}</span>
              <span className="truncate">{booking.destination || 'Destination TBD'}</span>
            </p>
            <p className="mt-1 truncate text-[11px] text-content-muted">
              {booking.packageName || 'Custom package'}
            </p>
            <div className="mt-2 space-y-1 text-[11px] text-content-secondary">
              <p className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 opacity-70" />
                {formatTravelDateWithDay(booking.travelDate || booking.travelStart, 'parentheses')}
              </p>
              <p className="pl-5 text-content-muted">{formatPax(booking)}</p>
            </div>
          </div>

          {/* Reason — hero info */}
          <div className={cn('min-w-0 flex-[1.2] rounded-xl border px-3.5 py-3', theme.reasonBox)}>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-70">
              {theme.reasonLabel}
            </p>
            {reason ? (
              <p className="mt-1.5 text-sm font-medium leading-snug line-clamp-3" title={reason}>
                {reason}
              </p>
            ) : (
              <p className="mt-1.5 text-sm italic opacity-60">No reason recorded yet</p>
            )}
            {formatHoldDate(eventAt) ? (
              <p className="mt-2 text-[11px] opacity-70">
                {mode === 'postponed' ? 'Held since' : 'Closed on'} {formatHoldDate(eventAt)}
              </p>
            ) : null}
          </div>

          {/* Money + CTA */}
          <div className="flex min-w-[150px] flex-col justify-between gap-3 xl:w-[170px] xl:items-end">
            <div className="xl:text-right">
              <p className="text-base font-bold tabular-nums text-content-primary">
                {formatINR(booking.totalAmount)}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                <Wallet className="h-3 w-3" />
                Adv {formatINR(booking.advanceReceived || 0)}
              </p>
              {Number(booking.pendingAmount) > 0 ? (
                <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                  Due {formatINR(booking.pendingAmount)}
                </p>
              ) : booking.paymentStatus === 'paid' ? (
                <p className="mt-0.5 text-[11px] text-content-muted">Fully paid</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(booking);
              }}
              className={cn(
                'inline-flex h-9 items-center justify-center rounded-xl px-3.5 text-xs font-bold transition',
                theme.cta
              )}
            >
              Open booking
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function LifecycleBookingsBoard({
  mode = 'postponed',
  bookings = [],
  loading = false,
  total = 0,
  onOpen,
}) {
  const theme = THEME[mode] || THEME.postponed;
  const Icon = theme.Icon;
  const insights = buildInsights(bookings, mode);

  if (loading) {
    return (
      <div className="space-y-3 p-4 sm:p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[132px] animate-pulse rounded-2xl bg-slate-100/80" />
        ))}
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-20 text-center">
        <div className={cn('rounded-2xl p-4 ring-1', theme.insight)}>
          <Icon className="h-8 w-8" />
        </div>
        <div>
          <p className="font-semibold text-content-primary">{theme.emptyTitle}</p>
          <p className="mt-1 max-w-sm text-sm text-content-muted">{theme.emptyDesc}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3',
          theme.shell
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn('rounded-xl p-2.5 ring-1', theme.insight)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-content-primary">
              {mode === 'postponed' ? 'Hold portfolio' : 'Closure portfolio'}
            </p>
            <p className="text-xs text-content-muted">
              Showing {bookings.length} of {Number(total || bookings.length).toLocaleString('en-IN')} · reason and money at a glance
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <InsightPill label="On list" value={insights.total} />
          <InsightPill
            label="With reason"
            value={insights.withReason}
            hint={insights.total ? `${Math.round((insights.withReason / insights.total) * 100)}% filled` : undefined}
          />
          <InsightPill label="Package value" value={formatINR(insights.amount)} />
          {insights.due > 0 ? <InsightPill label="Still due" value={formatINR(insights.due)} /> : null}
        </div>
      </div>

      <div className="space-y-3">
        {bookings.map((booking, index) => (
          <LifecycleCard
            key={booking._id || booking.bookingNumber || index}
            booking={booking}
            mode={mode}
            index={index}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

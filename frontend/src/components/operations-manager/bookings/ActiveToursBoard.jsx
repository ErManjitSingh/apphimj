import { motion } from 'framer-motion';
import {
  Building2,
  CalendarDays,
  Car,
  MessageCircle,
  Phone,
  Plane,
  Sparkles,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatINR, formatPax } from '../operationsUtils';
import {
  formatActiveTravelDate,
  formatCompletedReturnDate,
  getAvatarColor,
  getDestinationFlag,
  getInitials,
  getPrimaryCabLabel,
  getPrimaryHotelName,
  resolveActiveTripStatus,
} from './bookingListUtils';

function toDay(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function tripProgress(booking) {
  const start = toDay(booking.travelDate || booking.travelStart);
  const end = toDay(booking.returnDate || booking.travelEnd);
  const today = toDay(new Date());
  if (!start || !end || !today) return null;

  const totalMs = end - start;
  const totalDays = Math.max(1, Math.round(totalMs / 86400000) + 1);
  const elapsedRaw = Math.floor((today - start) / 86400000) + 1;
  const dayIndex = Math.min(totalDays, Math.max(1, elapsedRaw));
  const remaining = Math.max(0, Math.round((end - today) / 86400000));
  const pct = Math.round((dayIndex / totalDays) * 100);
  const nights = Math.max(0, totalDays - 1);

  let phase = 'traveling';
  if (today.getTime() === start.getTime()) phase = 'arrival';
  else if (today.getTime() === end.getTime()) phase = 'departure';
  else if (today > end) phase = 'wrapping';

  return {
    dayIndex,
    totalDays,
    remaining,
    pct: Math.min(100, Math.max(4, pct)),
    nights,
    durationLabel: `${totalDays}D / ${nights}N`,
    phase,
  };
}

function buildInsights(bookings) {
  const amount = bookings.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
  const due = bookings.reduce((s, b) => s + Number(b.pendingAmount || 0), 0);
  const guests = bookings.reduce(
    (s, b) => s + Number(b.adults || 0) + Number(b.children || 0),
    0
  );
  const hotelsOk = bookings.filter((b) => b.hotelConfirmation === 'confirmed').length;
  const cabsOk = bookings.filter((b) => b.cabConfirmation === 'confirmed').length;
  const returningSoon = bookings.filter((b) => {
    const p = tripProgress(b);
    return p && p.remaining <= 1;
  }).length;
  const destinations = new Set(
    bookings.map((b) => String(b.destination || '').trim()).filter(Boolean)
  ).size;

  return { total: bookings.length, amount, due, guests, hotelsOk, cabsOk, returningSoon, destinations };
}

function ConfirmPill({ ok, label, detail, icon: Icon }) {
  return (
    <div
      className={cn(
        'rounded-xl border px-2.5 py-2',
        ok
          ? 'border-emerald-200/80 bg-emerald-50/90 text-emerald-900'
          : 'border-amber-200/80 bg-amber-50/80 text-amber-950'
      )}
    >
      <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide opacity-70">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-semibold" title={detail || undefined}>
        {detail || (ok ? 'Confirmed' : 'Pending')}
      </p>
    </div>
  );
}

function InsightPill({ label, value, hint }) {
  return (
    <div className="min-w-[110px] rounded-2xl border border-white/70 bg-white/85 px-3.5 py-2.5 shadow-sm backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-content-muted">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums leading-tight text-content-primary">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-content-muted">{hint}</p> : null}
    </div>
  );
}

function phaseLabel(phase) {
  if (phase === 'arrival') return { text: 'Arriving today', className: 'bg-violet-100 text-violet-900 ring-violet-200/80' };
  if (phase === 'departure') return { text: 'Returning today', className: 'bg-rose-100 text-rose-900 ring-rose-200/80' };
  if (phase === 'wrapping') return { text: 'Wrap-up', className: 'bg-slate-100 text-slate-700 ring-slate-200/80' };
  return { text: 'On ground', className: 'bg-sky-100 text-sky-900 ring-sky-200/80' };
}

function ActiveCard({ booking, index, onOpen }) {
  const phoneDigits = String(booking.customerPhone || '').replace(/\D/g, '');
  const tripStatus = resolveActiveTripStatus(booking);
  const progress = tripProgress(booking);
  const hotelOk = booking.hotelConfirmation === 'confirmed';
  const cabOk = booking.cabConfirmation === 'confirmed';
  const phase = phaseLabel(progress?.phase);
  const statusChip =
    booking.status === 'confirmed'
      ? { label: 'Confirmed · live', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80' }
      : tripStatus;

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.24) }}
      onClick={() => onOpen(booking)}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl border border-sky-200/70',
        'bg-gradient-to-br from-sky-50/95 via-white to-cyan-50/40',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_rgba(14,165,233,0.1)]',
        'transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(14,165,233,0.18)]'
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-sky-400 to-cyan-600" />

      <div className="pl-5 pr-4 py-4 sm:pl-6 sm:pr-5 sm:py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch xl:gap-5">
          {/* Guest */}
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              className={cn(
                'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm',
                getAvatarColor(booking.customerName)
              )}
            >
              {getInitials(booking.customerName)}
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 ring-2 ring-white">
                <Plane className="h-3 w-3 text-white" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-[15px] font-bold text-content-primary">
                  {booking.customerName || 'Guest'}
                </h3>
                <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1', phase.className)}>
                  {phase.text}
                </span>
                <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold ring-1', statusChip.className)}>
                  {statusChip.label}
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
              {booking.executiveName ? (
                <p className="mt-1.5 text-[11px] text-content-muted">SE · {booking.executiveName}</p>
              ) : null}
            </div>
          </div>

          {/* Trip window + progress */}
          <div className="min-w-[220px] rounded-xl border border-white/80 bg-white/80 px-3.5 py-3 xl:w-[250px]">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-content-primary">
              <span className="text-base leading-none">{getDestinationFlag(booking.destination)}</span>
              <span className="truncate">{booking.destination || 'Destination'}</span>
            </p>
            <p className="mt-1 truncate text-[11px] text-content-muted">
              {booking.packageName || 'Custom package'}
            </p>
            <div className="mt-2 space-y-1 text-[11px] text-content-secondary">
              <p className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-sky-600" />
                Start {formatActiveTravelDate(booking.travelDate || booking.travelStart)}
              </p>
              <p className="pl-5 text-content-muted">
                Return {formatCompletedReturnDate(booking.returnDate || booking.travelEnd)}
                {progress ? ` · ${progress.durationLabel}` : ''}
              </p>
              <p className="inline-flex items-center gap-1.5 pl-5 text-content-muted">
                <Users className="h-3 w-3" />
                {formatPax(booking)}
              </p>
            </div>

            {progress ? (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-content-muted">
                  <span>
                    Day {progress.dayIndex} of {progress.totalDays}
                  </span>
                  <span>
                    {progress.remaining === 0
                      ? 'Returns today'
                      : `${progress.remaining} day${progress.remaining === 1 ? '' : 's'} left`}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-sky-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all"
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* Ops fulfilment */}
          <div className="grid min-w-[200px] flex-1 grid-cols-2 gap-2 xl:max-w-[280px]">
            <ConfirmPill
              ok={hotelOk}
              label="Hotel"
              detail={getPrimaryHotelName(booking)}
              icon={Building2}
            />
            <ConfirmPill
              ok={cabOk}
              label="Transport"
              detail={getPrimaryCabLabel(booking)}
              icon={Car}
            />
            <div className="col-span-2 rounded-xl border border-slate-200/80 bg-slate-50/90 px-2.5 py-2 text-slate-800">
              <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-content-muted">
                <Ticket className="h-3 w-3" />
                Voucher
              </p>
              <p className="mt-0.5 text-xs font-semibold capitalize">
                {String(booking.voucherStatus || 'pending').replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {/* Money + CTA */}
          <div className="flex min-w-[160px] flex-col justify-between gap-3 xl:w-[180px] xl:items-end">
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
                <p className="mt-0.5 text-[11px] text-content-muted">Fully settled</p>
              ) : null}
              {progress?.phase === 'departure' ? (
                <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                  <Sparkles className="h-3 w-3" />
                  Checkout / return today
                </p>
              ) : progress?.phase === 'arrival' ? (
                <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700">
                  <Sparkles className="h-3 w-3" />
                  First day on ground
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(booking);
              }}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-sky-600 px-3.5 text-xs font-bold text-white transition hover:bg-sky-700"
            >
              Open live tour
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function ActiveToursBoard({
  bookings = [],
  loading = false,
  total = 0,
  summary = null,
  onOpen,
}) {
  const pageInsights = buildInsights(bookings);
  const insights = {
    total: summary?.count ?? total ?? pageInsights.total,
    guests: summary?.totalPax ?? pageInsights.guests,
    amount: summary?.totalAmount ?? pageInsights.amount,
    due: summary?.pendingAmount ?? pageInsights.due,
    hotelsOk: summary?.hotelsConfirmed ?? pageInsights.hotelsOk,
    cabsOk: summary?.cabsConfirmed ?? pageInsights.cabsOk,
    returningSoon:
      summary?.returningToday != null ? summary.returningToday : pageInsights.returningSoon,
    destinations: pageInsights.destinations,
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4 sm:p-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-[168px] animate-pulse rounded-2xl bg-sky-50/80" />
        ))}
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-20 text-center">
        <div className="rounded-2xl bg-sky-500/10 p-4 ring-1 ring-sky-200/70">
          <Plane className="h-8 w-8 text-sky-700" />
        </div>
        <div>
          <p className="font-semibold text-content-primary">No active tours right now</p>
          <p className="mt-1 max-w-sm text-sm text-content-muted">
            Trips appear here while guests are on the ground — from travel start through return day.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50/90 via-white to-cyan-50/40 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-sky-500/10 p-2.5 ring-1 ring-sky-200/70">
            <Plane className="h-5 w-5 text-sky-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-content-primary">Live on-ground board</p>
            <p className="text-xs text-content-muted">
              Showing {bookings.length} of {Number(total || bookings.length).toLocaleString('en-IN')} ·
              day progress, hotel/cab & guest contact in one glance
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <InsightPill label="Active tours" value={insights.total} />
          <InsightPill label="Guests" value={insights.guests} />
          <InsightPill label="Destinations" value={insights.destinations} />
          <InsightPill
            label="Hotels OK"
            value={insights.hotelsOk}
            hint={`${insights.total ? Math.round((insights.hotelsOk / insights.total) * 100) : 0}% ready`}
          />
          <InsightPill
            label="Cabs OK"
            value={insights.cabsOk}
            hint={`${insights.total ? Math.round((insights.cabsOk / insights.total) * 100) : 0}% ready`}
          />
          {insights.returningSoon > 0 ? (
            <InsightPill label="Return today" value={insights.returningSoon} />
          ) : null}
          {insights.due > 0 ? <InsightPill label="Still due" value={formatINR(insights.due)} /> : null}
        </div>
      </div>

      <div className="space-y-3">
        {bookings.map((booking, index) => (
          <ActiveCard
            key={booking._id || booking.bookingNumber || index}
            booking={booking}
            index={index}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  );
}

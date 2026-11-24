import { motion } from 'framer-motion';
import {
  Building2,
  CalendarCheck2,
  Car,
  CheckCircle2,
  CircleCheck,
  MessageCircle,
  Phone,
  Sparkles,
  Ticket,
  Wallet,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatINR, formatPax } from '../operationsUtils';
import {
  formatCompletedReturnDate,
  formatTravelDateWithDay,
  getAvatarColor,
  getDestinationFlag,
  getInitials,
  getPrimaryCabLabel,
  getPrimaryHotelName,
  resolveListStatus,
} from './bookingListUtils';

function tripNights(booking) {
  const start = booking.travelDate || booking.travelStart;
  const end = booking.returnDate || booking.travelEnd;
  if (!start || !end) return null;
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const nights = Math.max(0, Math.round((b - a) / 86400000));
  const days = nights + 1;
  return `${days}D / ${nights}N`;
}

function profitOf(booking) {
  const c = booking.opsCosting || {};
  const packageCost = Number(c.packageCost || booking.totalAmount || 0);
  const cost = Number(c.hotelCost || 0) + Number(c.cabCost || 0) + Number(c.otherCost || 0);
  if (!packageCost && !cost) return null;
  const profit = packageCost - cost;
  const margin = packageCost > 0 ? Math.round((profit / packageCost) * 1000) / 10 : 0;
  return { profit, margin, packageCost };
}

function buildInsights(bookings) {
  const amount = bookings.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
  const due = bookings.reduce((s, b) => s + Number(b.pendingAmount || 0), 0);
  const collected = bookings.reduce(
    (s, b) => s + Number(b.advanceReceived || Math.max(0, Number(b.totalAmount || 0) - Number(b.pendingAmount || 0))),
    0
  );
  const withVoucher = bookings.filter((b) =>
    ['issued', 'redeemed', 'sent'].includes(String(b.voucherStatus || ''))
  ).length;
  const profitSum = bookings.reduce((s, b) => {
    const p = profitOf(b);
    return s + (p ? p.profit : 0);
  }, 0);
  return { total: bookings.length, amount, due, collected, withVoucher, profitSum };
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
      <p className="mt-0.5 text-xs font-semibold truncate" title={detail || undefined}>
        {detail || (ok ? 'Confirmed' : 'Pending')}
      </p>
    </div>
  );
}

function CompletedCard({ booking, index, onOpen }) {
  const phoneDigits = String(booking.customerPhone || '').replace(/\D/g, '');
  const status = resolveListStatus(booking, 'completed');
  const duration = tripNights(booking);
  const profit = profitOf(booking);
  const hotelOk = booking.hotelConfirmation === 'confirmed';
  const cabOk = booking.cabConfirmation === 'confirmed';

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.24) }}
      onClick={() => onOpen(booking)}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl border border-emerald-200/70',
        'bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40',
        'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_rgba(16,185,129,0.08)]',
        'transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(16,185,129,0.16)]'
      )}
    >
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-emerald-400 to-teal-600" />

      <div className="pl-5 pr-4 py-4 sm:pl-6 sm:pr-5 sm:py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch xl:gap-5">
          {/* Customer */}
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div
              className={cn(
                'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm',
                getAvatarColor(booking.customerName)
              )}
            >
              {getInitials(booking.customerName)}
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                <CheckCircle2 className="h-3 w-3 text-white" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-[15px] font-bold text-content-primary">
                  {booking.customerName || 'Guest'}
                </h3>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-900 ring-1 ring-emerald-200/80">
                  Completed
                </span>
                <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold ring-1', status.className)}>
                  {status.label}
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

          {/* Trip window */}
          <div className="min-w-[200px] rounded-xl border border-white/80 bg-white/75 px-3.5 py-3 xl:w-[230px]">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-content-primary">
              <span className="text-base leading-none">{getDestinationFlag(booking.destination)}</span>
              <span className="truncate">{booking.destination || 'Destination'}</span>
            </p>
            <p className="mt-1 truncate text-[11px] text-content-muted">
              {booking.packageName || 'Custom package'}
            </p>
            <div className="mt-2 space-y-1 text-[11px] text-content-secondary">
              <p className="inline-flex items-center gap-1.5">
                <CalendarCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                {formatTravelDateWithDay(booking.travelDate || booking.travelStart, 'parentheses')}
              </p>
              <p className="pl-5 text-content-muted">
                Return {formatCompletedReturnDate(booking.returnDate || booking.travelEnd)}
                {duration ? ` · ${duration}` : ''}
              </p>
              <p className="pl-5 text-content-muted">{formatPax(booking)}</p>
            </div>
          </div>

          {/* Fulfillment */}
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
              {profit ? (
                <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <Sparkles className="h-3 w-3" />
                  Profit {formatINR(profit.profit)} · {profit.margin}%
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(booking);
              }}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white transition hover:bg-emerald-700"
            >
              Open tour file
            </button>
          </div>
        </div>
      </div>
    </motion.article>
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

export default function CompletedToursBoard({
  bookings = [],
  loading = false,
  total = 0,
  summary = null,
  onOpen,
}) {
  const pageInsights = buildInsights(bookings);
  // Prefer API rollup (all completed tours) over current page only.
  const insights = {
    total: summary?.count ?? total ?? pageInsights.total,
    amount: summary?.packageRevenue ?? summary?.totalAmount ?? pageInsights.amount,
    due: summary?.pendingAmount ?? pageInsights.due,
    collected: summary?.advanceReceived ?? pageInsights.collected,
    withVoucher: summary?.vouchersIssued ?? pageInsights.withVoucher,
    profitSum: summary?.profitAmount ?? pageInsights.profitSum,
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4 sm:p-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[140px] animate-pulse rounded-2xl bg-emerald-50/80" />
        ))}
      </div>
    );
  }

  if (!bookings.length) {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-20 text-center">
        <div className="rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-200/70">
          <CircleCheck className="h-8 w-8 text-emerald-700" />
        </div>
        <div>
          <p className="font-semibold text-content-primary">No completed tours yet</p>
          <p className="mt-1 max-w-sm text-sm text-content-muted">
            Trips appear here once bookings are marked completed after successful travel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-2.5 ring-1 ring-emerald-200/70">
            <CircleCheck className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-content-primary">Completed portfolio</p>
            <p className="text-xs text-content-muted">
              Showing {bookings.length} of {Number(total || bookings.length).toLocaleString('en-IN')} ·
              travel closed, money & fulfilment at a glance
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <InsightPill label="Tours" value={insights.total} />
          <InsightPill label="Package value" value={formatINR(insights.amount)} />
          <InsightPill label="Collected" value={formatINR(insights.collected)} />
          {insights.due > 0 ? <InsightPill label="Still due" value={formatINR(insights.due)} /> : null}
          {insights.profitSum ? (
            <InsightPill label="Profit on file" value={formatINR(insights.profitSum)} />
          ) : null}
          <InsightPill
            label="Vouchers"
            value={insights.withVoucher}
            hint={`${insights.total ? Math.round((insights.withVoucher / insights.total) * 100) : 0}% ready`}
          />
        </div>
      </div>

      <div className="space-y-3">
        {bookings.map((booking, index) => (
          <CompletedCard
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

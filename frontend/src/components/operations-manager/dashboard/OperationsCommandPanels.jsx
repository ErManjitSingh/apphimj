import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  MapPin,
  Users,
} from 'lucide-react';
import BookingStatusBadge from '../bookings/BookingStatusBadge';
import { getAvatarColor, getInitials } from '../bookings/bookingListUtils';
import { formatDate, formatINR } from '../operationsUtils';
import { cn } from '../../../lib/utils';

const TOUR_THUMBS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=480&q=70',
  'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=480&q=70',
  'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=480&q=70',
  'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=480&q=70',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=480&q=70',
];

function paxCount(row) {
  return Number(row?.adults || 0) + Number(row?.children || 0) || Number(row?.pax || 0);
}

function PanelShell({ title, subtitle, to, children, delay = 0, accent = 'sky' }) {
  const accents = {
    sky: 'from-sky-50/80 via-white to-white border-sky-100',
    teal: 'from-teal-50/80 via-white to-white border-teal-100',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'flex min-h-[380px] flex-col overflow-hidden rounded-2xl border bg-gradient-to-b shadow-sm',
        accents[accent] || accents.sky
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100/80 px-5 py-4">
        <div>
          <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <Link
          to={to}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-orange-600 ring-1 ring-orange-100 transition hover:bg-orange-50"
        >
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="flex-1 p-3 sm:p-4">{children}</div>
    </motion.div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 text-center">
      <Icon className="mb-2 h-8 w-8 text-slate-300" />
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}

function RecentBookingCard({ booking, index }) {
  const pax = paxCount(booking);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.24) }}
    >
      <Link
        to={`/operations-manager/booking/${booking._id}`}
        className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
      >
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm',
            getAvatarColor(booking.customerName)
          )}
        >
          {getInitials(booking.customerName)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">
              {booking.customerName || 'Guest'}
            </p>
            <BookingStatusBadge status={booking.status} />
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {booking.packageName || booking.destination || 'Package TBD'}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 font-medium">
              <CalendarDays className="h-3 w-3 text-sky-500" />
              {formatDate(booking.travelDate || booking.travelStart)}
            </span>
            {pax > 0 ? (
              <span className="inline-flex items-center gap-1 font-medium">
                <Users className="h-3 w-3 text-violet-500" />
                {pax} pax
              </span>
            ) : null}
            {booking.destination ? (
              <span className="inline-flex items-center gap-1 font-medium">
                <MapPin className="h-3 w-3 text-teal-500" />
                {booking.destination}
              </span>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-mono text-[10px] font-bold text-orange-500">
            {booking.bookingNumber || '—'}
          </p>
          {booking.totalAmount != null ? (
            <p className="mt-1 text-xs font-bold tabular-nums text-slate-700">
              {formatINR(booking.totalAmount)}
            </p>
          ) : null}
        </div>
      </Link>
    </motion.div>
  );
}

function UpcomingTourCard({ tour, index }) {
  const pax = paxCount(tour);
  const hotelOk = tour.hotelConfirmation === 'confirmed';
  const cabOk = tour.cabConfirmation === 'confirmed';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.24) }}
    >
      <Link
        to={`/operations-manager/booking/${tour._id}`}
        className="group relative flex overflow-hidden rounded-xl border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
      >
        <div className="relative h-auto w-[88px] shrink-0 overflow-hidden sm:w-[104px]">
          <img
            src={TOUR_THUMBS[index % TOUR_THUMBS.length]}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
          <span className="absolute bottom-2 left-2 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
            {pax > 0 ? `${pax} pax` : 'Tour'}
          </span>
        </div>

        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {tour.packageName || `${tour.destination || 'Tour'} Package`}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{tour.customerName || 'Guest'}</p>
            </div>
            <BookingStatusBadge status={tour.status} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 font-medium">
              <MapPin className="h-3 w-3 text-teal-500" />
              {tour.destination || 'Destination TBD'}
            </span>
            <span className="inline-flex items-center gap-1 font-medium">
              <CalendarDays className="h-3 w-3 text-sky-500" />
              {formatDate(tour.travelDate)}
              {tour.returnDate ? ` → ${formatDate(tour.returnDate)}` : ''}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset',
                hotelOk
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-amber-50 text-amber-700 ring-amber-200'
              )}
            >
              Hotel {hotelOk ? 'OK' : 'Pending'}
            </span>
            <span
              className={cn(
                'rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset',
                cabOk
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-amber-50 text-amber-700 ring-amber-200'
              )}
            >
              Cab {cabOk ? 'OK' : 'Pending'}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function OperationsCommandPanels({ data }) {
  if (!data) return null;

  const recent = data.recentBookings || [];
  const upcoming = data.upcomingTrips || [];

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <PanelShell
        title="Recent Bookings"
        subtitle="Latest handoffs into operations"
        to="/operations-manager/bookings/all"
        delay={0.05}
        accent="sky"
      >
        {recent.length === 0 ? (
          <EmptyState icon={ClipboardList} text="No recent bookings yet" />
        ) : (
          <div className="space-y-2.5">
            {recent.slice(0, 6).map((booking, index) => (
              <RecentBookingCard key={booking._id} booking={booking} index={index} />
            ))}
          </div>
        )}
      </PanelShell>

      <PanelShell
        title="Upcoming Tours"
        subtitle="Next departures ready for ops setup"
        to="/operations-manager/trip-tracker?tab=upcoming"
        delay={0.1}
        accent="teal"
      >
        {upcoming.length === 0 ? (
          <EmptyState icon={MapPin} text="No upcoming tours scheduled" />
        ) : (
          <div className="space-y-2.5">
            {upcoming.slice(0, 5).map((tour, index) => (
              <UpcomingTourCard key={tour._id} tour={tour} index={index} />
            ))}
          </div>
        )}
      </PanelShell>
    </div>
  );
}

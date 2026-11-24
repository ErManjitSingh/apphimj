import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  CalendarDays,
  Car,
  MapPin,
  Phone,
  Plane,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import API from '../../api/axios';
import { cn } from '../../lib/utils';
import { formatINR } from './operationsUtils';
import { getAvatarColor, getInitials } from './bookings/bookingListUtils';

const FILTERS = [
  { key: 'all', label: 'All events', type: null, today: false },
  { key: 'arrivals-today', label: "Today's Arrivals", type: 'return', today: true },
  { key: 'departures-today', label: "Today's Departures", type: 'departure', today: true },
  { key: 'arrivals', label: 'All Arrivals', type: 'return', today: false },
  { key: 'departures', label: 'All Departures', type: 'departure', today: false },
];

function dayKey(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
}

function formatDayHeading(d) {
  const date = new Date(d);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (dayKey(date) === dayKey(today)) return 'Today';
  if (dayKey(date) === dayKey(tomorrow)) return 'Tomorrow';
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatEventDate(d) {
  if (!d) return '—';
  const x = new Date(d);
  return x.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
}

function modeFromParams(typeFilter, todayOnly) {
  if (todayOnly && typeFilter === 'return') return 'arrivals-today';
  if (todayOnly && typeFilter === 'departure') return 'departures-today';
  if (typeFilter === 'return') return 'arrivals';
  if (typeFilter === 'departure') return 'departures';
  return 'all';
}

function Hero({ mode, count, guests, destinations, pendingOps }) {
  const isArrival = mode.includes('arrival');
  const isDeparture = mode.includes('departure');
  const focused = isArrival || isDeparture;

  const tone = isArrival
    ? {
        wrap: 'from-sky-600 via-cyan-600 to-teal-700',
        chip: 'bg-white/15 text-white ring-white/25',
        icon: ArrowDownToLine,
        eyebrow: mode.includes('today') ? "Today's arrivals" : 'Guest arrivals',
        title: mode.includes('today') ? 'Arriving guests today' : 'Arrival board',
        blurb: 'Travel / check-in day — hotels, cabs and guest readiness at a glance.',
      }
    : isDeparture
      ? {
          wrap: 'from-amber-600 via-orange-600 to-rose-700',
          chip: 'bg-white/15 text-white ring-white/25',
          icon: ArrowUpFromLine,
          eyebrow: mode.includes('today') ? "Today's departures" : 'Guest departures',
          title: mode.includes('today') ? 'Departing guests today' : 'Departure board',
          blurb: 'Return / check-out day — settle dues, confirm drop and close the trip.',
        }
      : {
          wrap: 'from-slate-800 via-slate-700 to-teal-800',
          chip: 'bg-white/10 text-white ring-white/20',
          icon: CalendarDays,
          eyebrow: 'Operations calendar',
          title: 'Trip milestones',
          blurb: 'Arrivals, departures and travel windows for the ops floor.',
        };

  const Icon = tone.icon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-3xl bg-gradient-to-br px-5 py-6 text-white shadow-lg sm:px-7 sm:py-7',
        tone.wrap
      )}
    >
      <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 left-10 h-40 w-40 rounded-full bg-black/10 blur-2xl" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div
            className={cn(
              'mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ring-1 backdrop-blur-sm',
              tone.chip
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {tone.eyebrow}
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{tone.title}</h1>
          <p className="mt-2 max-w-xl text-sm text-white/80">{tone.blurb}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatPill label={focused ? 'Trips' : 'Events'} value={count} />
          <StatPill label="Guests" value={guests} />
          <StatPill label="Destinations" value={destinations} />
          <StatPill label="Ops pending" value={pendingOps} warn={pendingOps > 0} />
        </div>
      </div>
    </motion.section>
  );
}

function StatPill({ label, value, warn = false }) {
  return (
    <div className={cn('rounded-2xl px-3 py-2.5 ring-1 backdrop-blur-sm', warn ? 'bg-rose-500/20 ring-rose-200/30' : 'bg-white/10 ring-white/15')}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-white/70">{label}</p>
      <p className="mt-0.5 text-xl font-black tabular-nums">{Number(value || 0).toLocaleString('en-IN')}</p>
    </div>
  );
}

function ConfirmChip({ ok, label, detail, icon: Icon }) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl border px-2.5 py-2',
        ok
          ? 'border-emerald-200/80 bg-emerald-50/90 text-emerald-900'
          : 'border-amber-200/80 bg-amber-50/90 text-amber-950'
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

function EventCard({ event, index, onOpen }) {
  const isArrival = event.type === 'return';
  const hotelOk = event.hotelConfirmation === 'confirmed';
  const cabOk = event.cabConfirmation === 'confirmed';
  const phoneDigits = String(event.customerPhone || '').replace(/\D/g, '');
  const due = Number(event.pendingAmount || 0);
  const advance = Number(event.advanceReceived || 0);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.28) }}
      onClick={() => onOpen(event)}
      className={cn(
        'group cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(15,23,42,0.1)]',
        isArrival ? 'border-sky-200/80' : 'border-orange-200/80'
      )}
    >
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5',
          isArrival
            ? 'border-sky-100 bg-gradient-to-r from-sky-50/90 via-white to-cyan-50/50'
            : 'border-orange-100 bg-gradient-to-r from-orange-50/90 via-white to-amber-50/50'
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
              isArrival ? 'bg-sky-600 text-white' : 'bg-orange-600 text-white'
            )}
          >
            {isArrival ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
            {isArrival ? 'Arrival' : 'Departure'}
          </span>
          <span className="text-xs font-semibold text-content-muted">{formatEventDate(event.start)}</span>
        </div>
        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
          {event.bookingNumber || '—'}
        </span>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="flex gap-3">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white',
              getAvatarColor(event.customerName)
            )}
          >
            {getInitials(event.customerName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-content-primary">{event.customerName}</p>
            <p className="mt-0.5 inline-flex items-center gap-1 truncate text-sm text-content-secondary">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-teal-600" />
              {event.destination}
            </p>
            {event.packageName ? (
              <p className="mt-1 truncate text-xs text-content-muted">{event.packageName}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                <Users className="h-3 w-3" />
                {event.guests || (event.adults || 0) + (event.children || 0) || '—'} pax
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                <Plane className="h-3 w-3" />
                {formatEventDate(event.travelDate)} → {formatEventDate(event.returnDate)}
              </span>
              {event.executiveName ? (
                <span className="rounded-lg bg-violet-50 px-2 py-1 font-semibold text-violet-700 ring-1 ring-violet-100">
                  SE · {event.executiveName}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <ConfirmChip ok={hotelOk} label="Hotel" detail={event.hotelName} icon={Building2} />
            <ConfirmChip ok={cabOk} label="Cab" detail={event.cabLabel} icon={Car} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-content-muted">Money</p>
              <p className="text-sm font-bold text-content-primary">
                {formatINR(event.totalAmount)}
                <span className="ml-2 text-xs font-semibold text-emerald-700">Adv {formatINR(advance)}</span>
                {due > 0 ? (
                  <span className="ml-2 text-xs font-semibold text-rose-600">Due {formatINR(due)}</span>
                ) : (
                  <span className="ml-2 text-xs font-semibold text-content-muted">Settled</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {phoneDigits ? (
                <a
                  href={`tel:${phoneDigits}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  title="Call guest"
                >
                  <Phone className="h-4 w-4" />
                </a>
              ) : null}
              <Link
                to={`/operations-manager/booking/${event._id}`}
                className="inline-flex h-9 items-center rounded-xl bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-800"
              >
                Open
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function OperationsCalendarPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = searchParams.get('type');
  const todayOnly = searchParams.get('today') === '1';
  const mode = modeFromParams(typeFilter, todayOnly);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    API.get('/operations-manager/calendar', { skipSuccessToast: true })
      .then((r) => setEvents(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false));
  }, []);

  const todayKey = dayKey(new Date());

  const filtered = useMemo(() => {
    let list = [...events];
    if (typeFilter === 'departure' || typeFilter === 'return') {
      list = list.filter((e) => e.type === typeFilter);
    }
    if (todayOnly) {
      list = list.filter((e) => dayKey(e.start) === todayKey);
    }
    return list.sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [events, typeFilter, todayOnly, todayKey]);

  const insights = useMemo(() => {
    const guests = filtered.reduce(
      (s, e) => s + (Number(e.guests) || Number(e.adults || 0) + Number(e.children || 0)),
      0
    );
    const destinations = new Set(filtered.map((e) => e.destination).filter(Boolean)).size;
    const pendingOps = filtered.filter(
      (e) => e.hotelConfirmation !== 'confirmed' || e.cabConfirmation !== 'confirmed'
    ).length;
    return { count: filtered.length, guests, destinations, pendingOps };
  }, [filtered]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const event of filtered) {
      const key = dayKey(event.start) || 'unknown';
      if (!map.has(key)) map.set(key, { key, date: event.start, items: [] });
      map.get(key).items.push(event);
    }
    return [...map.values()];
  }, [filtered]);

  const setMode = (next) => {
    const params = {};
    if (next.type) params.type = next.type;
    if (next.today) params.today = '1';
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="space-y-5 pb-10">
      <nav className="flex items-center gap-1.5 text-xs text-content-muted">
        <Link to="/operations-manager" className="hover:text-content-primary">
          Operations
        </Link>
        <span>/</span>
        <span className="font-medium text-content-secondary">Calendar</span>
      </nav>

      <Hero
        mode={mode}
        count={insights.count}
        guests={insights.guests}
        destinations={insights.destinations}
        pendingOps={insights.pendingOps}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = mode === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setMode(f)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition',
                active
                  ? f.type === 'return'
                    ? 'border-sky-300 bg-sky-600 text-white shadow-sm'
                    : f.type === 'departure'
                      ? 'border-orange-300 bg-orange-600 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-900 text-white shadow-sm'
                  : 'border-subtle bg-white text-content-secondary hover:bg-slate-50'
              )}
            >
              {f.type === 'return' ? (
                <ArrowDownToLine className="h-3.5 w-3.5" />
              ) : f.type === 'departure' ? (
                <ArrowUpFromLine className="h-3.5 w-3.5" />
              ) : (
                <CalendarDays className="h-3.5 w-3.5" />
              )}
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <div className="rounded-2xl bg-slate-100 p-4">
            <Sparkles className="h-7 w-7 text-slate-500" />
          </div>
          <p className="text-base font-bold text-content-primary">Nothing on this board</p>
          <p className="max-w-sm text-sm text-content-muted">
            No {mode.includes('arrival') ? 'arrivals' : mode.includes('departure') ? 'departures' : 'events'} match the
            current filter. Try switching to All events.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.key} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-slate-900 px-2.5 py-1.5 text-white">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-content-primary">{formatDayHeading(group.date)}</p>
                    <p className="text-[11px] text-content-muted">
                      {group.items.length} trip{group.items.length === 1 ? '' : 's'} ·{' '}
                      {group.items.reduce(
                        (s, e) => s + (Number(e.guests) || Number(e.adults || 0) + Number(e.children || 0)),
                        0
                      )}{' '}
                      guests
                    </p>
                  </div>
                </div>
                <div className="hidden items-center gap-2 text-[11px] font-semibold text-content-muted sm:flex">
                  <Wallet className="h-3.5 w-3.5" />
                  {formatINR(group.items.reduce((s, e) => s + Number(e.totalAmount || 0), 0))} package value
                </div>
              </div>

              <div className="space-y-3">
                {group.items.map((event, index) => (
                  <EventCard
                    key={`${event._id}-${event.type}-${event.start}`}
                    event={event}
                    index={index}
                    onOpen={(e) => navigate(`/operations-manager/booking/${e._id}`)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

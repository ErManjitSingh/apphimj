import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Flag,
  Hotel,
  LayoutGrid,
  List,
  Map as MapIcon,
  MapPin,
  Plane,
  Radio,
  Users,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatDate } from '../operationsUtils';
import {
  FALLBACK_MAP_BG,
  buildJourney,
  formatShort,
  paxCount,
} from './tripExecutionMapUtils';

const VIEW_TABS = [
  { key: 'map', label: 'Map View', icon: MapIcon },
  { key: 'list', label: 'List View', icon: List },
  { key: 'timeline', label: 'Timeline', icon: LayoutGrid },
];

function ProgressRing({ value = 0, size = 56 }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E2E8F0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#22C55E"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-slate-900">{pct}%</span>
      </div>
    </div>
  );
}

function EmptyLiveState() {
  return (
    <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div>
        <MapPin className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-base font-bold text-slate-800">No live tours right now</p>
        <p className="mt-1 text-sm text-slate-500">
          When a client is on trip, the live map, day plan and itinerary will appear here.
        </p>
        <Link
          to="/operations-manager/bookings/active"
          className="mt-4 inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Open Live Tours
        </Link>
      </div>
    </div>
  );
}

export default function TripExecutionLiveMapView({
  liveTours = [],
  showPageHeader = true,
  compact = false,
}) {
  const tours = useMemo(
    () => (Array.isArray(liveTours) ? liveTours.filter(Boolean) : []),
    [liveTours]
  );
  const [index, setIndex] = useState(0);
  const [view, setView] = useState('map');
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    setIndex(0);
  }, [tours.length]);

  const active = tours[index] || null;
  const journey = useMemo(() => (active ? buildJourney(active) : null), [active]);

  useEffect(() => {
    setSelectedDay(journey?.todayStop?.day || journey?.stops?.[0]?.day || null);
  }, [active?._id, journey?.todayStop?.day, journey?.stops?.[0]?.day]);

  const go = (dir) => {
    if (!tours.length) return;
    setIndex((prev) => (prev + dir + tours.length) % tours.length);
  };

  const stops = journey?.stops || [];
  const pathD = stops.length
    ? `M ${stops.map((s) => `${s.left} ${s.top}`).join(' L ')}`
    : '';

  const selectedStop = stops.find((s) => s.day === selectedDay) || journey?.todayStop || stops[0];
  const uniqueStops = new Set(stops.map((s) => s.pinLabel || s.place)).size;

  if (!tours.length) {
    return (
      <div className="space-y-4">
        {showPageHeader ? (
          <HeaderBar view={view} setView={setView} multi={false} />
        ) : null}
        <EmptyLiveState />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      {showPageHeader ? (
        <HeaderBar
          view={view}
          setView={setView}
          multi={tours.length > 1}
          index={index}
          total={tours.length}
          onPrev={() => go(-1)}
          onNext={() => go(1)}
        />
      ) : null}

      <div className={cn('grid grid-cols-1 gap-4', !compact && 'xl:grid-cols-5')}>
        {/* MAP CANVAS */}
        <div className={cn('relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm', compact ? 'min-h-[480px]' : 'min-h-[620px] xl:col-span-3')}>
          <img
            src={journey?.mapBg || FALLBACK_MAP_BG}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-900/15 to-slate-900/25" />

          {/* Top badges */}
          <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/95 px-3 py-1.5 font-mono text-xs font-bold text-slate-800 shadow-sm">
              {active.bookingNumber || '—'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
              <Radio className="h-3.5 w-3.5" />
              Live Tour
            </span>
          </div>
          <div className="absolute right-4 top-4 z-20">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-bold text-white shadow-sm backdrop-blur-md">
              <CalendarDays className="h-3.5 w-3.5 text-orange-300" />
              Day {journey?.currentDayNo || selectedDay || 1} of {journey?.totalDays || stops.length}
            </span>
          </div>

          {/* Live Client card */}
          <div className="absolute left-4 top-16 z-20 w-[min(100%-2rem,280px)] rounded-2xl border border-white/15 bg-slate-950/75 p-3.5 text-white shadow-2xl backdrop-blur-md">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">
              <Users className="h-3.5 w-3.5" />
              Live Client
            </p>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-orange-400 text-sm font-bold">
                {(active.customerName || '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{active.customerName}</p>
                <p className="truncate text-xs text-slate-300">
                  {active.packageName || active.destination}
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-1.5 text-[11px] text-slate-200">
              <p className="flex items-center gap-2">
                <Plane className="h-3.5 w-3.5 shrink-0 text-orange-300" />
                <span>
                  <span className="text-slate-400">Arrival</span>{' '}
                  <span className="font-semibold text-white">{journey?.arrivalOrigin || '—'}</span>
                </span>
              </p>
              <p className="flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-sky-300" />
                <span className="font-semibold text-white">
                  {formatShort(journey?.travel)} – {formatShort(journey?.returnDate)}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                <span className="font-semibold text-white">{paxCount(active) || '—'} Pax</span>
              </p>
              <p className="flex items-center gap-2">
                <Hotel className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                <span className="truncate font-semibold text-white">
                  {journey?.todayStop?.hotel || selectedStop?.hotel || 'Hotel TBD'}
                </span>
              </p>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[10px]">
                <span className="font-semibold text-slate-300">Trip Progress</span>
                <span className="font-bold text-white">{journey?.progressPct || 0}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400"
                  style={{ width: `${journey?.progressPct || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Route + stop cards */}
          <svg
            className="absolute inset-0 z-[5] h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            {pathD ? (
              <>
                <path
                  d={pathD}
                  fill="none"
                  stroke="rgba(56,189,248,0.85)"
                  strokeWidth="1.4"
                  strokeDasharray="2.8 2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {stops.slice(0, -1).map((s, i) => {
                  const n = stops[i + 1];
                  const mx = (s.left + n.left) / 2;
                  const my = (s.top + n.top) / 2;
                  return (
                    <polygon
                      key={`arrow-${s.day}`}
                      points={`${mx - 1.2},${my - 1.1} ${mx + 1.6},${my} ${mx - 1.2},${my + 1.1}`}
                      fill="#F97316"
                      opacity="0.95"
                    />
                  );
                })}
              </>
            ) : null}
          </svg>

          <AnimatePresence mode="wait">
            <motion.div
              key={active._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10"
            >
              {stops.map((stop, idx) => {
                const isToday = journey?.todayStop && stop.day === journey.todayStop.day;
                const isPast =
                  journey?.today && stop.date && stop.date < journey.today && !isToday;
                const isFirst = idx === 0;
                const isLast = idx === stops.length - 1;
                const isSelected = stop.day === selectedDay;

                return (
                  <button
                    key={`${stop.day}-${stop.place}`}
                    type="button"
                    onClick={() => setSelectedDay(stop.day)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-left"
                    style={{ left: `${stop.left}%`, top: `${stop.top}%` }}
                  >
                    <div className="relative flex flex-col items-center">
                      {isFirst ? (
                        <span className="mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-2 ring-white">
                          <Flag className="h-3.5 w-3.5" />
                        </span>
                      ) : isLast ? (
                        <span className="mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg ring-2 ring-white">
                          <Flag className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span
                          className={cn(
                            'mb-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow',
                            isToday ? 'bg-orange-500 ring-4 ring-orange-300/60' : 'bg-sky-400'
                          )}
                        />
                      )}

                      <div
                        className={cn(
                          'flex min-w-[132px] max-w-[160px] items-center gap-2 rounded-xl bg-white p-1.5 shadow-xl ring-1 transition',
                          isToday || isSelected
                            ? 'ring-orange-300'
                            : isPast
                              ? 'ring-emerald-200'
                              : 'ring-slate-200'
                        )}
                      >
                        <img
                          src={stop.thumb}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0 pr-1">
                          <p className="truncate text-[12px] font-bold text-slate-900">
                            {stop.pinLabel || stop.place}
                          </p>
                          <p className="truncate text-[10px] font-medium text-slate-500">
                            Day {stop.day} · {formatShort(stop.date)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>

          {/* Bottom day strip */}
          <div className="absolute inset-x-3 bottom-3 z-20">
            <div className="flex gap-2 overflow-x-auto rounded-2xl bg-slate-950/55 p-2.5 backdrop-blur-md">
              {stops.map((stop) => {
                const isToday = journey?.todayStop && stop.day === journey.todayStop.day;
                const isPast =
                  journey?.today && stop.date && stop.date < journey.today && !isToday;
                const isSelected = stop.day === selectedDay;
                return (
                  <button
                    key={`daystrip-${stop.day}`}
                    type="button"
                    onClick={() => setSelectedDay(stop.day)}
                    className={cn(
                      'min-w-[72px] shrink-0 rounded-xl px-3 py-2.5 text-center transition',
                      isToday
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/40'
                        : isPast
                          ? 'bg-emerald-500/90 text-white'
                          : isSelected
                            ? 'bg-white text-slate-900'
                            : 'bg-white/90 text-slate-800 hover:bg-white'
                    )}
                  >
                    <p className="text-[11px] font-bold">Day {stop.day}</p>
                    <div className="mt-1 flex justify-center">
                      {isPast ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : isToday ? (
                        <MapPin className="h-3.5 w-3.5" />
                      ) : (
                        <span className="h-3.5 w-3.5 rounded-full border border-current opacity-40" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR CARDS */}
        <div className={cn('flex flex-col gap-4', !compact && 'xl:col-span-2')}>
          {/* Trip Overview */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <MapIcon className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Trip Overview</h3>
                  <p className="font-mono text-[11px] font-semibold text-slate-400">
                    {active.bookingNumber}
                  </p>
                </div>
              </div>
              <Link
                to={`/operations-manager/booking/${active._id}`}
                className="text-xs font-semibold text-violet-600 hover:text-violet-700"
              >
                Open →
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <OverviewStat label="Duration" value={`${journey?.totalDays || stops.length} Days`} />
              <OverviewStat label="Travelers" value={`${paxCount(active) || 0} Pax`} />
              <OverviewStat label="Destinations" value={`${uniqueStops} Stops`} />
              <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 px-1 py-2">
                <ProgressRing value={journey?.progressPct || 0} size={52} />
                <p className="mt-1 text-[10px] font-semibold text-slate-500">Completed</p>
              </div>
            </div>
          </div>

          {/* Trip Status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Trip Status</h3>
            <div className="flex items-start gap-0 overflow-x-auto pb-1">
              {stops.map((stop, idx) => {
                const isToday = journey?.todayStop && stop.day === journey.todayStop.day;
                const isPast =
                  journey?.today && stop.date && stop.date < journey.today && !isToday;
                const done = isPast || isToday;
                const label =
                  idx === 0 ? 'Started' : isToday ? 'In Progress' : idx === stops.length - 1 ? 'Return' : 'Upcoming';
                return (
                  <div key={`status-${stop.day}`} className="flex min-w-[72px] flex-1 flex-col items-center">
                    <div className="flex w-full items-center">
                      {idx > 0 ? (
                        <div className={cn('h-0.5 flex-1', done || isPast ? 'bg-emerald-400' : 'bg-slate-200')} />
                      ) : (
                        <div className="flex-1" />
                      )}
                      <span
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white',
                          done ? 'bg-emerald-500' : 'bg-slate-200 text-slate-400'
                        )}
                      >
                        {done ? <Check className="h-3.5 w-3.5" /> : <span className="text-[10px] font-bold">{stop.day}</span>}
                      </span>
                      {idx < stops.length - 1 ? (
                        <div className={cn('h-0.5 flex-1', isPast ? 'bg-emerald-400' : 'bg-slate-200')} />
                      ) : (
                        <div className="flex-1" />
                      )}
                    </div>
                    <p className="mt-1.5 text-center text-[10px] font-bold text-slate-700">{label}</p>
                    <p className="text-center text-[9px] font-medium text-slate-400">
                      {idx === 0 ? formatShort(stop.date) : `Day ${stop.day}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day-wise Itinerary */}
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Day-wise Itinerary</h3>
            <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
              {stops.map((stop) => {
                const isToday = journey?.todayStop && stop.day === journey.todayStop.day;
                const isPast =
                  journey?.today && stop.date && stop.date < journey.today && !isToday;
                return (
                  <button
                    key={`itin-${stop.day}`}
                    type="button"
                    onClick={() => setSelectedDay(stop.day)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                      isToday
                        ? 'border-orange-300 bg-orange-50'
                        : isPast
                          ? 'border-orange-100 bg-orange-50/50'
                          : stop.day === selectedDay
                            ? 'border-violet-200 bg-violet-50/60'
                            : 'border-slate-100 bg-slate-50/60 hover:border-slate-200'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900">Day {stop.day}</p>
                        {isToday ? (
                          <span className="rounded-md bg-orange-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                            Live
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-[12px] font-semibold text-slate-700">
                        {stop.pinLabel || stop.place}
                        {stop.title && stop.title !== stop.place ? ` – ${stop.title}` : ''}
                      </p>
                      <p className="truncate text-[10px] text-slate-400">
                        {formatShort(stop.date)}
                        {stop.hotel ? ` · ${stop.hotel}` : ''}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                        isPast || isToday
                          ? 'bg-emerald-500 text-white'
                          : 'border-2 border-slate-200 bg-white'
                      )}
                    >
                      {isPast || isToday ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {view !== 'map' && showPageHeader ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Showing map canvas for live execution. Switch stays on Map View for the reference layout.
        </div>
      ) : null}

      {active ? (
        <p className="text-xs text-slate-400">
          {active.customerName} · {formatDate(active.travelDate)} → {formatDate(active.returnDate)}
          {tours.length > 1 ? ` · Live tour ${index + 1} of ${tours.length}` : ''}
        </p>
      ) : null}
    </div>
  );
}

function HeaderBar({ view, setView, multi, index = 0, total = 0, onPrev, onNext }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <nav className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-400">
          <span>Trip Execution</span>
          <span>›</span>
          <span className="font-medium text-slate-600">Trip Map</span>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Trip Execution – Trip Map</h1>
        <p className="mt-1 text-sm text-slate-500">
          Live trip tracking, day-wise plan and on-ground execution
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {multi ? (
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button type="button" onClick={onPrev} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-50" aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-bold text-slate-600">
              {index + 1}/{total}
            </span>
            <button type="button" onClick={onNext} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-50" aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {VIEW_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition',
                view === key
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OverviewStat({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2.5 text-center">
      <p className="text-sm font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

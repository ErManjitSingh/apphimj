import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Ban,
  CalendarClock,
  CircleCheck,
  Compass,
  MapPin,
  PauseCircle,
  Radio,
  Route,
  Ticket,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import KpiCard from '../../dashboard/KpiCard';
import { buildSparkline } from '../bookings/bookingListUtils';
import { cn } from '../../../lib/utils';

/** Top row = 4, bottom row = 5 */
const TOP_ROW = [
  {
    key: 'totalBookings',
    label: 'Total Bookings',
    icon: Ticket,
    iconColor: 'bg-sky-500',
    sparkColor: '#0EA5E9',
    to: '/operations-manager/bookings/all',
  },
  {
    key: 'activeTours',
    label: 'Active Tour',
    featured: true,
    icon: Route,
    iconColor: 'bg-teal-600',
    sparkColor: '#0D9488',
    to: '/operations-manager/bookings/active-tours',
  },
  {
    key: 'liveTours',
    label: 'Live Tour',
    icon: Radio,
    iconColor: 'bg-emerald-500',
    sparkColor: '#22C55E',
    to: '/operations-manager/bookings/active',
    altKey: 'activeTrips',
  },
  {
    key: 'upcomingTours',
    label: 'Upcoming Tours',
    icon: Compass,
    iconColor: 'bg-cyan-500',
    sparkColor: '#06B6D4',
    to: '/operations-manager/trip-tracker?tab=upcoming',
  },
];

const BOTTOM_ROW = [
  {
    key: 'todaysDepartures',
    label: "Today's Departures",
    icon: CalendarClock,
    iconColor: 'bg-violet-500',
    sparkColor: '#8B5CF6',
    to: '/operations-manager/calendar?type=departure&today=1',
  },
  {
    key: 'todaysArrivals',
    label: "Today's Arrivals",
    icon: MapPin,
    iconColor: 'bg-blue-500',
    sparkColor: '#3B82F6',
    to: '/operations-manager/calendar?type=return&today=1',
  },
  {
    key: 'postponedBookings',
    label: 'Postponed Bookings',
    icon: PauseCircle,
    iconColor: 'bg-amber-500',
    sparkColor: '#F59E0B',
    to: '/operations-manager/bookings/postponed',
  },
  {
    key: 'cancelledBookings',
    label: 'Cancelled Bookings',
    icon: Ban,
    iconColor: 'bg-rose-500',
    sparkColor: '#EF4444',
    to: '/operations-manager/bookings/cancelled',
  },
  {
    key: 'completedTrips',
    label: 'Completed Tours',
    icon: CircleCheck,
    iconColor: 'bg-slate-500',
    sparkColor: '#64748B',
    to: '/operations-manager/bookings/completed',
  },
];

const ALL_KPIS = [...TOP_ROW, ...BOTTOM_ROW];

const EMPTY_KPIS = Object.fromEntries(
  ALL_KPIS.flatMap((item) => {
    const keys = [item.key];
    if (item.altKey) keys.push(item.altKey);
    return keys.map((k) => [k, 0]);
  })
);

function resolveValue(values, item) {
  const primary = Number(values[item.key]);
  if (Number.isFinite(primary) && (primary > 0 || values[item.key] != null)) return primary;
  if (item.altKey != null) return Number(values[item.altKey] ?? 0) || 0;
  return 0;
}

/** Same size as other KPIs — teal accent + compact formula hint. */
function ActiveTourCard({ value, trend, sparkData, index }) {
  const isUp = trend?.changeType === 'up';
  const isNeutral = !trend?.changeType || trend.changeType === 'neutral';
  const chartData = (sparkData || []).map((v, i) => ({ i, v }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="h-full"
    >
      <Link
        to="/operations-manager/bookings/active-tours"
        className={cn(
          'group relative flex h-full min-h-[92px] flex-col justify-between overflow-hidden rounded-xl border border-teal-200/90 bg-white p-3',
          'shadow-sm transition-all duration-300',
          'hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/40'
        )}
      >
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-teal-500 to-cyan-500" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(13,148,136,0.07),transparent_50%)]" />

        <div className="relative flex items-start justify-between gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 shadow-sm">
            <Route className="h-3.5 w-3.5 text-white" strokeWidth={2.25} />
          </div>
          {trend?.change != null && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 text-[10px] font-semibold',
                isNeutral ? 'text-slate-400' : isUp ? 'text-emerald-600' : 'text-red-500'
              )}
            >
              {!isNeutral &&
                (isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />)}
              {trend.change}
            </span>
          )}
        </div>

        <div className="relative mt-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-teal-700">
            Active Tour
          </p>
          <p className="mt-0.5 text-lg font-bold leading-none tracking-tight text-slate-900 tabular-nums">
            {Number(value || 0).toLocaleString('en-IN')}
          </p>
          <p className="mt-1 truncate text-[9px] font-medium text-slate-400">
            Total − Done − Hold − Cancel
          </p>
        </div>

        {chartData.length > 0 && (
          <div className="relative -mx-1 mt-1 h-5 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`active-tour-spark-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D9488" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#0D9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#0D9488"
                  strokeWidth={1.5}
                  fill={`url(#active-tour-spark-${index})`}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Link>
    </motion.div>
  );
}

function renderCard(item, values, kpiTrends, sparklines, index) {
  if (item.featured) {
    const activeTourValue =
      Number(values.activeTours) ||
      Math.max(
        0,
        Number(values.totalBookings || 0) -
          Number(values.completedTrips || 0) -
          Number(values.postponedBookings || 0) -
          Number(values.cancelledBookings || 0)
      );
    const activeSpark = sparklines?.activeTours?.length
      ? sparklines.activeTours
      : buildSparkline(activeTourValue);

    return (
      <ActiveTourCard
        key={item.key}
        value={activeTourValue}
        trend={kpiTrends?.activeTours}
        sparkData={activeSpark}
        index={index}
      />
    );
  }

  const value = resolveValue(values, item);
  const trendKey =
    item.key === 'liveTours' ? (kpiTrends?.liveTours ? 'liveTours' : 'activeTrips') : item.key;
  const trend = kpiTrends?.[trendKey] || { change: 'No change', changeType: 'neutral' };
  const sparkSource = sparklines?.[item.key] || sparklines?.[item.altKey];
  const sparkData = sparkSource?.length ? sparkSource : buildSparkline(value);

  return (
    <KpiCard
      key={item.key}
      label={item.label}
      value={Number(value ?? 0).toLocaleString('en-IN')}
      change={trend.change}
      changeType={trend.changeType || 'neutral'}
      changeLabel=""
      icon={item.icon}
      iconColor={item.iconColor}
      sparkColor={item.sparkColor}
      sparkData={sparkData}
      index={index}
      dense
      to={item.to}
    />
  );
}

export default function OperationsKpiCards({ kpis, kpiTrends, sparklines, loading }) {
  const values = kpis && typeof kpis === 'object' ? { ...EMPTY_KPIS, ...kpis } : EMPTY_KPIS;

  if (loading && !kpis) {
    return (
      <div className="space-y-3 md:space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={`t-${i}`} className="h-[92px] animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={`b-${i}`} className="h-[92px] animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {TOP_ROW.map((item, i) => renderCard(item, values, kpiTrends, sparklines, i))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
        {BOTTOM_ROW.map((item, i) => renderCard(item, values, kpiTrends, sparklines, i + 4))}
      </div>
    </div>
  );
}

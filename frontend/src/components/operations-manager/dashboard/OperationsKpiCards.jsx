import {
  Ban,
  CalendarClock,
  CircleCheck,
  Compass,
  PauseCircle,
  Plane,
  Ticket,
} from 'lucide-react';
import KpiCard from '../../dashboard/KpiCard';
import { buildSparkline } from '../bookings/bookingListUtils';

const KPI_CONFIG = [
  { key: 'totalBookings', label: 'Total Bookings', icon: Ticket, iconColor: 'bg-sky-500', sparkColor: '#0EA5E9', to: '/operations-manager/bookings' },
  { key: 'upcomingTours', label: 'Upcoming Tours', icon: Compass, iconColor: 'bg-teal-500', sparkColor: '#14B8A6', to: '/operations-manager/trip-tracker' },
  { key: 'activeTrips', label: 'Active Tours (On Trip)', icon: Plane, iconColor: 'bg-emerald-500', sparkColor: '#22C55E', to: '/operations-manager/bookings/active' },
  { key: 'todaysDepartures', label: "Today's Departures", icon: CalendarClock, iconColor: 'bg-violet-500', sparkColor: '#8B5CF6', to: '/operations-manager/calendar' },
  { key: 'postponedBookings', label: 'Postponed Bookings', icon: PauseCircle, iconColor: 'bg-amber-500', sparkColor: '#F59E0B', to: '/operations-manager/bookings' },
  { key: 'cancelledBookings', label: 'Cancelled Bookings', icon: Ban, iconColor: 'bg-rose-500', sparkColor: '#EF4444', to: '/operations-manager/bookings' },
  { key: 'completedTrips', label: 'Completed Tours', icon: CircleCheck, iconColor: 'bg-slate-500', sparkColor: '#64748B', to: '/operations-manager/bookings/completed' },
];

const EMPTY_KPIS = Object.fromEntries(KPI_CONFIG.map((item) => [item.key, 0]));

export default function OperationsKpiCards({ kpis, kpiTrends, sparklines, loading }) {
  const values = kpis && typeof kpis === 'object' ? { ...EMPTY_KPIS, ...kpis } : EMPTY_KPIS;

  if (loading && !kpis) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 md:gap-4">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 md:gap-4">
      {KPI_CONFIG.map((item, i) => {
        const trend = kpiTrends?.[item.key] || { change: 'No change', changeType: 'neutral' };
        const sparkData = sparklines?.[item.key]?.length
          ? sparklines[item.key]
          : buildSparkline(values[item.key]);

        return (
          <KpiCard
            key={item.key}
            label={item.label}
            value={Number(values[item.key] ?? 0).toLocaleString('en-IN')}
            change={trend.change}
            changeType={trend.changeType || 'neutral'}
            changeLabel=""
            icon={item.icon}
            iconColor={item.iconColor}
            sparkColor={item.sparkColor}
            sparkData={sparkData}
            index={i}
            dense
            to={item.to}
          />
        );
      })}
    </div>
  );
}

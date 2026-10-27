import {
  Calendar,
  Car,
  CircleCheck,
  Clock,
  Compass,
  Hotel,
  Plane,
  Ticket,
} from 'lucide-react';
import KpiCard from '../../dashboard/KpiCard';
import { buildSparkline } from '../bookings/bookingListUtils';

const KPI_CONFIG = [
  { key: 'todaysArrivals', label: "Today's Arrivals", icon: Calendar, iconColor: 'bg-blue-500', sparkColor: '#3B82F6', to: '/operations-manager/calendar' },
  { key: 'todaysDepartures', label: "Today's Departures", icon: Plane, iconColor: 'bg-violet-500', sparkColor: '#8B5CF6', to: '/operations-manager/calendar' },
  { key: 'upcomingTours', label: 'Upcoming Tours', icon: Compass, iconColor: 'bg-teal-500', sparkColor: '#14B8A6', to: '/operations-manager/trip-tracker' },
  { key: 'pendingBookings', label: 'Pending Bookings', icon: Clock, iconColor: 'bg-orange-500', sparkColor: '#F97316', to: '/operations-manager/bookings/pending' },
  { key: 'hotelPending', label: 'Hotel Pending', icon: Hotel, iconColor: 'bg-sky-500', sparkColor: '#0EA5E9', to: '/operations-manager/bookings/pending' },
  { key: 'cabPending', label: 'Cab Pending', icon: Car, iconColor: 'bg-pink-500', sparkColor: '#EC4899', to: '/operations-manager/bookings/pending' },
  { key: 'activityPending', label: 'Confirmed (Sales Exec)', icon: CircleCheck, iconColor: 'bg-red-500', sparkColor: '#EF4444', to: '/operations-manager/bookings/pending' },
  { key: 'voucherPending', label: 'Voucher Pending', icon: Ticket, iconColor: 'bg-purple-500', sparkColor: '#A855F7', to: '/operations-manager/vouchers' },
  { key: 'activeTrips', label: 'Active Trips', icon: Plane, iconColor: 'bg-emerald-500', sparkColor: '#22C55E', to: '/operations-manager/bookings/active' },
  { key: 'completedTrips', label: 'Completed', icon: CircleCheck, iconColor: 'bg-slate-500', sparkColor: '#64748B', to: '/operations-manager/bookings/completed' },
];

const EMPTY_KPIS = Object.fromEntries(KPI_CONFIG.map((item) => [item.key, 0]));

export default function OperationsKpiCards({ kpis, kpiTrends, sparklines, loading }) {
  const values = kpis && typeof kpis === 'object' ? { ...EMPTY_KPIS, ...kpis } : EMPTY_KPIS;

  if (loading && !kpis) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 md:gap-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="h-[74px] animate-pulse rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5 md:gap-4">
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

import {
  Clock,
  IndianRupee,
  Users,
  CalendarDays,
  CheckCircle2,
  Building2,
  Car,
  Plane,
  Hotel,
  MapPin,
  CircleCheck,
  Ticket,
  BadgeCheck,
  Wallet,
  ArrowUpRight,
  Sparkles,
  Percent,
} from 'lucide-react';
import KpiCard from '../../dashboard/KpiCard';
import { buildSparkline, formatINRCompact, formatPercent } from './bookingListUtils';
import { cn } from '../../../lib/utils';

function buildConfirmedKpis(summary) {
  const count = summary?.count || 0;
  const hotelsConfirmed = summary?.hotelsConfirmed || 0;
  const cabsConfirmed = summary?.cabsConfirmed || 0;

  return [
    { key: 'count', label: 'Total Confirmed', icon: CheckCircle2, iconColor: 'bg-emerald-500', sparkColor: '#22C55E', change: `${formatPercent(hotelsConfirmed, count)} hotels OK`, changeType: 'up', changeLabel: '', format: (v) => v?.toLocaleString('en-IN') ?? '0' },
    { key: 'totalAmount', label: 'Total Revenue', icon: IndianRupee, iconColor: 'bg-blue-500', sparkColor: '#3B82F6', change: formatINRCompact(summary?.advanceReceived), changeType: 'up', changeLabel: 'collected', format: (v) => formatINRCompact(v) },
    { key: 'totalPax', label: 'Total Pax', icon: Users, iconColor: 'bg-violet-500', sparkColor: '#8B5CF6', change: `${summary?.cabsConfirmed || 0} cabs ready`, changeType: 'up', changeLabel: '', format: (v) => v?.toLocaleString('en-IN') ?? '0' },
    { key: 'hotelsConfirmed', label: 'Hotels Confirmed', icon: Building2, iconColor: 'bg-orange-500', sparkColor: '#F97316', change: `${formatPercent(hotelsConfirmed, count)} confirmed`, changeType: 'up', changeLabel: '', format: (v) => v?.toLocaleString('en-IN') ?? '0' },
    { key: 'cabsConfirmed', label: 'Cabs Confirmed', icon: Car, iconColor: 'bg-sky-500', sparkColor: '#0EA5E9', change: `${formatPercent(cabsConfirmed, count)} confirmed`, changeType: 'up', changeLabel: '', format: (v) => v?.toLocaleString('en-IN') ?? '0' },
  ];
}

function buildActiveKpis(summary) {
  return [
    { key: 'count', label: 'Active Trips', icon: Plane, iconColor: 'bg-blue-500', sparkColor: '#3B82F6', change: `${summary?.todayOnTrip || 0} on trip today`, changeType: 'up', changeLabel: '', format: (v) => v?.toLocaleString('en-IN') ?? '0' },
    { key: 'totalPax', label: 'Total Guests', icon: Users, iconColor: 'bg-emerald-500', sparkColor: '#22C55E', change: 'Traveling now', changeType: 'up', changeLabel: '', format: (v) => v?.toLocaleString('en-IN') ?? '0' },
    { key: 'todayOnTrip', label: 'On Trip Today', icon: MapPin, iconColor: 'bg-violet-500', sparkColor: '#8B5CF6', change: 'On today', changeType: 'up', changeLabel: '', format: (v) => v?.toLocaleString('en-IN') ?? '0' },
    { key: 'hotelsPending', label: 'Hotels Pending', icon: Hotel, iconColor: 'bg-orange-500', sparkColor: '#F97316', change: 'Pending', changeType: (summary?.hotelsPending || 0) > 0 ? 'down' : 'neutral', changeLabel: '', format: (v) => v?.toLocaleString('en-IN') ?? '0' },
    { key: 'cabsPending', label: 'Cabs Pending', icon: Car, iconColor: 'bg-cyan-500', sparkColor: '#06B6D4', change: 'Pending', changeType: (summary?.cabsPending || 0) > 0 ? 'down' : 'neutral', changeLabel: '', format: (v) => v?.toLocaleString('en-IN') ?? '0' },
    { key: 'returningToday', label: 'Returning Today', icon: CalendarDays, iconColor: 'bg-rose-500', sparkColor: '#F43F5E', change: 'Departures', changeType: 'up', changeLabel: '', format: (v) => v?.toLocaleString('en-IN') ?? '0' },
  ];
}

function buildPendingKpis(summary) {
  return [
    {
      key: 'count',
      label: 'Total Pending',
      icon: Clock,
      iconColor: 'bg-blue-500',
      sparkColor: '#3B82F6',
      change: `${summary?.todayPending || 0} today`,
      changeType: 'up',
      changeLabel: '',
      format: (v) => v?.toLocaleString('en-IN') ?? '0',
    },
    {
      key: 'totalAmount',
      label: 'Total Amount',
      icon: IndianRupee,
      iconColor: 'bg-emerald-500',
      sparkColor: '#22C55E',
      change: 'Package value',
      changeType: 'up',
      changeLabel: '',
      format: (v) => formatINRCompact(v),
    },
    {
      key: 'totalPax',
      label: 'Total Pax',
      icon: Users,
      iconColor: 'bg-violet-500',
      sparkColor: '#8B5CF6',
      change: 'Guests',
      changeType: 'neutral',
      changeLabel: '',
      format: (v) => v?.toLocaleString('en-IN') ?? '0',
    },
    {
      key: 'todayPending',
      label: "Today's Pending",
      icon: CalendarDays,
      iconColor: 'bg-orange-500',
      sparkColor: '#F97316',
      change: 'Created today',
      changeType: 'up',
      changeLabel: '',
      format: (v) => v?.toLocaleString('en-IN') ?? '0',
    },
  ];
}

function buildCompletedKpis(summary) {
  const count = summary?.count || 0;
  const vouchersIssued = summary?.vouchersIssued || 0;
  const paidInFull = summary?.paidInFull || 0;
  const margin = summary?.profitMargin || 0;
  const withCosting = summary?.withCosting || 0;

  return [
    {
      key: 'count',
      label: 'Total Tours Completed',
      icon: CircleCheck,
      iconColor: 'bg-emerald-600',
      sparkColor: '#059669',
      change: `${summary?.completedThisMonth || 0} this month`,
      changeType: 'up',
      changeLabel: '',
      format: (v) => v?.toLocaleString('en-IN') ?? '0',
    },
    {
      key: 'packageRevenue',
      label: 'Completed Package Value',
      icon: IndianRupee,
      iconColor: 'bg-sky-500',
      sparkColor: '#0EA5E9',
      change: formatINRCompact(summary?.totalAmount),
      changeType: 'up',
      changeLabel: 'booking total',
      format: (v) => formatINRCompact(v ?? summary?.totalAmount),
    },
    {
      key: 'profitAmount',
      label: 'Total Profit',
      icon: Sparkles,
      iconColor: 'bg-emerald-500',
      sparkColor: '#22C55E',
      change: `${withCosting}/${count} with ops file`,
      changeType: 'up',
      changeLabel: '',
      format: (v) => formatINRCompact(v),
    },
    {
      key: 'profitMargin',
      label: 'Profit Margin',
      icon: Percent,
      iconColor: 'bg-teal-500',
      sparkColor: '#14B8A6',
      change: `Cost ${formatINRCompact(summary?.costTotal)}`,
      changeType: 'up',
      changeLabel: '',
      format: (v) => `${Number(v ?? margin) || 0}%`,
    },
    {
      key: 'advanceReceived',
      label: 'Collected',
      icon: Wallet,
      iconColor: 'bg-amber-500',
      sparkColor: '#F59E0B',
      change: `${formatPercent(paidInFull, count)} paid full`,
      changeType: 'up',
      changeLabel: '',
      format: (v) => formatINRCompact(v),
    },
    {
      key: 'pendingAmount',
      label: 'Still Due',
      icon: BadgeCheck,
      iconColor: 'bg-rose-500',
      sparkColor: '#F43F5E',
      change: `${summary?.paymentPending || 0} open`,
      changeType: (summary?.pendingAmount || 0) > 0 ? 'down' : 'neutral',
      changeLabel: '',
      format: (v) => formatINRCompact(v),
    },
    {
      key: 'totalPax',
      label: 'Guests Served',
      icon: Users,
      iconColor: 'bg-violet-500',
      sparkColor: '#8B5CF6',
      change: `${summary?.completedThisMonth || 0} returned MoM`,
      changeType: 'up',
      changeLabel: '',
      format: (v) => v?.toLocaleString('en-IN') ?? '0',
    },
    {
      key: 'vouchersIssued',
      label: 'Vouchers Issued',
      icon: Ticket,
      iconColor: 'bg-indigo-500',
      sparkColor: '#6366F1',
      change: `${formatPercent(vouchersIssued, count)} ready`,
      changeType: 'up',
      changeLabel: '',
      format: (v) => v?.toLocaleString('en-IN') ?? '0',
    },
  ];
}

function buildAllKpis(summary) {
  const count = summary?.count || 0;
  const paidInFull = summary?.paidInFull || 0;
  const hotelsConfirmed = summary?.hotelsConfirmed || 0;

  return [
    {
      key: 'count',
      label: 'Total Bookings',
      icon: Ticket,
      iconColor: 'bg-sky-500',
      sparkColor: '#0EA5E9',
      change: `${summary?.statusActive || 0} on trip`,
      changeType: 'up',
      changeLabel: '',
      format: (v) => v?.toLocaleString('en-IN') ?? '0',
    },
    {
      key: 'totalAmount',
      label: 'Gross Revenue',
      icon: IndianRupee,
      iconColor: 'bg-emerald-500',
      sparkColor: '#22C55E',
      change: formatINRCompact(summary?.advanceReceived),
      changeType: 'up',
      changeLabel: 'collected',
      format: (v) => formatINRCompact(v),
    },
    {
      key: 'pendingAmount',
      label: 'Pending Collection',
      icon: Wallet,
      iconColor: 'bg-amber-500',
      sparkColor: '#F59E0B',
      change: `${summary?.paymentPending || 0} open`,
      changeType: (summary?.pendingAmount || 0) > 0 ? 'down' : 'neutral',
      changeLabel: '',
      format: (v) => formatINRCompact(v),
    },
    {
      key: 'totalPax',
      label: 'Total Guests',
      icon: Users,
      iconColor: 'bg-violet-500',
      sparkColor: '#8B5CF6',
      change: `${summary?.statusActive || 0} traveling`,
      changeType: 'up',
      changeLabel: '',
      format: (v) => v?.toLocaleString('en-IN') ?? '0',
    },
    {
      key: 'todayOnTrip',
      label: "Today's Departures",
      icon: ArrowUpRight,
      iconColor: 'bg-blue-500',
      sparkColor: '#3B82F6',
      change: `${summary?.returningToday || 0} arrivals`,
      changeType: 'up',
      changeLabel: '',
      format: (v) => v?.toLocaleString('en-IN') ?? '0',
      to: '/operations-manager/calendar?type=departure&today=1',
    },
    {
      key: 'hotelsConfirmed',
      label: 'Hotels Confirmed',
      icon: Building2,
      iconColor: 'bg-teal-500',
      sparkColor: '#14B8A6',
      change: `${formatPercent(hotelsConfirmed, count)} ready`,
      changeType: 'up',
      changeLabel: '',
      format: (v) => v?.toLocaleString('en-IN') ?? '0',
    },
    {
      key: 'paidInFull',
      label: 'Paid in Full',
      icon: BadgeCheck,
      iconColor: 'bg-indigo-500',
      sparkColor: '#6366F1',
      change: `${formatPercent(paidInFull, count)} settled`,
      changeType: 'up',
      changeLabel: '',
      format: (v) => v?.toLocaleString('en-IN') ?? '0',
    },
    {
      key: 'hotelsPending',
      label: 'Ops Pending',
      icon: Hotel,
      iconColor: 'bg-orange-500',
      sparkColor: '#F97316',
      change: `${summary?.cabsPending || 0} cab pending`,
      changeType: (summary?.hotelsPending || 0) > 0 ? 'down' : 'neutral',
      changeLabel: '',
      format: (v) => v?.toLocaleString('en-IN') ?? '0',
    },
  ];
}

function resolveItems(status, summary) {
  if (status === 'all') return buildAllKpis(summary);
  if (status === 'confirmed') return buildConfirmedKpis(summary);
  if (status === 'active') return buildActiveKpis(summary);
  if (status === 'completed') return buildCompletedKpis(summary);
  return buildPendingKpis(summary);
}

export default function BookingKpiStrip({ summary, status = 'pending', loading }) {
  const items = resolveItems(status, summary);
  const colClass =
    items.length >= 8
      ? 'xl:grid-cols-4 2xl:grid-cols-8'
      : items.length >= 6
        ? 'xl:grid-cols-6'
        : items.length >= 5
          ? 'xl:grid-cols-5'
          : 'xl:grid-cols-4';

  if (loading && !summary) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5', colClass)}>
        {[...Array(items.length || 4)].map((_, i) => (
          <div key={i} className="rounded-xl bg-white border border-subtle animate-pulse h-[88px]" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5', colClass)}>
      {items.map((item, i) => (
        <KpiCard
          key={item.key}
          label={item.label}
          value={item.format(summary[item.key])}
          change={item.change}
          changeType={item.changeType || 'up'}
          changeLabel={item.changeLabel ?? 'vs last 7 days'}
          icon={item.icon}
          iconColor={item.iconColor}
          sparkColor={item.sparkColor}
          sparkData={buildSparkline(summary[item.key])}
          index={i}
          compact
          to={item.to}
        />
      ))}
    </div>
  );
}

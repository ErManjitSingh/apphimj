import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bus,
  FileText,
  Hotel,
  MapPin,
  Plus,
  Route,
  Send,
  Ticket,
  Users,
  Car,
} from 'lucide-react';
import OperationsDonutChart from './OperationsDonutChart';

const MAP_BG =
  'https://images.unsplash.com/photo-1524661132062-80923727030d?auto=format&fit=crop&w=1200&q=60';

const ROUTE_PINS = [
  { name: 'Dharamshala', left: '18%', top: '28%', tone: 'bg-emerald-500', label: 'On Trip' },
  { name: 'Manali', left: '48%', top: '42%', tone: 'bg-sky-500', label: 'Upcoming' },
  { name: 'Shimla', left: '72%', top: '58%', tone: 'bg-orange-500', label: 'Departing' },
];

const QUICK_ACTIONS = [
  { label: 'Add Booking', icon: Plus, color: 'bg-orange-500', to: '/operations-manager/bookings/pending' },
  { label: 'Create Tour', icon: Route, color: 'bg-violet-500', to: '/operations-manager/trip-tracker' },
  { label: 'Assign Cab', icon: Car, color: 'bg-sky-500', to: '/operations-manager/transport' },
  { label: 'Create Voucher', icon: Ticket, color: 'bg-emerald-500', to: '/operations-manager/vouchers' },
  { label: 'Manage Hotels', icon: Hotel, color: 'bg-pink-500', to: '/operations-manager/hotels' },
  { label: 'Activities', icon: FileText, color: 'bg-amber-500', to: '/operations-manager/activities' },
  { label: 'Vendors', icon: Send, color: 'bg-blue-600', to: '/operations-manager/vendors' },
  { label: 'Support', icon: Users, color: 'bg-indigo-500', to: '/operations-manager/support' },
];

const STATUS_COLORS = {
  confirmed: '#22C55E',
  pending: '#F97316',
  active: '#8B5CF6',
  completed: '#94A3B8',
};

function PanelShell({ title, children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}
    >
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
      </div>
      <div className="flex-1 p-5">{children}</div>
    </motion.div>
  );
}

export default function OperationsBottomPanels({ data }) {
  const statusData = (data?.bookingsByStatus || [])
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: s.label,
      value: s.count,
      color: STATUS_COLORS[s.status] || '#94A3B8',
    }));

  const onTrip = Number(data?.hubStats?.onTrip ?? data?.kpis?.activeTrips ?? 0);
  const departures = Number(data?.hubStats?.departuresToday ?? data?.kpis?.todaysDepartures ?? 0);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <PanelShell title="Trip Execution Map" delay={0.05} className="xl:col-span-1">
        <div className="relative h-[220px] overflow-hidden rounded-xl bg-slate-100">
          <img src={MAP_BG} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-white/10" />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path
              d="M18 28 C 30 34, 38 40, 48 42 S 62 50, 72 58"
              fill="none"
              stroke="#F97316"
              strokeWidth="1.2"
              strokeDasharray="2 1.5"
              opacity="0.85"
            />
          </svg>
          {ROUTE_PINS.map((pin) => (
            <div
              key={pin.name}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: pin.left, top: pin.top }}
            >
              <div className={`mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full ${pin.tone} text-white shadow-md`}>
                {pin.label === 'On Trip' ? <Bus className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
              </div>
              <div className="rounded-lg bg-white/95 px-2 py-1 text-center shadow-sm ring-1 ring-slate-200/80">
                <p className="text-[10px] font-bold text-slate-800">{pin.name}</p>
                <p className="text-[9px] font-medium text-slate-400">{pin.label}</p>
              </div>
            </div>
          ))}
          <div className="absolute bottom-3 left-3 flex gap-2">
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-sm">
              {onTrip} on trip
            </span>
            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-sm">
              {departures} departing
            </span>
          </div>
        </div>
      </PanelShell>

      <PanelShell title="Tour Status Distribution" delay={0.1}>
        <OperationsDonutChart data={statusData} totalLabel="Tours" />
      </PanelShell>

      <PanelShell title="Quick Actions" delay={0.15}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
          {QUICK_ACTIONS.map(({ label, icon: Icon, color, to }) => (
            <Link
              key={label}
              to={to}
              className="group flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-2 py-3 text-center transition hover:border-orange-200 hover:bg-orange-50/50"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm ${color}`}>
                <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" strokeWidth={2.25} />
              </span>
              <span className="text-[11px] font-semibold leading-tight text-slate-600 group-hover:text-slate-900">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </PanelShell>
    </div>
  );
}

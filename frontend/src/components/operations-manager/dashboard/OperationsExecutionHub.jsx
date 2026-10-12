import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Car, MapPin, Plane } from 'lucide-react';

const HUB_BG =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=70';

function HubStat({ icon: Icon, iconWrap, value, label, subtitle }) {
  return (
    <div className="min-w-[120px] text-center">
      <div
        className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${iconWrap}`}
      >
        <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" strokeWidth={2.25} />
      </div>
      <p className="text-3xl font-bold tabular-nums leading-none text-slate-900">{value}</p>
      <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{subtitle}</p>
    </div>
  );
}

export default function OperationsExecutionHub({ kpis, hubStats }) {
  const pending = Number(kpis?.pendingBookings ?? 0);
  const hotel = Number(kpis?.hotelConfirmations ?? kpis?.hotelPending ?? 0);
  const cab = Number(kpis?.cabConfirmations ?? kpis?.cabPending ?? 0);
  const onTrip = Number(hubStats?.onTrip ?? kpis?.activeTrips ?? 0);
  const departures = Number(hubStats?.departuresToday ?? kpis?.todaysDepartures ?? 0);
  const arrivals = Number(hubStats?.arrivalsToday ?? kpis?.todaysArrivals ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
    >
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-[55%] bg-cover bg-center opacity-[0.18] sm:opacity-[0.22]"
        style={{ backgroundImage: `url(${HUB_BG})` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[55%] bg-gradient-to-l from-transparent via-white/40 to-white" aria-hidden />

      <div className="relative z-10 grid grid-cols-1 gap-6 p-6 sm:p-8 lg:grid-cols-[1.15fr_auto]">
        <div className="max-w-xl">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-orange-500">
            Trip Execution Hub
          </p>
          <h2 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-[28px]">
            <span className="text-orange-500">{pending}</span>{' '}
            booking{pending === 1 ? '' : 's'} need{pending === 1 ? 's' : ''} operations setup
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {hotel} hotel · {cab} cab confirmations pending
          </p>
          <Link
            to="/operations-manager/bookings/pending"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600"
          >
            View Pending Bookings
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-6 border-t border-slate-100 pt-5 lg:justify-end lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
          <HubStat
            icon={Car}
            iconWrap="bg-emerald-50 text-emerald-600"
            value={onTrip}
            label="On Trip"
            subtitle={onTrip ? 'Bookings in progress' : 'Bookings in progress'}
          />
          <HubStat
            icon={Plane}
            iconWrap="bg-sky-50 text-sky-600"
            value={departures}
            label="Departures Today"
            subtitle={departures ? 'Departing today' : 'No departures'}
          />
          <HubStat
            icon={MapPin}
            iconWrap="bg-violet-50 text-violet-600"
            value={arrivals}
            label="Arrivals Today"
            subtitle={arrivals ? 'Arriving today' : 'No arrivals'}
          />
        </div>
      </div>
    </motion.div>
  );
}

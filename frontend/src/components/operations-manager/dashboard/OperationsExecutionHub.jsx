import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, MapPin, Plane } from 'lucide-react';

const HUB_BG = '/login-himalaya-bg.png';

function HubPill({ icon: Icon, iconWrap, value, label, subtitle, to }) {
  const Shell = to ? Link : 'div';
  const shellProps = to ? { to } : {};
  return (
    <Shell
      {...shellProps}
      className="flex min-w-[148px] items-center gap-3 rounded-2xl border border-white/70 bg-white/92 px-4 py-3 shadow-lg shadow-slate-900/10 backdrop-blur-md transition hover:bg-white"
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconWrap}`}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold tabular-nums leading-none text-slate-900">{value}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-400">{subtitle}</p>
      </div>
    </Shell>
  );
}

export default function OperationsExecutionHub({ kpis, hubStats }) {
  const onTrip = Number(hubStats?.onTrip ?? kpis?.activeTrips ?? 0);
  const departures = Number(hubStats?.departuresToday ?? kpis?.todaysDepartures ?? 0);
  const arrivals = Number(hubStats?.arrivalsToday ?? kpis?.todaysArrivals ?? 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative isolate overflow-hidden rounded-[22px] shadow-sm ring-1 ring-slate-200/60"
    >
      <img
        src={HUB_BG}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[72%_40%]"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/88 to-white/15" />
      <div className="absolute inset-y-0 right-0 w-[48%] bg-gradient-to-l from-slate-900/35 via-slate-900/10 to-transparent" />

      <div className="relative z-10 flex min-h-[220px] flex-col justify-between gap-8 px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-xl">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-white shadow-md shadow-sky-500/30">
                <BadgeCheck className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                Operations Command Center
              </h1>
            </div>
            <p className="text-[15px] font-medium text-slate-600 sm:text-base">
              All Tours. All Bookings. Real-time Ops.
            </p>
          </div>

          <p
            className="hidden max-w-[220px] text-right text-[28px] font-semibold leading-tight text-white drop-shadow-md sm:block lg:text-[32px]"
            style={{ fontFamily: '"Caveat", cursive' }}
          >
            Turning Journeys into Memories
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <HubPill
            icon={Plane}
            iconWrap="bg-sky-50 text-sky-600"
            value={onTrip}
            label="On Trip"
            subtitle="Active Tours"
            to="/operations-manager/bookings/active"
          />
          <HubPill
            icon={Plane}
            iconWrap="bg-amber-50 text-amber-600"
            value={departures}
            label="Departures Today"
            subtitle="Travellers"
            to="/operations-manager/calendar"
          />
          <HubPill
            icon={MapPin}
            iconWrap="bg-violet-50 text-violet-600"
            value={arrivals}
            label="Arrivals Today"
            subtitle="Travellers"
            to="/operations-manager/calendar"
          />
        </div>
      </div>
    </motion.div>
  );
}

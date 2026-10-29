import { motion } from 'framer-motion';
import { BadgeCheck } from 'lucide-react';

const HUB_BG = '/login-himalaya-bg.png';

/** Scenic banner only — KPI counts live in OperationsKpiCards below. */
export default function OperationsExecutionHub() {
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

      <div className="relative z-10 flex min-h-[160px] flex-col justify-center gap-2 px-6 py-6 sm:px-8 sm:py-7">
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
      </div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { PhoneCall, PhoneIncoming, Activity, Clock, Users2 } from 'lucide-react';
import { formatDurationHuman } from '../../../lib/callSession';

export default function CallReportHero({
  totalCalls = 0,
  totalConnected = 0,
  connectionRate = 0,
  totalTalkTimeSec = 0,
  activeExecutives = 0,
  scopeLabel = 'today',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#5B21B6] via-[#7C3AED] to-[#2563EB] shadow-xl shadow-violet-500/25"
    >
      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)',
          backgroundSize: '16px 16px',
        }}
      />
      <div className="absolute inset-0 opacity-50 bg-[radial-gradient(ellipse_at_80%_20%,_rgba(255,255,255,0.22),_transparent_50%)]" />
      <div className="absolute -left-8 -bottom-20 h-48 w-48 rounded-full bg-fuchsia-400/30 blur-3xl" />
      <div className="absolute right-1/4 -top-10 h-32 w-32 rounded-full bg-sky-300/25 blur-2xl" />

      <div className="relative flex flex-col gap-5 px-6 py-7 sm:px-8 sm:py-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-sm ring-1 ring-white/25">
            <PhoneCall className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug tracking-tight">
              Every call, every executive, every day
            </h2>
            <p className="mt-1 text-sm text-violet-100/95">
              Chronological calling history, summary metrics, and analytics — scoped to {scopeLabel}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <StatPill icon={PhoneCall} label="Total calls" value={totalCalls} />
          <StatPill icon={PhoneIncoming} label="Total connected" value={totalConnected} />
          <StatPill icon={Activity} label="Connection rate" value={`${connectionRate}%`} />
          <StatPill icon={Clock} label="Total talk time" value={formatDurationHuman(totalTalkTimeSec, { includeSeconds: true })} />
          <StatPill icon={Users2} label="Active executives" value={activeExecutives} />
        </div>
      </div>
    </motion.div>
  );
}

function StatPill({ icon: Icon, label, value }) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-2xl bg-white/12 px-4 py-2.5 backdrop-blur-sm ring-1 ring-white/20">
      <Icon className="h-4 w-4 text-violet-100" />
      <div className="leading-tight">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-100/80">{label}</p>
        <p className="text-base font-bold tabular-nums text-white">{value}</p>
      </div>
    </div>
  );
}

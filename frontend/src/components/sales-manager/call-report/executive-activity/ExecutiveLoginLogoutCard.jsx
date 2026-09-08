import { LogIn, Radio, Clock3, LogOut } from 'lucide-react';
import { formatTime, formatDurationMs } from './activityFormat';

const MAX_BAR_MS = 10 * 60 * 60 * 1000; // 10h reference for the decorative connector width

function SessionLine({ session }) {
  const { loginAt, logoutAt, lastSeenAt, status, durationMs } = session;
  const pct = Math.max(4, Math.min(100, Math.round(((durationMs || 0) / MAX_BAR_MS) * 100)));
  const barColor = status === 'online' ? 'bg-emerald-400' : status === 'logged_out' ? 'bg-sky-300' : 'bg-slate-300';

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-xs font-semibold tabular-nums text-content-primary">{formatTime(loginAt)}</span>
      </div>
      <div className="h-1 flex-1 min-w-[24px] rounded-full bg-surface-elevated">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      {status === 'online' ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
          <Radio className="h-2.5 w-2.5 animate-pulse" /> Online
        </span>
      ) : status === 'logged_out' ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs font-semibold tabular-nums text-content-primary">{formatTime(logoutAt)}</span>
          <span className="h-2 w-2 rounded-full bg-slate-400" />
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs font-semibold tabular-nums text-content-muted">{formatTime(lastSeenAt)}</span>
          <span className="h-2 w-2 rounded-full bg-amber-400" />
        </div>
      )}
    </div>
  );
}

function StatusCaption({ session }) {
  const { status, durationMs } = session;
  if (status === 'online') {
    return <p className="mt-1 text-[11px] text-emerald-600">Login · Current session: <span className="font-semibold">{formatDurationMs(durationMs)}</span></p>;
  }
  if (status === 'logged_out') {
    return <p className="mt-1 text-[11px] text-content-muted">Login → Logout · Session: <span className="font-semibold text-content-secondary">{formatDurationMs(durationMs)}</span></p>;
  }
  return <p className="mt-1 text-[11px] text-amber-600">Session ended · Last seen · ~<span className="font-semibold">{formatDurationMs(durationMs)}</span></p>;
}

export default function ExecutiveLoginLogoutCard({ mode, rows, loading, executiveName }) {
  const totalMs = mode === 'sessions' ? (rows || []).reduce((s, r) => s + (r.durationMs || 0), 0) : 0;

  return (
    <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/60 to-white p-3.5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-white">
          <LogIn className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-sky-700">Executive Login &amp; Logout</h3>
          <p className="text-[11px] text-sky-600/80">
            {mode === 'sessions' ? `${executiveName || 'Executive'}'s CRM sessions for the selected period` : 'When each executive logged in and out'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-white/70" />)}
        </div>
      ) : !rows?.length ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-sky-100 bg-white py-10 text-center">
          <LogOut className="h-6 w-6 text-content-muted" />
          <p className="text-sm font-semibold text-content-primary">No login activity for this period</p>
        </div>
      ) : (
        <div className="max-h-[320px] space-y-1.5 overflow-y-auto rounded-xl border border-sky-100 bg-white p-2">
          {rows.map((row, i) => (
            <div key={row._id || i} className="rounded-lg border border-subtle px-2.5 py-2">
              <div className="flex flex-wrap items-center gap-3">
                {mode === 'roster' && (
                  <div className="w-28 shrink-0">
                    <p className="truncate text-xs font-semibold text-content-primary">{row.name}</p>
                    {row.sessionCount > 1 && <p className="text-[9px] text-content-muted">{row.sessionCount} sessions</p>}
                  </div>
                )}
                {row.status === 'no_login' ? (
                  <p className="text-xs text-content-muted">No login recorded</p>
                ) : (
                  <div className="min-w-0 flex-1">
                    <SessionLine session={row} />
                    <StatusCaption session={row} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {mode === 'sessions' && rows.length > 1 && (
            <div className="flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2 text-xs">
              <span className="font-semibold text-sky-700">Total session time</span>
              <span className="font-bold tabular-nums text-sky-700">{formatDurationMs(totalMs)}</span>
            </div>
          )}
        </div>
      )}

      <p className="mt-2 flex items-start gap-1.5 text-[11px] text-content-muted">
        <Clock3 className="mt-0.5 h-3 w-3 shrink-0" />
        Session timing reflects actual login/logout events only — see CRM Active Time for how much of that session had real activity.
      </p>
    </div>
  );
}

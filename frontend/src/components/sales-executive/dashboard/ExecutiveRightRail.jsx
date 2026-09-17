import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CheckSquare,
  Phone,
  FileText,
  BarChart3,
  CalendarClock,
  Activity,
} from 'lucide-react';
import { formatFollowUpDate } from '../executiveUtils';

const DEFAULT_TASKS = [
  { id: 't1', label: 'Follow up with new leads', icon: CheckSquare, tone: 'bg-orange-100 text-orange-600' },
  { id: 't2', label: 'Make customer calls', icon: Phone, tone: 'bg-sky-100 text-sky-600' },
  { id: 't3', label: 'Send pending quotations', icon: FileText, tone: 'bg-violet-100 text-violet-600' },
  { id: 't4', label: 'Update daily reports', icon: BarChart3, tone: 'bg-emerald-100 text-emerald-600' },
];

const ACTIVITY_FALLBACK = [
  { key: 'lead', label: 'Lead created' },
  { key: 'followup', label: 'Follow-up' },
  { key: 'call', label: 'Call made' },
  { key: 'quote', label: 'Quotation sent' },
];

function formatLongDate(date) {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function activityTone(type = '') {
  if (type.includes('call')) return 'bg-sky-500';
  if (type.includes('email')) return 'bg-violet-500';
  if (type.includes('quotation')) return 'bg-orange-500';
  if (type.includes('follow')) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export default function ExecutiveRightRail({
  now = new Date(),
  todayTasks = [],
  upcomingFollowups = [],
  todayActivities = [],
}) {
  const tasks = todayTasks.length
    ? todayTasks.slice(0, 4).map((task, index) => ({
        id: task._id || `task-${index}`,
        label: task.title || 'Follow-up task',
        icon: CalendarClock,
        tone: 'bg-orange-100 text-orange-600',
        meta: task.destination,
      }))
    : DEFAULT_TASKS.map((task) => ({ ...task, meta: null }));

  return (
    <aside className="space-y-3">
      <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2 text-slate-700">
          <CalendarDays className="h-4 w-4 text-orange-500" />
          <p className="text-sm font-semibold">{formatLongDate(now)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800">Today&apos;s Tasks</h3>
        <div className="mt-3 space-y-2">
          {tasks.map((task) => {
            const Icon = task.icon || CheckSquare;
            return (
              <div
                key={task.id}
                className="flex items-start gap-2.5 rounded-xl bg-slate-50 px-2.5 py-2.5"
              >
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${task.tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-700">{task.label}</p>
                  {task.meta ? (
                    <p className="mt-0.5 text-[11px] text-slate-400">{task.meta}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-800">Upcoming Follow-ups</h3>
          <Link to="/sales-executive/follow-ups" className="text-[11px] font-semibold text-orange-600 hover:underline">
            View all
          </Link>
        </div>
        {upcomingFollowups.length ? (
          <div className="mt-3 space-y-2">
            {upcomingFollowups.slice(0, 4).map((item) => (
              <Link
                key={item._id}
                to="/sales-executive/follow-ups"
                className="block rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 transition hover:border-orange-200"
              >
                <p className="truncate text-[13px] font-semibold text-slate-800">
                  {item.customer || 'Lead'}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                  {item.destination || 'No destination'}
                  {item.scheduledAt ? ` · ${formatFollowUpDate(item.scheduledAt)}` : ''}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center px-2 py-6 text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <CalendarClock className="h-6 w-6" />
            </div>
            <p className="text-[13px] font-medium text-slate-600">No upcoming follow-ups</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800">Recent Activity</h3>
        {todayActivities.length ? (
          <div className="relative mt-3 space-y-3 pl-1">
            {todayActivities.slice(0, 5).map((activity, index) => (
              <div key={activity._id || index} className="relative flex gap-3 pl-4">
                <span
                  className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${activityTone(activity.type)}`}
                />
                {index < Math.min(todayActivities.length, 5) - 1 ? (
                  <span className="absolute left-[4px] top-4 h-[calc(100%+4px)] w-px bg-slate-200" />
                ) : null}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800">
                    {activity.title || activity.type?.replace(/_/g, ' ')}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {activity.customer || activity.description || 'Just now'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {ACTIVITY_FALLBACK.map((item) => (
              <div key={item.key} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Activity className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[13px] font-medium text-slate-700">{item.label}</p>
                  <p className="text-[11px] text-slate-400">No recent activity</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}

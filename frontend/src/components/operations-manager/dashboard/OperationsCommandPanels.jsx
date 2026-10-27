import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckSquare, ImageIcon } from 'lucide-react';
import BookingStatusBadge from '../bookings/BookingStatusBadge';
import { getAvatarColor, getInitials } from '../bookings/bookingListUtils';
import { formatDate } from '../operationsUtils';
import { cn } from '../../../lib/utils';

function paxLabel(tour) {
  const n = Number(tour?.adults || 0) + Number(tour?.children || 0) || Number(tour?.pax || 0);
  return n > 0 ? `${n} Pax` : '—';
}

const TOUR_THUMBS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=200&q=60',
  'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=200&q=60',
  'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=200&q=60',
  'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=200&q=60',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=200&q=60',
];

function PanelShell({ title, to, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex min-h-[340px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-xs font-semibold text-orange-500 hover:text-orange-600"
        >
          View All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="flex-1">{children}</div>
    </motion.div>
  );
}

function PriorityBadge({ priority }) {
  const map = {
    high: 'bg-rose-50 text-rose-600 ring-rose-200',
    medium: 'bg-orange-50 text-orange-600 ring-orange-200',
    low: 'bg-sky-50 text-sky-600 ring-sky-200',
  };
  const label = priority === 'high' ? 'High' : priority === 'medium' ? 'Medium' : 'Low';
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset',
        map[priority] || map.low
      )}
    >
      {label}
    </span>
  );
}

function dueLabel(dueDate) {
  if (!dueDate) return '—';
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  if (dueDay.getTime() === today.getTime()) return 'Today';
  if (dueDay.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function statusTone(status) {
  if (status === 'confirmed' || status === 'in_progress') return 'Confirmed';
  if (status === 'completed') return 'Confirmed';
  if (['booking_received', 'pending_verification', 'pending'].includes(status)) return 'Pending';
  return null;
}

export default function OperationsCommandPanels({ data }) {
  if (!data) return null;

  const recent = data.recentBookings || [];
  const upcoming = data.upcomingTrips || [];
  const tasks = data.operationsTasks || [];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <PanelShell title="Recent Bookings" to="/operations-manager/bookings/pending" delay={0.05}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-2.5 font-bold">#</th>
                <th className="px-2 py-2.5 font-bold">Customer</th>
                <th className="px-2 py-2.5 font-bold">Package</th>
                <th className="px-2 py-2.5 font-bold">Travel Date</th>
                <th className="px-4 py-2.5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                    No recent bookings
                  </td>
                </tr>
              ) : (
                recent.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <Link
                        to={`/operations-manager/booking/${b._id}`}
                        className="font-mono text-xs font-bold text-orange-500 hover:underline"
                      >
                        {b.bookingNumber || '—'}
                      </Link>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
                            getAvatarColor(b.customerName)
                          )}
                        >
                          {getInitials(b.customerName)}
                        </span>
                        <span className="truncate text-sm font-medium text-slate-800">
                          {b.customerName || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-[120px] truncate px-2 py-3 text-sm text-slate-500">
                      {b.packageName || b.destination || '—'}
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-sm text-slate-500">
                      {formatDate(b.travelDate || b.travelStart)}
                    </td>
                    <td className="px-4 py-3">
                      <BookingStatusBadge status={b.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PanelShell>

      <PanelShell title="Upcoming Tours" to="/operations-manager/trip-tracker" delay={0.1}>
        <div className="divide-y divide-slate-50">
          {upcoming.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">No upcoming tours</p>
          ) : (
            upcoming.map((tour, i) => {
              const tone = statusTone(tour.status);
              return (
                <Link
                  key={tour._id}
                  to={`/operations-manager/booking/${tour._id}`}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/80"
                >
                  <div className="relative h-12 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    <img
                      src={TOUR_THUMBS[i % TOUR_THUMBS.length]}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {!TOUR_THUMBS[i % TOUR_THUMBS.length] && (
                      <ImageIcon className="absolute inset-0 m-auto h-4 w-4 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {tour.packageName || `${tour.destination || 'Tour'} Group Tour`}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatDate(tour.travelDate)} · {paxLabel(tour)}
                    </p>
                  </div>
                  {tone === 'Confirmed' ? (
                    <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 ring-1 ring-inset ring-emerald-200">
                      Confirmed
                    </span>
                  ) : tone === 'Pending' ? (
                    <span className="shrink-0 rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600 ring-1 ring-inset ring-orange-200">
                      Pending
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-600 ring-1 ring-inset ring-sky-200">
                      In Process
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </PanelShell>

      <PanelShell title="Operations Tasks" to="/operations-manager/tasks" delay={0.15}>
        <div className="divide-y divide-slate-50">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
              <CheckSquare className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-400">No pending operations tasks</p>
            </div>
          ) : (
            tasks.map((task) => (
              <Link
                key={task._id}
                to={
                  task.bookingId
                    ? `/operations-manager/booking/${task.bookingId}`
                    : '/operations-manager/tasks'
                }
                className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/80"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-slate-300 bg-white" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug text-slate-800">{task.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-[11px] font-medium text-slate-400">
                      {dueLabel(task.dueDate)}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </PanelShell>
    </div>
  );
}

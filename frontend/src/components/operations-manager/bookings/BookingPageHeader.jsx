import { motion } from 'framer-motion';
import { Ban, Calendar, CheckCircle2, CircleCheck, MoreHorizontal, PauseCircle, Plane, Ticket } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatDateRangeLabel } from './bookingListUtils';

const STATUS_ICONS = {
  all: { icon: Ticket, className: 'text-sky-500' },
  confirmed: { icon: CheckCircle2, className: 'text-emerald-500' },
  active: { icon: Plane, className: 'text-blue-500' },
  completed: { icon: CircleCheck, className: 'text-slate-600' },
  cancelled: { icon: Ban, className: 'text-rose-500' },
  postponed: { icon: PauseCircle, className: 'text-amber-500' },
};

export default function BookingPageHeader({
  title,
  total,
  description,
  breadcrumbs,
  dateFrom,
  dateTo,
  status,
  badgeClassName,
}) {
  const statusIcon = STATUS_ICONS[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5"
    >
      {breadcrumbs?.length > 0 && (
        <nav className="text-xs text-content-muted mb-2 flex items-center gap-1.5">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-1.5">
              {i > 0 && <span>/</span>}
              <span className={i === breadcrumbs.length - 1 ? 'text-content-secondary font-medium' : ''}>
                {crumb}
              </span>
            </span>
          ))}
        </nav>
      )}

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            {statusIcon && (
              <statusIcon.icon className={cn('w-7 h-7 shrink-0', statusIcon.className)} strokeWidth={2.25} />
            )}
            <h1 className="text-2xl sm:text-[26px] font-bold text-content-primary tracking-tight">
              {title}
            </h1>
            {total != null && (
              <span
                className={cn(
                  'px-2.5 py-0.5 rounded-lg text-sm font-bold metric-tabular',
                  badgeClassName || 'bg-sky-100 text-sky-700'
                )}
              >
                {total.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-content-secondary">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-subtle bg-white text-sm font-medium text-content-primary hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Calendar className="w-4 h-4 text-content-muted" />
            {formatDateRangeLabel(dateFrom, dateTo)}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-subtle bg-white text-content-muted hover:bg-slate-50 transition-colors shadow-sm"
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

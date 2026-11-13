import { useEffect, useState } from 'react';
import { CalendarRange, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { BOOKING_STATUS_CONFIG } from '../constants';

const PENDING_STATUSES = ['booking_received', 'pending_verification', 'pending'];

export default function BookingFilterBar({
  filters,
  onChange,
  onApply,
  onReset,
  onApplyNow,
  destinations = [],
  packages = [],
  showStatusFilter = true,
  statusOptions = PENDING_STATUSES,
  searchPlaceholder = 'Search customer, booking #, destination...',
  activeCount = 0,
  singleDate = false,
  defaultExpanded = true,
}) {
  const [open, setOpen] = useState(defaultExpanded);

  useEffect(() => {
    setOpen(defaultExpanded);
  }, [defaultExpanded]);

  const patch = (partial, { apply = false } = {}) => {
    const next = { ...filters, ...partial };
    onChange(next);
    if (apply) {
      if (onApplyNow) onApplyNow(next);
      else onApply?.();
    }
  };

  const onSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onApply?.();
    }
  };

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-sky-200/70 bg-white shadow-[0_1px_3px_rgba(14,165,233,0.06),0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="border-b border-sky-100/80 bg-gradient-to-r from-sky-50/90 via-white to-teal-50/40 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-600/70" />
            <input
              value={filters.search || ''}
              onChange={(e) => patch({ search: e.target.value })}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              className="h-11 w-full rounded-xl border border-sky-200/80 bg-white pl-10 pr-28 text-sm text-content-primary outline-none transition placeholder:text-content-muted focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
              {filters.search ? (
                <button
                  type="button"
                  onClick={() => patch({ search: '' }, { apply: true })}
                  className="rounded-lg p-1.5 text-content-muted hover:bg-slate-100 hover:text-content-primary"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onApply}
                className="rounded-lg bg-sky-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-sky-700"
              >
                Search
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition',
                open
                  ? 'border-sky-300 bg-sky-50 text-sky-800'
                  : 'border-subtle bg-white text-content-primary hover:bg-slate-50'
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeCount > 0 ? (
                <span className="rounded-full bg-sky-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {activeCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-subtle bg-white text-content-muted transition hover:bg-slate-50 hover:text-content-primary"
              title="Reset filters"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-content-muted">
          Search updates as you type · use Filters for status, destination, package and travel dates
        </p>
      </div>

      {open ? (
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6 xl:items-end">
          {showStatusFilter ? (
            <label className="block space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-content-muted">
                Status
              </span>
              <select
                value={filters.bookingStatus || ''}
                onChange={(e) => patch({ bookingStatus: e.target.value }, { apply: true })}
                className="h-10 w-full rounded-xl border border-subtle bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="">All statuses</option>
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {BOOKING_STATUS_CONFIG[s]?.label || s}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-content-muted">
              Destination
            </span>
            <select
              value={filters.destination || ''}
              onChange={(e) => patch({ destination: e.target.value }, { apply: true })}
              className="h-10 w-full rounded-xl border border-subtle bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="">All destinations</option>
              {destinations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-content-muted">
              Package
            </span>
            <select
              value={filters.package || ''}
              onChange={(e) => patch({ package: e.target.value }, { apply: true })}
              className="h-10 w-full rounded-xl border border-subtle bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="">All packages</option>
              {packages.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-content-muted">
              Date type
            </span>
            <select
              value={filters.dateField || (singleDate ? 'travelDate' : 'createdAt')}
              onChange={(e) => patch({ dateField: e.target.value }, { apply: true })}
              className="h-10 w-full rounded-xl border border-subtle bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="createdAt">Booking date</option>
              <option value="travelDate">Travel date</option>
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-content-muted">
              <CalendarRange className="h-3 w-3" />
              {singleDate ? 'Date' : 'From'}
            </span>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => patch({ dateFrom: e.target.value }, { apply: true })}
              className="h-10 w-full rounded-xl border border-subtle bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </label>

          {!singleDate ? (
            <label className="block space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-content-muted">
                To
              </span>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => patch({ dateTo: e.target.value }, { apply: true })}
                  className="h-10 min-w-0 flex-1 rounded-xl border border-subtle bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                <button
                  type="button"
                  onClick={onApply}
                  className="h-10 shrink-0 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700"
                >
                  Apply
                </button>
              </div>
            </label>
          ) : (
            <div className="flex items-end">
              <button
                type="button"
                onClick={onApply}
                className="h-10 w-full rounded-xl bg-sky-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

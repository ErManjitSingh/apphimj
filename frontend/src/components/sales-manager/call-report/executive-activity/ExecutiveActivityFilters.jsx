import { useMemo, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';

function toInputDate(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

export const ACTIVITY_PRESETS = [
  { key: 'today', label: 'Today', days: 0 },
  { key: 'yesterday', label: 'Yesterday', days: 1, single: true },
  { key: '7d', label: '7 Days', days: 6 },
  { key: '30d', label: '30 Days', days: 29 },
];

export function applyActivityPreset(key) {
  const now = new Date();
  const preset = ACTIVITY_PRESETS.find((p) => p.key === key) || ACTIVITY_PRESETS[0];
  if (preset.single) {
    const d = new Date(now);
    d.setDate(d.getDate() - preset.days);
    const day = toInputDate(d);
    return { dateFrom: day, dateTo: day };
  }
  const from = new Date(now);
  from.setDate(from.getDate() - preset.days);
  return { dateFrom: toInputDate(from), dateTo: toInputDate(now) };
}

export function activeActivityPreset(filters = {}) {
  for (const preset of ACTIVITY_PRESETS) {
    const next = applyActivityPreset(preset.key);
    if (filters.dateFrom === next.dateFrom && filters.dateTo === next.dateTo) return preset.key;
  }
  return 'custom';
}

export default function ExecutiveActivityFilters({
  filters,
  onChange,
  executives = [],
  executiveId,
  onExecutiveChange,
}) {
  const [showCustom, setShowCustom] = useState(false);
  const active = useMemo(() => activeActivityPreset(filters), [filters]);
  const isCustom = active === 'custom' || showCustom;

  const setPreset = (key) => {
    setShowCustom(false);
    onChange?.(applyActivityPreset(key));
  };

  return (
    <div className="rounded-xl border border-subtle bg-white p-3.5 shadow-sm dark:bg-slate-900/80">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {ACTIVITY_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => setPreset(preset.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                active === preset.key && !showCustom
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-surface-elevated text-content-muted hover:text-content-primary'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCustom((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              isCustom ? 'bg-indigo-600 text-white shadow-sm' : 'bg-surface-elevated text-content-muted hover:text-content-primary'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Custom range
          </button>
        </div>

        <select
          value={executiveId}
          onChange={(e) => onExecutiveChange?.(e.target.value)}
          className="h-10 min-w-[200px] rounded-xl border border-subtle bg-white px-3 text-sm font-medium text-content-primary"
        >
          <option value="all">All Executives</option>
          {executives.map((ex) => (
            <option key={ex._id} value={ex._id}>{ex.name}</option>
          ))}
        </select>
      </div>

      {isCustom && (
        <div className="mt-3 flex flex-col gap-2 rounded-lg border border-subtle bg-surface-elevated/60 p-2.5 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-wide text-content-muted">
            From
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => onChange?.({ ...filters, dateFrom: e.target.value })}
              className="mt-1 h-9 w-full rounded-lg border border-subtle bg-white px-2.5 text-xs text-content-primary outline-none focus:border-teal-400"
            />
          </label>
          <label className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-wide text-content-muted">
            To
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => onChange?.({ ...filters, dateTo: e.target.value })}
              className="mt-1 h-9 w-full rounded-lg border border-subtle bg-white px-2.5 text-xs text-content-primary outline-none focus:border-teal-400"
            />
          </label>
          <button
            type="button"
            onClick={() => { setShowCustom(false); onChange?.(applyActivityPreset('today')); }}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-lg border border-subtle bg-white px-3 text-[11px] font-semibold text-content-muted hover:bg-surface-elevated"
          >
            <X className="h-3 w-3" />
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

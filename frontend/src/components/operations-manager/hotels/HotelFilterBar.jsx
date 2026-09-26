import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Filter, MapPin, RotateCcw, Search, X } from 'lucide-react';

function DestinationSearchInput({ value, onChange, options = [] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const suggestions = useMemo(() => {
    const q = String(value || '').trim().toLowerCase();
    const list = q
      ? options.filter((d) => String(d).toLowerCase().includes(q))
      : options;
    return list.slice(0, 12);
  }, [options, value]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search destination..."
        className="h-10 w-full rounded-xl border border-subtle bg-slate-50 pl-9 pr-9 text-sm text-content-primary outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/40"
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
            setOpen(false);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-content-muted hover:bg-slate-100"
          aria-label="Clear destination"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {open && suggestions.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-subtle bg-white py-1 shadow-lg">
          {suggestions.map((d) => (
            <li key={d}>
              <button
                type="button"
                onClick={() => {
                  onChange(d);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-content-primary hover:bg-blue-50"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-content-muted" />
                <span className="truncate">{d}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function HotelFilterBar({
  filters,
  onChange,
  onApply,
  onReset,
  onExport,
  categories = [],
  destinations = [],
  locations = [],
  roomTypes = [],
  mealPlans = [],
  activeCount = 0,
}) {
  const set = (key, val) => onChange({ ...filters, [key]: val });

  return (
    <div className="mb-4 rounded-2xl border border-subtle bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
          <input
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Search hotels by name, location, category..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-subtle bg-slate-50 text-sm text-content-primary placeholder:text-content-muted outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500/40 transition-all"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filter
            {activeCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-white/20 rounded-full font-bold">
                {activeCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-subtle bg-white text-sm font-semibold text-content-primary hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-subtle bg-white text-content-muted hover:bg-slate-50 transition-colors"
            title="Reset filters"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <DestinationSearchInput
          value={filters.destination || ''}
          onChange={(val) => set('destination', val)}
          options={destinations}
        />
        <select
          value={filters.category}
          onChange={(e) => set('category', e.target.value)}
          className="h-10 rounded-xl border border-subtle bg-slate-50 px-3 text-sm text-content-primary outline-none focus:ring-2 focus:ring-blue-500/25"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filters.location}
          onChange={(e) => set('location', e.target.value)}
          className="h-10 rounded-xl border border-subtle bg-slate-50 px-3 text-sm text-content-primary outline-none focus:ring-2 focus:ring-blue-500/25"
        >
          <option value="">All Locations</option>
          {locations.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select
          value={filters.roomType}
          onChange={(e) => set('roomType', e.target.value)}
          className="h-10 rounded-xl border border-subtle bg-slate-50 px-3 text-sm text-content-primary outline-none focus:ring-2 focus:ring-blue-500/25"
        >
          <option value="">All Room Types</option>
          {roomTypes.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={filters.mealPlan}
          onChange={(e) => set('mealPlan', e.target.value)}
          className="h-10 rounded-xl border border-subtle bg-slate-50 px-3 text-sm text-content-primary outline-none focus:ring-2 focus:ring-blue-500/25"
        >
          <option value="">All Meal Plans</option>
          {mealPlans.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List } from 'lucide-react';
import API from '../../../api/axios';
import { cn } from '../../../lib/utils';
import TripTrackerHeader from './TripTrackerHeader';
import TripTrackerKpiStrip from './TripTrackerKpiStrip';
import TripTrackerCard from './TripTrackerCard';
import TripTrackerBottomPanels from './TripTrackerBottomPanels';
import { sortTrips } from './tripTrackerUtils';

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const VALID_TABS = new Set(TABS.map((t) => t.key));

const SORT_OPTIONS = [
  { value: 'departure', label: 'Departure Date' },
  { value: 'customer', label: 'Customer Name' },
  { value: 'destination', label: 'Destination' },
];

export default function TripTrackerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = VALID_TABS.has(tabParam) ? tabParam : 'upcoming';

  const [data, setData] = useState(null);
  const [sortBy, setSortBy] = useState('departure');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);

  const setTab = (key) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', key);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    setLoading(true);
    API.get('/operations-manager/trip-tracker', { skipSuccessToast: true })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  const trips = useMemo(
    () => sortTrips(data?.[tab], sortBy),
    [data, tab, sortBy]
  );

  const tabCount = (key) => data?.summary?.[key] ?? data?.[key]?.length ?? 0;

  return (
    <div className="space-y-1 pb-8">
      <TripTrackerHeader />

      <TripTrackerKpiStrip summary={data?.summary} loading={loading} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100/80 border border-subtle">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                tab === key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-content-muted hover:text-content-primary'
              )}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-80">({tabCount(key)})</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-10 rounded-xl border border-subtle bg-white px-3 text-sm text-content-primary outline-none focus:ring-2 focus:ring-blue-500/25"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Sort by: {opt.label}
              </option>
            ))}
          </select>
          <div className="flex rounded-xl border border-subtle bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center transition-colors',
                viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-content-muted hover:bg-slate-50'
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center transition-colors',
                viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-content-muted hover:bg-slate-50'
              )}
              aria-label="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white border border-subtle animate-pulse h-[340px]" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="rounded-2xl border border-subtle bg-white py-20 text-center text-content-muted">
          No trips in this category
        </div>
      ) : (
        <div
          className={cn(
            'gap-5',
            viewMode === 'grid' ? 'grid grid-cols-1 xl:grid-cols-2' : 'flex flex-col'
          )}
        >
          {trips.map((trip, i) => (
            <TripTrackerCard key={trip._id} trip={trip} index={i} compact={viewMode === 'list'} />
          ))}
        </div>
      )}

      <TripTrackerBottomPanels
        statusOverview={data?.statusOverview}
        upcomingDepartures={data?.upcomingDepartures}
      />
    </div>
  );
}

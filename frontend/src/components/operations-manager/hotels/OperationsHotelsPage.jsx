import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import API from '../../../api/axios';
import { cn } from '../../../lib/utils';
import TablePagination from '../../ui/TablePagination';
import OperationsDataTable from '../ui/OperationsDataTable';
import HotelInventoryHeader from './HotelInventoryHeader';
import HotelKpiStrip from './HotelKpiStrip';
import HotelFilterBar from './HotelFilterBar';
import HotelRowActions, { HotelCategoryCell, HotelStatusBadge } from './HotelRowActions';
import {
  countActiveHotelFilters,
  exportHotelsCsv,
  formatHotelPrice,
  getHotelThumbClass,
} from './hotelListUtils';

const EMPTY_FILTERS = {
  search: '',
  category: '',
  location: '',
  roomType: '',
  mealPlan: '',
};

export default function OperationsHotelsPage() {
  const [hotels, setHotels] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    locations: [],
    roomTypes: [],
    mealPlans: [],
  });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const fetchHotels = useCallback(() => {
    setLoading(true);
    API.get('/operations-manager/hotels', {
      params: {
        page: pagination.page,
        limit: pagination.limit,
        search: appliedFilters.search || undefined,
        category: appliedFilters.category || undefined,
        location: appliedFilters.location || undefined,
        roomType: appliedFilters.roomType || undefined,
        mealPlan: appliedFilters.mealPlan || undefined,
      },
      skipSuccessToast: true,
    })
      .then((r) => {
        const payload = r.data || {};
        setHotels(payload.data || []);
        setSummary(payload.summary || null);
        setFilterOptions(payload.filters || {
          categories: [],
          locations: [],
          roomTypes: [],
          mealPlans: [],
        });
        setPagination((prev) => ({
          ...prev,
          total: payload.pagination?.total ?? 0,
          totalPages: payload.pagination?.totalPages ?? 1,
        }));
      })
      .finally(() => setLoading(false));
  }, [pagination.page, pagination.limit, appliedFilters]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  const columns = useMemo(() => [
    {
      key: 'name',
      header: 'Hotel',
      render: (h) => (
        <div className="flex items-center gap-3 min-w-[220px]">
          {h.coverImage || h.images?.[0] ? (
            <img
              src={h.coverImage || h.images[0]}
              alt={h.name}
              className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-sm"
              loading="lazy"
            />
          ) : (
            <div
              className={cn(
                'w-12 h-12 rounded-xl bg-gradient-to-br shrink-0 flex items-center justify-center shadow-sm',
                getHotelThumbClass(h.name)
              )}
            >
              <Building2 className="w-5 h-5 text-white/90" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-content-primary truncate">{h.name}</p>
            <p className="text-xs text-content-muted truncate">{h.displayCity || h.location}</p>
            <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
              ID: {h.displayCode}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (h) => <HotelCategoryCell category={h.category} />,
    },
    {
      key: 'location',
      header: 'Location',
      className: 'text-content-secondary text-sm',
      render: (h) => h.location || '—',
    },
    {
      key: 'roomType',
      header: 'Room Type',
      className: 'text-sm text-content-secondary',
      render: (h) => h.displayRoomType || '—',
    },
    {
      key: 'mealPlan',
      header: 'Meal Plan',
      className: 'text-sm text-content-secondary',
      render: (h) => h.displayMealPlan || '—',
    },
    {
      key: 'price',
      header: 'Price / Night',
      render: (h) => (
        <div>
          <p className="font-bold text-emerald-600 tabular-nums text-base">
            {formatHotelPrice(h.displayPrice)}
          </p>
          <p className="text-[10px] text-content-muted">Per Night</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (h) => <HotelStatusBadge status={h.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'w-28 text-right',
      className: 'text-right',
      render: (h) => <HotelRowActions hotelId={h._id} />,
    },
  ], []);

  const handleApply = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setAppliedFilters({ ...filters });
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleExport = () => {
    exportHotelsCsv(hotels);
  };

  return (
    <div className="space-y-1 pb-8">
      <HotelInventoryHeader total={summary?.count ?? pagination.total} />

      <HotelKpiStrip summary={summary} loading={loading} />

      <HotelFilterBar
        filters={filters}
        onChange={setFilters}
        onApply={handleApply}
        onReset={handleReset}
        onExport={handleExport}
        categories={filterOptions.categories}
        locations={filterOptions.locations}
        roomTypes={filterOptions.roomTypes}
        mealPlans={filterOptions.mealPlans}
        activeCount={countActiveHotelFilters(appliedFilters)}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-subtle/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(13,148,136,0.06)] overflow-hidden"
      >
        <OperationsDataTable
          columns={columns}
          data={hotels}
          loading={loading}
          emptyIcon={Building2}
          emptyTitle="No hotels in inventory"
          emptyDescription="Add hotel partners to confirm stays for upcoming trips."
          className="border-0 shadow-none rounded-none"
        />

        {!loading && hotels.length > 0 && (
          <TablePagination
            className="border-t border-subtle/80 bg-surface-elevated/30"
            pageIndex={pagination.page - 1}
            pageSize={pagination.limit}
            pageCount={pagination.totalPages}
            total={pagination.total}
            totalLabel="hotels"
            showPageNumbers
            onPageChange={(pageIndex) => setPagination((prev) => ({ ...prev, page: pageIndex + 1 }))}
            onPageSizeChange={(limit) => setPagination((prev) => ({ ...prev, limit, page: 1 }))}
          />
        )}
      </motion.div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Car, ClipboardList, MessageCircle } from 'lucide-react';
import API from '../../../api/axios';
import { cn } from '../../../lib/utils';
import TablePagination from '../../ui/TablePagination';
import OperationsDataTable from '../ui/OperationsDataTable';
import { formatINR, formatPax } from '../operationsUtils';
import { BOOKING_STATUS_CONFIG, CONFIRMATION_CONFIG } from '../constants';
import BookingPageHeader from './BookingPageHeader';
import BookingKpiStrip from './BookingKpiStrip';
import BookingFilterBar from './BookingFilterBar';
import BookingRowActions from './BookingRowActions';
import TotalBookingsOverview from './TotalBookingsOverview';
import {
  countActiveBookingFilters,
  formatActiveTravelDate,
  formatCompletedReturnDate,
  formatTravelDateWithDay,
  getAvatarColor,
  getCabDisplayDetail,
  getDestinationFlag,
  getHotelDisplayDetail,
  getInitials,
  getPrimaryCabLabel,
  getPrimaryHotelName,
  isNewBooking,
  resolveListStatus,
} from './bookingListUtils';

const ALL_STATUS_OPTIONS = [
  'booking_received',
  'pending_verification',
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'refund_pending',
  'refund_completed',
];

const PAYMENT_BADGE = {
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  partial: { label: 'Partial', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  pending: { label: 'Unpaid', className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' },
  refunded: { label: 'Refunded', className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
};

const PAGE_META = {
  all: {
    title: 'Total Bookings',
    desc: 'Complete booking portfolio — pipeline, collections, and trip readiness in one place',
    searchPlaceholder: 'Search customer, booking #, phone, destination, package...',
    paginationLabel: 'bookings',
  },
  pending: {
    title: 'Pending Bookings',
    desc: 'New confirmed sales awaiting operations setup',
    searchPlaceholder: 'Search customer, booking #, destination...',
    paginationLabel: 'bookings',
  },
  confirmed: {
    title: 'Confirmed Bookings',
    desc: 'Hotels & transport confirmed — ready for departure',
    searchPlaceholder: 'Search bookings by customer, destination, booking #...',
    paginationLabel: 'bookings',
  },
  active: {
    title: 'Active Trips',
    desc: 'Guests currently traveling — monitor trip execution in real-time',
    searchPlaceholder: 'Search by booking #, customer, destination, hotel...',
    paginationLabel: 'active trips',
  },
  postponed: {
    title: 'Postponed Bookings',
    desc: 'Bookings linked to postponed leads — travel dates on hold',
    searchPlaceholder: 'Search customer, booking #, destination...',
    paginationLabel: 'postponed bookings',
  },
  cancelled: {
    title: 'Cancelled Bookings',
    desc: 'Cancelled tours — review refund and closure status',
    searchPlaceholder: 'Search customer, booking #, destination...',
    paginationLabel: 'cancelled bookings',
  },
  completed: {
    title: 'Completed Trips',
    desc: 'Successfully fulfilled bookings — review trip closure & voucher status',
    searchPlaceholder: 'Search by booking #, customer, destination, hotel...',
    paginationLabel: 'completed trips',
  },
};

const EMPTY_FILTERS = {
  search: '',
  bookingStatus: '',
  destination: '',
  package: '',
  dateFrom: '',
  dateTo: '',
};

function ConfirmationCell({ value, detail, listStatus, icon: Icon }) {
  const cfg = CONFIRMATION_CONFIG[value] || CONFIRMATION_CONFIG.pending;
  const showDetail = listStatus === 'confirmed' || listStatus === 'active' || listStatus === 'all';

  return (
    <div className="min-w-[108px]">
      <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md', cfg.className)}>
        {Icon && <Icon className="w-3 h-3 shrink-0 opacity-80" />}
        {cfg.label}
      </span>
      {showDetail && detail && (
        <p className="text-[11px] text-content-muted mt-1 truncate max-w-[150px]">{detail}</p>
      )}
    </div>
  );
}

function PaymentCell({ booking }) {
  const key = booking.paymentStatus || 'pending';
  const badge = PAYMENT_BADGE[key] || PAYMENT_BADGE.pending;
  const pending = Number(booking.pendingAmount || 0);

  return (
    <div className="min-w-[100px]">
      <span className={cn('inline-flex text-[11px] font-semibold px-2.5 py-1 rounded-md', badge.className)}>
        {badge.label}
      </span>
      {pending > 0 && key !== 'paid' && (
        <p className="text-[11px] text-amber-700 mt-1 font-medium tabular-nums">
          Due {formatINR(pending)}
        </p>
      )}
    </div>
  );
}

function buildAllColumns() {
  return [
    {
      key: 'bookingNumber',
      header: 'Booking #',
      render: (b) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-blue-600">{b.bookingNumber}</span>
            {isNewBooking(b) && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">New</span>
            )}
          </div>
          <span className="text-[10px] text-content-muted">
            {b.createdAt
              ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (b) => (
        <div className="flex items-center gap-3 min-w-[190px]">
          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0', getAvatarColor(b.customerName))}>
            {getInitials(b.customerName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-content-primary break-words">{b.customerName}</p>
            <div className="flex items-center gap-1.5 text-xs text-content-muted">
              <span className="break-all">{b.customerPhone || '—'}</span>
              {b.customerPhone && (
                <a
                  href={`https://wa.me/${String(b.customerPhone).replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-emerald-600 hover:text-emerald-500"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'destination',
      header: 'Trip',
      headerClassName: 'w-[180px] max-w-[180px]',
      className: 'w-[180px] max-w-[180px] overflow-hidden',
      render: (b) => {
        const tripName = b.destination || '—';
        const pkg = b.packageName || 'Custom package';
        return (
          <div className="min-w-0 max-w-[160px] overflow-hidden">
            <p className="flex items-center gap-1.5 font-medium min-w-0" title={tripName}>
              <span className="text-base leading-none shrink-0">{getDestinationFlag(tripName)}</span>
              <span className="truncate">{tripName}</span>
            </p>
            <p className="text-[11px] text-content-muted mt-0.5 truncate" title={pkg}>
              {pkg}
            </p>
          </div>
        );
      },
    },
    {
      key: 'travel',
      header: 'Travel window',
      headerClassName: 'w-[170px] whitespace-nowrap',
      className: 'w-[170px] whitespace-nowrap text-sm align-top',
      render: (b) => (
        <div className="min-w-[150px]">
          <p className="font-medium text-content-primary whitespace-nowrap">
            {formatTravelDateWithDay(b.travelDate || b.travelStart, 'parentheses')}
          </p>
          <p className="text-[11px] text-content-muted mt-0.5 whitespace-nowrap">
            Return {formatCompletedReturnDate(b.returnDate || b.travelEnd)}
          </p>
        </div>
      ),
    },
    {
      key: 'pax',
      header: 'Pax',
      className: 'text-sm text-content-secondary whitespace-nowrap',
      render: (b) => formatPax(b),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (b) => (
        <div>
          <span className="font-bold tabular-nums text-content-primary">{formatINR(b.totalAmount ?? b.amount)}</span>
          {Number(b.advanceReceived) > 0 && (
            <p className="text-[11px] text-emerald-700 mt-0.5 tabular-nums">
              Adv {formatINR(b.advanceReceived)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (b) => <PaymentCell booking={b} />,
    },
    {
      key: 'hotel',
      header: 'Hotel',
      render: (b) => (
        <ConfirmationCell
          value={b.hotelConfirmation}
          detail={getPrimaryHotelName(b)}
          listStatus="all"
          icon={Building2}
        />
      ),
    },
    {
      key: 'cab',
      header: 'Cab',
      render: (b) => (
        <ConfirmationCell
          value={b.cabConfirmation}
          detail={getPrimaryCabLabel(b)}
          listStatus="all"
          icon={Car}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => {
        const cfg = BOOKING_STATUS_CONFIG[b.status] || BOOKING_STATUS_CONFIG.pending;
        return (
          <span
            className={cn(
              'text-[11px] font-semibold px-2.5 py-1 rounded-md whitespace-nowrap ring-1',
              cfg.className
            )}
          >
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'w-16 text-center',
      className: 'text-center',
      render: (b) => <BookingRowActions bookingId={b._id} />,
    },
  ];
}

function buildColumns(listStatus, selection) {
  if (listStatus === 'all') return buildAllColumns();

  const travelDateStyle = listStatus === 'confirmed' || listStatus === 'completed' ? 'parentheses' : 'default';
  const showDetail = listStatus === 'confirmed' || listStatus === 'active' || listStatus === 'completed';
  const cols = [];

  if (listStatus === 'active') {
    cols.push({
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selection.allSelected}
          ref={(el) => {
            if (el) el.indeterminate = selection.someSelected && !selection.allSelected;
          }}
          onChange={selection.onToggleAll}
          className="w-4 h-4 rounded border-subtle text-blue-500 focus:ring-blue-500/30"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      headerClassName: 'w-12',
      className: 'w-12',
      render: (b) => (
        <input
          type="checkbox"
          checked={selection.selectedIds.has(b._id)}
          onChange={() => selection.onToggleRow(b._id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-subtle text-blue-500 focus:ring-blue-500/30"
        />
      ),
    });
  }

  cols.push(
    {
      key: 'bookingNumber',
      header: 'Booking #',
      render: (b) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-blue-600">{b.bookingNumber}</span>
          {isNewBooking(b) && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">New</span>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (b) => (
        <div className="flex items-center gap-3 min-w-[190px]">
          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0', getAvatarColor(b.customerName))}>
            {getInitials(b.customerName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-content-primary break-words">{b.customerName}</p>
            <div className="flex items-center gap-1.5 text-xs text-content-muted">
              <span className="break-all">{b.customerPhone || '—'}</span>
              {b.customerPhone && (
                <a
                  href={`https://wa.me/${String(b.customerPhone).replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-emerald-600 hover:text-emerald-500"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'destination',
      header: 'Destination',
      render: (b) => (
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className="text-base leading-none">{getDestinationFlag(b.destination)}</span>
          {b.destination}
        </span>
      ),
    },
    {
      key: 'package',
      header: 'Package',
      className: 'max-w-[190px]',
      render: (b) => <span className="text-content-secondary block break-words whitespace-normal">{b.packageName || '—'}</span>,
    },
    {
      key: 'travel',
      header: 'Travel Date',
      className: 'whitespace-nowrap text-sm',
      render: (b) => {
        const dateStr = b.travelDate || b.travelStart;
        if (listStatus === 'active') {
          return (
            <span className="inline-block px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 text-xs font-semibold border border-sky-100">
              {formatActiveTravelDate(dateStr)}
            </span>
          );
        }
        if (listStatus === 'completed') {
          return (
            <span className="text-content-secondary">
              {formatTravelDateWithDay(dateStr, travelDateStyle)}
            </span>
          );
        }
        return (
          <span className="text-content-secondary">
            {formatTravelDateWithDay(dateStr, travelDateStyle)}
          </span>
        );
      },
    },
    {
      key: 'pax',
      header: 'Pax',
      className: 'text-sm text-content-secondary whitespace-nowrap',
      render: (b) => formatPax(b),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (b) => (
        <span className="font-bold tabular-nums text-content-primary">{formatINR(b.totalAmount ?? b.amount)}</span>
      ),
    },
    {
      key: 'hotel',
      header: 'Hotel',
      render: (b) => (
        <ConfirmationCell
          value={b.hotelConfirmation}
          detail={showDetail ? getHotelDisplayDetail(b) : getPrimaryHotelName(b)}
          listStatus={listStatus}
          icon={Building2}
        />
      ),
    },
    {
      key: 'cab',
      header: 'Cab',
      render: (b) => (
        <ConfirmationCell
          value={b.cabConfirmation}
          detail={showDetail ? getCabDisplayDetail(b) : getPrimaryCabLabel(b)}
          listStatus={listStatus}
          icon={Car}
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => {
        const st = resolveListStatus(b, listStatus);
        return (
          <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-md whitespace-nowrap', st.className)}>
            {st.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Action',
      headerClassName: 'w-16 text-center',
      className: 'text-center',
      render: (b) => <BookingRowActions bookingId={b._id} />,
    }
  );

  if (listStatus === 'completed') {
    const returnIdx = cols.findIndex((c) => c.key === 'travel') + 1;
    cols.splice(returnIdx, 0, {
      key: 'return',
      header: 'Return Date',
      className: 'whitespace-nowrap text-sm',
      render: (b) => (
        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-100">
          {formatCompletedReturnDate(b.returnDate || b.travelEnd)}
        </span>
      ),
    });
  }

  return cols;
}

export default function BookingsListPage() {
  const navigate = useNavigate();
  const { status } = useParams();
  const meta = PAGE_META[status] || PAGE_META.all;
  const isAll = status === 'all';
  const showKpis = ['all', 'pending', 'confirmed', 'active', 'completed'].includes(status);

  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ destinations: [], packages: [] });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const fetchBookings = useCallback(() => {
    setLoading(true);
    // Total Bookings ("all") must not send status=all — some servers treated it as a
    // literal booking status and returned zero rows.
    const statusParam = status && status !== 'all' ? status : undefined;
    API.get('/operations-manager/bookings', {
      params: {
        ...(statusParam ? { status: statusParam } : {}),
        page: pagination.page,
        limit: pagination.limit,
        search: appliedFilters.search || undefined,
        bookingStatus: appliedFilters.bookingStatus || undefined,
        destination: appliedFilters.destination || undefined,
        package: appliedFilters.package || undefined,
        dateFrom: appliedFilters.dateFrom || undefined,
        dateTo: appliedFilters.dateTo || undefined,
      },
      skipSuccessToast: true,
      skipErrorToast: true,
    })
      .then((r) => {
        const payload = r.data || {};
        setBookings(payload.data || []);
        setSummary(payload.summary || null);
        setFilterOptions(payload.filters || { destinations: [], packages: [] });
        setPagination((prev) => ({
          ...prev,
          total: payload.pagination?.total ?? 0,
          totalPages: payload.pagination?.totalPages ?? 1,
        }));
        setSelectedIds(new Set());
      })
      .catch(() => {
        setBookings([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }, [status, pagination.page, pagination.limit, appliedFilters]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const allSelected = bookings.length > 0 && bookings.every((b) => selectedIds.has(b._id));
  const someSelected = bookings.some((b) => selectedIds.has(b._id));

  const selection = useMemo(() => ({
    selectedIds,
    allSelected,
    someSelected,
    onToggleRow: (id) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    onToggleAll: () => {
      setSelectedIds((prev) => {
        if (allSelected) return new Set();
        return new Set(bookings.map((b) => b._id));
      });
    },
  }), [selectedIds, allSelected, bookings]);

  const columns = useMemo(() => buildColumns(status, selection), [status, selection]);

  const handleApply = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setAppliedFilters({ ...filters });
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-1 pb-8">
      <BookingPageHeader
        title={meta.title}
        total={summary?.count ?? pagination.total}
        description={meta.desc}
        breadcrumbs={['Operations', 'Bookings', meta.title]}
        dateFrom={appliedFilters.dateFrom}
        dateTo={appliedFilters.dateTo}
        status={status}
        badgeClassName={
          isAll
            ? 'bg-sky-100 text-sky-800'
            : status === 'confirmed' || status === 'active'
              ? 'bg-sky-100 text-sky-700'
              : status === 'completed'
                ? 'bg-slate-100 text-slate-700'
                : undefined
        }
      />

      {isAll && <TotalBookingsOverview summary={summary} loading={loading} />}

      {showKpis && <BookingKpiStrip summary={summary} status={status} loading={loading} />}

      <BookingFilterBar
        filters={filters}
        onChange={setFilters}
        onApply={handleApply}
        onReset={handleReset}
        destinations={filterOptions.destinations}
        packages={filterOptions.packages}
        showStatusFilter={isAll || status === 'pending' || status === 'active'}
        statusOptions={
          isAll ? ALL_STATUS_OPTIONS : status === 'active' ? ['in_progress'] : undefined
        }
        searchPlaceholder={meta.searchPlaceholder}
        activeCount={countActiveBookingFilters(appliedFilters)}
        singleDate={status === 'active'}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'rounded-3xl border border-subtle/80 bg-white overflow-hidden',
          isAll
            ? 'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_12px_28px_rgba(14,165,233,0.08)]'
            : 'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(13,148,136,0.06)]'
        )}
      >
        {isAll && !loading && bookings.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-subtle/80 bg-gradient-to-r from-slate-50/80 to-white">
            <div>
              <p className="text-sm font-semibold text-content-primary">All bookings</p>
              <p className="text-xs text-content-muted">
                Showing {bookings.length} of {pagination.total.toLocaleString('en-IN')} · click a row for full ops detail
              </p>
            </div>
            {appliedFilters.bookingStatus && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                Status: {BOOKING_STATUS_CONFIG[appliedFilters.bookingStatus]?.label || appliedFilters.bookingStatus}
              </span>
            )}
          </div>
        )}

        <OperationsDataTable
          columns={columns}
          data={bookings}
          loading={loading}
          emptyIcon={ClipboardList}
          emptyTitle={
            isAll
              ? 'No bookings yet'
              : status === 'completed'
                ? 'No completed trips yet'
                : 'No bookings in this list'
          }
          emptyDescription={
            isAll
              ? 'Converted leads with confirmed payments will appear here across every ops status.'
              : status === 'completed'
                ? 'Trips appear here once bookings are marked completed after successful travel.'
                : 'Bookings will appear here once leads are converted and payments confirmed.'
          }
          onRowClick={(b) => navigate(`/operations-manager/booking/${b._id}`)}
          className="border-0 shadow-none rounded-none"
        />

        {!loading && bookings.length > 0 && (
          <TablePagination
            className="border-t border-subtle/80 bg-surface-elevated/30"
            pageIndex={pagination.page - 1}
            pageSize={pagination.limit}
            pageCount={pagination.totalPages}
            total={pagination.total}
            totalLabel={meta.paginationLabel}
            showPageNumbers
            onPageChange={(pageIndex) => setPagination((prev) => ({ ...prev, page: pageIndex + 1 }))}
            onPageSizeChange={(limit) => setPagination((prev) => ({ ...prev, limit, page: 1 }))}
          />
        )}
      </motion.div>
    </div>
  );
}

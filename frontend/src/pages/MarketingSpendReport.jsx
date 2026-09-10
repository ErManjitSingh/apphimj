import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  listMarketingSpend,
  getMarketingSpendSummary,
  createMarketingSpend,
  updateMarketingSpend,
  deleteMarketingSpend,
} from '../services/marketingSpendApi';
import { usePermissions } from '../hooks/usePermissions';
import { useToast } from '../context/ToastContext';
import MarketingSpendModal from '../components/dashboard/MarketingSpendModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import TablePagination from '../components/ui/TablePagination';

const PAGE_SIZE = 25;

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const EMPTY_FILTERS = { dateFrom: '', dateTo: '', channel: '', campaign: '' };

export default function MarketingSpendReport() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canCreate = can('marketing', 'create');
  const canEdit = can('marketing', 'edit');
  const canDelete = can('marketing', 'delete');

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [modalRecord, setModalRecord] = useState(undefined); // undefined = closed, null = add, object = edit
  const [deleteTarget, setDeleteTarget] = useState(null);

  const listQuery = useQuery({
    queryKey: ['marketing-spend', filters, page],
    queryFn: () => listMarketingSpend({ ...filters, page, limit: PAGE_SIZE }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const summaryQuery = useQuery({
    queryKey: ['marketing-spend-summary'],
    queryFn: getMarketingSpendSummary,
    staleTime: 30_000,
  });

  const rows = listQuery.data?.data || [];
  const pagination = listQuery.data?.pagination || { total: 0, totalPages: 1 };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['marketing-spend'] });
    queryClient.invalidateQueries({ queryKey: ['marketing-spend-summary'] });
  };

  const createMutation = useMutation({
    mutationFn: createMarketingSpend,
    onSuccess: () => {
      toast.success('Marketing spend recorded');
      setModalRecord(undefined);
      invalidateAll();
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to add marketing spend'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateMarketingSpend(id, payload),
    onSuccess: () => {
      toast.success('Marketing spend updated');
      setModalRecord(undefined);
      invalidateAll();
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to update marketing spend'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMarketingSpend,
    onSuccess: () => {
      toast.success('Marketing spend deleted');
      setDeleteTarget(null);
      invalidateAll();
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Failed to delete marketing spend'),
  });

  const summary = summaryQuery.data || {};

  return (
    <div className="animate-fade-up space-y-5">
      <Link
        to="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Marketing Spend</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Track marketing spend by channel and campaign — manual entries feed the dashboard's Marketing Spend card.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setModalRecord(null)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold shadow-md shadow-violet-600/25"
          >
            <Plus className="w-4 h-4" />
            Add Spend
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {[
          { label: "Today's Spend", value: summary.today },
          { label: "Yesterday's Spend", value: summary.yesterday },
          { label: 'Last 7 Days', value: summary.week },
          { label: 'This Month', value: summary.month },
        ].map((card) => (
          <div key={card.label} className="rounded-[20px] border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-medium text-slate-500">{card.label}</p>
            <p className="text-2xl font-bold metric-tabular mt-1 text-slate-900">{formatINR(card.value)}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] space-y-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-500">From</span>
              <input
                type="date"
                className="h-10 w-full min-w-0 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                value={filters.dateFrom}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, dateFrom: e.target.value }));
                  setPage(1);
                }}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-500">To</span>
              <input
                type="date"
                className="h-10 w-full min-w-0 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                value={filters.dateTo}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, dateTo: e.target.value }));
                  setPage(1);
                }}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Channel</span>
              <input
                className="h-10 w-full min-w-0 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                placeholder="e.g. Meta Ads"
                value={filters.channel}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, channel: e.target.value }));
                  setPage(1);
                }}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Campaign</span>
              <input
                className="h-10 w-full min-w-0 rounded-xl border border-slate-200 px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                placeholder="e.g. Diwali Sale"
                value={filters.campaign}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, campaign: e.target.value }));
                  setPage(1);
                }}
              />
            </label>
          </div>
          {(filters.dateFrom || filters.dateTo || filters.channel || filters.campaign) && (
            <div className="flex justify-end">
              <button
                type="button"
                className="h-8 px-3 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setFilters(EMPTY_FILTERS);
                  setPage(1);
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {listQuery.isLoading ? (
          <div className="h-40 rounded-2xl bg-slate-100 animate-pulse" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 text-left">
                  {['Date', 'Channel', 'Campaign', 'Amount', 'Notes', 'Added By', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-t border-slate-100 hover:bg-violet-50/30">
                    <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">{formatDate(row.spendDate)}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-900">{row.channel}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{row.campaign || '—'}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold metric-tabular text-violet-600">
                      {formatINR(row.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500 max-w-[220px] truncate" title={row.notes || ''}>
                      {row.notes || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{row.createdBy?.name || '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {canEdit && (
                          <button
                            type="button"
                            className="text-slate-400 hover:text-violet-600"
                            title="Edit"
                            onClick={() => setModalRecord(row)}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="text-slate-400 hover:text-rose-600"
                            title="Delete"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                      No marketing spend recorded for this filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination
          pageIndex={page - 1}
          pageSize={PAGE_SIZE}
          pageCount={Math.max(1, pagination.totalPages || 1)}
          total={pagination.total ?? 0}
          onPageChange={(idx) => setPage(idx + 1)}
          totalLabel="records"
        />
      </div>

      <MarketingSpendModal
        open={modalRecord !== undefined}
        record={modalRecord}
        onClose={() => setModalRecord(undefined)}
        loading={createMutation.isPending || updateMutation.isPending}
        onSubmit={(payload) => {
          if (modalRecord) {
            updateMutation.mutate({ id: modalRecord._id, payload });
          } else {
            createMutation.mutate(payload);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete marketing spend entry"
        message={
          deleteTarget
            ? `Delete the ${deleteTarget.channel} spend of ${formatINR(deleteTarget.amount)} on ${formatDate(deleteTarget.spendDate)}? This cannot be undone.`
            : ''
        }
        confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
      />
    </div>
  );
}

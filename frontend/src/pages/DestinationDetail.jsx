import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  PhoneCall,
  Sun,
  Flame,
  Snowflake,
  Briefcase,
  IndianRupee,
  Percent,
} from 'lucide-react';
import API from '../api/axios';
import LeadDataTable from '../components/leads/LeadDataTable';
import { useLeadsQuery } from '../features/leads/hooks/useLeadsQuery';
import { LEADS_PAGE_SIZE } from '../components/ui/TablePagination';
import { resolveListTotal } from '../lib/resolveListTotal';
import { LIST_STALE_MS, GC_TIME_MS } from '../lib/queryConfig';
import { cn } from '../lib/utils';

function KpiCard({ label, value, icon: Icon, iconColor }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-subtle bg-white px-3 py-2.5 shadow-sm">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm', iconColor)}>
        <Icon className="h-4 w-4 text-white" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="metric-tabular mt-0.5 truncate text-lg font-bold leading-none tracking-tight text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

function formatCurrency(n) {
  const value = Number(n || 0);
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return `₹${value.toLocaleString('en-IN')}`;
}

/**
 * Top Destinations chart drill-down. Reuses the existing Lead Management data-fetching hook
 * (useLeadsQuery) and table component (LeadDataTable) for the lead list — only the KPI strip
 * above it is new. The dashboard's selected period (dateFrom/dateTo/source) and the exact backend
 * rollup name(s) the clicked chart segment represents (`names`) are carried entirely via the URL,
 * so this page works the same whether navigated to from the chart or loaded fresh on refresh.
 */
export default function DestinationDetail() {
  const { name } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const source = searchParams.get('source') || '';
  const namesParam = searchParams.get('names') || name || '';

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: LEADS_PAGE_SIZE });
  const [rowSelection, setRowSelection] = useState({});

  const kpiQuery = useQuery({
    queryKey: ['dashboard-destination', { names: namesParam, dateFrom, dateTo, source }],
    queryFn: async () => {
      const { data } = await API.get('/dashboard/destination', {
        params: { names: namesParam, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, source: source || undefined },
        skipSuccessToast: true,
      });
      return data;
    },
    enabled: Boolean(namesParam),
    staleTime: LIST_STALE_MS,
    gcTime: GC_TIME_MS,
  });

  const leadFilters = useMemo(
    () => ({ destinationNames: namesParam, dateFrom, dateTo, source }),
    [namesParam, dateFrom, dateTo, source]
  );

  const tableQuery = useLeadsQuery({
    filters: leadFilters,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  });

  const tableLeads = tableQuery.data?.data ?? [];
  const hasMoreLeads = tableQuery.data?.hasMore ?? false;
  const totalLeads = resolveListTotal({
    apiTotal: tableQuery.data?.pagination?.total,
    rowCount: tableLeads.length,
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    hasMore: hasMoreLeads,
  });
  const pageCount =
    totalLeads != null
      ? Math.max(1, Math.ceil(totalLeads / pagination.pageSize) || 1)
      : hasMoreLeads
        ? pagination.pageIndex + 2
        : pagination.pageIndex + 1;

  const loading = tableQuery.isLoading && !tableQuery.data;
  const kpis = kpiQuery.data?.kpis || {};
  const periodLabel = kpiQuery.data?.period?.label;

  return (
    <div className="animate-fade-up">
      <Link
        to="/admin/dashboard"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px]">
          {decodeURIComponent(name || '')}
        </h1>
        {periodLabel && <p className="mt-0.5 text-sm text-slate-500">Selected dashboard period: {periodLabel}</p>}
      </div>

      {kpiQuery.isLoading ? (
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-[58px] animate-pulse rounded-xl border border-subtle bg-white" />
          ))}
        </div>
      ) : (
        <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
          <KpiCard label="Total Leads" value={(kpis.totalLeads ?? 0).toLocaleString('en-IN')} icon={Users} iconColor="bg-violet-600" />
          <KpiCard label="Connected" value={(kpis.connected ?? 0).toLocaleString('en-IN')} icon={PhoneCall} iconColor="bg-blue-500" />
          <KpiCard label="Warm" value={(kpis.warm ?? 0).toLocaleString('en-IN')} icon={Sun} iconColor="bg-amber-500" />
          <KpiCard label="Hot" value={(kpis.hot ?? 0).toLocaleString('en-IN')} icon={Flame} iconColor="bg-rose-500" />
          <KpiCard label="Cold" value={(kpis.cold ?? 0).toLocaleString('en-IN')} icon={Snowflake} iconColor="bg-slate-500" />
          <KpiCard label="Bookings" value={(kpis.bookings ?? 0).toLocaleString('en-IN')} icon={Briefcase} iconColor="bg-sky-500" />
          <KpiCard label="Revenue" value={formatCurrency(kpis.revenue)} icon={IndianRupee} iconColor="bg-teal-500" />
          <KpiCard label="Conv. Rate" value={`${kpis.conversionRate ?? 0}%`} icon={Percent} iconColor="bg-fuchsia-500" />
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-subtle bg-white p-16 text-center text-content-muted shadow-sm">
          Loading leads...
        </div>
      ) : (
        <LeadDataTable
          leads={tableLeads}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          onRowClick={(lead) => navigate(`/leads/${lead._id}`)}
          menuActions={{ view: true, edit: false, assign: false, delete: false }}
          showAssignButton={false}
          serverPagination={{
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
            pageCount,
            total: totalLeads,
            hasMore: hasMoreLeads,
            onPaginationChange: setPagination,
          }}
        />
      )}
    </div>
  );
}

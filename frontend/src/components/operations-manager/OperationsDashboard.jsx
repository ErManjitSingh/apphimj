import OperationsDashboardHeader from './dashboard/OperationsDashboardHeader';
import OperationsExecutionHub from './dashboard/OperationsExecutionHub';
import OperationsKpiCards from './dashboard/OperationsKpiCards';
import OperationsCommandPanels from './dashboard/OperationsCommandPanels';
import OperationsBottomPanels from './dashboard/OperationsBottomPanels';
import { useDashboardQuery } from '../../features/dashboard/hooks/useDashboardQuery';

export default function OperationsDashboard() {
  const { data, isLoading, isFetching, isError, error, refetch } = useDashboardQuery(
    '/operations-manager/dashboard'
  );

  if (isLoading && !data) {
    return (
      <div className="flex justify-center py-32">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
        <p className="mb-1 font-semibold text-rose-800">Dashboard could not load</p>
        <p className="mb-4 text-sm text-rose-600">
          {error?.response?.data?.message || error?.message || 'Please try again.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {isFetching && (
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-orange-500/20">
          <div className="h-full w-1/3 animate-pulse bg-orange-500" />
        </div>
      )}

      <OperationsDashboardHeader
        generatedAt={data?.generatedAt}
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      <OperationsExecutionHub />

      <OperationsKpiCards
        kpis={data?.kpis || {}}
        kpiTrends={data?.kpiTrends || {}}
        sparklines={data?.sparklines || {}}
        loading={isLoading && !data}
      />

      <OperationsCommandPanels data={data} />

      <OperationsBottomPanels data={data} />
    </div>
  );
}

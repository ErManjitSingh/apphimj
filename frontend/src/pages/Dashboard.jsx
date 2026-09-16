import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useDataRefresh } from "../hooks/useDataRefresh";
import {
  useDashboardQuery,
  buildDashboardParams,
  dashboardQueryKey,
} from "../features/dashboard/hooks/useDashboardQuery";
import { invalidateDashboard } from "../lib/queryInvalidation";
import DashboardHeader, {
  getDefaultDashboardFilters,
} from "../components/dashboard/DashboardHeader";
import {
  DashboardSkeleton,
  ScenicDashboardBanner,
  PastelKpiStrip,
  LeadStatusOverviewCard,
  BookingsTrendCard,
  TopLeadSourcesCard,
  DestinationInsightCard,
  ExecutiveInsightCard,
} from "../components/dashboard";

export default function Dashboard() {
  const { user } = useAuth();
  const isLeadProvider = user?.role === "lead_provider";
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState(getDefaultDashboardFilters);
  const [showFilters, setShowFilters] = useState(false);
  const {
    data: stats,
    isLoading,
    isFetching,
  } = useDashboardQuery("/dashboard/stats", filters);

  const softRefreshDashboard = useCallback(() => {
    invalidateDashboard(queryClient);
  }, [queryClient]);

  const hardRefreshDashboard = useCallback(async () => {
    const endpoint = "/dashboard/stats";
    const key = dashboardQueryKey(endpoint, filters);
    await invalidateDashboard(queryClient);
    await queryClient.invalidateQueries({ queryKey: ["nav-counts"] });
    await queryClient.fetchQuery({
      queryKey: key,
      queryFn: async () => {
        const { data } = await API.get(endpoint, {
          params: buildDashboardParams(filters, { fresh: true }),
          skipSuccessToast: true,
        });
        return data;
      },
    });
  }, [queryClient, filters]);

  useDataRefresh(["dashboard"], softRefreshDashboard);

  if (isLoading && !stats) return <DashboardSkeleton />;
  if (!stats) return null;

  const sourceRows =
    stats.report?.leadsBySource ||
    stats.leadSourceAnalytics ||
    stats.sourceAnalytics?.sources ||
    [];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-8">
      {isFetching && (
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-orange-500/30">
          <div className="h-full w-1/3 animate-pulse bg-orange-500" />
        </div>
      )}

      <ScenicDashboardBanner
        filters={filters}
        periodLabel={stats.report?.period?.label}
        onOpenFilters={() => setShowFilters((v) => !v)}
      />

      {showFilters && (
        <DashboardHeader
          filters={filters}
          onFiltersChange={setFilters}
          onRefresh={hardRefreshDashboard}
          isRefreshing={isFetching}
          periodLabel={stats.report?.period?.label}
          badgeLabel={isLeadProvider ? "Lead Insights" : "Admin Insights"}
        />
      )}

      <PastelKpiStrip stats={stats} filters={filters} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <LeadStatusOverviewCard stats={stats} />
        </div>
        <div className="xl:col-span-5">
          <BookingsTrendCard stats={stats} />
        </div>
        <div className="xl:col-span-3">
          <TopLeadSourcesCard data={sourceRows} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DestinationInsightCard />
        <ExecutiveInsightCard />
      </div>
    </div>
  );
}

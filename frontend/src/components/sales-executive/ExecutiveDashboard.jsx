import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useDataRefresh } from '../../hooks/useDataRefresh';
import { useLogModuleOpened } from '../../hooks/useLogModuleOpened';
import { useDashboardQuery } from '../../features/dashboard/hooks/useDashboardQuery';
import { invalidateDashboard } from '../../lib/queryInvalidation';
import { fetchAnnouncementFeed } from '../../services/announcementApi';
import API from '../../api/axios';
import { APP_GREETING } from '../../lib/greeting';
import MobileExecutiveDashboard from './dashboard/MobileExecutiveDashboard';
import ExecutiveWelcomeBanner from './dashboard/ExecutiveWelcomeBanner';
import ExecutiveHeroKpis from './dashboard/ExecutiveHeroKpis';
import ExecutiveWorkspacePanel, {
  ExecutiveTargetsCard,
  ExecutiveTopDestinationsCard,
} from './dashboard/ExecutiveWorkspacePanel';
import ExecutiveRightRail from './dashboard/ExecutiveRightRail';
import { ColdCallAlertsPanel } from './dashboard/DestinationAndColdPanels';
import {
  getDefaultExecDashboardFilters,
} from './dashboard/ExecutiveDashboardPeriodFilter';

function getGreeting() {
  return APP_GREETING;
}

export default function ExecutiveDashboard() {
  useLogModuleOpened('dashboard');
  const [now, setNow] = useState(() => new Date());
  const [filters, setFilters] = useState(getDefaultExecDashboardFilters);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = useDashboardQuery('/sales-executive/dashboard', filters);
  const { data: announcementFeed } = useQuery({
    queryKey: ['announcements', 'feed'],
    queryFn: fetchAnnouncementFeed,
    staleTime: 120_000,
  });
  const firstName = user?.name?.trim().split(' ')[0] || 'Sales';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const refresh = useCallback(() => {
    invalidateDashboard(queryClient);
  }, [queryClient]);

  const handleMarkColdCallDone = useCallback(async (item) => {
    await API.put(`/sales-executive/leads/${item._id}`, {
      coldCallDone: true,
      coldCallNotes: 'Cold call done from dashboard',
    });
    refresh();
  }, [refresh]);

  useDataRefresh(['dashboard'], refresh);

  if (isLoading && !data) {
    return (
      <div className="flex justify-center py-32">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  const hero = announcementFeed?.hero;
  const periodLabel = data?.filters?.periodLabel || data?.statusDistributionSummary?.periodLabel || '';

  return (
    <>
      <MobileExecutiveDashboard
        data={data}
        hero={hero}
        firstName={firstName}
        greeting={getGreeting()}
        now={now}
        unreadCount={announcementFeed?.unreadCount || 0}
        filters={filters}
        onFiltersChange={setFilters}
        periodLabel={periodLabel}
      />

      <div className="hidden space-y-4 pb-6 lg:block">
        {isFetching && (
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-orange-500/20">
            <div className="h-full w-1/3 animate-pulse bg-orange-500" />
          </div>
        )}

        <ExecutiveWelcomeBanner firstName={firstName} now={now} />

        <ColdCallAlertsPanel
          items={data?.coldCallReminders || []}
          onMarkDone={handleMarkColdCallDone}
        />

        <ExecutiveHeroKpis kpis={data?.kpis} trends={data?.kpiTrends} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <ExecutiveWorkspacePanel
              recentLeads={data?.recentLeads || []}
              upcomingFollowups={data?.upcomingFollowups || []}
              quotationsSent={data?.kpis?.quotationsSent || 0}
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ExecutiveTargetsCard target={data?.target} />
              <ExecutiveTopDestinationsCard rows={data?.destinationWise?.rows || []} />
            </div>
          </div>

          <ExecutiveRightRail
            now={now}
            todayTasks={data?.todayTasks || []}
            upcomingFollowups={data?.upcomingFollowups || []}
            todayActivities={data?.todayActivities || []}
          />
        </div>
      </div>
    </>
  );
}

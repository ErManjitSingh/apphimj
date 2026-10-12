import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { SidebarProvider } from '../../context/SidebarContext';
import AppSidebar from '../sidebar/AppSidebar';
import SidebarAccountFooter from '../sidebar/SidebarAccountFooter';
import MobileSidebarDrawer from '../sidebar/MobileSidebarDrawer';
import TopBar from '../TopBar';
import MissedFollowUpAlert from '../notifications/MissedFollowUpAlert';
import RouteFallback from '../ui/RouteFallback';
import SalesExecutiveMobileNav from './SalesExecutiveMobileNav';
import { salesExecutiveNavItems } from './sidebar-config';
import API from '../../api/axios';
import {
  buildDashboardParams,
  dashboardQueryKey,
} from '../../features/dashboard/hooks/useDashboardQuery';
import { getDefaultExecDashboardFilters } from './dashboard/ExecutiveDashboardPeriodFilter';
import { DASHBOARD_STALE_MS, GC_TIME_MS } from '../../lib/queryConfig';

function usePrefetchExecutiveWarmData() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const userId = user?._id || user?.id;
  const onDashboard = pathname === '/sales-executive/dashboard';

  useEffect(() => {
    if (!userId || !onDashboard) return undefined;
    const filters = getDefaultExecDashboardFilters();
    const endpoint = '/sales-executive/dashboard';
    queryClient.prefetchQuery({
      queryKey: dashboardQueryKey(endpoint, filters),
      queryFn: async () => {
        const { data } = await API.get(endpoint, {
          params: buildDashboardParams(filters),
          skipSuccessToast: true,
        });
        return data;
      },
      staleTime: DASHBOARD_STALE_MS,
      gcTime: GC_TIME_MS,
    });
    const idle = typeof window !== 'undefined' && window.requestIdleCallback
      ? window.requestIdleCallback.bind(window)
      : (cb) => window.setTimeout(cb, 1500);
    const cancelIdle = typeof window !== 'undefined' && window.cancelIdleCallback
      ? window.cancelIdleCallback.bind(window)
      : window.clearTimeout.bind(window);
    const idleId = idle(() => {
      import('./MyLeadsPage').catch(() => {});
      import('./ExecutiveFollowUpsPage').catch(() => {});
    });
    return () => cancelIdle(idleId);
  }, [queryClient, userId, onDashboard]);
}

function SalesExecutiveShell() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  usePrefetchExecutiveWarmData();
  const isDashboard = pathname === '/sales-executive/dashboard';
  const isQuotationBuilder =
    pathname === '/sales-executive/quotations/new' ||
    /^\/sales-executive\/quotations\/[^/]+\/edit$/.test(pathname);
  const isQuotationsList = pathname === '/sales-executive/quotations';
  const isLeadsList = pathname.startsWith('/sales-executive/leads')
    && !pathname.includes('/add')
    && !pathname.includes('/view')
    && !pathname.includes('/edit');
  const isWhatsApp = pathname === '/sales-executive/whatsapp';
  const isMobileImmersive = isDashboard || isQuotationBuilder || isQuotationsList || isLeadsList || isWhatsApp;

  const sidebarProps = {
    user,
    navItems: salesExecutiveNavItems,
    brandSubtitle: 'Sales Executive',
    sidebarVariant: 'light',
    profilePath: '/sales-executive/profile',
    quickActions: [],
    sidebarFooter: <SidebarAccountFooter />,
  };

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-surface-app">
      <div className="hidden lg:block shrink-0 h-dvh sticky top-0">
        <AppSidebar {...sidebarProps} className="h-dvh" />
      </div>

      <MobileSidebarDrawer sidebarProps={sidebarProps} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className={isMobileImmersive ? 'hidden lg:block' : ''}>
          <TopBar />
        </div>
        <main
          data-workspace-main
          className={`flex-1 min-h-0 overflow-y-auto overscroll-y-contain ${isQuotationBuilder ? 'pb-0' : 'pb-20 lg:pb-0'}`}
        >
          <div className={`mx-auto max-w-[1600px] ${isMobileImmersive ? 'p-0 lg:p-6' : 'p-4 sm:p-5 lg:p-6'}`}>
            <div className={isMobileImmersive ? 'hidden lg:block' : ''}>
              <MissedFollowUpAlert />
            </div>
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        {!isQuotationBuilder && <SalesExecutiveMobileNav />}
      </div>
    </div>
  );
}

export default function SalesExecutiveLayout() {
  return (
    <SidebarProvider>
      <SalesExecutiveShell />
    </SidebarProvider>
  );
}

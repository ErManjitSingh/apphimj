import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
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

function SalesExecutiveShell() {
  const { user } = useAuth();
  const { pathname } = useLocation();
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

import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SidebarProvider } from '../../context/SidebarContext';
import AppSidebar from '../sidebar/AppSidebar';
import SidebarAccountFooter from '../sidebar/SidebarAccountFooter';
import MobileSidebarDrawer from '../sidebar/MobileSidebarDrawer';
import TopBar from '../TopBar';
import RouteFallback from '../ui/RouteFallback';
import PanelMobileNav from '../mobile/PanelMobileNav';
import { operationsManagerNavItems, operationsQuickActions } from './sidebar-config';

function OperationsManagerShell() {
  const { user } = useAuth();

  const sidebarProps = {
    user,
    navItems: operationsManagerNavItems,
    quickActions: operationsQuickActions,
    brandSubtitle: 'Operations Manager',
    sidebarVariant: 'light',
    profilePath: '/operations-manager/profile',
    sidebarFooter: <SidebarAccountFooter />,
  };

  return (
    <div className="flex min-h-screen bg-surface-app">
      <div className="hidden lg:block h-screen sticky top-0">
        <AppSidebar {...sidebarProps} className="h-screen" />
      </div>

      <MobileSidebarDrawer sidebarProps={sidebarProps} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <div className="p-4 sm:p-5 lg:p-6 max-w-[1600px] mx-auto">
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <PanelMobileNav />
      </div>
    </div>
  );
}

export default function OperationsManagerLayout() {
  return (
    <SidebarProvider>
      <OperationsManagerShell />
    </SidebarProvider>
  );
}

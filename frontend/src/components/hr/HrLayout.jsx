import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SidebarProvider } from '../../context/SidebarContext';
import AppSidebar from '../sidebar/AppSidebar';
import SidebarAccountFooter from '../sidebar/SidebarAccountFooter';
import MobileSidebarDrawer from '../sidebar/MobileSidebarDrawer';
import RouteFallback from '../ui/RouteFallback';
import PanelMobileNav from '../mobile/PanelMobileNav';
import HrTopBar from './HrTopBar';
import { hrPortalNavItems } from './hr-nav-config';
import { APP_BRAND_NAME } from '../../config/branding';

function HrShell() {
  const { user } = useAuth();

  const sidebarProps = {
    user,
    navItems: hrPortalNavItems,
    brandTitle: APP_BRAND_NAME,
    brandSubtitle: 'HR Management',
    sidebarVariant: 'light',
    profilePath: '/hr/profile',
    quickActions: [],
    sidebarFooter: <SidebarAccountFooter />,
  };

  return (
    <div className="flex min-h-screen bg-surface-app">
      <div className="hidden lg:block h-screen sticky top-0">
        <AppSidebar {...sidebarProps} className="h-screen" />
      </div>

      <MobileSidebarDrawer sidebarProps={sidebarProps} />

      <div className="flex-1 flex flex-col min-w-0">
        <HrTopBar />
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

export default function HrLayout() {
  return (
    <SidebarProvider>
      <HrShell />
    </SidebarProvider>
  );
}

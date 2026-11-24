import SidebarNavItem from './SidebarNavItem';
import { isNavItemActive } from './sidebar-utils';
import { useLocation } from 'react-router-dom';

/** Simple WhatsApp nav row — same as other sidebar items, green accent. */
export default function SidebarWhatsAppCard({ item }) {
  const location = useLocation();
  return (
    <SidebarNavItem
      item={{ ...item, accent: item.accent || 'green' }}
      isActive={isNavItemActive(location.pathname, item.path)}
    />
  );
}

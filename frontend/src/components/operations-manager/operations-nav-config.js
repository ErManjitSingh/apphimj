import {
  LayoutDashboard,
  ClipboardList,
  Clock,
  CheckCircle2,
  Plane,
  CircleCheck,
  Hotel,
  Car,
  Compass,
  Building2,
  Ticket,
  Headphones,
  Calendar,
  BarChart3,
  User,
  MapPin,
  ListTodo,
  Sparkles,
} from 'lucide-react';

export const operationsBookingsChildren = [
  { path: '/operations-manager/bookings/pending', label: 'Pending', icon: Clock, badgeKey: 'bookings.pending' },
  { path: '/operations-manager/bookings/confirmed', label: 'Confirmed', icon: CheckCircle2, countKey: 'bookings.confirmed' },
  { path: '/operations-manager/bookings/active-tours', label: 'Active Tours', icon: Sparkles, countKey: 'bookings.activeTours' },
  { path: '/operations-manager/bookings/active', label: 'Live Tours', icon: Plane, badgeKey: 'bookings.active' },
  { path: '/operations-manager/bookings/completed', label: 'Completed Trips', icon: CircleCheck, countKey: 'bookings.completed' },
];

export const operationsExecutionChildren = [
  { path: '/operations-manager/trip-map', label: 'Trip Map', icon: MapPin },
  { path: '/operations-manager/trip-tracker', label: 'Trip Tracker', icon: Compass },
  { path: '/operations-manager/tasks', label: 'Tasks', icon: ListTodo, badgeKey: 'tasks.pending' },
  { path: '/operations-manager/hotels', label: 'Hotels', icon: Hotel },
  { path: '/operations-manager/transport', label: 'Transport', icon: Car },
  { path: '/operations-manager/activities', label: 'Activities', icon: Sparkles },
];

export const operationsResourcesChildren = [
  { path: '/operations-manager/vendors', label: 'Vendors', icon: Building2 },
  { path: '/operations-manager/vouchers', label: 'Vouchers', icon: Ticket },
  { path: '/operations-manager/support', label: 'Support Tickets', icon: Headphones, badgeKey: 'support.open' },
];

export const operationsInsightsChildren = [
  { path: '/operations-manager/calendar', label: 'Calendar', icon: Calendar },
  { path: '/operations-manager/reports', label: 'Reports', icon: BarChart3 },
];

/** Flat list for admin sidebar — all operations routes in one group */
export const operationsAdminMenuChildren = [
  { path: '/operations-manager/dashboard', label: 'Ops Dashboard', icon: LayoutDashboard },
  ...operationsBookingsChildren,
  ...operationsExecutionChildren,
  ...operationsResourcesChildren,
  ...operationsInsightsChildren,
];

/** Grouped main menu for Operations Manager layout */
export const operationsManagerNavItems = [
  { path: '/operations-manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'ops-bookings',
    label: 'Bookings',
    icon: ClipboardList,
    children: operationsBookingsChildren,
  },
  {
    id: 'ops-execution',
    label: 'Trip Execution',
    icon: MapPin,
    children: operationsExecutionChildren,
  },
  {
    id: 'ops-resources',
    label: 'Resources',
    icon: Building2,
    children: operationsResourcesChildren,
  },
  {
    id: 'ops-insights',
    label: 'Insights',
    icon: BarChart3,
    children: operationsInsightsChildren,
  },
  { path: '/operations-manager/profile', label: 'Profile', icon: User },
];

/** Sidebar quick actions — operations workflows only (no sales/quotation) */
export const operationsQuickActions = [
  { path: '/operations-manager/bookings/pending', label: 'Pending Bookings', icon: Clock },
  { path: '/operations-manager/trip-tracker', label: 'Trip Tracker', icon: MapPin },
  { path: '/operations-manager/tasks', label: 'Assign Tasks', icon: ListTodo },
  { path: '/operations-manager/vendors', label: 'Vendor Follow-up', icon: Building2 },
  { path: '/operations-manager/vouchers', label: 'Generate Voucher', icon: Ticket },
];

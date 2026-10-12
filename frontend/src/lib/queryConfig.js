/** Shared React Query timing — longer cache = fewer Mongo stampedes, snappier navigation */
export const LIST_STALE_MS = 4 * 60_000;
export const DETAIL_STALE_MS = 3 * 60_000;
export const DASHBOARD_STALE_MS = 10 * 60_000;
/** Sidebar counts — Redis absorbs concurrent users; poll slowly */
export const NAV_COUNTS_STALE_MS = 5 * 60_000;
export const NAV_COUNTS_REFETCH_MS = 6 * 60_000;
export const ANALYTICS_STALE_MS = 6 * 60_000;
export const HEADER_ACTIVITY_STALE_MS = 90_000;
export const HEADER_ACTIVITY_REFETCH_MS = 2 * 60_000;
export const GC_TIME_MS = 45 * 60_000;

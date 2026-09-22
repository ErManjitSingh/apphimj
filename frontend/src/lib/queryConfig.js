/** Shared React Query timing — tuned for snappy CRM feel under concurrent users */
export const LIST_STALE_MS = 3 * 60_000;
export const DETAIL_STALE_MS = 3 * 60_000;
export const DASHBOARD_STALE_MS = 8 * 60_000;
/** Sidebar counts — Redis absorbs concurrent users; poll slowly */
export const NAV_COUNTS_STALE_MS = 4 * 60_000;
export const NAV_COUNTS_REFETCH_MS = 5 * 60_000;
export const ANALYTICS_STALE_MS = 5 * 60_000;
export const GC_TIME_MS = 30 * 60_000;

import { useQuery } from '@tanstack/react-query';
import { fetchFollowUps, fetchFollowUpSummary, fetchFollowUpsCalendar } from '../../../services/followupsApi';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { LIST_STALE_MS, GC_TIME_MS } from '../../../lib/queryConfig';

export function useFollowUpsQuery({
  filters = {},
  page = 1,
  limit = 25,
  kpiTab = '',
  endpoint = '/followups',
  enabled = true,
}) {
  const debouncedSearch = useDebouncedValue(filters.search, 350);

  return useQuery({
    queryKey: ['followups', endpoint, { filters: { ...filters, search: debouncedSearch }, page, limit, kpiTab }],
    queryFn: () =>
      fetchFollowUps(
        {
          page,
          limit,
          filters: {
            ...filters,
            search: debouncedSearch,
            kpiTab: kpiTab || undefined,
            tab: kpiTab || filters.tab,
            priority: filters.priority || undefined,
            status: filters.status || undefined,
          },
        },
        endpoint
      ),
    enabled,
    staleTime: LIST_STALE_MS,
    gcTime: GC_TIME_MS,
    refetchOnMount: false,
    placeholderData: (prev) => prev,
  });
}

export function useFollowUpSummaryQuery(endpoint = '/followups/summary', enabled = true) {
  return useQuery({
    queryKey: ['followups', 'summary', endpoint],
    queryFn: () => fetchFollowUpSummary(endpoint),
    enabled,
    staleTime: LIST_STALE_MS,
    gcTime: GC_TIME_MS,
    refetchOnMount: false,
    placeholderData: (prev) => prev,
  });
}

export function useFollowUpsCalendarQuery({ filters = {}, endpoint = '/followups', enabled = true }) {
  const debouncedSearch = useDebouncedValue(filters.search, 350);

  return useQuery({
    queryKey: ['followups', 'calendar', endpoint, { filters: { ...filters, search: debouncedSearch } }],
    queryFn: () =>
      fetchFollowUpsCalendar({ filters: { ...filters, search: debouncedSearch } }, endpoint),
    enabled,
    staleTime: LIST_STALE_MS,
    gcTime: GC_TIME_MS,
    refetchOnMount: false,
    placeholderData: (prev) => prev,
  });
}

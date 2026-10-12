import API from '../api/axios';

const FRESH_PARAMS = { fresh: 1 };

function resolveDashboardEndpoint(keyPart) {
  if (typeof keyPart !== 'string' || !keyPart) return '/dashboard/stats';
  if (keyPart.startsWith('/')) return keyPart;
  // Insight cards historically used short keys like "destination-insight"
  return `/dashboard/${keyPart}`;
}

function buildDashboardRefreshParams(queryKey) {
  const params = { ...FRESH_PARAMS };
  const slot = queryKey?.[2];

  // Standard dashboard keys: ['dashboard', '/dashboard/stats', { dateFrom, dateTo, ... }]
  if (slot && typeof slot === 'object' && !Array.isArray(slot)) {
    if (slot.dateFrom) params.dateFrom = slot.dateFrom;
    if (slot.dateTo) params.dateTo = slot.dateTo;
    if (slot.source) params.source = slot.source;
    if (slot.destinationPeriod) params.destinationPeriod = slot.destinationPeriod;
    if (slot.period) params.period = slot.period;
    return params;
  }

  // Insight card keys: ['dashboard', 'destination-insight', period, dateFrom, dateTo]
  if (typeof slot === 'string') {
    params.period = slot;
    if (queryKey[3]) params.dateFrom = queryKey[3];
    if (queryKey[4]) params.dateTo = queryKey[4];
  }
  return params;
}

async function refetchActiveDashboards(queryClient) {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: ['dashboard'], type: 'active' });

  await Promise.all(
    queries.map((query) => {
      const endpoint = resolveDashboardEndpoint(query.queryKey[1]);
      const params = buildDashboardRefreshParams(query.queryKey);
      return queryClient.fetchQuery({
        queryKey: query.queryKey,
        queryFn: async () => {
          const { data } = await API.get(endpoint, {
            params,
            skipSuccessToast: true,
            skipErrorToast: true,
          });
          return data;
        },
      });
    })
  );
}

async function refetchActiveNavCounts(queryClient) {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: ['nav-counts'], type: 'active' });

  await Promise.all(
    queries.map((query) =>
      queryClient.fetchQuery({
        queryKey: query.queryKey,
        queryFn: async () => {
          const { data } = await API.get('/nav-counts', {
            params: FRESH_PARAMS,
            skipSuccessToast: true,
            skipErrorToast: true,
          });
          return data;
        },
      })
    )
  );
}

/** Manual top-bar refresh — only refresh shell + currently visible page queries. */
export async function refreshAppData(queryClient) {
  // Mark dashboards/nav stale without a global refetch stampede.
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'none' }),
    queryClient.invalidateQueries({ queryKey: ['nav-counts'], refetchType: 'none' }),
  ]);

  const PRIMARY_ACTIVE = new Set(['leads', 'followups', 'quotations', 'operations', 'whatsapp', 'reports']);

  await Promise.all([
    refetchActiveDashboards(queryClient),
    refetchActiveNavCounts(queryClient),
    queryClient.refetchQueries({
      type: 'active',
      predicate: (query) => {
        const root = query.queryKey[0];
        if (!PRIMARY_ACTIVE.has(root)) return false;
        // KPI strip refreshes with leads lists; skip header ticker / noise keys
        if (root === 'leads' && query.queryKey[1] === 'list-kpis') return true;
        return true;
      },
    }),
  ]);
}

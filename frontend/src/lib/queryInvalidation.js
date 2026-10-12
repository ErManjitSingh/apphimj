/** Scoped cache invalidation — avoids refetching every lead query on one mutation */

export function invalidateLeadLists(queryClient) {
  return queryClient.invalidateQueries({
    // Only active list/detail-family queries — skip inactive cached pages & KPIs stampede
    type: 'active',
    predicate: (q) => {
      if (q.queryKey[0] !== 'leads') return false;
      // list-kpis is expensive; refresh via nav-counts / dedicated TTL instead
      if (q.queryKey[1] === 'list-kpis') return false;
      return true;
    },
  });
}

export function invalidateNavCounts(queryClient) {
  return queryClient.invalidateQueries({ queryKey: ['nav-counts'] });
}

export function invalidateLeadDetail(queryClient, leadId) {
  if (!leadId) return Promise.resolve();
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['lead', leadId] }),
    queryClient.invalidateQueries({ queryKey: ['lead-timeline', leadId] }),
    queryClient.invalidateQueries({ queryKey: ['lead-audit', leadId] }),
    queryClient.invalidateQueries({ queryKey: ['lead-transfer-history', leadId] }),
  ]);
}

export function invalidateDashboard(queryClient) {
  return queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}

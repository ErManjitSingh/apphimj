import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import SourceAnalyticsPanel from '../components/dashboard/SourceAnalyticsPanel';
import ExecutivePerformancePanel from '../components/dashboard/ExecutivePerformancePanel';
import AgingChartPanel from '../components/dashboard/AgingChartPanel';
import { fetchLeadKpis, fetchSourceAnalytics, fetchExecutivePerformance } from '../services/leadEnterpriseApi';
import EnterpriseKpiStrip from '../components/dashboard/EnterpriseKpiStrip';
import { ANALYTICS_STALE_MS, GC_TIME_MS } from '../lib/queryConfig';

export default function LeadAnalytics() {
  const kpisQuery = useQuery({
    queryKey: ['lead-analytics', 'kpis'],
    queryFn: fetchLeadKpis,
    staleTime: ANALYTICS_STALE_MS,
    gcTime: GC_TIME_MS,
  });
  const sourcesQuery = useQuery({
    queryKey: ['lead-analytics', 'sources'],
    queryFn: fetchSourceAnalytics,
    staleTime: ANALYTICS_STALE_MS,
    gcTime: GC_TIME_MS,
  });
  const execQuery = useQuery({
    queryKey: ['lead-analytics', 'executives'],
    queryFn: fetchExecutivePerformance,
    staleTime: ANALYTICS_STALE_MS,
    gcTime: GC_TIME_MS,
  });

  const loading = kpisQuery.isLoading || sourcesQuery.isLoading || execQuery.isLoading;

  if (loading) {
    return (
      <div className="rounded-2xl border border-subtle bg-surface p-16 text-center text-content-muted animate-pulse">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-600">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Lead Analytics</h1>
          <p className="text-sm text-content-muted">
            Booked conversions, package value, source mix & executive performance
          </p>
        </div>
      </div>

      <EnterpriseKpiStrip kpis={kpisQuery.data} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SourceAnalyticsPanel data={sourcesQuery.data} />
        <AgingChartPanel aging={kpisQuery.data?.aging || []} />
      </div>

      <ExecutivePerformancePanel data={execQuery.data} />
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Sparkles, ListTree, BarChart3 } from 'lucide-react';
import API from '../../../../api/axios';
import { useAuth } from '../../../../context/AuthContext';
import { useDataRefresh } from '../../../../hooks/useDataRefresh';
import ExecutiveActivityFilters, { applyActivityPreset } from './ExecutiveActivityFilters';
import ActivitySummaryCards from './ActivitySummaryCards';
import ActiveIdleSummaryCard from './ActiveIdleSummaryCard';
import ModuleUsagePanel from './ModuleUsagePanel';
import ActivityTimelineList from './ActivityTimelineList';
import ActivityTeamOverviewTable from './ActivityTeamOverviewTable';
import ActivityAnalyticsSection from './ActivityAnalyticsSection';
import ActivityDetailDrawer from './ActivityDetailDrawer';

const TIMELINE_PAGE_SIZE = 20;

/** `selfOnly` — see CallReportPage.jsx's doc comment; same pattern, same server-side guarantee. */
export default function ExecutiveActivityPage({ selfOnly = false }) {
  const { user } = useAuth();
  const [filters, setFilters] = useState(() => applyActivityPreset('today'));
  const [executiveId, setExecutiveId] = useState(() => (selfOnly ? String(user?._id || '') : 'all'));
  const [executives, setExecutives] = useState(() => (selfOnly && user ? [user] : []));
  const [tab, setTab] = useState('timeline');

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [moduleUsage, setModuleUsage] = useState([]);
  const [moduleUsageLoading, setModuleUsageLoading] = useState(false);

  const [pageIndex, setPageIndex] = useState(0);
  const [timeline, setTimeline] = useState({ events: [], pagination: null });
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [teamRows, setTeamRows] = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    if (selfOnly) return;
    API.get('/sales-manager/executives', { skipSuccessToast: true }).then((r) => setExecutives(r.data || []));
  }, [selfOnly]);

  const fetchSummary = useCallback(() => {
    if (executiveId === 'all') return;
    setSummaryLoading(true);
    API.get('/sales-manager/call-report/activity/summary', {
      params: { executiveId, dateFrom: filters.dateFrom, dateTo: filters.dateTo },
      skipSuccessToast: true,
    })
      .then((r) => setSummary(r.data))
      .finally(() => setSummaryLoading(false));
  }, [executiveId, filters.dateFrom, filters.dateTo]);

  const fetchModuleUsage = useCallback(() => {
    if (executiveId === 'all') return;
    setModuleUsageLoading(true);
    API.get('/sales-manager/call-report/activity/module-usage', {
      params: { executiveId, dateFrom: filters.dateFrom, dateTo: filters.dateTo },
      skipSuccessToast: true,
    })
      .then((r) => setModuleUsage(r.data || []))
      .finally(() => setModuleUsageLoading(false));
  }, [executiveId, filters.dateFrom, filters.dateTo]);

  const fetchTimeline = useCallback(() => {
    if (executiveId === 'all') return;
    setTimelineLoading(true);
    API.get('/sales-manager/call-report/activity/timeline', {
      params: {
        executiveId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        page: pageIndex + 1,
        limit: TIMELINE_PAGE_SIZE,
      },
      skipSuccessToast: true,
    })
      .then((r) => setTimeline(r.data))
      .finally(() => setTimelineLoading(false));
  }, [executiveId, filters.dateFrom, filters.dateTo, pageIndex]);

  const fetchTeamOverview = useCallback(() => {
    if (executiveId !== 'all') return;
    setTeamLoading(true);
    API.get('/sales-manager/call-report/activity/team-overview', {
      params: { dateFrom: filters.dateFrom, dateTo: filters.dateTo },
      skipSuccessToast: true,
    })
      .then((r) => setTeamRows(r.data || []))
      .finally(() => setTeamLoading(false));
  }, [executiveId, filters.dateFrom, filters.dateTo]);

  useEffect(() => { setPageIndex(0); }, [executiveId, filters.dateFrom, filters.dateTo]);
  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchModuleUsage(); }, [fetchModuleUsage]);
  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);
  useEffect(() => { fetchTeamOverview(); }, [fetchTeamOverview]);

  useDataRefresh(['leads'], () => {
    fetchSummary();
    fetchModuleUsage();
    fetchTimeline();
    fetchTeamOverview();
  });

  const selectedExecutive = useMemo(
    () => (selfOnly ? user : executives.find((ex) => String(ex._id) === String(executiveId))),
    [executives, executiveId, selfOnly, user]
  );

  return (
    <div className="space-y-4">
      <ExecutiveActivityFilters
        filters={filters}
        onChange={setFilters}
        executives={executives}
        executiveId={executiveId}
        onExecutiveChange={setExecutiveId}
        selfOnly={selfOnly}
      />

      {executiveId === 'all' ? (
        <div className="space-y-4">
          <ActivityTeamOverviewTable rows={teamRows} loading={teamLoading} onSelectExecutive={setExecutiveId} />

          <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-white p-3.5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-700">Team Activity Analytics</h3>
                <p className="text-[11px] text-amber-600/80">Trends and executive comparison</p>
              </div>
            </div>
            <ActivityAnalyticsSection executiveId="all" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!selfOnly && (
            <button
              type="button"
              onClick={() => setExecutiveId('all')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-500"
            >
              <ArrowLeft className="h-4 w-4" /> Back to team overview
            </button>
          )}

          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-3.5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-700">
                  {selfOnly ? 'My Activity Summary' : `${selectedExecutive?.name || 'Executive'} — Activity Summary`}
                </h3>
                <p className="text-[11px] text-emerald-600/80">What this executive did in the CRM for the selected period</p>
              </div>
            </div>
            <ActivitySummaryCards summary={summary} loading={summaryLoading} />
          </div>

          <ActiveIdleSummaryCard summary={summary} loading={summaryLoading} />

          <ModuleUsagePanel rows={moduleUsage} loading={moduleUsageLoading} />

          <div className="flex items-center gap-1.5 rounded-xl border border-subtle bg-white p-1 w-fit">
            <button
              type="button"
              onClick={() => setTab('timeline')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === 'timeline' ? 'bg-teal-600 text-white shadow-sm' : 'text-content-muted hover:text-content-primary'
              }`}
            >
              <ListTree className="h-3.5 w-3.5" /> Timeline
            </button>
            <button
              type="button"
              onClick={() => setTab('analytics')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                tab === 'analytics' ? 'bg-teal-600 text-white shadow-sm' : 'text-content-muted hover:text-content-primary'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </button>
          </div>

          {tab === 'timeline' ? (
            <ActivityTimelineList
              events={timeline.events || []}
              pagination={timeline.pagination}
              pageIndex={pageIndex}
              onPageChange={setPageIndex}
              loading={timelineLoading}
              onSelectEvent={setSelectedEvent}
            />
          ) : (
            <ActivityAnalyticsSection executiveId={executiveId} executiveName={selectedExecutive?.name} />
          )}
        </div>
      )}

      <ActivityDetailDrawer event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}

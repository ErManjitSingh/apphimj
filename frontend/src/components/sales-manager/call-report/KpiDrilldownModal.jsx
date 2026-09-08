import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Phone, PhoneOff, Clock4, Users2 } from 'lucide-react';
import AppModal from '../../ui/AppModal';
import TablePagination from '../../ui/TablePagination';
import API from '../../../api/axios';
import { formatCallDuration } from '../../../lib/callSession';
import { StatChip, CallRow } from './HourCallDetailModal';

const PAGE_SIZE = 20;
// Only 1 or 2 stat chips ever appear (see getKpiPresentation) — a static class per count keeps
// Tailwind's build-time class scan happy (computed class-name strings are invisible to it).
const GRID_COLS = { 1: 'max-w-[180px] grid-cols-1', 2: 'grid-cols-2' };

const EMPTY_MESSAGES = {
  connected: 'No connected calls in this period.',
  no_answer: 'No unanswered calls in this period.',
  failed: 'No failed or cancelled calls in this period.',
};

function formatDateLabel(dateFrom, dateTo) {
  if (!dateFrom) return '';
  const opts = { month: 'long', day: 'numeric', year: 'numeric' };
  const from = new Date(`${dateFrom}T00:00:00`).toLocaleDateString('en-US', opts);
  if (!dateTo || dateTo === dateFrom) return from;
  const to = new Date(`${dateTo}T00:00:00`).toLocaleDateString('en-US', opts);
  return `${from} – ${to}`;
}

/**
 * Header value + supporting stat chips for a KPI drill-down. `summary` is the page-level
 * ExecutiveSummaryCards data (already fetched, same numbers shown on the KPI card — reused here
 * rather than recomputed). `result` is this modal's own fetch, whose `summary`/`guestBreakdown`
 * reflect exactly the filtered population feeding the list below, so it always reconciles with it.
 */
function getKpiPresentation(kpiKey, summary, result) {
  const s = result?.summary;
  switch (kpiKey) {
    case 'totalCalls':
      return { headerValue: summary?.totalCalls ?? 0, statChips: [] };
    case 'connectedCalls':
      return { headerValue: summary?.connectedCalls ?? 0, statChips: [] };
    case 'noAnswerCalls':
      return { headerValue: summary?.noAnswerCalls ?? 0, statChips: [] };
    case 'failedCalls':
      return { headerValue: summary?.failedCalls ?? 0, statChips: [] };
    case 'totalTalkTimeSec':
      return {
        headerValue: formatCallDuration(summary?.totalTalkTimeSec || 0),
        statChips: [{ label: 'Total Calls', value: summary?.totalCalls ?? '—', icon: Phone }],
      };
    case 'avgCallDurationSec':
      return {
        headerValue: formatCallDuration(summary?.avgCallDurationSec || 0),
        statChips: [
          { label: 'Total Calls', value: s?.totalCalls ?? '—', icon: Phone },
          { label: 'Total Talk Time', value: s ? formatCallDuration(s.totalTalkTimeSec) : '—', icon: Clock4 },
        ],
      };
    case 'longestCallSec':
      return { headerValue: formatCallDuration(summary?.longestCallSec || 0), statChips: [] };
    case 'shortestCallSec':
      return { headerValue: formatCallDuration(summary?.shortestCallSec || 0), statChips: [] };
    case 'uniqueGuestsContacted':
      return {
        headerValue: summary?.uniqueGuestsContacted ?? 0,
        statChips: [{ label: 'Total Calls', value: summary?.totalCalls ?? '—', icon: Phone }],
      };
    case 'avgCallsPerGuest':
      return {
        headerValue: summary?.avgCallsPerGuest ?? 0,
        statChips: [
          { label: 'Total Calls', value: summary?.totalCalls ?? '—', icon: Phone },
          { label: 'Unique Guests', value: summary?.uniqueGuestsContacted ?? '—', icon: Users2 },
        ],
      };
    default:
      return { headerValue: '—', statChips: [] };
  }
}

export default function KpiDrilldownModal({ open, kpi, executiveId, executiveName, dateFrom, dateTo, summary, onClose }) {
  const navigate = useNavigate();
  const [pageIndex, setPageIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setPageIndex(0); setResult(null); }, [kpi?.key, open]);

  useEffect(() => {
    if (!open || !kpi || !executiveId) return;
    const isSingle = kpi.mode === 'single';
    const isGuests = kpi.mode === 'guests';
    setLoading(true);
    const params = {
      executiveId,
      dateFrom,
      dateTo,
      page: isSingle ? 1 : pageIndex + 1,
      limit: isSingle ? 1 : PAGE_SIZE,
    };
    if (kpi.outcome) params.outcome = kpi.outcome;
    if (kpi.durationGt !== undefined) params.durationGt = kpi.durationGt;
    if (kpi.sortBy) params.sortBy = kpi.sortBy;
    if (kpi.sortDir) params.sortDir = kpi.sortDir;
    if (isGuests) params.includeGuestBreakdown = true;
    API.get('/sales-manager/call-report/hour-detail', { params, skipSuccessToast: true })
      .then((r) => setResult(r.data))
      .finally(() => setLoading(false));
  }, [open, kpi, executiveId, dateFrom, dateTo, pageIndex]);

  const dateLabel = useMemo(() => formatDateLabel(dateFrom, dateTo), [dateFrom, dateTo]);

  if (!kpi) return null;

  const { headerValue, statChips } = getKpiPresentation(kpi.key, summary, result);
  const calls = result?.calls || [];
  const guestRows = result?.guestBreakdown || [];
  const emptyMessage = EMPTY_MESSAGES[kpi.outcome] || (kpi.mode === 'guests' ? 'No guests contacted in this period.' : 'No calls in this period.');
  const gridColsClass = GRID_COLS[statChips.length] || 'grid-cols-2';

  return (
    <AppModal open={open} onClose={onClose} size={kpi.mode === 'single' ? 'md' : '2xl'}>
      <div className="shrink-0 border-b border-subtle p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-violet-600">{kpi.title} — {executiveName || 'Executive'}</p>
            <h2 className="mt-1 text-xl font-bold text-content-primary">{headerValue}</h2>
            <p className="mt-0.5 text-xs text-content-muted">{dateLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-content-muted hover:bg-surface-elevated">
            <X className="h-4 w-4" />
          </button>
        </div>

        {statChips.length > 0 && (
          <div className={`mt-4 grid gap-2 ${gridColsClass}`}>
            {statChips.map((chip) => (
              <StatChip key={chip.label} label={chip.label} value={chip.value} icon={chip.icon} />
            ))}
          </div>
        )}
      </div>

      <div className={kpi.mode !== 'single' ? 'max-h-[420px] overflow-y-auto p-5' : 'p-5'}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: kpi.mode === 'single' ? 1 : 4 }).map((_, i) => (
              <div key={i} className="h-[84px] animate-pulse rounded-xl bg-surface-elevated/50" />
            ))}
          </div>
        ) : kpi.mode === 'guests' ? (
          guestRows.length ? (
            <div className="overflow-x-auto rounded-xl border border-subtle">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-fuchsia-600">
                  <tr>
                    {['Guest', 'Phone', 'Calls'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {guestRows.map((g) => (
                    <tr
                      key={g.leadId}
                      className="cursor-pointer bg-white transition hover:bg-fuchsia-50/60 dark:bg-slate-900/80"
                      onClick={() => g.leadId && navigate(`/sales-manager/leads/${g.leadId}/view`)}
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-content-primary">{g.leadName}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-sm text-content-secondary">{g.leadPhone || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-sm font-bold tabular-nums text-content-primary">{g.calls}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-subtle bg-surface-elevated/60">
                    <td className="px-3 py-2.5 text-sm font-bold text-content-primary">Total</td>
                    <td />
                    <td className="px-3 py-2.5 text-sm font-bold tabular-nums text-content-primary">
                      {guestRows.reduce((sum, g) => sum + g.calls, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <EmptyState icon={Users2} message={emptyMessage} />
          )
        ) : !calls.length ? (
          <EmptyState icon={PhoneOff} message={emptyMessage} />
        ) : kpi.mode === 'single' ? (
          <CallRow call={calls[0]} />
        ) : (
          <div className="space-y-2">
            {calls.map((c) => <CallRow key={c.callId} call={c} />)}
          </div>
        )}
      </div>

      {kpi.mode === 'calls' && result?.pagination && calls.length > 0 && (
        <div className="border-t border-subtle">
          <TablePagination
            pageIndex={pageIndex}
            pageSize={result.pagination.limit}
            pageCount={result.pagination.totalPages || 1}
            total={result.pagination.total}
            onPageChange={setPageIndex}
            totalLabel="calls"
            accent="violet"
          />
        </div>
      )}
    </AppModal>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-subtle bg-surface-elevated/40 py-14 text-center">
      <Icon className="h-8 w-8 text-content-muted" />
      <p className="text-sm font-semibold text-content-primary">{message}</p>
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TrendingDown, TrendingUp } from 'lucide-react';
import API from '../../api/axios';
import { DASHBOARD_STALE_MS, GC_TIME_MS } from '../../lib/queryConfig';
import { cn } from '../../lib/utils';
import InsightPeriodTabs from './InsightPeriodTabs';

function n(v) {
  return Number(v || 0).toLocaleString('en-IN');
}

function Stat({ label, value, hint, tone }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn('metric-tabular mt-0.5 text-[16px] font-bold leading-none', tone || 'text-slate-900')}>
        {value}
      </p>
      {hint ? <div className="mt-0.5 truncate text-[10px] text-slate-400">{hint}</div> : null}
    </div>
  );
}

export default function DestinationInsightCard() {
  const [period, setPeriod] = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const customReady = period !== 'custom' || Boolean(dateFrom || dateTo);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'destination-insight', period, dateFrom, dateTo],
    queryFn: async () => {
      const { data: payload } = await API.get('/dashboard/destination-insight', {
        params: {
          period,
          dateFrom: period === 'custom' ? dateFrom || undefined : undefined,
          dateTo: period === 'custom' ? dateTo || undefined : undefined,
        },
        skipSuccessToast: true,
      });
      return payload;
    },
    enabled: customReady,
    staleTime: DASHBOARD_STALE_MS,
    gcTime: GC_TIME_MS,
    placeholderData: (prev) => prev,
  });

  const rows = (data?.rows || []).slice(0, 8);
  const totals = data?.totals || {
    queries: 0,
    hot: 0,
    warm: 0,
    cold: 0,
    prevQueries: 0,
    destinations: 0,
  };
  const maxQueries = Math.max(...rows.map((r) => Number(r.queries || 0)), 1);
  const delta = Number(totals.queryDelta || 0);
  const DeltaIcon = delta >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-900">Destinations</h2>
          <p className="text-[11px] text-slate-500">
            {data?.label || 'This Month'}
            {data?.previousLabel ? ` · vs ${data.previousLabel}` : ''}
          </p>
        </div>
        <InsightPeriodTabs
          period={period}
          onPeriodChange={setPeriod}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFrom={setDateFrom}
          onDateTo={setDateTo}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-slate-100 px-4 py-3 sm:grid-cols-5">
        <Stat label="Queries" value={n(totals.queries)} hint={`${totals.destinations || 0} places`} />
        <Stat
          label="vs Last"
          value={`${delta >= 0 ? '+' : ''}${n(delta)}`}
          hint={
            <span className="inline-flex items-center gap-0.5">
              <DeltaIcon className="h-3 w-3" />
              was {n(totals.prevQueries)}
            </span>
          }
          tone={delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}
        />
        <Stat label="Hot" value={n(totals.hot)} tone="text-rose-600" hint={`was ${n(totals.prevHot)}`} />
        <Stat label="Warm" value={n(totals.warm)} tone="text-amber-600" hint={`was ${n(totals.prevWarm)}`} />
        <Stat label="Cold" value={n(totals.cold)} tone="text-sky-600" hint={`was ${n(totals.prevCold)}`} />
      </div>

      <div className="min-h-0 flex-1 px-2 py-2">
        {isLoading && !rows.length ? (
          <div className="space-y-1.5 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : !rows.length ? (
          <p className="px-3 py-8 text-center text-sm text-slate-400">No destination queries yet</p>
        ) : (
          <ul className="space-y-0.5">
            {rows.map((row, index) => {
              const queries = Number(row.queries || 0);
              const width = Math.max(6, (queries / maxQueries) * 100);
              const rowDelta = Number(row.queryDelta || 0);
              return (
                <li key={row.destination}>
                  <Link
                    to={`/destination/${encodeURIComponent(row.destination)}`}
                    className="group flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-slate-50"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500 group-hover:bg-orange-50 group-hover:text-orange-600">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-[13px] font-semibold text-slate-800">{row.destination}</p>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={cn(
                              'text-[10px] font-bold tabular-nums',
                              rowDelta > 0
                                ? 'text-emerald-600'
                                : rowDelta < 0
                                  ? 'text-rose-500'
                                  : 'text-slate-300'
                            )}
                          >
                            {rowDelta > 0 ? '+' : ''}
                            {n(rowDelta)}
                          </span>
                          <span className="metric-tabular w-8 text-right text-[13px] font-bold text-slate-900">
                            {n(queries)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold tabular-nums">
                          <span className="text-rose-500">{n(row.hot)}H</span>
                          <span className="text-amber-500">{n(row.warm)}W</span>
                          <span className="text-sky-500">{n(row.cold)}C</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

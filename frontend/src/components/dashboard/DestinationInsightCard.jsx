import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, PhoneCall, Sparkles, Users } from 'lucide-react';
import API from '../../api/axios';
import { DASHBOARD_STALE_MS, GC_TIME_MS } from '../../lib/queryConfig';
import { cn } from '../../lib/utils';
import InsightPeriodTabs from './InsightPeriodTabs';

const DEST_TONES = [
  'from-orange-500 to-amber-500',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-sky-600',
];

function n(v) {
  return Number(v || 0).toLocaleString('en-IN');
}

function SummaryChip({ icon: Icon, label, value, tone, sub }) {
  return (
    <div className={cn('rounded-2xl p-3 ring-1', tone)}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-80">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="metric-tabular mt-1 text-[20px] font-bold leading-none tracking-tight">{value}</p>
      {sub ? <p className="mt-1 text-[10px] font-medium opacity-70">{sub}</p> : null}
    </div>
  );
}

export default function DestinationInsightCard() {
  const [period, setPeriod] = useState('today');
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

  const rows = data?.rows || [];
  const totals = data?.totals || { queries: 0, connected: 0, leads: 0, connectRate: 0 };
  const maxQueries = Math.max(...rows.map((r) => Number(r.queries || 0)), 1);

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-slate-100">
      <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50/80 via-white to-sky-50/60 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-500">Destination report</p>
            <h2 className="mt-0.5 text-[16px] font-semibold text-slate-900">Destination-wise Queries</h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Queries, connected calls, and open leads · {data?.label || 'Today'}
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

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryChip
            icon={Sparkles}
            label="Queries"
            value={n(totals.queries)}
            sub={`${totals.destinations || 0} destinations`}
            tone="bg-orange-50 text-orange-800 ring-orange-100"
          />
          <SummaryChip
            icon={PhoneCall}
            label="Connected"
            value={n(totals.connected)}
            sub={`${totals.connectRate || 0}% connect rate`}
            tone="bg-sky-50 text-sky-800 ring-sky-100"
          />
          <SummaryChip
            icon={Users}
            label="Open Leads"
            value={n(totals.leads)}
            sub="Still in pipeline"
            tone="bg-emerald-50 text-emerald-800 ring-emerald-100"
          />
          <SummaryChip
            icon={MapPin}
            label="Connect Rate"
            value={`${totals.connectRate || 0}%`}
            sub="Connected / queries"
            tone="bg-violet-50 text-violet-800 ring-violet-100"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {isLoading && !rows.length ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : !rows.length ? (
          <p className="flex h-full items-center justify-center px-5 py-12 text-center text-sm text-slate-400">
            No destination queries in this period
          </p>
        ) : (
          <ul className="space-y-1.5 p-2">
            {rows.map((row, index) => {
              const queries = Number(row.queries || 0);
              const width = Math.max(8, (queries / maxQueries) * 100);
              return (
                <li key={row.destination}>
                  <Link
                    to={`/destination/${row.destination}`}
                    className="block rounded-2xl px-3 py-2.5 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-[11px] font-bold text-white shadow-sm',
                          DEST_TONES[index % DEST_TONES.length]
                        )}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[13px] font-semibold text-slate-800">{row.destination}</p>
                          <p className="metric-tabular shrink-0 text-[13px] font-bold text-slate-900">{n(queries)}</p>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-400"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                          <span className="text-orange-600">
                            Query <b className="tabular-nums">{n(row.queries)}</b>
                          </span>
                          <span className="text-sky-600">
                            Connected <b className="tabular-nums">{n(row.connected)}</b>
                          </span>
                          <span className="text-emerald-600">
                            Leads <b className="tabular-nums">{n(row.leads)}</b>
                          </span>
                          <span className="text-violet-600">
                            {row.connectRate || 0}%
                          </span>
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

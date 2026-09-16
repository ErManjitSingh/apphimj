import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, PhoneCall, Trophy, Users } from 'lucide-react';
import API from '../../api/axios';
import { DASHBOARD_STALE_MS, GC_TIME_MS } from '../../lib/queryConfig';
import { cn } from '../../lib/utils';
import Avatar from '../ui/Avatar';
import InsightPeriodTabs from './InsightPeriodTabs';

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
      <p className="metric-tabular mt-1 truncate text-[20px] font-bold leading-none tracking-tight">{value}</p>
      {sub ? <p className="mt-1 truncate text-[10px] font-medium opacity-70">{sub}</p> : null}
    </div>
  );
}

export default function ExecutiveInsightCard() {
  const [period, setPeriod] = useState('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const customReady = period !== 'custom' || Boolean(dateFrom || dateTo);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'executive-insight', period, dateFrom, dateTo],
    queryFn: async () => {
      const { data: payload } = await API.get('/dashboard/executive-insight', {
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

  const rows = (data?.rows || []).filter((row) => Number(row.queries || 0) > 0 || row.unassigned);
  const visible = rows.filter((row) => Number(row.queries || 0) > 0);
  const totals = data?.totals || { queries: 0, connected: 0, leads: 0, executives: 0, connectRate: 0 };
  const top = visible[0];
  const maxQueries = Math.max(...visible.map((r) => Number(r.queries || 0)), 1);

  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-slate-100">
      <div className="border-b border-slate-100 bg-gradient-to-r from-violet-50/80 via-white to-emerald-50/50 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-500">Team report</p>
            <h2 className="mt-0.5 text-[16px] font-semibold text-slate-900">Executives with Leads</h2>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Total leads and destination mix · {data?.label || 'Today'}
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
            icon={Users}
            label="Executives"
            value={n(totals.executives)}
            sub="With at least 1 lead"
            tone="bg-violet-50 text-violet-800 ring-violet-100"
          />
          <SummaryChip
            icon={Trophy}
            label="Total Leads"
            value={n(totals.queries)}
            sub={top ? `Top: ${top.name}` : 'No leads yet'}
            tone="bg-amber-50 text-amber-800 ring-amber-100"
          />
          <SummaryChip
            icon={PhoneCall}
            label="Connected"
            value={n(totals.connected)}
            sub={`${totals.connectRate || 0}% of total`}
            tone="bg-sky-50 text-sky-800 ring-sky-100"
          />
          <SummaryChip
            icon={MapPin}
            label="Open Leads"
            value={n(totals.leads)}
            sub="Still in pipeline"
            tone="bg-emerald-50 text-emerald-800 ring-emerald-100"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {isLoading && !visible.length ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : !visible.length ? (
          <p className="flex h-full items-center justify-center px-5 py-12 text-center text-sm text-slate-400">
            No executive leads in this period
          </p>
        ) : (
          <ul className="space-y-1.5 p-2">
            {visible.map((row, index) => {
              const queries = Number(row.queries || 0);
              const width = Math.max(8, (queries / maxQueries) * 100);
              const dests = (row.destinations || []).slice(0, 5);
              const extra = Math.max(0, (row.destinations || []).length - dests.length);
              return (
                <li
                  key={row._id}
                  className="rounded-2xl px-3 py-2.5 transition hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <Avatar name={row.name} size="sm" />
                      <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 text-[9px] font-bold text-white">
                        {index + 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-slate-800">{row.name}</p>
                          <p className="text-[11px] text-slate-400">
                            {n(row.connected)} connected · {row.connectRate || 0}% · {n(row.leads)} open
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="metric-tabular text-[15px] font-bold leading-none text-slate-900">
                            {n(queries)}
                          </p>
                          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                            Total leads
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      {dests.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {dests.map((dest) => (
                            <span
                              key={dest.destination}
                              className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-100"
                              title={`${dest.destination}: ${dest.queries} queries, ${dest.connected} connected`}
                            >
                              <MapPin className="h-2.5 w-2.5" />
                              <span className="max-w-[110px] truncate">{dest.destination}</span>
                              <span className="tabular-nums text-violet-500">{n(dest.queries)}</span>
                            </span>
                          ))}
                          {extra > 0 && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                              +{extra} more
                            </span>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

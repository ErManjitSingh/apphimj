import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import InsightPeriodTabs from './InsightPeriodTabs';
import { useDashboardQuery } from '../../features/dashboard/hooks/useDashboardQuery';

const STAGE_META = [
  { keys: ['new', 'new_lead'], label: 'New', tint: '#F1F5F9', bar: '#94A3B8' },
  { keys: ['contacted'], label: 'Contacted', tint: '#EEF2FF', bar: '#818CF8' },
  { keys: ['working', 'working_progress'], label: 'Working', tint: '#FFF7ED', bar: '#FB923C' },
  { keys: ['qualified'], label: 'Qualified', tint: '#ECFDF5', bar: '#34D399' },
  { keys: ['quotation', 'quotation_sent', 'package_sent'], label: 'Quotation', tint: '#EFF6FF', bar: '#60A5FA' },
  { keys: ['follow_up'], label: 'Follow-up', tint: '#F5F3FF', bar: '#A78BFA' },
  { keys: ['negotiation'], label: 'Negotiation', tint: '#FFFBEB', bar: '#FBBF24' },
  { keys: ['reactivated'], label: 'Reactivated', tint: '#F0FDFA', bar: '#2DD4BF' },
  { keys: ['converted', 'booked', 'booking'], label: 'Booked', tint: '#ECFDF5', bar: '#22C55E' },
];

function toInputDate(d) {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function filtersFromPeriod(period, dateFrom, dateTo) {
  const now = new Date();
  if (period === 'custom') {
    return { dateFrom: dateFrom || '', dateTo: dateTo || '', source: '' };
  }
  if (period === 'today') {
    const day = toInputDate(now);
    return { dateFrom: day, dateTo: day, source: '' };
  }
  if (period === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const day = toInputDate(y);
    return { dateFrom: day, dateTo: day, source: '' };
  }
  if (period === 'month') {
    return {
      dateFrom: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      dateTo: toInputDate(now),
      source: '',
    };
  }
  return { dateFrom: '', dateTo: '', source: '' };
}

function buildStages(raw = []) {
  const byKey = new Map();
  raw.forEach((row) => {
    const key = String(row.key || row._id || row.name || '').toLowerCase();
    byKey.set(key, Number(row.value ?? row.count ?? 0));
  });

  const stages = [];
  for (const meta of STAGE_META) {
    let value = 0;
    for (const k of meta.keys) {
      if (byKey.has(k)) {
        value += byKey.get(k) || 0;
        byKey.delete(k);
      }
    }
    if (value > 0) {
      stages.push({
        key: meta.keys[0],
        label: meta.label,
        value,
        tint: meta.tint,
        bar: meta.bar,
      });
    }
  }

  let lost = 0;
  for (const [key, value] of byKey) {
    if (key.includes('lost') || key.includes('another')) lost += value;
  }
  return { stages, lost };
}

export default function LeadStatusOverviewCard({ stats: parentStats }) {
  const [period, setPeriod] = useState('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const localFilters = useMemo(
    () => filtersFromPeriod(period, dateFrom, dateTo),
    [period, dateFrom, dateTo]
  );
  const customReady = period !== 'custom' || Boolean(dateFrom || dateTo);

  const { data: localStats, isFetching } = useDashboardQuery('/dashboard/stats', localFilters, {
    enabled: customReady,
  });

  const stats = localStats || parentStats;
  const raw = stats?.report?.statusDistribution || [];
  const { stages, lost } = useMemo(() => buildStages(raw), [raw]);
  const total = stages.reduce((s, d) => s + d.value, 0);
  const max = Math.max(...stages.map((s) => s.value), 1);
  const booked = stages.find((s) => s.label === 'Booked')?.value || 0;
  const convRate = total ? Math.round((booked / total) * 1000) / 10 : 0;
  const summaryLabel =
    stats?.report?.statusDistributionSummary?.periodLabel || stats?.report?.period?.label;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-slate-900">Lead Pipeline</h3>
          <p className="text-[11px] text-slate-500">
            {summaryLabel || 'This Month'}
            {isFetching ? ' · updating…' : ''}
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

      <div className="flex items-end justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">In pipeline</p>
          <p className="metric-tabular text-[20px] font-bold text-slate-900">
            {total.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Booked</p>
          <p className="metric-tabular text-[14px] font-bold text-emerald-700">
            {booked.toLocaleString('en-IN')}
            <span className="ml-1 text-[12px] font-semibold text-emerald-500">{convRate}%</span>
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-auto px-4 py-3">
        {stages.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">No lead data for this period</p>
        ) : (
          stages.map((stage, i) => {
            const pct = Math.max(8, Math.round((stage.value / max) * 100));
            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025 }}
                className="rounded-xl px-3 py-2"
                style={{ backgroundColor: stage.tint }}
              >
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="text-[12px] font-semibold text-slate-700">{stage.label}</span>
                  <span className="metric-tabular shrink-0 text-[13px] font-bold text-slate-900">
                    {stage.value.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/80">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.35, delay: i * 0.03 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: stage.bar }}
                  />
                </div>
              </motion.div>
            );
          })
        )}

        {lost > 0 ? (
          <div className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2.5">
            <span className="text-[12px] font-semibold text-rose-600">Lost</span>
            <span className="metric-tabular text-[13px] font-bold text-rose-700">
              {lost.toLocaleString('en-IN')}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

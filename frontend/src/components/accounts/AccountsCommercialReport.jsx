import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  Car,
  Download,
  ExternalLink,
  Layers,
  PieChart as PieIcon,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import API from '../../api/axios';
import { cn } from '../../lib/utils';
import { useUrlPeriodFilter } from '../../hooks/useUrlPeriodFilter';
import { Button } from '../ui/button';

const MIX_COLORS = {
  hotelCost: '#0d9488',
  cabCost: '#0284c7',
  otherCost: '#7c3aed',
  profitAmount: '#059669',
};

function formatINR(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount));
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function KpiCard({ label, value, hint, tone, icon: Icon, delay = 0 }) {
  const tones = {
    emerald: 'from-emerald-50 to-white border-emerald-200/70 text-emerald-900',
    sky: 'from-sky-50 to-white border-sky-200/70 text-sky-900',
    amber: 'from-amber-50 to-white border-amber-200/70 text-amber-950',
    violet: 'from-violet-50 to-white border-violet-200/70 text-violet-950',
    slate: 'from-slate-50 to-white border-slate-200/70 text-slate-900',
    rose: 'from-rose-50 to-white border-rose-200/70 text-rose-950',
  };
  const iconTone = {
    emerald: 'bg-emerald-600',
    sky: 'bg-sky-600',
    amber: 'bg-amber-600',
    violet: 'bg-violet-600',
    slate: 'bg-slate-700',
    rose: 'bg-rose-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'rounded-2xl border bg-gradient-to-br p-4 shadow-sm min-h-[108px]',
        tones[tone] || tones.slate
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-content-muted">{label}</p>
          <p className="mt-1.5 text-xl font-black tabular-nums tracking-tight">{value}</p>
          {hint ? <p className="mt-1 text-[11px] text-content-muted">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className={cn('rounded-xl p-2 text-white shadow-sm', iconTone[tone] || iconTone.slate)}>
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}

function Panel({ title, subtitle, children, className, action }) {
  return (
    <div className={cn('rounded-3xl border border-subtle/80 bg-white shadow-sm overflow-hidden', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-subtle/70 px-5 py-3.5 bg-gradient-to-r from-slate-50/90 to-white">
        <div>
          <h3 className="text-sm font-bold text-content-primary">{title}</h3>
          {subtitle ? <p className="text-xs text-content-muted mt-0.5">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function statusChip(status) {
  const map = {
    confirmed: 'bg-teal-50 text-teal-800 ring-teal-200',
    in_progress: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    completed: 'bg-slate-100 text-slate-700 ring-slate-200',
    postponed: 'bg-amber-50 text-amber-900 ring-amber-200',
    cancelled: 'bg-rose-50 text-rose-800 ring-rose-200',
    booking_received: 'bg-sky-50 text-sky-800 ring-sky-200',
    pending_verification: 'bg-amber-50 text-amber-800 ring-amber-200',
  };
  return map[status] || 'bg-slate-50 text-slate-700 ring-slate-200';
}

function exportCsv(rows = []) {
  const headers = [
    'Booking #',
    'Customer',
    'Destination',
    'Package',
    'Travel',
    'Status',
    'Package ₹',
    'Hotel ₹',
    'Cab ₹',
    'Other ₹',
    'Cost ₹',
    'Profit ₹',
    'Margin %',
    'Collected ₹',
    'Pending ₹',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.bookingNumber,
        `"${String(r.customerName || '').replace(/"/g, '""')}"`,
        `"${String(r.destination || '').replace(/"/g, '""')}"`,
        `"${String(r.packageName || '').replace(/"/g, '""')}"`,
        formatDate(r.travelDate),
        r.status,
        r.packageCost,
        r.hotelCost,
        r.cabCost,
        r.otherCost,
        r.costTotal,
        r.profitAmount,
        r.profitMargin,
        r.collected,
        r.pendingAmount,
      ].join(',')
    );
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `accounts-commercial-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AccountsCommercialReport() {
  const { dateFrom, dateTo, setPeriod } = useUrlPeriodFilter();
  const [status, setStatus] = useState('active');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    setError('');
    API.get('/accounts/commercial', {
      params: {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: status || 'active',
      },
      skipSuccessToast: true,
      skipErrorToast: true,
    })
      .then((res) => setData(res.data))
      .catch((err) => {
        setData(null);
        setError(err?.response?.data?.message || 'Could not load commercial report');
      })
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary || {};
  const filteredRows = useMemo(() => {
    const rows = data?.rows || [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.bookingNumber, r.customerName, r.destination, r.packageName, r.executiveName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [data, search]);

  const pieData = useMemo(
    () =>
      (data?.costMix || [])
        .filter((x) => Number(x.amount) > 0)
        .map((x) => ({ name: x.label, value: Number(x.amount), key: x.key })),
    [data]
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-10 space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/25">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-content-primary">
              Accounts · Commercial P&L
            </h1>
            <p className="text-sm text-content-muted">
              Exact figures from Ops commercial file — package, hotel/cab/other cost, profit & collections
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="rounded-xl gap-2" onClick={fetchData}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl gap-2"
            disabled={!filteredRows.length}
            onClick={() => exportCsv(filteredRows)}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-subtle/80 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-content-secondary">
            From
            <input
              type="date"
              value={dateFrom || ''}
              onChange={(e) => setPeriod({ dateFrom: e.target.value, dateTo: dateTo || '' })}
              className="mt-1 block h-10 rounded-xl border border-subtle bg-white px-3 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-content-secondary">
            To
            <input
              type="date"
              value={dateTo || ''}
              onChange={(e) => setPeriod({ dateFrom: dateFrom || '', dateTo: e.target.value })}
              className="mt-1 block h-10 rounded-xl border border-subtle bg-white px-3 text-sm"
            />
          </label>
          <div className="flex rounded-xl border border-subtle p-1 bg-slate-50">
            {[
              { key: 'active', label: 'Active + Done' },
              { key: 'all', label: 'All' },
              { key: 'closed', label: 'Hold / Cancel' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setStatus(opt.key)}
                className={cn(
                  'rounded-lg px-3 py-2 text-xs font-bold transition',
                  status === opt.key
                    ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-100'
                    : 'text-content-muted hover:text-content-primary'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search booking, customer, destination…"
            className="h-10 min-w-[220px] flex-1 rounded-xl border border-subtle bg-white px-3 text-sm"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="grid animate-pulse grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Package revenue"
              value={formatINR(summary.packageRevenue)}
              hint={`${summary.bookings || 0} bookings · avg ${formatINR(summary.avgPackage)}`}
              tone="sky"
              icon={Wallet}
              delay={0}
            />
            <KpiCard
              label="Total cost"
              value={formatINR(summary.costTotal)}
              hint={`Hotel ${formatINR(summary.hotelCost)} · Cab ${formatINR(summary.cabCost)}`}
              tone="violet"
              icon={Layers}
              delay={0.04}
            />
            <KpiCard
              label="Profit on file"
              value={formatINR(summary.profitAmount)}
              hint={`Margin ${summary.profitMargin || 0}% · avg ${formatINR(summary.avgProfit)}`}
              tone="emerald"
              icon={Sparkles}
              delay={0.08}
            />
            <KpiCard
              label="Collected"
              value={formatINR(summary.collected)}
              hint={`Collection ${summary.collectionRate || 0}%`}
              tone="amber"
              icon={TrendingUp}
              delay={0.12}
            />
            <KpiCard
              label="Still due"
              value={formatINR(summary.pending)}
              hint={summary.refunds ? `Refunds ${formatINR(summary.refunds)}` : 'Receivables open'}
              tone="rose"
              icon={Wallet}
              delay={0.16}
            />
            <KpiCard
              label="Costing coverage"
              value={`${summary.withCosting || 0}/${summary.bookings || 0}`}
              hint={
                summary.missingCosting
                  ? `${summary.missingCosting} missing ops file`
                  : 'All bookings have costing'
              }
              tone="slate"
              icon={PieIcon}
              delay={0.2}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-5">
            <Panel
              className="xl:col-span-2"
              title="Package split"
              subtitle="Hotel + cab + other cost vs profit (ops file)"
            >
              <div className="h-64">
                {pieData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={88}
                        paddingAngle={3}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.key} fill={MIX_COLORS[entry.key] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatINR(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-content-muted">
                    No costing amounts yet
                  </div>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(data?.costMix || []).map((item) => (
                  <div
                    key={item.key}
                    className="rounded-xl border border-subtle/70 bg-slate-50/70 px-3 py-2"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wide text-content-muted">
                      {item.label}
                    </p>
                    <p className="text-sm font-bold tabular-nums text-content-primary">
                      {formatINR(item.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              className="xl:col-span-3"
              title="Monthly commercial trend"
              subtitle="Package revenue, cost and profit by travel month"
            >
              <div className="h-72">
                {(data?.monthly || []).length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip formatter={(v) => formatINR(v)} />
                      <Bar dataKey="packageRevenue" name="Package" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="costTotal" name="Cost" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="profitAmount" name="Profit" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-content-muted">
                    No monthly data in this period
                  </div>
                )}
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Destination P&L" subtitle="Ranked by profit from ops commercial file">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-content-muted">
                      <th className="pb-2 font-bold">Destination</th>
                      <th className="pb-2 font-bold">Trips</th>
                      <th className="pb-2 font-bold">Package</th>
                      <th className="pb-2 font-bold">Cost</th>
                      <th className="pb-2 font-bold">Profit</th>
                      <th className="pb-2 font-bold">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle/60">
                    {(data?.destinations || []).slice(0, 10).map((d) => (
                      <tr key={d.destination}>
                        <td className="py-2.5 font-semibold text-content-primary">{d.destination}</td>
                        <td className="py-2.5 tabular-nums">{d.bookings}</td>
                        <td className="py-2.5 tabular-nums">{formatINR(d.packageRevenue)}</td>
                        <td className="py-2.5 tabular-nums text-content-secondary">{formatINR(d.costTotal)}</td>
                        <td className="py-2.5 tabular-nums font-semibold text-emerald-700">
                          {formatINR(d.profitAmount)}
                        </td>
                        <td className="py-2.5 tabular-nums">{d.profitMargin}%</td>
                      </tr>
                    ))}
                    {!data?.destinations?.length ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-content-muted">
                          No destination rollup yet
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Cash vs file" subtitle="Collections against package on ops file">
              <div className="h-56">
                {(data?.monthly || []).length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip formatter={(v) => formatINR(v)} />
                      <Area
                        type="monotone"
                        dataKey="packageRevenue"
                        name="Package"
                        stroke="#0ea5e9"
                        fill="#0ea5e9"
                        fillOpacity={0.12}
                      />
                      <Area
                        type="monotone"
                        dataKey="collected"
                        name="Collected"
                        stroke="#f59e0b"
                        fill="#f59e0b"
                        fillOpacity={0.18}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-content-muted">
                    No collection trend yet
                  </div>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-sky-50 px-3 py-2 ring-1 ring-sky-100">
                  <p className="text-[10px] font-bold uppercase text-sky-700">Hotel cost</p>
                  <p className="text-sm font-bold text-sky-950">{formatINR(summary.hotelCost)}</p>
                </div>
                <div className="rounded-xl bg-violet-50 px-3 py-2 ring-1 ring-violet-100">
                  <p className="text-[10px] font-bold uppercase text-violet-700">Cab cost</p>
                  <p className="text-sm font-bold text-violet-950">{formatINR(summary.cabCost)}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 px-3 py-2 ring-1 ring-emerald-100">
                  <p className="text-[10px] font-bold uppercase text-emerald-700">Other cost</p>
                  <p className="text-sm font-bold text-emerald-950">{formatINR(summary.otherCost)}</p>
                </div>
              </div>
            </Panel>
          </div>

          <Panel
            title="Booking commercial ledger"
            subtitle="One row per booking — same numbers ops saves on the commercial strip"
            action={
              <span className="text-[11px] font-semibold text-content-muted">
                {filteredRows.length} rows
              </span>
            }
          >
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b border-subtle text-left text-[10px] uppercase tracking-wide text-content-muted">
                    <th className="pb-3 pr-3 font-bold">Booking</th>
                    <th className="pb-3 pr-3 font-bold">Trip</th>
                    <th className="pb-3 pr-3 font-bold">Package</th>
                    <th className="pb-3 pr-3 font-bold">Hotel</th>
                    <th className="pb-3 pr-3 font-bold">Cab</th>
                    <th className="pb-3 pr-3 font-bold">Other</th>
                    <th className="pb-3 pr-3 font-bold">Profit</th>
                    <th className="pb-3 pr-3 font-bold">Margin</th>
                    <th className="pb-3 pr-3 font-bold">Collected</th>
                    <th className="pb-3 pr-3 font-bold">Due</th>
                    <th className="pb-3 font-bold">Open</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle/70">
                  {filteredRows.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/80">
                      <td className="py-3 pr-3 align-top">
                        <p className="font-mono text-xs font-bold text-sky-700">{row.bookingNumber}</p>
                        <p className="font-semibold text-content-primary">{row.customerName}</p>
                        <span
                          className={cn(
                            'mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1',
                            statusChip(row.status)
                          )}
                        >
                          {String(row.status || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 pr-3 align-top">
                        <p className="font-medium">{row.destination || '—'}</p>
                        <p className="text-[11px] text-content-muted">{formatDate(row.travelDate)}</p>
                        <p className="text-[11px] text-content-muted truncate max-w-[140px]">
                          {row.packageName || '—'}
                        </p>
                      </td>
                      <td className="py-3 pr-3 align-top font-bold tabular-nums">
                        {formatINR(row.packageCost)}
                      </td>
                      <td className="py-3 pr-3 align-top tabular-nums text-teal-800">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3 opacity-60" />
                          {formatINR(row.hotelCost)}
                        </span>
                      </td>
                      <td className="py-3 pr-3 align-top tabular-nums text-sky-800">
                        <span className="inline-flex items-center gap-1">
                          <Car className="h-3 w-3 opacity-60" />
                          {formatINR(row.cabCost)}
                        </span>
                      </td>
                      <td className="py-3 pr-3 align-top tabular-nums">{formatINR(row.otherCost)}</td>
                      <td className="py-3 pr-3 align-top font-bold tabular-nums text-emerald-700">
                        {formatINR(row.profitAmount)}
                      </td>
                      <td className="py-3 pr-3 align-top tabular-nums">{row.profitMargin}%</td>
                      <td className="py-3 pr-3 align-top tabular-nums text-amber-800">
                        {formatINR(row.collected)}
                      </td>
                      <td className="py-3 pr-3 align-top tabular-nums text-rose-700">
                        {formatINR(row.pendingAmount)}
                      </td>
                      <td className="py-3 align-top">
                        <Link
                          to={`/operations-manager/booking/${row._id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800"
                        >
                          File <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!filteredRows.length ? (
                    <tr>
                      <td colSpan={11} className="py-16 text-center text-content-muted">
                        No bookings match this filter. Ops commercial numbers appear once bookings exist.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </motion.div>
  );
}

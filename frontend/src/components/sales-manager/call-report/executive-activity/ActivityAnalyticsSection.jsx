import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList,
} from 'recharts';
import { Clock4, ClipboardList, Scale, Users, PhoneOff } from 'lucide-react';
import API from '../../../../api/axios';
import { formatDurationMs } from './activityFormat';
import TeamLoginSummaryCard from './TeamLoginSummaryCard';
import ExecutiveLoginLogoutCard from './ExecutiveLoginLogoutCard';

const AXIS_LINE = { stroke: '#CBD5E1' };

function formatShortDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

function formatHourLabel(hour) {
  const h = Number(hour);
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${period}`;
}

function EmptyChart({ label = 'No activity in this period' }) {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
      <PhoneOff className="h-6 w-6 text-content-muted" />
      <p className="text-xs font-medium text-content-muted">{label}</p>
    </div>
  );
}

function ChartCard({ title, icon: Icon, iconWrap, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-white ${iconWrap}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-bold text-content-primary">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

function ActiveIdleTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const activeMin = payload.find((p) => p.dataKey === 'activeMin')?.value || 0;
  const idleMin = payload.find((p) => p.dataKey === 'idleMin')?.value || 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-bold text-content-primary">{label}</p>
      <p className="text-emerald-600">Active: <span className="font-semibold">{formatDurationMs(activeMin * 60000)}</span></p>
      <p className="text-amber-600">Idle: <span className="font-semibold">{formatDurationMs(idleMin * 60000)}</span></p>
      <p className="mt-1 text-content-muted">Total: {formatDurationMs((activeMin + idleMin) * 60000)}</p>
    </div>
  );
}

export default function ActivityAnalyticsSection({ executiveId, executiveName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginData, setLoginData] = useState(null);
  const [loginLoading, setLoginLoading] = useState(true);
  const isTeamView = !executiveId || executiveId === 'all';

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (!isTeamView) params.executiveId = executiveId;
    API.get('/sales-manager/call-report/activity/analytics', { params, skipSuccessToast: true })
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [executiveId, isTeamView]);

  useEffect(() => {
    setLoginLoading(true);
    const params = {};
    if (!isTeamView) params.executiveId = executiveId;
    API.get('/sales-manager/call-report/activity/login-sessions', { params, skipSuccessToast: true })
      .then((r) => setLoginData(r.data))
      .finally(() => setLoginLoading(false));
  }, [executiveId, isTeamView]);

  const byHour = useMemo(
    () => (data?.byHour || []).map((r) => ({ hour: formatHourLabel(r._id), count: r.count })),
    [data]
  );
  const byExecutive = data?.byExecutive || [];
  const actionsByType = data?.actionsByType || [];
  const activeIdleByDay = useMemo(
    () => (data?.activeIdleByDay || []).map((r) => ({
      day: formatShortDate(r._id),
      activeMin: Math.round((r.activeMs || 0) / 60000),
      idleMin: Math.round((r.idleMs || 0) / 60000),
    })),
    [data]
  );

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl border border-subtle bg-surface-elevated/50" />;
  }

  if (isTeamView) {
    return (
      <div className="space-y-4">
        <TeamLoginSummaryCard summary={loginData?.summary} loading={loginLoading} />
        <ExecutiveLoginLogoutCard mode={loginData?.mode} rows={loginData?.rows} loading={loginLoading} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Activities by Hour" icon={Clock4} iconWrap="bg-violet-500">
          {byHour.some((r) => r.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byHour} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={AXIS_LINE} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={AXIS_LINE} tickLine={false} allowDecimals={false} width={32} />
                <Tooltip contentStyle={{ borderRadius: 12 }} cursor={{ fill: 'rgba(124,58,237,0.08)' }} />
                <Bar dataKey="count" name="Activities" fill="#7C3AED" radius={[6, 6, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>

        <ChartCard title="Activities by Executive" icon={Users} iconWrap="bg-amber-500">
          {byExecutive.length ? (
            <div className="max-h-[300px] overflow-y-auto">
              <ResponsiveContainer width="100%" height={Math.max(180, byExecutive.length * 26)}>
                <BarChart data={byExecutive} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }} barCategoryGap={8}>
                  <XAxis type="number" hide domain={[0, (max) => Math.ceil((max || 1) * 1.15) + 1]} />
                  <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11, fill: '#64748B' }} axisLine={AXIS_LINE} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} cursor={{ fill: 'rgba(245,158,11,0.08)' }} formatter={(v) => [v, 'Activities']} />
                  <Bar dataKey="activities" name="Activities" fill="#F59E0B" radius={[0, 6, 6, 0]} barSize={14}>
                    <LabelList dataKey="activities" position="right" style={{ fill: '#92400E', fontSize: 10, fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyChart />}
        </ChartCard>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TeamLoginSummaryCard summary={loginData?.summary} loading={loginLoading} />
      <ExecutiveLoginLogoutCard mode={loginData?.mode} rows={loginData?.rows} loading={loginLoading} executiveName={executiveName} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Activity by Hour" icon={Clock4} iconWrap="bg-violet-500">
          {byHour.some((r) => r.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byHour} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={AXIS_LINE} tickLine={false} interval={1} />
                <YAxis hide allowDecimals={false} domain={[0, (max) => Math.ceil((max || 1) * 1.2) + 1]} />
                <Tooltip contentStyle={{ borderRadius: 12 }} cursor={{ fill: 'rgba(124,58,237,0.08)' }} formatter={(v) => [v, 'Activities']} />
                <Bar dataKey="count" name="Activities" fill="#7C3AED" radius={[5, 5, 0, 0]} maxBarSize={22}>
                  <LabelList dataKey="count" position="top" formatter={(v) => (v > 0 ? v : '')} style={{ fill: '#5B21B6', fontSize: 10, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart label="No hourly activity recorded for this period." />}
        </ChartCard>

        <ChartCard title="CRM Actions by Type" icon={ClipboardList} iconWrap="bg-indigo-500">
          {actionsByType.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={actionsByType} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
                <XAxis type="number" hide domain={[0, (max) => Math.ceil((max || 1) * 1.15) + 1]} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={110}
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
                  axisLine={AXIS_LINE}
                  tickLine={false}
                />
                <Tooltip contentStyle={{ borderRadius: 12 }} cursor={{ fill: 'rgba(99,102,241,0.06)' }} formatter={(v) => [v, 'Count']} />
                <Bar dataKey="count" name="Count" fill="#6366F1" radius={[0, 6, 6, 0]} barSize={16}>
                  <LabelList dataKey="count" position="right" style={{ fill: '#3730A3', fontSize: 11, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartCard>
      </div>

      <ChartCard title="Active vs Idle Time" icon={Scale} iconWrap="bg-emerald-500">
        {activeIdleByDay.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activeIdleByDay} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={AXIS_LINE} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={AXIS_LINE} tickLine={false} width={40} tickFormatter={(v) => `${v}m`} />
              <Tooltip content={<ActiveIdleTooltip />} />
              <Bar dataKey="activeMin" name="Active" stackId="a" fill="#10B981" />
              <Bar dataKey="idleMin" name="Idle" stackId="a" fill="#F59E0B" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyChart label="Not enough activity to estimate active/idle time." />}
      </ChartCard>
    </div>
  );
}

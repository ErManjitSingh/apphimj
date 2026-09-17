import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  FileText,
  PhoneCall,
  CalendarClock,
  Users,
  Bookmark,
  MapPin,
} from 'lucide-react';
import { formatFollowUpDate } from '../executiveUtils';

const TABS = [
  { id: 'today-leads', label: "Today's Leads" },
  { id: 'follow-ups', label: 'Pending Follow-ups' },
  { id: 'bookings', label: 'My Bookings' },
  { id: 'quotations', label: 'My Quotations' },
  { id: 'call-report', label: 'Call Report' },
];

function EmptyState({ title, actionLabel, actionTo, icon: Icon }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-4 py-10 text-center">
      <div className="relative mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Icon className="h-8 w-8" />
        </div>
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-white shadow-md">
          <Users className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {actionLabel && actionTo ? (
        <Link
          to={actionTo}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function LeadRow({ lead }) {
  return (
    <Link
      to={`/sales-executive/leads/${lead._id}/view`}
      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3 transition hover:border-orange-200 hover:bg-orange-50/40"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">{lead.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {lead.destination || 'No destination'}
          {lead.status ? ` · ${String(lead.status).replace(/_/g, ' ')}` : ''}
        </p>
      </div>
      {lead.isHot ? (
        <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
          HOT
        </span>
      ) : null}
    </Link>
  );
}

function FollowUpRow({ item }) {
  return (
    <Link
      to="/sales-executive/follow-ups"
      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3 transition hover:border-sky-200 hover:bg-sky-50/50"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">{item.customer || 'Lead'}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">
          {item.destination || 'No destination'}
          {item.scheduledAt ? ` · ${formatFollowUpDate(item.scheduledAt)}` : ''}
        </p>
      </div>
      <CalendarClock className="h-4 w-4 shrink-0 text-sky-500" />
    </Link>
  );
}

export default function ExecutiveWorkspacePanel({
  recentLeads = [],
  upcomingFollowups = [],
  quotationsSent = 0,
}) {
  const [tab, setTab] = useState('today-leads');

  const todayLeads = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return (recentLeads || []).filter((lead) => {
      if (!lead?.createdAt) return true;
      return new Date(lead.createdAt) >= start;
    });
  }, [recentLeads]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 pt-2 scrollbar-thin">
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`shrink-0 rounded-t-xl px-3.5 py-2.5 text-[13px] font-semibold transition ${
                active
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {tab === 'today-leads' && (
          todayLeads.length ? (
            <div className="space-y-2">
              {todayLeads.slice(0, 6).map((lead) => (
                <LeadRow key={lead._id} lead={lead} />
              ))}
              <div className="pt-2 text-center">
                <Link
                  to="/sales-executive/leads/new"
                  className="text-sm font-semibold text-orange-600 hover:underline"
                >
                  View all today&apos;s leads
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No leads assigned for today"
              actionLabel="Add New Lead"
              actionTo="/sales-executive/leads/add"
              icon={FileText}
            />
          )
        )}

        {tab === 'follow-ups' && (
          upcomingFollowups.length ? (
            <div className="space-y-2">
              {upcomingFollowups.slice(0, 6).map((item) => (
                <FollowUpRow key={item._id} item={item} />
              ))}
              <div className="pt-2 text-center">
                <Link
                  to="/sales-executive/follow-ups"
                  className="text-sm font-semibold text-orange-600 hover:underline"
                >
                  Open follow-ups
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No pending follow-ups right now"
              actionLabel="View Follow-ups"
              actionTo="/sales-executive/follow-ups"
              icon={CalendarClock}
            />
          )
        )}

        {tab === 'bookings' && (
          <EmptyState
            title="No bookings to show yet"
            actionLabel="Open Customers"
            actionTo="/sales-executive/customers"
            icon={Bookmark}
          />
        )}

        {tab === 'quotations' && (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-4 py-10 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
              <FileText className="h-7 w-7" />
            </div>
            <p className="text-3xl font-bold tabular-nums text-slate-900">{quotationsSent || 0}</p>
            <p className="mt-1 text-sm text-slate-500">Quotations sent in this period</p>
            <Link
              to="/sales-executive/quotations"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 hover:bg-orange-600"
            >
              Open Quotations
            </Link>
          </div>
        )}

        {tab === 'call-report' && (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-4 py-10 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-500">
              <PhoneCall className="h-7 w-7" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Review your call performance</p>
            <p className="mt-1 max-w-sm text-[12px] text-slate-500">
              See connected calls, talk time, and daily dialing activity in Call Report.
            </p>
            <Link
              to="/sales-executive/call-report"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 hover:bg-orange-600"
            >
              Open Call Report
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

export function ExecutiveTargetsCard({ target }) {
  if (!target) return null;
  const progress = Math.min(100, Math.max(0, Number(target.progress || 0)));
  const revenueTarget = Number(target.revenueTarget || target.monthlyTarget || target.totalSalesTarget || 0);
  const revenueAchieved = Number(target.revenueAchieved || 0);
  const formatShort = (value) => {
    const n = Number(value || 0);
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n}`;
  };

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800">Targets &amp; Performance</h3>
      <div className="mt-4 flex items-center gap-4">
        <div
          className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(#f97316 ${progress * 3.6}deg, #f1f5f9 0deg)`,
          }}
        >
          <div className="flex h-[70%] w-[70%] flex-col items-center justify-center rounded-full bg-white">
            <span className="text-lg font-bold text-slate-900">{progress}%</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Revenue Target
          </p>
          <p className="mt-1 text-base font-bold text-slate-900">
            {formatShort(revenueAchieved)}
            <span className="font-medium text-slate-400"> / {formatShort(revenueTarget)}</span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              <p className="text-slate-400">Total Sales</p>
              <p className="font-bold text-slate-800">{formatShort(target.totalSalesTarget || 0)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              <p className="text-slate-400">Profit</p>
              <p className="font-bold text-slate-800">{formatShort(target.profitTarget || 0)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              <p className="text-slate-400">Bookings</p>
              <p className="font-bold text-slate-800">{target.leadsConverted || 0}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5">
              <p className="text-slate-400">Conv. Rate</p>
              <p className="font-bold text-slate-800">{Number(target.conversionRate || 0)}%</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const FALLBACK_DESTINATIONS = ['Manali', 'Shimla', 'Kashmir', 'Goa', 'Kerala'];

export function ExecutiveTopDestinationsCard({ rows = [] }) {
  const list = rows.length
    ? rows.slice(0, 5)
    : FALLBACK_DESTINATIONS.map((destination) => ({ destination, total: 0 }));

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">Top Destinations</h3>
        <span className="text-[11px] font-medium text-slate-400">This Month</span>
      </div>
      <div className="mt-3 space-y-2">
        {list.map((row) => (
          <div
            key={row.destination}
            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                <MapPin className="h-3.5 w-3.5" />
              </span>
              <span className="truncate text-sm font-semibold text-slate-800">{row.destination}</span>
            </div>
            <span className="shrink-0 text-[12px] font-medium text-slate-500">
              {row.total ?? 0} leads
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  LayoutDashboard,
  History,
  CalendarClock,
  FileText,
  Briefcase,
  Wallet,
  StickyNote,
  FolderOpen,
} from 'lucide-react';
import { formatLeadId } from '../leads/constants';
import RepeatedLeadBadge from '../leads/RepeatedLeadBadge';
import { getLeadListStatusDisplay } from '../../lib/executiveStatusDisplay';
import {
  getInitials,
  computeLeadScores,
  DETAIL_TABS,
  formatCreatedOn,
  scoreIntentLabel,
} from './leadDetailUtils';
import { cn } from '../../lib/utils';
import { beginLeadCall } from '../../lib/callSession';
import { openCrmWhatsApp } from '../../lib/openCrmWhatsApp';
import { toast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const TAB_ICONS = {
  overview: LayoutDashboard,
  activity: History,
  followups: CalendarClock,
  quotations: FileText,
  bookings: Briefcase,
  payments: Wallet,
  notes: StickyNote,
  documents: FolderOpen,
};

function useLeadNeighbors(leadId, relatedBasePath = '/leads') {
  const queryClient = useQueryClient();
  const caches = queryClient.getQueriesData({ queryKey: ['leads'] });
  let items = [];
  for (const [, data] of caches) {
    const list = data?.data || data?.leads || data?.items || [];
    if (Array.isArray(list) && list.length) {
      items = list;
      break;
    }
  }
  const idx = items.findIndex((row) => String(row._id) === String(leadId));
  if (idx < 0) return { prevId: null, nextId: null, base: relatedBasePath };
  return {
    prevId: idx > 0 ? items[idx - 1]._id : null,
    nextId: idx < items.length - 1 ? items[idx + 1]._id : null,
    base: relatedBasePath,
  };
}

function ScoreGauge({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="#f97316"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[18px] font-bold tabular-nums text-slate-800">{value}</span>
      </div>
    </div>
  );
}

export default function LeadDetailHeader({
  lead,
  leadId,
  backHref = '/leads',
  backLabel = 'Back to Leads',
  editHref,
  relatedBasePath = '/leads',
  tab,
  onTabChange,
  onPrefetchTab,
  onMarkLost,
  canEditLead = true,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scores = computeLeadScores(lead);
  const listDisplay = getLeadListStatusDisplay(lead);
  const neighbors = useLeadNeighbors(leadId || lead?._id, relatedBasePath);
  const location = [lead.city, lead.state].filter(Boolean).join(', ') || lead.destination || '—';
  const isLost = ['lost', 'booked_from_another_company'].includes(lead?.status);
  const badgeLabel = listDisplay.bucket === 'new' ? 'No Status' : listDisplay.label || 'No Status';

  const goNeighbor = (id) => {
    if (!id) return;
    navigate(`${relatedBasePath}/${id}`);
  };

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          to={backHref}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-orange-600"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              disabled={!neighbors.prevId}
              onClick={() => goNeighbor(neighbors.prevId)}
              className="inline-flex h-9 items-center gap-1 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="w-px bg-slate-200" />
            <button
              type="button"
              disabled={!neighbors.nextId}
              onClick={() => goNeighbor(neighbors.nextId)}
              className="inline-flex h-9 items-center gap-1 px-3 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {canEditLead && editHref ? (
            <Link
              to={editHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 text-[13px] font-semibold text-white shadow-sm shadow-orange-500/20 hover:bg-orange-600"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Lead
            </Link>
          ) : null}
          {canEditLead && !isLost && onMarkLost ? (
            <button
              type="button"
              onClick={onMarkLost}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 text-[13px] font-semibold text-rose-500 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Move to Lost
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 px-5 pb-4 pt-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-[18px] font-bold text-white shadow-sm">
              {getInitials(lead.name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[22px] font-bold leading-tight tracking-tight text-slate-900">
                  {lead.name}
                </h1>
                <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-500 ring-1 ring-sky-100">
                  {badgeLabel}
                </span>
                {(lead.isRepeatCustomer || lead.isVip) && <RepeatedLeadBadge size="sm" />}
              </div>
              <p className="mt-1 text-[12px] text-slate-400">
                {lead.leadId || formatLeadId(lead._id)}
                <span className="mx-1.5 text-slate-300">|</span>
                Lead 360
                <span className="mx-1.5 text-slate-300">|</span>
                Created on {formatCreatedOn(lead)}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-slate-500">
                {lead.phone ? (
                  <button
                    type="button"
                    onClick={() => beginLeadCall({ leadId: lead._id, leadName: lead.name, phone: lead.phone })}
                    className="inline-flex items-center gap-1.5 hover:text-slate-800"
                  >
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {lead.phone}
                  </button>
                ) : null}
                {lead.email ? (
                  <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 hover:text-slate-800">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {lead.email}
                  </a>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {location}
                </span>
                {lead.phone ? (
                  <button
                    type="button"
                    onClick={() =>
                      openCrmWhatsApp({
                        leadId: lead._id,
                        phone: lead.phone,
                        navigate,
                        role: user?.role,
                        toast,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-600 hover:bg-emerald-100"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Chat on WhatsApp
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-slate-50/80 px-4 py-3">
            <ScoreGauge value={scores.overall} />
            <div>
              <p className="text-[11px] text-slate-400">Lead Score</p>
              <p className="text-[15px] font-bold text-slate-800">{scores.overall}/100</p>
              <p className="text-[12px] font-semibold text-orange-500">{scoreIntentLabel(scores.overall)}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-slate-100 px-3">
          <div className="flex min-w-max gap-0.5">
            {DETAIL_TABS.map((item) => {
              const Icon = TAB_ICONS[item.id];
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange?.(item.id)}
                  onMouseEnter={() => onPrefetchTab?.(item.id)}
                  onFocus={() => onPrefetchTab?.(item.id)}
                  className={cn(
                    'relative inline-flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-semibold',
                    active ? 'text-orange-500' : 'text-slate-400 hover:text-slate-600'
                  )}
                >
                  {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                  {item.label}
                  {active ? (
                    <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-orange-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import { MapPin, User, Users, MessageCircle, Calendar, Clock, Phone, Eye, ClipboardList, Snowflake, Sun, Flame, XCircle, CircleDashed, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { getLeadSourceChannel, getLeadSourceShortLabel } from '../../lib/leadSourceLabels';
import Avatar from '../ui/Avatar';
import { formatBudget } from './managerUtils';
import RepeatedLeadBadge from '../leads/RepeatedLeadBadge';
import LeadCallStats from '../leads/LeadCallStats';
import { formatCallDuration } from '../../lib/callSession';
import { getLeadListStatusDisplay, listStatusTextClass } from '../../lib/executiveStatusDisplay';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { openCrmWhatsApp } from '../../lib/openCrmWhatsApp';

function WhatsAppSourceIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const SOURCE_STYLES = {
  dpw: 'bg-gradient-to-r from-sky-500/20 to-blue-500/15 text-sky-700 dark:text-sky-300 ring-sky-400/40',
  dpw_wa: 'bg-gradient-to-r from-green-500/20 to-emerald-500/15 text-green-700 dark:text-green-300 ring-green-400/40',
  dpw_call: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/15 text-blue-700 dark:text-blue-300 ring-blue-400/40',
  dpw2: 'bg-gradient-to-r from-indigo-500/20 to-blue-500/15 text-indigo-700 dark:text-indigo-300 ring-indigo-400/40',
  dpw2_wa: 'bg-gradient-to-r from-teal-500/20 to-cyan-500/15 text-teal-700 dark:text-teal-300 ring-teal-400/40',
  dpw2_call: 'bg-gradient-to-r from-violet-500/20 to-indigo-500/15 text-violet-700 dark:text-violet-300 ring-violet-400/40',
  website: 'bg-gradient-to-r from-sky-500/20 to-blue-500/15 text-sky-700 dark:text-sky-300 ring-sky-400/40',
  website_2: 'bg-gradient-to-r from-indigo-500/20 to-blue-500/15 text-indigo-700 dark:text-indigo-300 ring-indigo-400/40',
  portal_lead: 'bg-gradient-to-r from-violet-500/20 to-purple-500/15 text-violet-700 dark:text-violet-300 ring-violet-400/40',
  potal_lead: 'bg-gradient-to-r from-violet-500/20 to-purple-500/15 text-violet-700 dark:text-violet-300 ring-violet-400/40',
  google_ads: 'bg-gradient-to-r from-sky-500/20 to-blue-500/15 text-sky-700 dark:text-sky-300 ring-sky-400/40',
  referral: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-400/40',
  social: 'bg-gradient-to-r from-violet-500/20 to-purple-500/15 text-violet-700 dark:text-violet-300 ring-violet-400/40',
  facebook_ads: 'bg-gradient-to-r from-indigo-500/20 to-blue-500/15 text-indigo-700 dark:text-indigo-300 ring-indigo-400/40',
  'fb-lead': 'bg-gradient-to-r from-indigo-500/20 to-blue-500/15 text-indigo-700 dark:text-indigo-300 ring-indigo-400/40',
  phone: 'bg-gradient-to-r from-amber-500/20 to-orange-500/15 text-amber-700 dark:text-amber-300 ring-amber-400/40',
  call_lead: 'bg-gradient-to-r from-amber-500/20 to-orange-500/15 text-amber-700 dark:text-amber-300 ring-amber-400/40',
  'walk-in': 'bg-gradient-to-r from-rose-500/20 to-pink-500/15 text-rose-700 dark:text-rose-300 ring-rose-400/40',
  whatsapp: 'bg-gradient-to-r from-green-500/20 to-emerald-500/15 text-green-700 dark:text-green-300 ring-green-400/40',
  wa: 'bg-gradient-to-r from-green-500/20 to-emerald-500/15 text-green-700 dark:text-green-300 ring-green-400/40',
  organic: 'bg-gradient-to-r from-teal-500/20 to-cyan-500/15 text-teal-700 dark:text-teal-300 ring-teal-400/40',
  other: 'bg-gradient-to-r from-slate-500/15 to-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-400/30',
};

const DEST_COLORS = [
  'from-sky-500/15 to-cyan-500/10 text-sky-700 ring-sky-400/30',
  'from-violet-500/15 to-purple-500/10 text-violet-700 ring-violet-400/30',
  'from-amber-500/15 to-orange-500/10 text-amber-700 ring-amber-400/30',
  'from-emerald-500/15 to-teal-500/10 text-emerald-700 ring-emerald-400/30',
  'from-rose-500/15 to-pink-500/10 text-rose-700 ring-rose-400/30',
];

function destStyle(name = '') {
  const i = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % DEST_COLORS.length;
  return DEST_COLORS[i];
}

/** Full date + time for when the lead arrived. */
export function formatLeadArrivedAt(date) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function leadArrivedFullTitle(date) {
  return formatLeadArrivedAt(date) || undefined;
}

/** Compact date+time lines under lead name (created / assigned / creator). */
export function LeadTimingLines({ lead, className }) {
  const created = formatLeadArrivedAt(lead?.createdAt);
  const assigned = formatLeadArrivedAt(lead?.assignedAt);
  const creatorRole = lead?.createdBy?.role;
  const creatorName = lead?.createdBy?.name;
  const assigneeName = lead?.assignedTo?.name;
  const creatorId = lead?.createdBy?._id || lead?.createdBy;
  const assigneeId = lead?.assignedTo?._id || lead?.assignedTo;
  const sameOwner =
    Boolean(creatorId) && Boolean(assigneeId) && String(creatorId) === String(assigneeId);
  const selfCreatedByExec =
    Boolean(creatorName) &&
    (creatorRole === 'sales_executive' ||
      (sameOwner && lead?.assigneeRole === 'sales_executive'));

  // Only render this line when the list endpoint actually computed it (key present) — an
  // absent key means "not fetched here", not "no calls", so it must never fall back to
  // "Not called yet" and risk hiding real call history.
  const hasFirstCallData = Boolean(lead) && Object.prototype.hasOwnProperty.call(lead, 'firstCall');
  const firstCall = hasFirstCallData ? lead.firstCall : undefined;
  const firstCallAt = firstCall ? formatLeadArrivedAt(firstCall.at) : null;

  // Management-only field — the API only includes `firstOpenedAt` for admin/sales_manager
  // requests, so an absent key here means "not authorized to see it", same idiom as firstCall.
  const hasOpenedData = Boolean(lead) && Object.prototype.hasOwnProperty.call(lead, 'firstOpenedAt');
  const openedAt = hasOpenedData ? formatLeadArrivedAt(lead.firstOpenedAt) : null;
  const openedByName = lead?.firstOpenedBy?.name;

  if (!created && !assigned && !selfCreatedByExec && !hasFirstCallData && !hasOpenedData) return null;

  const Chip = ({ icon: Icon, label, value, tone = 'slate', title }) => (
    <span
      title={title || `${label} ${value}`}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-tight ring-1',
        tone === 'emerald' && 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        tone === 'rose' && 'bg-rose-50 text-rose-600 ring-rose-100',
        tone === 'slate' && 'bg-slate-50 text-slate-500 ring-slate-100'
      )}
    >
      <Icon className="h-2.5 w-2.5 shrink-0 opacity-80" />
      <span className="truncate">
        <span className="font-semibold">{label}</span>
        {' · '}
        {value}
      </span>
    </span>
  );

  return (
    <div className={cn('mt-1 flex flex-wrap gap-1', className)}>
      {selfCreatedByExec ? (
        <Chip icon={User} label="Created by" value={creatorName} tone="emerald" />
      ) : null}
      {created ? <Chip icon={Clock} label="Created" value={created} /> : null}
      {assigned ? <Chip icon={User} label="Assigned" value={assigned} /> : null}
      {hasOpenedData ? (
        openedAt ? (
          <Chip
            icon={Eye}
            label="Opened"
            value={openedByName ? `${openedAt} · ${openedByName}` : openedAt}
          />
        ) : (
          <Chip icon={Eye} label="Opened" value="Not opened yet" tone="rose" />
        )
      ) : null}
      {hasFirstCallData ? (
        firstCall && firstCallAt ? (
          <Chip
            icon={Phone}
            label="First Call"
            value={`${firstCallAt} · ${formatCallDuration(firstCall.durationSeconds)}`}
          />
        ) : (
          <Chip icon={Phone} label="First Call" value="Not called yet" tone="rose" />
        )
      ) : null}
    </div>
  );
}

export function LeadListStatusIcon({ lead, className }) {
  const display = getLeadListStatusDisplay(lead);
  const listBucket = display.listBucket || display.bucket;
  const label = display.mainLabel || 'No status';
  const subLabel = display.subLabel || '';
  const cfg = {
    cold: { Icon: Snowflake, wrap: 'bg-slate-100 text-slate-600 ring-slate-200' },
    warm: { Icon: Sun, wrap: 'bg-amber-100 text-amber-700 ring-amber-200' },
    hot: { Icon: Flame, wrap: 'bg-rose-100 text-rose-600 ring-rose-200' },
    lost: { Icon: XCircle, wrap: 'bg-red-100 text-red-600 ring-red-200' },
    new: { Icon: CircleDashed, wrap: 'bg-sky-100 text-sky-600 ring-sky-200' },
    converted: { Icon: Trophy, wrap: 'bg-emerald-100 text-emerald-700 ring-emerald-200' },
  }[listBucket] || { Icon: CircleDashed, wrap: 'bg-slate-100 text-slate-500 ring-slate-200' };
  const Icon = cfg.Icon;

  return (
    <div className={cn('inline-flex min-w-0 flex-col items-start gap-0.5', className)}>
      <span
        className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ring-1 ring-inset', cfg.wrap)}
        title={[label, subLabel].filter(Boolean).join(' · ')}
      >
        <Icon
          className={cn('h-3 w-3 shrink-0', display.animateLabel && 'animate-hot-text')}
          strokeWidth={2.4}
        />
        <span className={cn('text-[10px] font-bold leading-none whitespace-nowrap', listStatusTextClass(display))}>
          {label}
        </span>
      </span>
      {subLabel ? (
        <span className="max-w-[140px] truncate text-[9px] font-medium leading-tight text-slate-500" title={subLabel}>
          {subLabel}
        </span>
      ) : null}
    </div>
  );
}

export function LeadIdPill({ id, lead }) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1.5">
      <span className="inline-flex items-center rounded-lg bg-sky-50 px-2 py-0.5 font-mono text-[11px] font-bold tracking-wide text-sky-700 ring-1 ring-sky-100">
        {id}
      </span>
      {lead ? <LeadListStatusIcon lead={lead} /> : null}
    </div>
  );
}

export function SourceBadge({ source, label, sourceShort }) {
  const display = sourceShort || getLeadSourceShortLabel(source, label) || label || '—';
  const channel = getLeadSourceChannel(source, label || sourceShort);
  const iconClass = 'w-3.5 h-3.5 shrink-0';

  let Icon = null;
  let tone = 'text-content-secondary';
  if (channel === 'whatsapp') {
    Icon = WhatsAppSourceIcon;
    tone = 'text-green-600';
  } else if (channel === 'call') {
    Icon = Phone;
    tone = 'text-sky-600';
  } else if (channel === 'form') {
    Icon = ClipboardList;
    tone = 'text-indigo-600';
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm font-medium break-words', tone)}>
      {Icon ? <Icon className={iconClass} /> : null}
      {display}
    </span>
  );
}

export function DestinationChip({ name }) {
  if (!name) return <span className="text-sm text-slate-400">—</span>;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-gradient-to-r px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset max-w-[220px] whitespace-normal break-words shadow-sm', destStyle(name))}>
      <MapPin className="h-3 w-3 shrink-0 opacity-80" />
      {name}
    </span>
  );
}

export function TravelersBadge({ travelers, adults, children }) {
  const count = travelers ?? adults ?? null;
  if (count == null || count === '') {
    return <span className="text-sm text-slate-400">—</span>;
  }
  const childCount = children ?? 0;
  const detail = childCount > 0 ? `${count} (${childCount} child${childCount > 1 ? 'ren' : ''})` : String(count);
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-100">
      <Users className="h-3.5 w-3.5 shrink-0 text-violet-500" />
      {detail}
    </span>
  );
}

export function BudgetBadge({ amount }) {
  if (!amount) return <span className="text-sm text-slate-400">—</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-bold tabular-nums text-emerald-700 ring-1 ring-emerald-100 whitespace-nowrap">
      {formatBudget(amount)}
    </span>
  );
}

export function MealPlanBadge({ mealPlan, mealPreference }) {
  const key = String(mealPlan || mealPreference || 'map')
    .trim()
    .toLowerCase();
  const label = ['ep', 'cp', 'map', 'ap'].includes(key) ? key.toUpperCase() : 'MAP';
  return (
    <span className="text-sm font-semibold text-amber-700 whitespace-nowrap">{label}</span>
  );
}

export function ExecutiveBadge({ name, unassigned }) {
  if (unassigned || !name) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-100">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100">
          <User className="h-3 w-3" />
        </span>
        Unassigned
      </span>
    );
  }
  return (
    <span className="inline-flex max-w-[160px] items-center gap-2 rounded-full bg-violet-50/80 py-0.5 pl-0.5 pr-2.5 ring-1 ring-violet-100">
      <Avatar name={name} size="sm" className="!h-7 !w-7 !text-[10px] shrink-0 ring-2 ring-white" />
      <span className="truncate text-[12px] font-semibold text-slate-800">{name}</span>
    </span>
  );
}

export function ManagerStatusBadge({ status, lead }) {
  const display = getLeadListStatusDisplay(lead || { status });
  const label = display.mainLabel || 'No status';
  const subLabel = display.subLabel || '';
  return (
    <div className="flex min-w-0 flex-col items-start gap-0.5">
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide ring-1 ring-inset whitespace-nowrap max-w-[160px] truncate',
          display.listClassName || display.className
        )}
        title={[label, subLabel].filter(Boolean).join(' · ')}
      >
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            display.listDotClass || display.dotClass,
            display.bucket === 'new' && 'animate-pulse'
          )}
        />
        <span className={listStatusTextClass(display)}>{label}</span>
      </span>
      {subLabel ? (
        <span className="max-w-[140px] truncate text-[9px] font-medium leading-tight text-slate-500" title={subLabel}>
          {subLabel}
        </span>
      ) : null}
    </div>
  );
}

export function formatFollowUpDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function NextFollowUpLine({ lead, className }) {
  const raw = lead?.nextFollowUp;
  if (!raw) {
    return (
      <span className={cn('mt-1 inline-flex items-center gap-1 rounded-full bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 ring-1 ring-slate-100', className)}>
        <Calendar className="h-2.5 w-2.5" />
        No next follow-up
      </span>
    );
  }
  const when = formatFollowUpDate(raw);
  const overdue = new Date(raw).getTime() < Date.now();
  return (
    <span
      className={cn(
        'mt-1 inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1',
        overdue
          ? 'bg-rose-50 text-rose-600 ring-rose-100'
          : 'bg-violet-50 text-violet-700 ring-violet-100',
        className
      )}
      title={`Next follow-up ${when}`}
    >
      <Calendar className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate">Next F/U · {when}</span>
    </span>
  );
}

export function CustomerCell({ name, lead, showPhone = false }) {
  const isRepeated = lead?.isRepeatCustomer || lead?.isVip;
  const isLost =
    lead?.status === 'lost' || lead?.status === 'booked_from_another_company';
  const isConverted = lead?.status === 'converted';
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Avatar
        name={name}
        size="sm"
        className="mt-0.5 !h-9 !w-9 shrink-0 !text-[11px] shadow-sm ring-2 ring-white"
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <p
            className={cn(
              'text-[13px] font-semibold tracking-tight text-slate-900 break-words',
              isLost && 'rounded-md bg-red-50 px-1.5 py-0.5 text-red-700 ring-1 ring-inset ring-red-200',
              isConverted && 'rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-800 ring-1 ring-inset ring-emerald-200'
            )}
          >
            {name}
          </p>
          {isRepeated ? (
            <RepeatedLeadBadge size="sm" />
          ) : (
            <span className="shrink-0 rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orange-600 ring-1 ring-orange-100">
              New
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          <NextFollowUpLine lead={lead} className="mt-0" />
        </div>
        <LeadTimingLines lead={lead} />
        <LeadCallStats lead={lead} compact className="mt-1.5" />
        {showPhone && lead?.phone && (
          <p className="mt-0.5 truncate font-mono text-xs text-slate-400">{lead.phone}</p>
        )}
      </div>
    </div>
  );
}

export function PhoneCell({ phone, leadId, lead }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [opening, setOpening] = useState(false);
  if (!phone) return <span className="text-sm text-content-muted">—</span>;
  const id = leadId || lead?._id;

  const openWa = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!id || opening) return;
    setOpening(true);
    try {
      await openCrmWhatsApp({
        leadId: id,
        phone,
        navigate,
        role: user?.role,
        toast,
      });
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="rounded-lg bg-slate-50 px-2 py-1 font-mono text-[12px] font-medium text-slate-700 ring-1 ring-slate-100">
        {phone}
      </span>
      {id ? (
        <button
          type="button"
          onClick={openWa}
          disabled={opening}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white shadow-sm shadow-green-500/30 transition hover:bg-green-600 disabled:opacity-60"
          aria-label="Open CRM WhatsApp"
          title="Open CRM WhatsApp"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function TravelDateCell({ date }) {
  if (!date) return <span className="text-sm text-slate-400">—</span>;
  const formatted = new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
      <Calendar className="h-3.5 w-3.5 shrink-0" />
      {formatted}
    </span>
  );
}

export const assignLeadBtnClass =
  'h-6 text-[10px] px-1.5 py-0 leading-none shadow-sm shadow-violet-600/20 whitespace-nowrap rounded-l-md rounded-r-none';

export const moreLeadBtnClass =
  'h-6 px-1.5 py-0 text-[10px] leading-none font-medium text-content-secondary hover:text-violet-600 hover:bg-violet-500/10 rounded-r-md rounded-l-none border border-subtle border-l-0';

export const moreLeadBtnSoloClass =
  'h-6 px-1.5 py-0 text-[10px] leading-none font-medium text-content-secondary hover:text-violet-600 hover:bg-violet-500/10 rounded-md border border-subtle';

export function AssignedExecutiveChip({ name }) {
  if (!name) return null;
  return (
    <span
      title={name}
      className="inline-flex items-center gap-1 h-6 px-1.5 max-w-[92px] rounded-l-md border border-subtle border-r-0 bg-emerald-500/10 text-[10px] font-medium text-emerald-800 truncate"
    >
      <Avatar name={name} size="sm" className="!w-4 !h-4 !text-[8px] shrink-0 ring-1 ring-emerald-500/20" />
      <span className="truncate">{name}</span>
    </span>
  );
}

export const FILTER_THEMES = {
  all: {
    gradient: 'from-brand-500/25 via-violet-500/15 to-indigo-500/20',
    border: 'border-brand-500/25',
    header: 'from-brand-600/10 via-violet-600/8 to-indigo-600/10',
    icon: 'text-brand-600',
  },
  returned: {
    gradient: 'from-amber-500/25 via-orange-500/15 to-rose-500/15',
    border: 'border-amber-500/30',
    header: 'from-amber-500/12 via-orange-500/8 to-rose-500/10',
    icon: 'text-amber-600',
  },
  unassigned: {
    gradient: 'from-amber-500/25 via-orange-500/15 to-yellow-500/20',
    border: 'border-amber-500/30',
    header: 'from-amber-500/12 via-orange-500/8 to-yellow-500/10',
    icon: 'text-amber-600',
  },
  assigned: {
    gradient: 'from-emerald-500/20 via-teal-500/15 to-cyan-500/15',
    border: 'border-emerald-500/25',
    header: 'from-emerald-500/10 via-teal-500/8 to-cyan-500/10',
    icon: 'text-emerald-600',
  },
  'working-progress': {
    gradient: 'from-orange-500/25 via-amber-500/15 to-yellow-500/20',
    border: 'border-orange-500/30',
    header: 'from-orange-500/12 via-amber-500/8 to-yellow-500/10',
    icon: 'text-orange-600',
  },
  hot: {
    gradient: 'from-rose-500/25 via-orange-500/20 to-amber-500/15',
    border: 'border-rose-500/30',
    header: 'from-rose-500/12 via-orange-500/10 to-amber-500/8',
    icon: 'text-rose-600',
  },
  lost: {
    gradient: 'from-slate-500/15 via-zinc-500/10 to-neutral-500/10',
    border: 'border-slate-500/25',
    header: 'from-slate-500/10 to-zinc-500/8',
    icon: 'text-slate-500',
  },
  reactivated: {
    gradient: 'from-teal-500/25 via-cyan-500/15 to-emerald-500/15',
    border: 'border-teal-500/30',
    header: 'from-teal-500/12 via-cyan-500/8 to-emerald-500/10',
    icon: 'text-teal-600',
  },
};

import { useState } from 'react';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  IndianRupee,
  Users,
  Pencil,
  MessageCircle,
  Clock,
  MoreHorizontal,
  Eye,
  UserCheck,
  RefreshCw,
  Trash2,
  Plane,
  Contact,
  ListChecks,
  StickyNote,
  ChevronDown,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { openCrmWhatsApp } from '../../lib/openCrmWhatsApp';
import { beginLeadCall } from '../../lib/callSession';
import Avatar from '../ui/Avatar';
import AppDrawer from '../ui/AppDrawer';
import { formatLeadId } from './constants';
import { cn } from '../../lib/utils';
import { getLeadSourceShortLabel } from '../../lib/leadSourceLabels';
import RepeatedLeadBadge from './RepeatedLeadBadge';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'followups', label: 'Follow-ups' },
  { id: 'quotations', label: 'Quotations' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'notes', label: 'Notes' },
];

function initials(name) {
  return String(name || 'LD')
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatMoney(amount) {
  if (!amount) return '—';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

function formatTravelers(lead) {
  const adults = lead?.adults ?? lead?.travelers ?? 0;
  const children = lead?.children ?? 0;
  const pax = lead?.travelers || adults + children;
  if (!pax) return '—';
  const bits = [];
  if (adults) bits.push(`${adults} Adult${adults === 1 ? '' : 's'}`);
  if (children) bits.push(`${children} Child${children === 1 ? '' : 'ren'}`);
  return `${pax} Pax${bits.length ? ` (${bits.join(', ')})` : ''}`;
}

function packageType(lead) {
  if (lead?.packageName) return lead.packageName;
  const dest = lead?.destination || 'Himachal';
  const kids = Number(lead?.children || 0);
  const adults = Number(lead?.adults || lead?.travelers || 0);
  if (kids > 0 || adults >= 3) return `${dest} Family Trip`;
  if (adults === 2) return `${dest} Couple Trip`;
  return `${dest} Trip`;
}

function requirementItems(lead) {
  const raw = String(lead?.specialRequirements || '').trim();
  if (!raw) return [];
  return raw
    .split(/\n|,|;/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function createdLabel(lead) {
  if (!lead?.createdAt) return '';
  return new Date(lead.createdAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function LeadPreviewDrawer({
  lead,
  onClose,
  onAssign,
  onDelete,
  onTransferBranch,
  canEditLead = true,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const assignedName = lead?.assignedTo?.name;
  const reqs = requirementItems(lead);
  const isNew = lead?.status === 'new';

  const goFull = (hash) => {
    if (!lead?._id) return;
    navigate(hash ? `/leads/${lead._id}#${hash}` : `/leads/${lead._id}`);
    onClose?.();
  };

  return (
    <AppDrawer open={!!lead} onClose={onClose} className="max-w-[480px] border-l border-slate-200 bg-white shadow-2xl">
      {lead && (
        <>
          <div className="shrink-0 border-b border-slate-100 px-5 pt-4 pb-3">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Lead Details</h2>
                <p className="text-[12px] text-slate-400">Complete information and actions</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goFull()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-orange-500 px-2.5 text-[11px] font-semibold text-white shadow-sm shadow-orange-500/20 hover:bg-orange-600"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View Full Lead
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-[15px] font-bold text-white shadow-sm">
                  {initials(lead.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-[16px] font-bold text-slate-900">{lead.name}</h3>
                    {isNew ? (
                      <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-600 ring-1 ring-sky-100">
                        New
                      </span>
                    ) : null}
                    {(lead.isRepeatCustomer || lead.isVip) && <RepeatedLeadBadge size="sm" />}
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Lead ID: {lead.leadId || formatLeadId(lead._id)}
                  </p>
                  <p className="text-[11px] text-slate-400">Created: {createdLabel(lead)}</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {onAssign ? (
                  <button
                    type="button"
                    onClick={() => onAssign(lead)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Assign
                    <ChevronDown className="h-3 w-3" />
                  </button>
                ) : null}
                {assignedName ? (
                  <span className="inline-flex max-w-[140px] items-center gap-1.5 rounded-full bg-slate-50 py-0.5 pl-0.5 pr-2 ring-1 ring-slate-100">
                    <Avatar name={assignedName} size="sm" className="!h-5 !w-5 !text-[8px]" />
                    <span className="truncate text-[10px] font-semibold text-slate-700">{assignedName}</span>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {lead.phone ? (
                <button
                  type="button"
                  onClick={() => beginLeadCall({ leadId: lead._id, leadName: lead.name, phone: lead.phone })}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-orange-500 text-[12px] font-semibold text-white shadow-sm shadow-orange-500/25 hover:bg-orange-600"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call
                </button>
              ) : null}
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
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-[12px] font-semibold text-white hover:bg-emerald-600"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
              ) : null}
              {lead.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-sky-50 text-[12px] font-semibold text-sky-600 hover:bg-sky-100"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </a>
              ) : (
                <span className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-sky-50 text-[12px] font-semibold text-sky-300">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </span>
              )}
              <DropdownMenuRoot>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    More
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-xl">
                  <DropdownMenuItem
                    onClick={() => goFull()}
                    className="gap-2 rounded-lg cursor-pointer"
                  >
                    <Eye className="w-4 h-4" /> View Full Lead
                  </DropdownMenuItem>
                  {canEditLead && (
                    <DropdownMenuItem asChild>
                      <Link to={`/leads/${lead._id}/edit`} className="gap-2 rounded-lg cursor-pointer">
                        <Pencil className="w-4 h-4" /> Edit Lead
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {onAssign && (
                    <DropdownMenuItem onClick={() => onAssign(lead)} className="gap-2 rounded-lg cursor-pointer">
                      <UserCheck className="w-4 h-4" />
                      {assignedName ? 'Reassign Lead' : 'Assign Lead'}
                    </DropdownMenuItem>
                  )}
                  {onTransferBranch && (
                    <DropdownMenuItem onClick={() => onTransferBranch(lead)} className="gap-2 rounded-lg cursor-pointer">
                      <RefreshCw className="w-4 h-4" /> Transfer Branch
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(lead._id)}
                        className="gap-2 rounded-lg cursor-pointer text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" /> Delete Lead
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenuRoot>
            </div>
          </div>

          <div className="shrink-0 overflow-x-auto border-b border-slate-100 px-3">
            <div className="flex min-w-max gap-1">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'overview') setTab('overview');
                    else goFull(item.id);
                  }}
                  className={cn(
                    'relative px-3 py-2.5 text-[12px] font-semibold',
                    tab === item.id && item.id === 'overview'
                      ? 'text-orange-500'
                      : 'text-slate-400 hover:text-slate-600'
                  )}
                >
                  {item.label}
                  {tab === item.id && item.id === 'overview' ? (
                    <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-orange-500" />
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              <section className="rounded-2xl border border-slate-100 bg-white p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-800">
                    <Plane className="h-3.5 w-3.5 text-orange-500" />
                    Trip Information
                  </h4>
                  {canEditLead ? (
                    <Link to={`/leads/${lead._id}/edit`} className="text-[11px] font-semibold text-orange-500">
                      Edit
                    </Link>
                  ) : null}
                </div>
                <dl className="space-y-2.5 text-[12px]">
                  <div className="flex items-start gap-2 text-slate-500">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Destination</p>
                      <p className="font-semibold text-slate-800">
                        {[lead.destination, lead.state].filter(Boolean).join(', ') || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-slate-500">
                    <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Travel Date</p>
                      <p className="font-semibold text-slate-800">
                        {lead.travelDate
                          ? new Date(lead.travelDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                        {lead.flexibleDates ? ' (Flexible)' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-slate-500">
                    <Plane className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Package Type</p>
                      <p className="font-semibold text-slate-800">{packageType(lead)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-slate-500">
                    <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">No. of Travelers</p>
                      <p className="font-semibold text-slate-800">{formatTravelers(lead)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-slate-500">
                    <IndianRupee className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">Budget</p>
                      <p className="font-semibold text-slate-800">
                        {lead.budget ? `${formatMoney(lead.budget)} (Approx)` : '—'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Source</p>
                    <p className="font-semibold text-slate-800">
                      {getLeadSourceShortLabel(lead.source, lead.sourceLabel) || lead.sourceLabel || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Status</p>
                    <span
                      className={cn(
                        'mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1',
                        isNew ? 'bg-sky-50 text-sky-600 ring-sky-100' : 'bg-slate-50 text-slate-600 ring-slate-100'
                      )}
                    >
                      {isNew ? 'New' : String(lead.status || '—').replaceAll('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">Priority</p>
                    <p className="font-semibold capitalize text-slate-800">{lead.priority || 'Medium'}</p>
                  </div>
                </dl>
              </section>

              <div className="space-y-3">
                <section className="rounded-2xl border border-slate-100 bg-white p-3.5">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-800">
                      <Contact className="h-3.5 w-3.5 text-orange-500" />
                      Contact Information
                    </h4>
                    {canEditLead ? (
                      <Link to={`/leads/${lead._id}/edit`} className="text-[11px] font-semibold text-orange-500">
                        Edit
                      </Link>
                    ) : null}
                  </div>
                  <div className="space-y-2.5 text-[12px]">
                    <p className="flex items-center gap-2 font-semibold text-slate-800">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {lead.phone || '—'}
                    </p>
                    <p className="flex items-center gap-2 text-slate-600">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {lead.email || '—'}
                    </p>
                    <p className="flex items-center gap-2 text-slate-600">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {[lead.city, lead.state].filter(Boolean).join(', ') || '—'}
                    </p>
                    <p className="flex items-center gap-2 text-slate-600">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {lead.preferredCallTime || 'Preferred time not set'}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl border border-orange-100 bg-orange-50/60 p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-800">
                      <ListChecks className="h-3.5 w-3.5 text-orange-500" />
                      Requirements
                    </h4>
                    {canEditLead ? (
                      <Link to={`/leads/${lead._id}/edit`} className="text-[11px] font-semibold text-orange-500">
                        Edit
                      </Link>
                    ) : null}
                  </div>
                  {reqs.length ? (
                    <ul className="space-y-1 text-[12px] text-slate-700">
                      {reqs.map((item) => (
                        <li key={item} className="flex gap-1.5">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-orange-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[12px] text-slate-400">No specific requirements added yet.</p>
                  )}
                </section>
              </div>
            </div>

            <section className="rounded-2xl border border-slate-100 bg-white p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-800">
                  <StickyNote className="h-3.5 w-3.5 text-sky-500" />
                  Notes
                </h4>
                <button
                  type="button"
                  onClick={() => goFull('notes')}
                  className="text-[11px] font-semibold text-orange-500"
                >
                  + Add Note
                </button>
              </div>
              <p className="text-[12px] text-slate-400">
                {lead.notes || 'No notes added yet. Add notes to keep track of conversation.'}
              </p>
            </section>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-white p-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-3">
              <div>
                <p className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-800">
                  <Calendar className="h-3.5 w-3.5" />
                  Next Follow-up
                </p>
                <p className="mt-0.5 text-[12px] text-rose-500">
                  {lead.nextFollowUp
                    ? new Date(lead.nextFollowUp).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                    : 'Not scheduled'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => goFull('followups')}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-[12px] font-semibold text-white hover:bg-emerald-700"
              >
                <Calendar className="h-3.5 w-3.5" />
                Set Follow-up
              </button>
            </div>
          </div>
        </>
      )}
    </AppDrawer>
  );
}

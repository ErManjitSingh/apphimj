import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  Calendar,
  Plane,
  Users,
  IndianRupee,
  UserRound,
  Pencil,
  Phone,
  Mail,
  MessageCircle,
  FileText,
  MoreHorizontal,
  Copy,
  Clock,
  StickyNote,
  Plus,
  CalendarDays,
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../context/ToastContext';
import { beginLeadCall } from '../../lib/callSession';
import { openCrmWhatsApp } from '../../lib/openCrmWhatsApp';
import LeadStatusPipeline from './LeadStatusPipeline';
import LeadPaymentSummaryCard from './LeadPaymentSummaryCard';
import MetaFormAnswersCard from './MetaFormAnswersCard';
import API from '../../api/axios';
import { CHANNELS } from '../../config/channels';
import { usePermissions } from '../../hooks/usePermissions';
import { isBookedStatus } from '../../lib/leadPipeline';
import {
  formatSource,
  DETAIL_CARD,
  formatDetailMoney,
  formatTravelDateLabel,
  packageTypeLabel,
  travelersSummary,
  requirementItems,
  getUpcomingFollowUp,
} from './leadDetailUtils';
import { cn } from '../../lib/utils';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu';

const SOURCE_HIDDEN_ROLES = ['sales_executive', 'team_leader'];
const EmailComposerModal = lazy(() => import('../email/EmailComposerModal'));
const PaymentVoucherModal = lazy(() => import('./PaymentVoucherModal'));

function CardTitle({ icon: Icon, title, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="inline-flex items-center gap-2 text-[14px] font-bold text-slate-800">
        <Icon className="h-4 w-4 text-orange-500" />
        {title}
      </h3>
      {action}
    </div>
  );
}

function Field({ icon: Icon, label, value, sub }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 inline-flex items-center gap-1 text-[11px] text-slate-700">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </p>
      <p className="truncate text-[13px] font-semibold text-slate-800">{value || '—'}</p>
      {sub ? <p className="text-[11px] text-slate-700">{sub}</p> : null}
    </div>
  );
}

function ActionTile({ icon: Icon, label, tone, onClick, disabled }) {
  const tones = {
    sky: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
    green: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    violet: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
    blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-12 items-center justify-center gap-2 rounded-xl text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        tones[tone]
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function LeadOverviewSection({
  lead,
  leadId,
  notes = [],
  legacyNote = '',
  followups = [],
  contactEndpoint = '/leads',
  receiptEndpoint,
  editHref,
  canEditLead,
  onCreateQuote,
  onScheduleFollowUp,
  onContactLogged,
  onEmailSent,
  onLogCallNote,
  onAssign,
  onAddNote,
  onUpdateStatus,
  onEditCommercial,
  sidebarExtra,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { can } = usePermissions();
  const canSeeSource = !SOURCE_HIDDEN_ROLES.includes(user?.role);
  const canSendEmail = CHANNELS.email && can('email', 'send');
  const [emailOpen, setEmailOpen] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherHtml, setVoucherHtml] = useState('');
  const [voucherData, setVoucherData] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [sendingVoucher, setSendingVoucher] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showNoteBox, setShowNoteBox] = useState(false);

  const travelers = travelersSummary(lead);
  const reqs = requirementItems(lead);
  const summary = lead?.paymentSummary;
  const packageCost = summary?.totalAmount ?? lead?.budget ?? 0;
  const advance = summary?.advanceReceived ?? 0;
  const balance = summary?.balanceDue ?? (packageCost - advance);
  const booked = isBookedStatus(lead?.status);
  const canManageVoucher = Boolean(booked || summary);
  const editAdvanceHandler = onEditCommercial || (canManageVoucher ? onUpdateStatus : null);
  const upcoming = getUpcomingFollowUp(followups) || (lead?.nextFollowUp ? { scheduledAt: lead.nextFollowUp } : null);
  const noteItems = notes.length
    ? notes
    : legacyNote
      ? [{ message: legacyNote, user: lead?.assignedTo?.name || 'Team', date: lead?.updatedAt }]
      : [];
  const latestNote = noteItems[0];
  const endpoint = receiptEndpoint || (lead?._id ? `/leads/${lead._id}/payment-receipt` : null);
  const sendEndpoint = endpoint ? `${endpoint}/send` : null;
  const phone = lead?.whatsapp || lead?.phone;

  useEffect(() => {
    const onOpen = (event) => {
      const detail = event?.detail || {};
      if (!detail.html) return;
      setVoucherHtml(detail.html);
      setVoucherData(detail.voucher || null);
      setVoucherOpen(true);
    };
    window.addEventListener('hj:open-voucher', onOpen);
    return () => window.removeEventListener('hj:open-voucher', onOpen);
  }, []);

  const openVoucher = async () => {
    if (!endpoint) return;
    setVoucherLoading(true);
    try {
      const { data } = await API.get(endpoint, {
        params: { refresh: 1 },
        skipSuccessToast: true,
        skipErrorToast: true,
      });
      if (!data?.html) {
        toast.error('Voucher HTML missing — save commercial / advance details first');
        return;
      }
      setVoucherHtml(data.html || '');
      setVoucherData(data.voucher || null);
      setVoucherOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load payment voucher');
    } finally {
      setVoucherLoading(false);
    }
  };

  const sendVoucherNow = async () => {
    if (!sendEndpoint) {
      toast.error('Send is not available for this lead');
      return;
    }
    setSendingVoucher(true);
    try {
      // Ensure receipt HTML exists before send
      await API.get(endpoint, {
        params: { refresh: 1 },
        skipSuccessToast: true,
        skipErrorToast: true,
      });
      const { data } = await API.post(sendEndpoint, {}, { skipSuccessToast: true, skipErrorToast: true });
      if (data?.sent === false) {
        const reasons = {
          no_email: 'Customer email is missing',
          email_not_configured: 'Email is not configured on server',
          no_receipt: 'Receipt not found — edit advance / commercial form first',
        };
        toast.error(reasons[data.reason] || 'Could not send voucher');
        return;
      }
      toast.success(`Voucher sent${data?.to?.length ? ` to ${data.to.join(', ')}` : ''}`);
      onEmailSent?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send voucher');
    } finally {
      setSendingVoucher(false);
    }
  };

  const copyEmail = async () => {
    if (!lead?.email) return;
    try {
      await navigator.clipboard.writeText(lead.email);
      toast.success('Email copied');
    } catch {
      toast.error('Could not copy email');
    }
  };

  const saveNote = async () => {
    if (!noteDraft.trim() || !onAddNote) return;
    setAddingNote(true);
    try {
      await onAddNote(noteDraft.trim());
      setNoteDraft('');
      setShowNoteBox(false);
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
      <div className="space-y-4">
        <section className={cn(DETAIL_CARD, 'p-5')}>
          <CardTitle
            icon={Briefcase}
            title="Trip Details"
            action={
              canEditLead && editHref ? (
                <Link to={editHref} className="text-[13px] font-semibold text-orange-500 hover:text-orange-600">
                  Edit
                </Link>
              ) : null
            }
          />
          <div className="grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 xl:grid-cols-4">
            <Field icon={MapPin} label="Destination" value={lead.destination || '—'} />
            <Field
              icon={Calendar}
              label="Travel Date"
              value={formatTravelDateLabel(lead)}
              sub={lead.flexibleDates ? '(Flexible)' : ''}
            />
            <Field icon={Plane} label="Package Type" value={packageTypeLabel(lead)} />
            <Field icon={Users} label="No. of Travelers" value={travelers.main} sub={travelers.sub} />
            <Field
              icon={IndianRupee}
              label="Budget"
              value={lead.budget ? `${formatDetailMoney(lead.budget)}` : '—'}
              sub={lead.budget ? '(Approx)' : ''}
            />
            {canSeeSource ? <Field label="Source" value={formatSource(lead) || '—'} /> : null}
            <Field
              icon={UserRound}
              label="Assigned To"
              value={lead.assignedTo?.name || 'Unassigned'}
            />
            <Field icon={MapPin} label="Pickup point" value={lead.pickupPoint || '—'} />
            <Field icon={MapPin} label="Drop point" value={lead.dropPoint || '—'} />
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[12px] font-semibold text-slate-800">Special Requirements</p>
              {canEditLead && editHref ? (
                <Link to={editHref} className="text-slate-700 hover:text-orange-500">
                  <Pencil className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </div>
            <p className="text-[13px] text-slate-600">
              {reqs.length ? reqs.join(', ') : 'No specific requirements added yet.'}
            </p>
          </div>
        </section>

        <MetaFormAnswersCard lead={lead} />

        <LeadPaymentSummaryCard
          packageCost={packageCost}
          advance={advance}
          balance={balance}
          voucherLabel={
            summary?.receiptNumber
              ? `Voucher ${summary.receiptNumber}`
              : summary?.invoiceNumber
                ? `Invoice ${summary.invoiceNumber}`
                : canManageVoucher
                  ? 'Advance receipt ready'
                  : null
          }
          receiptSentAt={summary?.receiptSentAt}
          receiptSentTo={summary?.receiptSentTo}
          paymentScreenshots={
            summary?.paymentScreenshots?.length
              ? summary.paymentScreenshots
              : summary?.paymentScreenshotUrl
                ? [{ url: summary.paymentScreenshotUrl, name: summary.paymentScreenshotName }]
                : []
          }
          canManage={canManageVoucher}
          onEditAdvance={editAdvanceHandler}
          onSendVoucher={sendEndpoint ? sendVoucherNow : undefined}
          onViewVoucher={openVoucher}
          sendingVoucher={sendingVoucher}
          voucherLoading={voucherLoading}
        />

        <LeadStatusPipeline status={lead.status} lead={lead} onUpdateStatus={onUpdateStatus} />
      </div>

      <aside className="space-y-4">
        <section className={cn(DETAIL_CARD, 'p-4')}>
          <h3 className="mb-3 text-[14px] font-bold text-slate-800">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2.5">
            <ActionTile
              icon={Phone}
              label="Call"
              tone="sky"
              disabled={!phone}
              onClick={() => beginLeadCall({ leadId: lead._id, leadName: lead.name, phone })}
            />
            <ActionTile
              icon={MessageCircle}
              label="WhatsApp"
              tone="green"
              disabled={!phone}
              onClick={() =>
                openCrmWhatsApp({
                  leadId: lead._id,
                  phone,
                  navigate,
                  role: user?.role,
                  toast,
                }).then((row) => {
                  if (row) onContactLogged?.();
                })
              }
            />
            <ActionTile
              icon={Mail}
              label="Send Email"
              tone="violet"
              onClick={() => {
                if (!canSendEmail) {
                  toast.error('Email is not connected on this CRM');
                  return;
                }
                setEmailOpen(true);
              }}
            />
            <ActionTile
              icon={FileText}
              label="Create Quotation"
              tone="blue"
              disabled={!onCreateQuote}
              onClick={onCreateQuote}
            />
          </div>
          <DropdownMenuRoot>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="mt-2.5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-50 text-[13px] font-semibold text-slate-600 hover:bg-slate-100"
              >
                <MoreHorizontal className="h-4 w-4" />
                More Actions
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onLogCallNote ? <DropdownMenuItem onClick={onLogCallNote}>Log Call Note</DropdownMenuItem> : null}
              {onAssign ? (
                <DropdownMenuItem onClick={onAssign}>
                  {lead?.assignedTo ? 'Reassign' : 'Assign Lead'}
                </DropdownMenuItem>
              ) : null}
              {canEditLead && editHref ? (
                <DropdownMenuItem asChild>
                  <Link to={editHref}>Edit Lead</Link>
                </DropdownMenuItem>
              ) : null}
              {onScheduleFollowUp ? (
                <DropdownMenuItem onClick={onScheduleFollowUp}>Set Follow-up</DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenuRoot>
        </section>

        <section className={cn(DETAIL_CARD, 'p-4')}>
          <CardTitle
            icon={Phone}
            title="Contact Information"
            action={
              canEditLead && editHref ? (
                <Link to={editHref} className="text-[13px] font-semibold text-orange-500">
                  Edit
                </Link>
              ) : null
            }
          />
          <div className="space-y-3 text-[13px]">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 font-semibold text-slate-800">
                <Phone className="h-3.5 w-3.5 text-slate-700" />
                {lead.phone || '—'}
              </p>
              <div className="flex items-center gap-1">
                {lead.phone ? (
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-500 hover:bg-emerald-50"
                    onClick={() =>
                      openCrmWhatsApp({
                        leadId: lead._id,
                        phone: lead.phone,
                        navigate,
                        role: user?.role,
                        toast,
                      })
                    }
                    aria-label="WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                {lead.phone ? (
                  <button
                    type="button"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-sky-500 hover:bg-sky-50"
                    onClick={() => beginLeadCall({ leadId: lead._id, leadName: lead.name, phone: lead.phone })}
                    aria-label="Call"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex min-w-0 items-center gap-2 text-slate-600">
                <Mail className="h-3.5 w-3.5 shrink-0 text-slate-700" />
                <span className="truncate">{lead.email || '—'}</span>
              </p>
              {lead.email ? (
                <button
                  type="button"
                  onClick={copyEmail}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-700 hover:bg-slate-50 hover:text-slate-600"
                  aria-label="Copy email"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <p className="inline-flex items-center gap-2 text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-slate-700" />
              {[lead.city, lead.state].filter(Boolean).join(', ') || lead.destination || '—'}
            </p>
            <div>
              <p className="mb-0.5 text-[11px] text-slate-700">Preferred Time to Contact</p>
              <p className="inline-flex items-center gap-2 text-slate-600">
                <Clock className="h-3.5 w-3.5 text-slate-700" />
                {lead.preferredCallTime || '10:00 AM - 8:00 PM'}
              </p>
            </div>
          </div>
        </section>

        <section className={cn(DETAIL_CARD, 'p-4')}>
          <CardTitle
            icon={StickyNote}
            title="Notes"
            action={
              <button
                type="button"
                onClick={() => setShowNoteBox(true)}
                className="inline-flex items-center gap-1 text-[13px] font-semibold text-orange-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Note
              </button>
            }
          />
          {latestNote ? (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Avatar name={latestNote.user || 'AU'} size="sm" className="!h-7 !w-7 !text-[10px]" />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-slate-800">{latestNote.user || 'Team'}</p>
                  <p className="text-[11px] text-slate-700">
                    {latestNote.date
                      ? new Date(latestNote.date).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })
                      : ''}
                  </p>
                </div>
              </div>
              <p className="text-[13px] leading-relaxed text-slate-600">{latestNote.message}</p>
            </div>
          ) : (
            <p className="text-[13px] text-slate-700">No notes added yet.</p>
          )}
          {showNoteBox ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-orange-300"
                placeholder="Write a note…"
              />
              <button
                type="button"
                disabled={addingNote || !noteDraft.trim()}
                onClick={saveNote}
                className="inline-flex h-8 items-center rounded-lg bg-orange-500 px-3 text-[12px] font-semibold text-white disabled:opacity-50"
              >
                {addingNote ? 'Saving…' : 'Save note'}
              </button>
            </div>
          ) : null}
        </section>

        <section className={cn(DETAIL_CARD, 'p-4')}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[14px] font-bold text-slate-800">
                <CalendarDays className="h-4 w-4 text-orange-500" />
                Next Follow-up
              </p>
              <p className="mt-1 text-[13px] text-slate-700">
                {upcoming?.scheduledAt
                  ? new Date(upcoming.scheduledAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })
                  : 'Not scheduled'}
              </p>
            </div>
            {onScheduleFollowUp ? (
              <button
                type="button"
                onClick={onScheduleFollowUp}
                className="inline-flex h-9 shrink-0 items-center rounded-xl border border-orange-200 bg-white px-3 text-[12px] font-semibold text-orange-500 hover:bg-orange-50"
              >
                Set Follow-up
              </button>
            ) : null}
          </div>
        </section>
        {sidebarExtra}
      </aside>

      <Suspense fallback={null}>
        {emailOpen && canSendEmail ? (
          <EmailComposerModal
            open={emailOpen}
            onClose={() => setEmailOpen(false)}
            lead={lead}
            leadId={leadId}
            emailEndpoint={contactEndpoint}
            onSent={() => {
              setEmailOpen(false);
              (onEmailSent || onContactLogged)?.();
            }}
          />
        ) : null}
        {voucherOpen ? (
          <PaymentVoucherModal
            open={voucherOpen}
            onClose={() => setVoucherOpen(false)}
            voucher={voucherData}
            html={voucherHtml}
            lead={lead}
            sendEndpoint={endpoint ? `${endpoint}/send` : null}
          />
        ) : null}
      </Suspense>
    </div>
  );
}

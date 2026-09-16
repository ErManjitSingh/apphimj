import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import LeadDetailHeader from './LeadDetailHeader';
import LeadConvertedBanner from './LeadConvertedBanner';
import LeadOverviewSection from './LeadOverviewSection';
import LeadActivityTimeline from './LeadActivityTimeline';
import LeadFollowUpSection from './LeadFollowUpSection';
import LeadQuotationSection from './LeadQuotationSection';
import LeadOpsStatusPanel from './LeadOpsStatusPanel';
import LeadPaymentVoucherPanel from './LeadPaymentVoucherPanel';
import LeadNotesPanel from './LeadNotesPanel';
import LeadScoreBreakdown from './LeadScoreBreakdown';
import LeadTagsPanel from './LeadTagsPanel';
import LeadCustomerPanel from './LeadCustomerPanel';
import { useLeadQuotationsQuery, useLeadNotesQuery } from '../../features/leads/hooks/useLeadRelatedQueries';
import { getLeadDetailData } from './leadDetailData';
import { DETAIL_TABS } from './leadDetailUtils';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import API from '../../api/axios';
import { toast } from '../../context/ToastContext';
import { invalidateLeadDetail } from '../../lib/queryInvalidation';

function tabFromHash(hash) {
  const id = String(hash || '').replace('#', '').trim().toLowerCase();
  if (id === 'follow-ups') return 'followups';
  return DETAIL_TABS.some((t) => t.id === id) ? id : 'overview';
}

export default function LeadDetailLayout({
  lead,
  leadId,
  activities,
  timelineLoading,
  relatedBasePath = '/leads',
  backHref,
  backLabel,
  contactEndpoint,
  onCreateQuote,
  onScheduleFollowUp,
  onContactLogged,
  onEmailSent,
  onLogCallNote,
  onAssign,
  onChangeStatus,
  canCreateFollowUp,
  canEditLead,
  editHref,
  headerExtra,
  sidebarExtra,
  bottomExtra,
  receiptEndpoint,
  flashMessage,
  highlightQuotationId,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm, dialogNode } = useConfirmDialog();
  const [tab, setTab] = useState(() => tabFromHash(location.hash));

  useEffect(() => {
    setTab(tabFromHash(location.hash));
  }, [location.hash]);

  const setTabAndHash = (id) => {
    setTab(id);
    const next = id === 'overview' ? location.pathname : `${location.pathname}#${id}`;
    navigate(next, { replace: true });
  };

  const detail = getLeadDetailData(lead);
  const followups = lead.followups || lead.followUps || detail.followUps || [];
  const embeddedQuotations = lead.quotations || detail.quotations || [];
  const embeddedNotes = detail.notes?.length ? detail.notes : null;

  const { data: quotationsData, isLoading: quotationsLoading } = useLeadQuotationsQuery(leadId, {
    basePath: relatedBasePath,
    enabled: !embeddedQuotations.length,
  });
  const { data: notesData, isLoading: notesLoading, refetch: refetchNotes } = useLeadNotesQuery(leadId, {
    basePath: relatedBasePath,
  });

  const quotations = embeddedQuotations.length ? embeddedQuotations : (quotationsData?.items || []);
  const notes = notesData?.items?.length ? notesData.items : (embeddedNotes || []);

  const paymentReceiptEndpoint =
    receiptEndpoint ||
    (relatedBasePath ? `${relatedBasePath}/${leadId}/payment-receipt` : `/leads/${leadId}/payment-receipt`);

  const canMarkLost = Boolean(canEditLead && (relatedBasePath === '/leads' || relatedBasePath === '/sales-executive/leads'));

  const handleMarkLost = async () => {
    const ok = await confirm({
      title: 'Move to Lost',
      message: 'This lead will be marked as lost and removed from the active pipeline.',
      confirmLabel: 'Move to Lost',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await API.put(`${relatedBasePath}/${leadId}`, { status: 'lost' });
      toast.success('Lead moved to lost');
      await invalidateLeadDetail(queryClient, leadId);
      onContactLogged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not move lead to lost');
    }
  };

  const handleAddNote = async (text) => {
    try {
      await API.post(`${relatedBasePath}/${leadId}/notes`, { text });
      await refetchNotes();
      onContactLogged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save note');
      throw err;
    }
  };

  return (
    <>
      <LeadDetailHeader
        lead={lead}
        leadId={leadId}
        backHref={backHref}
        backLabel={backLabel}
        editHref={canEditLead ? editHref : undefined}
        relatedBasePath={relatedBasePath}
        tab={tab}
        onTabChange={setTabAndHash}
        onMarkLost={canMarkLost ? handleMarkLost : undefined}
        canEditLead={canEditLead}
      />
      {headerExtra}
      {flashMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {flashMessage}
        </div>
      )}
      <LeadConvertedBanner
        status={lead.status}
        bookingNumber={lead.paymentSummary?.bookingNumber}
        onViewBooking={() => setTabAndHash('bookings')}
      />

      {tab === 'overview' ? (
        <LeadOverviewSection
          lead={lead}
          leadId={leadId}
          notes={notes}
          legacyNote={lead.notes}
          followups={followups}
          contactEndpoint={contactEndpoint || relatedBasePath}
          receiptEndpoint={paymentReceiptEndpoint}
          editHref={editHref}
          canEditLead={canEditLead}
          onCreateQuote={onCreateQuote}
          onScheduleFollowUp={onScheduleFollowUp}
          onContactLogged={onContactLogged}
          onEmailSent={onEmailSent}
          onLogCallNote={onLogCallNote}
          onAssign={onAssign}
          onAddNote={handleAddNote}
          onUpdateStatus={onChangeStatus || onScheduleFollowUp}
          sidebarExtra={sidebarExtra}
        />
      ) : null}

      {tab === 'activity' ? (
        <LeadActivityTimeline
          activities={activities}
          loading={timelineLoading}
          quotations={quotations}
          highlightQuotationId={highlightQuotationId}
          lead={lead}
          leadId={leadId}
          contactEndpoint={contactEndpoint || relatedBasePath || '/leads'}
          onQuotationSent={onContactLogged}
        />
      ) : null}

      {tab === 'followups' ? (
        <LeadFollowUpSection
          followUps={followups}
          lead={lead}
          canCreate={canCreateFollowUp}
          onRefresh={onContactLogged}
        />
      ) : null}

      {tab === 'quotations' ? (
        <LeadQuotationSection quotations={quotations} loading={quotationsLoading} />
      ) : null}

      {tab === 'bookings' ? (
        lead.status === 'converted' ? (
          <LeadOpsStatusPanel lead={lead} paymentSummary={lead.paymentSummary} />
        ) : (
          <div className="rounded-[20px] border border-slate-100 bg-white p-10 text-center text-sm text-slate-400">
            No bookings yet. Convert this lead to start hotel, cab and installment tracking.
          </div>
        )
      ) : null}

      {tab === 'payments' ? (
        lead.paymentSummary ? (
          <LeadPaymentVoucherPanel
            lead={lead}
            paymentSummary={lead.paymentSummary}
            receiptEndpoint={paymentReceiptEndpoint}
          />
        ) : (
          <div className="rounded-[20px] border border-slate-100 bg-white p-10 text-center text-sm text-slate-400">
            No payment recorded yet. Package cost on overview uses the lead budget.
          </div>
        )
      ) : null}

      {tab === 'notes' ? (
        <LeadNotesPanel notes={notes} legacyNote={lead.notes} loading={notesLoading} />
      ) : null}

      {tab === 'documents' ? (
        <div className="space-y-4">
          <LeadCustomerPanel lead={lead} />
          <LeadScoreBreakdown lead={lead} />
          <LeadTagsPanel lead={lead} />
          {sidebarExtra}
          {bottomExtra}
        </div>
      ) : null}

      {dialogNode}
    </>
  );
}

import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import LeadDetailHeader from './LeadDetailHeader';
import LeadConvertedBanner from './LeadConvertedBanner';
import LeadOverviewSection from './LeadOverviewSection';
import { useLeadQuotationsQuery, useLeadNotesQuery } from '../../features/leads/hooks/useLeadRelatedQueries';
import { useLeadActivities } from '../../features/leads/hooks/useLeadActivities';
import { fetchLeadTimeline } from '../../services/leadEnterpriseApi';
import { DETAIL_TABS } from './leadDetailUtils';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import API from '../../api/axios';
import { toast } from '../../context/ToastContext';
import { invalidateLeadDetail } from '../../lib/queryInvalidation';
import { DETAIL_STALE_MS, GC_TIME_MS } from '../../lib/queryConfig';

const LeadActivityTimeline = lazy(() => import('./LeadActivityTimeline'));
const LeadFollowUpSection = lazy(() => import('./LeadFollowUpSection'));
const LeadQuotationSection = lazy(() => import('./LeadQuotationSection'));
const LeadOpsStatusPanel = lazy(() => import('./LeadOpsStatusPanel'));
const LeadPaymentVoucherPanel = lazy(() => import('./LeadPaymentVoucherPanel'));
const LeadNotesPanel = lazy(() => import('./LeadNotesPanel'));
const LeadScoreBreakdown = lazy(() => import('./LeadScoreBreakdown'));
const LeadTagsPanel = lazy(() => import('./LeadTagsPanel'));
const LeadCustomerPanel = lazy(() => import('./LeadCustomerPanel'));

function tabFromHash(hash) {
  const id = String(hash || '').replace('#', '').trim().toLowerCase();
  if (id === 'follow-ups') return 'followups';
  return DETAIL_TABS.some((t) => t.id === id) ? id : 'overview';
}

function TabFallback() {
  return <div className="h-40 animate-pulse rounded-[20px] bg-slate-100" />;
}

export default function LeadDetailLayout({
  lead,
  leadId,
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

  const followups = lead.followups || lead.followUps || [];
  const embeddedQuotations = lead.quotations || [];

  const needQuotes = tab === 'quotations' || tab === 'activity';
  const needNotes = tab === 'notes';
  const needActivity = tab === 'activity';

  const { data: quotationsData, isLoading: quotationsLoading } = useLeadQuotationsQuery(leadId, {
    basePath: relatedBasePath,
    enabled: needQuotes && !embeddedQuotations.length,
  });
  const { data: notesData, isLoading: notesLoading, refetch: refetchNotes } = useLeadNotesQuery(leadId, {
    basePath: relatedBasePath,
    enabled: needNotes,
  });
  const { activities, timelineLoading } = useLeadActivities(lead, leadId, { enabled: needActivity });

  const quotations = embeddedQuotations.length ? embeddedQuotations : (quotationsData?.items || []);
  const notes = notesData?.items || [];

  const paymentReceiptEndpoint = useMemo(
    () =>
      receiptEndpoint ||
      (relatedBasePath ? `${relatedBasePath}/${leadId}/payment-receipt` : `/leads/${leadId}/payment-receipt`),
    [receiptEndpoint, relatedBasePath, leadId]
  );

  const canMarkLost = Boolean(
    canEditLead && (relatedBasePath === '/leads' || relatedBasePath === '/sales-executive/leads')
  );

  const prefetchTab = useCallback(
    (id) => {
      if (id === 'activity' && leadId) {
        queryClient.prefetchQuery({
          queryKey: ['lead-timeline', leadId],
          queryFn: () => fetchLeadTimeline(leadId, { limit: 30 }),
          staleTime: DETAIL_STALE_MS,
          gcTime: GC_TIME_MS,
        });
      }
      if (id === 'quotations' && leadId && !embeddedQuotations.length) {
        queryClient.prefetchQuery({
          queryKey: ['lead-quotations', relatedBasePath, leadId],
          queryFn: async () => {
            const { data } = await API.get(`${relatedBasePath}/${leadId}/quotations`, {
              params: { page: 1, limit: 20 },
              skipSuccessToast: true,
            });
            return {
              items: data?.quotations || data?.data || [],
              total: data?.quotationTotal ?? data?.pagination?.total ?? 0,
              pagination: data?.pagination,
            };
          },
          staleTime: DETAIL_STALE_MS,
          gcTime: GC_TIME_MS,
        });
      }
      if (id === 'notes' && leadId) {
        queryClient.prefetchQuery({
          queryKey: ['lead-notes', relatedBasePath, leadId],
          queryFn: async () => {
            const { data } = await API.get(`${relatedBasePath}/${leadId}/notes-list`, {
              params: { page: 1, limit: 20 },
              skipSuccessToast: true,
            });
            return {
              items: data?.notes || data?.data || [],
              total: data?.notesTotal ?? data?.pagination?.total ?? 0,
              pagination: data?.pagination,
            };
          },
          staleTime: DETAIL_STALE_MS,
          gcTime: GC_TIME_MS,
        });
      }
    },
    [embeddedQuotations.length, leadId, queryClient, relatedBasePath]
  );

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
        onPrefetchTab={prefetchTab}
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

      <Suspense fallback={<TabFallback />}>
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
            <div className="rounded-[20px] border border-slate-100 bg-white p-8 text-center text-sm text-slate-400">
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
            <div className="rounded-[20px] border border-slate-100 bg-white p-8 text-center text-sm text-slate-400">
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
      </Suspense>

      {dialogNode}
    </>
  );
}

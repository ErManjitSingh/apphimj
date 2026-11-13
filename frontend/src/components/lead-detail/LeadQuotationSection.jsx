import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  CheckCircle,
  Clock,
  Eye,
  Loader2,
  Pencil,
  Send,
  XCircle,
} from 'lucide-react';
import QuotationPdfOverlay from '../quotations/QuotationPdfOverlay';
import SendQuotationModal from './SendQuotationModal';
import { Button } from '../ui/button';
import { formatINR } from '../quotations/quotationUtils';
import { resolveQuotationAmount } from './leadDetailData';
import { DETAIL_CARD } from './leadDetailUtils';
import { cn } from '../../lib/utils';
import API from '../../api/axios';
import { toast } from '../../context/ToastContext';

const statusConfig = {
  sent: { label: 'Sent', icon: Clock, class: 'text-amber-700 bg-amber-50 border-amber-100' },
  viewed: { label: 'Viewed', icon: Clock, class: 'text-sky-700 bg-sky-50 border-sky-100' },
  negotiation: { label: 'Negotiation', icon: Clock, class: 'text-violet-700 bg-violet-50 border-violet-100' },
  approved: { label: 'Approved', icon: CheckCircle, class: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  pending_approval: { label: 'Pending', icon: Clock, class: 'text-amber-700 bg-amber-50 border-amber-100' },
  rejected: { label: 'Rejected', icon: XCircle, class: 'text-red-700 bg-red-50 border-red-100' },
  draft: { label: 'Draft', icon: Clock, class: 'text-slate-600 bg-slate-50 border-slate-100' },
};

function resolveQuoteEditHref(quoteId, contactEndpoint = '') {
  if (!quoteId) return null;
  const base = String(contactEndpoint || '');
  if (base.includes('sales-executive')) {
    return `/sales-executive/quotations/${quoteId}/edit`;
  }
  if (base.includes('sales-manager')) {
    return `/sales-manager/quotations/new?edit=${quoteId}`;
  }
  if (base.includes('team-leader')) {
    return `/team-leader/quotations/new?edit=${quoteId}`;
  }
  return `/quotations/new?edit=${quoteId}`;
}

function resolveFinalQuotationEndpoint(contactEndpoint = '', leadId) {
  if (!leadId) return null;
  const base = String(contactEndpoint || '');
  if (base.includes('sales-executive')) {
    return `/sales-executive/leads/${leadId}/final-quotation`;
  }
  return `/leads/${leadId}/final-quotation`;
}

function canEditQuote(status) {
  return ['draft', 'pending_approval', 'rejected'].includes(String(status || 'draft'));
}

export default function LeadQuotationSection({
  quotations = [],
  compact = false,
  loading = false,
  contactEndpoint = '',
  lead = null,
  leadId = null,
  onQuotationSent,
  onFinalQuotationSet,
}) {
  const [pdfQuote, setPdfQuote] = useState(null);
  const [sendQuote, setSendQuote] = useState(null);
  const [savingFinalId, setSavingFinalId] = useState(null);
  const [localFinalId, setLocalFinalId] = useState(null);
  const pdfRef = useRef(null);

  const finalQuotationId = String(
    localFinalId || lead?.finalQuotation?._id || lead?.finalQuotation || ''
  );

  useEffect(() => {
    setLocalFinalId(null);
  }, [lead?.finalQuotation, lead?._id]);

  const markFinalQuotation = async (quoteId) => {
    if (!quoteId || !leadId) return;
    const endpoint = resolveFinalQuotationEndpoint(contactEndpoint, leadId);
    if (!endpoint) return;
    setSavingFinalId(String(quoteId));
    try {
      const { data } = await API.post(endpoint, { quotationId: quoteId });
      setLocalFinalId(String(quoteId));
      toast.success(
        data?.syncedToOps
          ? 'Final quotation set · package synced to Operations'
          : 'Final quotation set — yeh package convert pe Operations me jayega'
      );
      onFinalQuotationSet?.(quoteId, data);
      onQuotationSent?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not set final quotation');
    } finally {
      setSavingFinalId(null);
    }
  };

  if (loading) {
    return (
      <div className={`${DETAIL_CARD} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Quotations</h3>
        </div>
        <p className="p-8 text-center text-sm text-slate-400">Loading quotations…</p>
      </div>
    );
  }

  if (!quotations.length) {
    return (
      <div className={`${DETAIL_CARD} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Quotations</h3>
        </div>
        <p className="p-8 text-center text-sm text-slate-400">No quotations yet</p>
      </div>
    );
  }

  return (
    <>
      <div className={`${DETAIL_CARD} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Quotations</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Edit draft, set final quotation, view PDF, or send — same as Activity.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                {['Quote #', 'Trip', 'Amount', 'Date', 'Status', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {quotations.map((q, index) => {
                const cfg = statusConfig[q.status] || statusConfig.draft;
                const amount = resolveQuotationAmount(q);
                const quoteId = q._id || q.id;
                const quoteNumber = q.quoteNumber || quoteId || `Q-${index + 1}`;
                const title = q.title || q.packageSnapshot?.name || q.package?.name || 'Package';
                const date = q.sentAt || q.createdAt;
                const quoteStatus = String(q.status || 'draft');
                const editHref = canEditQuote(quoteStatus)
                  ? resolveQuoteEditHref(quoteId, contactEndpoint)
                  : null;
                const isFinalQuote =
                  quoteId && finalQuotationId && String(quoteId) === String(finalQuotationId);
                const canMarkFinal = Boolean(quoteId && leadId);
                const canView = Boolean(quoteId && (q.pricing || q.packageSnapshot || q.quoteNumber));
                const canSend =
                  canView &&
                  lead &&
                  leadId &&
                  !['draft', 'pending_approval', 'rejected'].includes(quoteStatus);

                return (
                  <tr
                    key={quoteId || index}
                    className={cn(
                      'hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-colors',
                      isFinalQuote && 'bg-teal-50/40 dark:bg-teal-950/20'
                    )}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-semibold text-violet-600">
                      <div className="flex flex-col gap-1">
                        <span>{quoteNumber}</span>
                        {isFinalQuote ? (
                          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-teal-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                            <BadgeCheck className="h-3 w-3" />
                            Final
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white">
                      {title}
                    </td>
                    <td className="px-5 py-3.5 font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatINR(amount)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                      {date
                        ? new Date(date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border',
                          cfg.class
                        )}
                      >
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {editHref ? (
                          <Link
                            to={editHref}
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-100"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit draft
                          </Link>
                        ) : null}
                        {canMarkFinal ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={savingFinalId === String(quoteId) || isFinalQuote}
                            onClick={() => markFinalQuotation(quoteId)}
                            className={cn(
                              'rounded-lg h-7 gap-1 text-[11px]',
                              isFinalQuote
                                ? 'bg-teal-600 text-white hover:bg-teal-600 border-0'
                                : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200'
                            )}
                          >
                            {savingFinalId === String(quoteId) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <BadgeCheck className="h-3 w-3" />
                            )}
                            {isFinalQuote ? 'Final quotation' : 'Set final quotation'}
                          </Button>
                        ) : null}
                        {canView ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPdfQuote(q)}
                            className="rounded-lg h-7 gap-1 text-[11px] text-sky-700 border-sky-200 bg-sky-50 hover:bg-sky-100"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        ) : null}
                        {canSend ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setSendQuote(q)}
                            className="rounded-lg h-7 gap-1 text-[11px] bg-[#25D366] hover:bg-[#1ebe5d] text-white border-0"
                          >
                            <Send className="h-3 w-3" />
                            Send
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <QuotationPdfOverlay
        quote={pdfQuote}
        open={!!pdfQuote}
        onClose={() => setPdfQuote(null)}
        pdfRef={pdfRef}
      />

      <SendQuotationModal
        open={!!sendQuote}
        onClose={() => setSendQuote(null)}
        lead={lead}
        leadId={leadId}
        quote={sendQuote}
        contactEndpoint={contactEndpoint}
        onSent={onQuotationSent}
      />
    </>
  );
}

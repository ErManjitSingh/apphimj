import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, Pencil, XCircle } from 'lucide-react';
import QuotationPdfOverlay from '../quotations/QuotationPdfOverlay';
import { formatINR } from '../quotations/quotationUtils';
import { resolveQuotationAmount } from './leadDetailData';
import { DETAIL_CARD } from './leadDetailUtils';
import { cn } from '../../lib/utils';

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

function canEditQuote(status) {
  return ['draft', 'pending_approval', 'rejected'].includes(String(status || 'draft'));
}

export default function LeadQuotationSection({
  quotations = [],
  compact = false,
  loading = false,
  contactEndpoint = '',
}) {
  const [pdfQuote, setPdfQuote] = useState(null);
  const pdfRef = useRef(null);

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
          <p className="mt-0.5 text-xs text-slate-500">Drafts can be opened and edited anytime.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                {['Quote #', 'Trip', 'Amount', 'Date', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {quotations.map((q, index) => {
                const cfg = statusConfig[q.status] || statusConfig.draft;
                const amount = resolveQuotationAmount(q);
                const quoteNumber = q.quoteNumber || q.id || `Q-${index + 1}`;
                const title = q.title || q.packageSnapshot?.name || q.package?.name || 'Package';
                const date = q.sentAt || q.createdAt;
                const editHref = canEditQuote(q.status)
                  ? resolveQuoteEditHref(q._id || q.id, contactEndpoint)
                  : null;

                return (
                  <tr
                    key={q._id || q.id || index}
                    className="hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-colors"
                  >
                    <td
                      className="px-5 py-3.5 font-mono text-xs font-semibold text-violet-600 cursor-pointer"
                      onClick={() => setPdfQuote(q)}
                    >
                      {quoteNumber}
                    </td>
                    <td
                      className="px-5 py-3.5 font-medium text-slate-900 dark:text-white cursor-pointer"
                      onClick={() => setPdfQuote(q)}
                    >
                      {title}
                    </td>
                    <td
                      className="px-5 py-3.5 font-bold tabular-nums text-slate-900 dark:text-white cursor-pointer"
                      onClick={() => setPdfQuote(q)}
                    >
                      {formatINR(amount)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border', cfg.class)}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {editHref ? (
                        <Link
                          to={editHref}
                          className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 hover:bg-violet-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Pencil className="h-3 w-3" />
                          Edit draft
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="text-[11px] font-semibold text-slate-400 hover:text-violet-600"
                          onClick={() => setPdfQuote(q)}
                        >
                          View PDF
                        </button>
                      )}
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
    </>
  );
}

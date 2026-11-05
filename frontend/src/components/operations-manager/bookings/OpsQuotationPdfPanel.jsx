import { useEffect, useRef, useState } from 'react';
import { FileText, Loader2, Eye, AlertCircle } from 'lucide-react';
import API from '../../../api/axios';
import { Button } from '../../ui/button';
import QuotationPdfOverlay from '../../quotations/QuotationPdfOverlay';
import { formatINR, formatDate } from '../operationsUtils';
import { cn } from '../../../lib/utils';

const EMPTY_MESSAGE = 'The sales executive did not send any quotation PDF from the CRM.';

export default function OpsQuotationPdfPanel({ bookingId, summary }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quotation, setQuotation] = useState(null);
  const [available, setAvailable] = useState(summary?.available !== false);
  const [message, setMessage] = useState(summary?.message || EMPTY_MESSAGE);
  const [pdfOpen, setPdfOpen] = useState(false);
  const pdfRef = useRef(null);

  useEffect(() => {
    if (!bookingId) return undefined;
    let cancelled = false;

    // If booking already says unavailable, skip fetch
    if (summary && summary.available === false) {
      setAvailable(false);
      setMessage(summary.message || EMPTY_MESSAGE);
      setQuotation(null);
      return undefined;
    }

    setLoading(true);
    setError('');
    API.get(`/operations-manager/bookings/${bookingId}/customer-quotation`, {
      skipSuccessToast: true,
      skipErrorToast: true,
    })
      .then((r) => {
        if (cancelled) return;
        const data = r.data || {};
        if (!data.available || !data.quotation) {
          setAvailable(false);
          setMessage(data.message || EMPTY_MESSAGE);
          setQuotation(null);
          return;
        }
        setAvailable(true);
        setQuotation(data.quotation);
        setMessage('');
      })
      .catch((err) => {
        if (cancelled) return;
        setAvailable(false);
        setQuotation(null);
        setError(err?.response?.data?.message || EMPTY_MESSAGE);
        setMessage(EMPTY_MESSAGE);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId, summary?.available, summary?._id]);

  const quoteNumber = quotation?.quoteNumber || summary?.quoteNumber;
  const status = quotation?.status || summary?.status;
  const sentAt = quotation?.sentAt || summary?.sentAt;
  const total =
    quotation?.pricing?.total ||
    quotation?.costing?.grandTotal ||
    summary?.total ||
    0;
  const packageName =
    quotation?.packageSnapshot?.name ||
    quotation?.packageSnapshot?.title ||
    summary?.packageName ||
    '';

  return (
    <>
      <div
        className={cn(
          'rounded-3xl border overflow-hidden',
          available
            ? 'border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] via-white to-fuchsia-500/[0.05]'
            : 'border-amber-300/50 bg-gradient-to-br from-amber-50 via-orange-50/60 to-white'
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-subtle/70">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm',
                available ? 'bg-violet-500' : 'bg-amber-500'
              )}
            >
              {available ? <FileText className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  'text-[10px] font-bold uppercase tracking-[0.14em]',
                  available ? 'text-violet-700' : 'text-amber-700'
                )}
              >
                Sales executive quotation PDF
              </p>
              <h3 className="mt-0.5 text-base font-black text-content-primary truncate">
                {available
                  ? `${quoteNumber || 'Quotation'} · ${packageName || 'Package'}`
                  : 'No quotation PDF on file'}
              </h3>
              {available ? (
                <p className="text-xs text-content-muted mt-1">
                  Status <span className="font-semibold capitalize text-content-secondary">{status || '—'}</span>
                  {sentAt ? ` · Sent ${formatDate(sentAt)}` : ' · Final / approved on file'}
                  {total ? ` · ${formatINR(total)}` : ''}
                </p>
              ) : null}
            </div>
          </div>

          {available && quotation ? (
            <Button
              type="button"
              variant="sky"
              className="rounded-xl gap-2 shrink-0"
              onClick={() => setPdfOpen(true)}
            >
              <Eye className="w-4 h-4" />
              View PDF
            </Button>
          ) : null}
        </div>

        <div className="px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-content-muted">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading quotation PDF…
            </div>
          ) : available && quotation ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0 rounded-2xl border border-violet-200/70 bg-white/80 px-4 py-3">
                <p className="text-xs text-content-muted">
                  This is the quotation the sales executive sent or finalized for this lead. Open the PDF to review the exact customer copy from the CRM.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl gap-2 shrink-0 border-violet-200 text-violet-700 hover:bg-violet-50"
                onClick={() => setPdfOpen(true)}
              >
                <FileText className="w-4 h-4" />
                Open quotation PDF
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-amber-300/80 bg-white/70 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-amber-900">{message || EMPTY_MESSAGE}</p>
              {error && error !== message ? (
                <p className="mt-1 text-xs text-content-muted">{error}</p>
              ) : (
                <p className="mt-1.5 text-xs text-amber-800/80">
                  Ask the sales executive to send or finalize the quotation from the CRM, then refresh this booking.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <QuotationPdfOverlay
        quote={quotation}
        open={pdfOpen && Boolean(quotation)}
        onClose={() => setPdfOpen(false)}
        pdfRef={pdfRef}
      />
    </>
  );
}

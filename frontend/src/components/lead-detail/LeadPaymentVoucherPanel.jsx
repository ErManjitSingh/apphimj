import { useState } from 'react';
import API from '../../api/axios';
import PaymentVoucherModal from './PaymentVoucherModal';
import LeadPaymentSummaryCard from './LeadPaymentSummaryCard';
import { toast } from '../../context/ToastContext';
import { isBookedStatus } from '../../lib/leadPipeline';

export default function LeadPaymentVoucherPanel({
  lead,
  paymentSummary: summaryProp,
  receiptEndpoint,
  onEditCommercial,
}) {
  const summary = summaryProp || lead?.paymentSummary;
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState('');
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const isBookedLead =
    lead?.status === 'converted' || lead?.status === 'booked' || isBookedStatus(lead?.status);
  if (!summary && !isBookedLead) return null;
  if (!summary) return null;

  const endpoint =
    receiptEndpoint ||
    (lead?._id ? `/leads/${lead._id}/payment-receipt` : null);

  const sendEndpoint = endpoint ? `${endpoint}/send` : null;

  const voucherLabel = summary.receiptNumber
    ? `Voucher ${summary.receiptNumber}`
    : summary.invoiceNumber
      ? `Invoice ${summary.invoiceNumber}`
      : 'Payment voucher';

  const openVoucher = async () => {
    if (!endpoint) return;
    setLoading(true);
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
      setHtml(data.html || '');
      setVoucher(data.voucher || null);
      setOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load payment voucher');
    } finally {
      setLoading(false);
    }
  };

  const sendVoucherNow = async () => {
    if (!sendEndpoint) {
      toast.error('Send is not available for this lead');
      return;
    }
    setSending(true);
    try {
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
          no_receipt: 'Receipt not found — edit advance first',
        };
        toast.error(reasons[data.reason] || 'Could not send voucher');
        return;
      }
      toast.success(`Voucher sent${data?.to?.length ? ` to ${data.to.join(', ')}` : ''}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send voucher');
    } finally {
      setSending(false);
    }
  };

  const screenshots = summary.paymentScreenshots?.length
    ? summary.paymentScreenshots
    : summary.paymentScreenshotUrl
      ? [{ url: summary.paymentScreenshotUrl, name: summary.paymentScreenshotName }]
      : [];

  return (
    <>
      <LeadPaymentSummaryCard
        className="mb-6"
        packageCost={summary.totalAmount}
        advance={summary.advanceReceived}
        balance={summary.balanceDue}
        voucherLabel={voucherLabel}
        receiptSentAt={summary.receiptSentAt}
        receiptSentTo={summary.receiptSentTo}
        paymentScreenshots={screenshots}
        canManage={isBookedLead || Boolean(summary)}
        onEditAdvance={isBookedLead ? onEditCommercial : undefined}
        onSendVoucher={isBookedLead && sendEndpoint ? sendVoucherNow : undefined}
        onViewVoucher={openVoucher}
        sendingVoucher={sending}
        voucherLoading={loading}
      />

      <PaymentVoucherModal
        open={open}
        onClose={() => setOpen(false)}
        voucher={voucher}
        html={html}
        lead={lead}
        sendEndpoint={sendEndpoint}
      />
    </>
  );
}

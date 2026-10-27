import { useEffect, useState } from 'react';
import { Wallet, IndianRupee } from 'lucide-react';
import AppModal from '../ui/AppModal';
import { Button } from '../ui/button';
import API from '../../api/axios';
import PaymentScreenshotField from './PaymentScreenshotField';
import { toast } from '../../context/ToastContext';
import { cn } from '../../lib/utils';

function formatINR(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

const METHODS = [
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'cheque', label: 'Cheque' },
];

const fieldClass =
  'mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-100';

/**
 * Record an additional client payment (with screenshot) against a booked lead.
 * endpoint example: /sales-executive/leads/:id/record-payment or /leads/:id/record-payment
 */
export default function AddLeadPaymentModal({
  open,
  onClose,
  onSaved,
  endpoint,
  customerName = '',
  totalAmount = 0,
  advanceReceived = 0,
  balanceDue = 0,
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [shotFiles, setShotFiles] = useState([]);
  const [shotError, setShotError] = useState('');
  const [saving, setSaving] = useState(false);

  const pending = Math.max(0, Number(balanceDue) || Math.max(0, Number(totalAmount) - Number(advanceReceived)));
  const addAmt = Number(amount) || 0;
  const nextPending = Math.max(0, pending - addAmt);

  useEffect(() => {
    if (!open) return;
    setAmount(pending > 0 ? String(pending) : '');
    setMethod('upi');
    setReference('');
    setNotes('');
    setShotFiles([]);
    setShotError('');
  }, [open, pending]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!endpoint) {
      toast.error('Payment endpoint missing');
      return;
    }
    if (addAmt <= 0) {
      toast.error('Enter the amount client paid');
      return;
    }
    if (addAmt > pending + 1) {
      toast.error(`Amount exceeds pending balance (${formatINR(pending)})`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        amount: addAmt,
        paymentMethod: method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (shotFiles.length) {
        payload.paymentScreenshots = shotFiles.map((f) => ({ base64: f.base64, name: f.name }));
        payload.paymentScreenshotBase64 = shotFiles[0]?.base64;
        payload.paymentScreenshotName = shotFiles[0]?.name;
      }
      const { data } = await API.post(endpoint, payload, { skipSuccessToast: true });
      toast.success(
        `Payment saved · Pending ${formatINR(data?.balanceDue ?? nextPending)}`
      );
      onSaved?.(data);
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal open={open} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Client payment</p>
          <h3 className="mt-1 flex items-center gap-2 text-xl font-bold text-slate-900">
            <Wallet className="h-5 w-5 text-teal-600" />
            Add Payment
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {customerName ? `${customerName} · ` : ''}
            Record money received. Screenshot optional — pending balance updates automatically.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-500">Package</p>
            <p className="text-sm font-bold tabular-nums text-slate-900">{formatINR(totalAmount)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-500">Received</p>
            <p className="text-sm font-bold tabular-nums text-teal-700">{formatINR(advanceReceived)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-500">Pending</p>
            <p className="text-sm font-bold tabular-nums text-orange-600">{formatINR(pending)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Amount received</span>
            <div className="relative">
              <IndianRupee className="pointer-events-none absolute left-3 top-[1.35rem] h-4 w-4 text-slate-400" />
              <input
                required
                type="number"
                min="1"
                step="1"
                className={cn(fieldClass, 'pl-9')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Payment mode</span>
            <select className={fieldClass} value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-slate-600">UTR / Reference</span>
            <input
              className={fieldClass}
              placeholder="UPI ref / bank UTR / cheque no."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-slate-600">Notes</span>
            <textarea
              className={cn(fieldClass, 'min-h-[72px] resize-none')}
              placeholder="Optional note"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-600">Payment screenshot (optional)</p>
          <PaymentScreenshotField
            value={shotFiles}
            required={false}
            onChange={({ files, error }) => {
              setShotFiles(files || []);
              setShotError(error || '');
            }}
          />
          {shotError ? <p className="mt-1 text-xs text-rose-600">{shotError}</p> : null}
        </div>

        {addAmt > 0 ? (
          <p className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-800">
            After save, pending will be {formatINR(nextPending)}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || pending <= 0} className="bg-teal-600 hover:bg-teal-500 text-white">
            {saving ? 'Saving…' : 'Save Payment'}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}

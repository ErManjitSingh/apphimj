import { useEffect, useState } from 'react';
import AppModal from '../ui/AppModal';

const CHANNEL_SUGGESTIONS = [
  'Meta Ads',
  'Google Ads',
  'Instagram',
  'WhatsApp Marketing',
  'Print / Hoarding',
  'Referral Program',
  'Influencer',
  'Other',
];

function todayLocalDate() {
  return new Date().toLocaleDateString('en-CA');
}

function toLocalDateInput(value) {
  if (!value) return todayLocalDate();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return todayLocalDate();
  return d.toLocaleDateString('en-CA');
}

const EMPTY_FORM = { channel: '', campaign: '', amount: '', spendDate: todayLocalDate(), notes: '' };

export default function MarketingSpendModal({ open, record, onClose, onSubmit, loading }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (record) {
      setForm({
        channel: record.channel || '',
        campaign: record.campaign || '',
        amount: record.amount != null ? String(record.amount) : '',
        spendDate: toLocalDateInput(record.spendDate),
        notes: record.notes || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, record]);

  const isEdit = Boolean(record);

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.channel.trim()) return setError('Channel is required');
    if (!Number.isFinite(amount) || amount <= 0) return setError('Amount must be greater than 0');
    if (!form.spendDate) return setError('Date is required');

    setError('');
    onSubmit({
      channel: form.channel.trim(),
      campaign: form.campaign.trim(),
      amount,
      spendDate: form.spendDate,
      notes: form.notes.trim(),
    });
  };

  return (
    <AppModal open={open} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">Marketing Spend</p>
          <h3 className="text-xl font-bold text-content-primary mt-1">
            {isEdit ? 'Edit Spend Entry' : 'Add Spend Entry'}
          </h3>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-content-muted">Channel</span>
          <input
            required
            list="marketing-spend-channels"
            className="input-premium"
            placeholder="Meta Ads, Google Ads, Instagram..."
            value={form.channel}
            onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
            maxLength={80}
          />
          <datalist id="marketing-spend-channels">
            {CHANNEL_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-content-muted">Campaign (optional)</span>
          <input
            className="input-premium"
            placeholder="Diwali Sale, Goa Push..."
            value={form.campaign}
            onChange={(e) => setForm((f) => ({ ...f, campaign: e.target.value }))}
            maxLength={120}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-content-muted">Amount (₹)</span>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              className="input-premium"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-content-muted">Date</span>
            <input
              required
              type="date"
              className="input-premium"
              value={form.spendDate}
              onChange={(e) => setForm((f) => ({ ...f, spendDate: e.target.value }))}
            />
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-content-muted">Notes (optional)</span>
          <textarea
            className="input-premium min-h-[80px] resize-none"
            placeholder="Any additional context..."
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            maxLength={500}
          />
        </label>

        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost border border-subtle" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary bg-violet-600 hover:bg-violet-500" disabled={loading}>
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Spend'}
          </button>
        </div>
      </form>
    </AppModal>
  );
}

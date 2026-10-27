import {
  Wallet,
  ArrowDownCircle,
  CreditCard,
  Pencil,
  Send,
  Eye,
  Receipt,
} from 'lucide-react';
import { cn } from '../../lib/utils';

function formatINR(n) {
  const num = Number(n || 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function MoneyMetric({ icon: Icon, label, value, accent }) {
  const accents = {
    package: {
      wrap: 'bg-slate-900 text-white',
      icon: 'bg-white/15 text-teal-200',
      label: 'text-slate-400',
    },
    advance: {
      wrap: 'bg-gradient-to-br from-teal-500 to-teal-700 text-white',
      icon: 'bg-white/20 text-white',
      label: 'text-teal-100',
    },
    balance: {
      wrap: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white',
      icon: 'bg-white/20 text-white',
      label: 'text-orange-100',
    },
  };
  const a = accents[accent] || accents.package;

  return (
    <div className={cn('rounded-xl px-3 py-2.5', a.wrap)}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={cn('inline-flex h-5 w-5 items-center justify-center rounded-md', a.icon)}>
          <Icon className="h-3 w-3" strokeWidth={2.5} />
        </span>
        <p className={cn('text-[10px] font-bold uppercase tracking-wide', a.label)}>{label}</p>
      </div>
      <p className="text-[17px] sm:text-[18px] font-black tracking-tight leading-none metric-tabular">
        {formatINR(value)}
      </p>
    </div>
  );
}

export default function LeadPaymentSummaryCard({
  packageCost = 0,
  advance = 0,
  balance = 0,
  voucherLabel,
  receiptSentAt,
  receiptSentTo,
  paymentScreenshots = [],
  canManage = false,
  onEditAdvance,
  onAddPayment,
  onSendVoucher,
  onViewVoucher,
  sendingVoucher = false,
  voucherLoading = false,
  className,
}) {
  const total = Math.max(0, Number(packageCost) || 0);
  const paid = Math.max(0, Number(advance) || 0);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const fullyPaid = total > 0 && paid >= total;

  return (
    <section
      id="payment-advance"
      className={cn(
        'scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',
        className
      )}
    >
      {/* Compact header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-950 px-3.5 py-2.5">
        <div className="min-w-0 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/20 text-teal-300">
            <Receipt className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[13px] font-bold text-white leading-tight">Package &amp; Advance</h3>
            <p className="text-[10px] text-slate-400 truncate">
              {voucherLabel || 'Edit · send · view voucher'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {canManage && onAddPayment && !fullyPaid ? (
            <button
              type="button"
              onClick={onAddPayment}
              className="inline-flex h-7 items-center gap-1 rounded-lg bg-orange-400 px-2 text-[11px] font-bold text-slate-950 hover:bg-orange-300"
            >
              <Wallet className="h-3 w-3" />
              Add Payment
            </button>
          ) : null}
          {canManage && onEditAdvance ? (
            <button
              type="button"
              onClick={onEditAdvance}
              className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2 text-[11px] font-semibold text-white hover:bg-white/20"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </button>
          ) : null}
          {canManage && onSendVoucher ? (
            <button
              type="button"
              onClick={onSendVoucher}
              disabled={sendingVoucher}
              className="inline-flex h-7 items-center gap-1 rounded-lg bg-teal-400 px-2 text-[11px] font-bold text-slate-950 hover:bg-teal-300 disabled:opacity-60"
            >
              <Send className="h-3 w-3" />
              {sendingVoucher ? '…' : 'Send'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onViewVoucher}
            disabled={voucherLoading || !canManage}
            className="inline-flex h-7 items-center gap-1 rounded-lg bg-white px-2 text-[11px] font-bold text-slate-900 hover:bg-orange-50 disabled:opacity-50"
          >
            <Eye className="h-3 w-3 text-orange-500" />
            {voucherLoading ? '…' : 'View'}
          </button>
        </div>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Thin progress */}
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                fullyPaid
                  ? 'bg-gradient-to-r from-teal-400 to-emerald-400'
                  : 'bg-gradient-to-r from-teal-400 to-orange-400'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] font-bold tabular-nums text-slate-600 shrink-0">{pct}%</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MoneyMetric icon={Wallet} label="Package" value={packageCost} accent="package" />
          <MoneyMetric icon={ArrowDownCircle} label="Advance" value={advance} accent="advance" />
          <MoneyMetric icon={CreditCard} label="Balance" value={balance} accent="balance" />
        </div>

        {receiptSentAt ? (
          <p className="text-[11px] text-teal-700 bg-teal-50 rounded-lg px-2.5 py-1.5">
            <span className="font-semibold">Emailed</span>
            {receiptSentTo ? ` · ${receiptSentTo}` : ''}
            {' · '}
            {new Date(receiptSentAt).toLocaleString('en-IN')}
          </p>
        ) : null}

        {paymentScreenshots?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {paymentScreenshots.map((shot) => (
              <a
                key={shot.url}
                href={shot.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-teal-300 hover:text-teal-800"
              >
                <Eye className="h-3 w-3" />
                {shot.name || 'Proof'}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

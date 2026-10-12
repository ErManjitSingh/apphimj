import { Trophy, Pencil, Send, Eye, Sparkles, PartyPopper } from 'lucide-react';
import { Button } from '../ui/button';

export default function LeadConvertedBanner({
  status,
  bookingHref,
  bookingNumber,
  onViewBooking,
  onEditAdvance,
  onSendVoucher,
  onViewVoucher,
  sendingVoucher = false,
}) {
  if (status !== 'converted' && status !== 'booked') return null;

  const handleView = () => {
    if (onViewBooking) {
      onViewBooking();
      return;
    }
    if (bookingHref) {
      window.location.assign(bookingHref);
      return;
    }
    document.getElementById('payment-advance')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="relative mb-5 overflow-hidden rounded-[28px] border border-white/0 bg-[radial-gradient(900px_280px_at_0%_0%,rgba(45,212,191,0.45),transparent),radial-gradient(700px_240px_at_100%_0%,rgba(251,146,60,0.35),transparent),linear-gradient(135deg,#042f2e_0%,#0f172a_45%,#1c1917_100%)] px-5 py-5 sm:px-6 sm:py-6 shadow-[0_28px_60px_-32px_rgba(15,23,42,0.7)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
      <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-teal-300/30 blur-2xl" />
      <div className="pointer-events-none absolute -left-8 bottom-[-40px] h-32 w-32 rounded-full bg-orange-400/25 blur-2xl" />

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
            <div className="relative inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-teal-300 to-teal-600 text-slate-950 shadow-[0_16px_40px_-12px_rgba(45,212,191,0.9)]">
              <Trophy className="w-6 h-6" strokeWidth={2.25} />
              <span className="absolute -right-1 -top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-400 text-white shadow-md">
                <PartyPopper className="h-3 w-3" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-100 ring-1 ring-white/15">
                <Sparkles className="h-3 w-3" />
                Booked lead
              </p>
              <p className="mt-2 text-[18px] sm:text-[20px] font-black tracking-tight text-white leading-snug">
                Advance voucher is live
              </p>
              <p className="mt-1 text-[13px] text-slate-300 leading-snug">
                Edit amounts or send to the customer anytime
                {bookingNumber ? (
                  <span className="ml-1 font-semibold text-teal-200">· {bookingNumber}</span>
                ) : null}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleView}
            className="shrink-0 rounded-2xl h-11 px-5 bg-white hover:bg-orange-50 text-slate-900 border-0 font-bold shadow-lg"
          >
            View Booking
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onEditAdvance ? (
            <Button
              type="button"
              onClick={onEditAdvance}
              className="rounded-2xl h-10 gap-1.5 border border-white/15 bg-white/10 text-white hover:bg-white/20"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Advance
            </Button>
          ) : null}
          {onSendVoucher ? (
            <Button
              type="button"
              onClick={onSendVoucher}
              disabled={sendingVoucher}
              className="rounded-2xl h-10 gap-1.5 bg-teal-400 hover:bg-teal-300 text-slate-950 border-0 font-bold shadow-[0_12px_28px_-10px_rgba(45,212,191,0.85)]"
            >
              <Send className="w-3.5 h-3.5" />
              {sendingVoucher ? 'Sending…' : 'Send Voucher'}
            </Button>
          ) : null}
          {onViewVoucher ? (
            <Button
              type="button"
              onClick={onViewVoucher}
              className="rounded-2xl h-10 gap-1.5 bg-orange-400 hover:bg-orange-300 text-slate-950 border-0 font-bold shadow-[0_12px_28px_-10px_rgba(251,146,60,0.8)]"
            >
              <Eye className="w-3.5 h-3.5" />
              View Voucher
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

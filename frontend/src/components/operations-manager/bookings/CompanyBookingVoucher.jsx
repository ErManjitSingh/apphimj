import { useState } from 'react';
import { Download, Eye, Loader2, Printer, Ticket } from 'lucide-react';
import API from '../../../api/axios';
import { Button } from '../../ui/button';

function readiness(booking) {
  const tasks = booking.tasks || [];
  const hotelTasks = tasks.filter((task) => task.type === 'hotel_confirmation');
  const cabTasks = tasks.filter((task) => task.type === 'cab_confirmation');
  const hotelDone = hotelTasks.length
    ? hotelTasks.every((task) => task.status === 'completed')
    : booking.hotelConfirmation === 'confirmed';
  const cabNeeded = cabTasks.length > 0 || (booking.transport || []).length > 0;
  const cabDone = !cabNeeded || (cabTasks.length
    ? cabTasks.every((task) => task.status === 'completed')
    : booking.cabConfirmation === 'confirmed');
  const pending = [];
  if (!hotelDone) pending.push('Hotel task');
  if (!cabDone) pending.push('Cab task');
  return { ready: hotelDone && cabDone, pending };
}

export default function CompanyBookingVoucher({ booking, onSaved }) {
  const [complimentary, setComplimentary] = useState(booking.complimentary || '');
  const [specialNotes, setSpecialNotes] = useState(booking.specialNotes || '');
  const [generating, setGenerating] = useState(false);
  const [url, setUrl] = useState(booking.companyVoucherUrl || '');
  const [error, setError] = useState('');
  const state = readiness(booking);

  const open = (print) => {
    if (!url) return;
    window.open(print ? `${url}${url.includes('?') ? '&' : '?'}print=1` : url, '_blank', 'noopener,noreferrer');
  };

  const generate = async () => {
    setGenerating(true);
    setError('');
    try {
      const response = await API.post(`/operations-manager/bookings/${booking._id}/company-voucher`, {
        complimentary,
        specialNotes,
      });
      setUrl(response.data?.pdfUrl || response.data?.companyVoucherUrl || '');
      onSaved?.();
    } catch (err) {
      setError(err?.response?.data?.message || 'Company voucher could not be created yet.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="rounded-3xl border border-indigo-500/20 bg-white/90 p-4 shadow-sm sm:p-6 dark:bg-slate-900/80">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-600">Company copy</p>
      <h2 className="mt-1 flex items-center gap-2 text-lg font-black text-content-primary">
        <Ticket className="h-5 w-5 text-indigo-600" /> Company Booking Confirmation Voucher
      </h2>
      <p className="mt-1 text-xs text-content-muted">
        Created after the hotel and cab tasks are marked Done. Booking team can preview, print, and save it as PDF.
      </p>

      {!state.ready && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Waiting for {state.pending.join(' and ')}. Mark those tasks Done in the task list.
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2">
        <input
          value={complimentary}
          onChange={(e) => setComplimentary(e.target.value)}
          className="input-premium h-10 rounded-xl text-sm"
          placeholder="Complimentary"
        />
        <textarea
          value={specialNotes}
          onChange={(e) => setSpecialNotes(e.target.value)}
          className="input-premium min-h-[80px] rounded-xl px-3 py-2 text-sm"
          placeholder="Special notes"
        />
      </div>

      {error && <p className="mt-3 text-xs font-medium text-rose-600">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="violet" size="sm" className="rounded-xl gap-1.5" disabled={!state.ready || generating} onClick={generate}>
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ticket className="h-3.5 w-3.5" />}
          {url ? 'Refresh voucher' : 'Generate voucher'}
        </Button>
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5" disabled={!url} onClick={() => open(false)}>
          <Eye className="h-3.5 w-3.5" /> Preview
        </Button>
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5" disabled={!url} onClick={() => open(true)}>
          <Printer className="h-3.5 w-3.5" /> Print
        </Button>
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5" disabled={!url} onClick={() => open(true)}>
          <Download className="h-3.5 w-3.5" /> Save PDF
        </Button>
      </div>
    </section>
  );
}

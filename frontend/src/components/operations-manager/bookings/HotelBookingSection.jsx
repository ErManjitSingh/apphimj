import { useState } from 'react';
import { Hotel, Loader2, Save, Send } from 'lucide-react';
import API from '../../../api/axios';
import { Button } from '../../ui/button';
import { formatDate, formatINR } from '../operationsUtils';

const ARRANGEMENTS = ['Candlelight Dinner', 'Cake', 'DJ', 'Bonfire', 'Flower Decoration', 'Honeymoon Setup'];

function dateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function letterFor(booking, hotel) {
  const persons = Number(hotel.persons) || (Number(booking.adults || 0) + Number(booking.children || 0));
  const arrangements = [...(hotel.specialArrangements || [])];
  if (hotel.specialArrangementNote) arrangements.push(hotel.specialArrangementNote);
  return [
    'Dear Sir/Ma’am,',
    '',
    'Greetings from Him Journey Tours!',
    '',
    'Kindly confirm the below booking.',
    '',
    `* Guest Name: ${booking.customerName || '—'}`,
    `* Company Name: ${hotel.companyName || 'Him Journey Tours'}`,
    `* Check-in Date: ${formatDate(hotel.checkIn || booking.travelDate)}`,
    `* Check-out Date: ${formatDate(hotel.checkOut || booking.returnDate)}`,
    `* Number of Nights: ${hotel.nights || 1}`,
    `* Number of Rooms: ${hotel.rooms || 1}`,
    `* Number of Persons: ${persons || '—'}`,
    `* Meal Plan: ${hotel.mealPlan || '—'}`,
    `* Any Special Arrangement: ${arrangements.join(', ') || 'None'}`,
    `* Total Price: ${formatINR(hotel.internalPrice || 0)}`,
  ].join('\n');
}

export default function HotelBookingSection({ bookingId, booking, hotels, onChange, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState(null);
  const [notice, setNotice] = useState('');

  const update = (index, patch) => {
    onChange(hotels.map((hotel, i) => (i === index ? { ...hotel, ...patch } : hotel)));
  };

  const toggleArrangement = (index, label) => {
    const current = hotels[index].specialArrangements || [];
    const next = current.includes(label) ? current.filter((item) => item !== label) : [...current, label];
    update(index, { specialArrangements: next });
  };

  const save = async () => {
    setSaving(true);
    setNotice('');
    try {
      await API.put(`/operations-manager/bookings/${bookingId}`, { hotels });
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const send = async (hotel) => {
    if (!hotel?._id) {
      setNotice('Save the hotel stay once, then send the confirmation.');
      return;
    }
    const channels = [
      hotel.email ? 'email' : null,
      hotel.phone ? 'whatsapp' : null,
    ].filter(Boolean);
    if (!channels.length) {
      setNotice('Add the hotel email or WhatsApp number before sending.');
      return;
    }
    setSendingId(hotel._id);
    setNotice('');
    try {
      await API.put(`/operations-manager/bookings/${bookingId}`, { hotels });
      const response = await API.post(
        `/operations-manager/bookings/${bookingId}/hotels/${hotel._id}/confirmation`,
        {
          email: hotel.email,
          phone: hotel.phone,
          contactPerson: hotel.contactPerson,
          companyName: hotel.companyName || 'Him Journey Tours',
          mealPlan: hotel.mealPlan,
          rooms: hotel.rooms || 1,
          nights: hotel.nights || 1,
          persons: Number(hotel.persons) || (Number(booking.adults || 0) + Number(booking.children || 0)),
          internalPrice: Number(hotel.internalPrice) || 0,
          checkIn: hotel.checkIn,
          checkOut: hotel.checkOut,
          specialArrangements: hotel.specialArrangements || [],
          specialArrangementNote: hotel.specialArrangementNote || '',
          channels,
        }
      );
      const warnings = response.data?.warnings || [];
      setNotice(warnings.length ? warnings.join(' ') : 'Confirmation request sent. Mark the hotel task Done after the hotel confirms.');
      onSaved?.();
    } finally {
      setSendingId(null);
    }
  };

  return (
    <section className="rounded-3xl border border-teal-500/20 bg-white/90 p-4 shadow-sm sm:p-6 dark:bg-slate-900/80">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-600">Hotel Master</p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-black text-content-primary">
            <Hotel className="h-5 w-5 text-teal-600" /> Hotel booking
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-content-muted">
            One entry per hotel stay. The same hotel on continuous dates stays as a single request.
            Internal price is for company profit only and does not change the agent quotation or customer itinerary.
          </p>
        </div>
        <Button variant="teal" size="sm" className="rounded-xl gap-1.5" disabled={saving || !hotels.length} onClick={save}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save hotel costs
        </Button>
      </div>

      {notice && (
        <p className="mb-4 rounded-xl border border-teal-500/20 bg-teal-500/10 px-3 py-2 text-xs text-teal-800">{notice}</p>
      )}

      {!hotels.length && (
        <p className="rounded-2xl border border-dashed border-subtle p-6 text-center text-sm text-content-muted">
          Save the itinerary to create one hotel stay from the selected hotels.
        </p>
      )}

      <div className="space-y-4">
        {hotels.map((hotel, index) => (
          <article key={hotel._id || `${hotel.hotelName}-${index}`} className="rounded-2xl border border-subtle bg-slate-50/70 p-4 dark:bg-slate-950/40">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-black text-content-primary">{hotel.hotelName || 'Hotel'}</h3>
                <p className="text-xs text-content-muted">
                  {formatDate(hotel.checkIn || booking.travelDate)} → {formatDate(hotel.checkOut || booking.returnDate)}
                  {' · '}{hotel.nights || 1} night{(hotel.nights || 1) > 1 ? 's' : ''}
                  {hotel.destination ? ` · ${hotel.destination}` : ''}
                </p>
              </div>
              <span className="rounded-full bg-teal-500/10 px-2.5 py-1 text-[10px] font-bold uppercase text-teal-700">
                {hotel.status || 'pending'}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input value={hotel.companyName || 'Him Journey Tours'} onChange={(e) => update(index, { companyName: e.target.value })} className="input-premium h-10 rounded-xl text-sm" placeholder="Company name" />
              <input value={hotel.mealPlan || ''} onChange={(e) => update(index, { mealPlan: e.target.value })} className="input-premium h-10 rounded-xl text-sm" placeholder="Meal plan" />
              <input type="number" min="1" value={hotel.rooms || 1} onChange={(e) => update(index, { rooms: Number(e.target.value) || 1 })} className="input-premium h-10 rounded-xl text-sm" placeholder="Rooms" />
              <input type="number" min="1" value={hotel.persons || (Number(booking.adults || 0) + Number(booking.children || 0)) || ''} onChange={(e) => update(index, { persons: Number(e.target.value) || 0 })} className="input-premium h-10 rounded-xl text-sm" placeholder="Persons" />
              <input type="date" value={dateInput(hotel.checkIn)} onChange={(e) => update(index, { checkIn: e.target.value })} className="input-premium h-10 rounded-xl text-sm" />
              <input type="date" value={dateInput(hotel.checkOut)} onChange={(e) => update(index, { checkOut: e.target.value })} className="input-premium h-10 rounded-xl text-sm" />
              <input value={hotel.email || ''} onChange={(e) => update(index, { email: e.target.value })} className="input-premium h-10 rounded-xl text-sm" placeholder="Hotel email" />
              <input value={hotel.phone || ''} onChange={(e) => update(index, { phone: e.target.value })} className="input-premium h-10 rounded-xl text-sm" placeholder="Hotel WhatsApp" />
              <label className="sm:col-span-2 text-xs font-semibold text-content-secondary">
                Internal hotel cost
                <input
                  type="number"
                  min="0"
                  value={hotel.internalPrice ?? ''}
                  onChange={(e) => update(index, { internalPrice: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="input-premium mt-1 h-10 w-full rounded-xl text-sm font-bold"
                  placeholder="Total price for this stay"
                />
              </label>
            </div>

            <div className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-content-muted">Special arrangements</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ARRANGEMENTS.map((label) => {
                  const active = (hotel.specialArrangements || []).includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleArrangement(index, label)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? 'border-teal-500 bg-teal-500 text-white' : 'border-subtle bg-white text-content-secondary'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <input
                value={hotel.specialArrangementNote || ''}
                onChange={(e) => update(index, { specialArrangementNote: e.target.value })}
                className="input-premium mt-2 h-10 w-full rounded-xl text-sm"
                placeholder="Any other arrangement"
              />
            </div>

            <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-amber-200 bg-amber-50/80 p-3 font-sans text-xs leading-5 text-slate-700">
              {letterFor(booking, hotel)}
            </pre>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-content-muted">
                {hotel.voucherSentAt ? `Last sent ${formatDate(hotel.voucherSentAt)}` : 'Not sent yet'}
                {hotel.whatsappSentAt ? ' · WhatsApp sent' : ''}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 border-amber-500/40"
                disabled={sendingId === hotel._id}
                onClick={() => send(hotel)}
              >
                {sendingId === hotel._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send for Confirmation
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

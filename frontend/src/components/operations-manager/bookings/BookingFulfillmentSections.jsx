import { motion } from 'framer-motion';
import {
  Hotel, Car, Calendar, MapPin, Utensils, Bus, Compass,
  Save, Plus, Trash2, RefreshCw, Sparkles, Loader2, FileText, ExternalLink, Send, Ticket,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { formatDate, formatINR } from '../operationsUtils';
import { CONFIRMATION_CONFIG } from '../constants';
import { cn } from '../../../lib/utils';
import OpsInternalNotesPanel from './OpsInternalNotesPanel';

function Field({ label, children, className }) {
  return (
    <label className={cn('block min-w-0', className)}>
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-content-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function numberInputValue(value) {
  if (value === '' || value === null || value === undefined) return '';
  return value;
}

function parseOptionalNumber(raw) {
  if (raw === '' || raw == null) return '';
  const n = Number(raw);
  return Number.isFinite(n) ? n : '';
}

function normalizeCabType(rawType) {
  const normalized = String(rawType || 'suv').toLowerCase().replace(/\s+/g, '_');
  const allowed = ['sedan', 'suv', 'innova', 'tempo_traveller', 'bus', 'other'];
  if (allowed.includes(normalized)) return normalized;
  if (normalized.includes('innova')) return 'innova';
  if (normalized.includes('tempo')) return 'tempo_traveller';
  if (normalized.includes('sedan')) return 'sedan';
  if (normalized.includes('bus')) return 'bus';
  return 'suv';
}

function cabOptionLabel(cab) {
  const name = cab.vehicleName || cab.name || cab.vehicleType || 'Cab';
  const route = cab.pickupLocation || cab.dropLocation
    ? ` · ${cab.pickupLocation || '—'} → ${cab.dropLocation || '—'}`
    : '';
  const pkg = cab.sourcePackage ? ` · ${cab.sourcePackage}` : '';
  const cost = Number(cab.cost || cab.price || cab.finalCost || 0);
  const price = cost > 0 ? ` · ₹${cost.toLocaleString('en-IN')}` : '';
  return `${name}${route}${pkg}${price}`;
}

const VEHICLE_TYPES = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'innova', label: 'Innova' },
  { value: 'tempo_traveller', label: 'Tempo Traveller' },
  { value: 'bus', label: 'Bus' },
];

const HOTEL_STATUS = ['pending', 'requested', 'confirmed', 'rejected', 'cancelled'];

const MANUAL_HOTEL = '__manual_hotel__';
const MANUAL_CAB = '__manual_cab__';

function formatDayHotelLabel(dayHotel) {
  if (!dayHotel?.hotelName) return '';
  return [dayHotel.hotelName, dayHotel.roomType, dayHotel.mealPlan].filter(Boolean).join(' · ');
}

function formatDayCabLabel(dayCab) {
  if (!dayCab) return '';
  const type = VEHICLE_TYPES.find((v) => v.value === dayCab.vehicleType)?.label || dayCab.vehicleType;
  return [type, dayCab.pickupLocation, dayCab.dropLocation].filter(Boolean).join(' · ');
}

function applyCatalogHotel(day, hotel) {
  const roomType = hotel.roomTypes?.[0]?.name || hotel.roomType || '';
  const dayHotel = {
    hotelId: hotel._id,
    hotelName: hotel.name,
    destination: hotel.destination || '',
    location: hotel.location || '',
    roomType,
    mealPlan: hotel.mealPlan || '',
    source: 'catalog',
  };
  return { ...day, dayHotel, accommodation: formatDayHotelLabel(dayHotel) };
}

function applyCatalogCab(day, cab) {
  const dayCab = {
    cabId: cab._id,
    vehicleType: (cab.vehicleType || 'suv').toLowerCase().replace(/\s+/g, '_'),
    pickupLocation: cab.pickupLocation || '',
    dropLocation: cab.dropLocation || '',
    source: 'catalog',
  };
  return { ...day, dayCab, transport: formatDayCabLabel(dayCab) };
}

function updateDayHotel(day, patch) {
  const dayHotel = { source: 'manual', ...day.dayHotel, ...patch };
  return { ...day, dayHotel, accommodation: formatDayHotelLabel(dayHotel) };
}

function updateDayCab(day, patch) {
  const dayCab = { source: 'manual', ...day.dayCab, ...patch };
  return { ...day, dayCab, transport: formatDayCabLabel(dayCab) };
}

function DayHotelPicker({ day, catalogHotels, onChange }) {
  const selectedId = day.dayHotel?.source === 'catalog' && day.dayHotel?.hotelId
    ? String(day.dayHotel.hotelId)
    : day.dayHotel?.hotelName
      ? MANUAL_HOTEL
      : '';

  const selectedHotel = catalogHotels.find((h) => String(h._id) === String(day.dayHotel?.hotelId));
  const roomOptions = selectedHotel?.roomTypes?.length
    ? selectedHotel.roomTypes
    : selectedHotel?.roomType
      ? [{ name: selectedHotel.roomType }]
      : [];

  const handleSelect = (value) => {
    if (!value) {
      onChange({ ...day, dayHotel: undefined, accommodation: '' });
      return;
    }
    if (value === MANUAL_HOTEL) {
      onChange(updateDayHotel(day, { hotelId: undefined, source: 'manual' }));
      return;
    }
    const hotel = catalogHotels.find((h) => String(h._id) === value);
    if (hotel) onChange(applyCatalogHotel(day, hotel));
  };

  return (
    <div className="rounded-xl border border-teal-500/25 bg-gradient-to-br from-teal-500/[0.06] to-emerald-500/[0.03] p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-teal-700 flex items-center gap-1.5">
          <Hotel className="w-3.5 h-3.5" /> Hotel for this day
        </span>
        {day.dayHotel?.hotelName && (
          <button
            type="button"
            onClick={() => onChange({ ...day, dayHotel: undefined, accommodation: '' })}
            className="text-[10px] font-medium text-rose-600 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <select
        value={selectedId}
        onChange={(e) => handleSelect(e.target.value)}
        className="input-premium h-10 w-full rounded-xl text-sm"
      >
        <option value="">— Select hotel from inventory —</option>
        {catalogHotels.map((h) => (
          <option key={h._id} value={h._id}>
            {h.name} · {h.location || h.destination}
          </option>
        ))}
        <option value={MANUAL_HOTEL}>✎ Enter hotel manually</option>
      </select>

      {(selectedId === MANUAL_HOTEL || day.dayHotel?.source === 'manual') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={day.dayHotel?.hotelName || ''}
            onChange={(e) => onChange(updateDayHotel(day, { hotelName: e.target.value, hotelId: undefined }))}
            placeholder="Hotel name"
            className="input-premium h-9 rounded-xl text-sm sm:col-span-2"
          />
          <input
            value={day.dayHotel?.destination || day.dayHotel?.location || ''}
            onChange={(e) => onChange(updateDayHotel(day, { destination: e.target.value, location: e.target.value }))}
            placeholder="City / destination"
            className="input-premium h-9 rounded-xl text-sm"
          />
          <input
            value={day.dayHotel?.roomType || ''}
            onChange={(e) => onChange(updateDayHotel(day, { roomType: e.target.value }))}
            placeholder="Room type"
            className="input-premium h-9 rounded-xl text-sm"
          />
          <input
            value={day.dayHotel?.mealPlan || ''}
            onChange={(e) => onChange(updateDayHotel(day, { mealPlan: e.target.value }))}
            placeholder="Meal plan (MAP / CP)"
            className="input-premium h-9 rounded-xl text-sm sm:col-span-2"
          />
        </div>
      )}

      {day.dayHotel?.source === 'catalog' && selectedHotel && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="sm:col-span-2 rounded-lg bg-white/50 dark:bg-surface/50 px-3 py-2 text-xs text-content-secondary">
            <span className="font-semibold text-content-primary">{selectedHotel.name}</span>
            {selectedHotel.location ? ` · ${selectedHotel.location}` : ''}
            {selectedHotel.category ? ` · ${selectedHotel.category}` : ''}
          </div>
          {roomOptions.length > 1 ? (
            <select
              value={day.dayHotel?.roomType || ''}
              onChange={(e) => onChange(updateDayHotel(day, { roomType: e.target.value, source: 'catalog', hotelId: selectedHotel._id }))}
              className="input-premium h-9 rounded-xl text-sm"
            >
              {roomOptions.map((r) => (
                <option key={r.name} value={r.name}>{r.name}</option>
              ))}
            </select>
          ) : (
            <input
              value={day.dayHotel?.roomType || ''}
              onChange={(e) => onChange(updateDayHotel(day, { roomType: e.target.value, source: 'catalog', hotelId: selectedHotel._id }))}
              placeholder="Room type"
              className="input-premium h-9 rounded-xl text-sm"
            />
          )}
          <input
            value={day.dayHotel?.mealPlan || ''}
            onChange={(e) => onChange(updateDayHotel(day, { mealPlan: e.target.value, source: 'catalog', hotelId: selectedHotel._id }))}
            placeholder="Meal plan"
            className="input-premium h-9 rounded-xl text-sm"
          />
        </div>
      )}
    </div>
  );
}

function DayCabPicker({ day, catalogCabs, onChange }) {
  const selectedId = day.dayCab?.source === 'catalog' && day.dayCab?.cabId
    ? String(day.dayCab.cabId)
    : day.dayCab?.vehicleType || day.dayCab?.pickupLocation
      ? MANUAL_CAB
      : '';

  const handleSelect = (value) => {
    if (!value) {
      onChange({ ...day, dayCab: undefined, transport: '' });
      return;
    }
    if (value === MANUAL_CAB) {
      onChange(updateDayCab(day, { cabId: undefined, source: 'manual' }));
      return;
    }
    const cab = catalogCabs.find((c) => String(c._id) === value);
    if (cab) onChange(applyCatalogCab(day, cab));
  };

  return (
    <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.06] to-purple-500/[0.03] p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-violet-700 flex items-center gap-1.5">
          <Car className="w-3.5 h-3.5" /> Cab / transport for this day
        </span>
        {day.dayCab && (day.dayCab.vehicleType || day.dayCab.pickupLocation) && (
          <button
            type="button"
            onClick={() => onChange({ ...day, dayCab: undefined, transport: '' })}
            className="text-[10px] font-medium text-rose-600 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <select
        value={selectedId}
        onChange={(e) => handleSelect(e.target.value)}
        className="input-premium h-10 w-full rounded-xl text-sm"
      >
        <option value="">— Select cab from fleet —</option>
        {catalogCabs.map((c) => (
          <option key={c._id} value={c._id}>
            {c.vehicleType} · {c.pickupLocation} → {c.dropLocation}
          </option>
        ))}
        <option value={MANUAL_CAB}>✎ Enter cab manually</option>
      </select>

      {(selectedId === MANUAL_CAB || day.dayCab?.source === 'manual') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={day.dayCab?.vehicleType || 'suv'}
            onChange={(e) => onChange(updateDayCab(day, { vehicleType: e.target.value, cabId: undefined }))}
            className="input-premium h-9 rounded-xl text-sm"
          >
            {VEHICLE_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
          <input
            value={day.dayCab?.vehicleNumber || ''}
            onChange={(e) => onChange(updateDayCab(day, { vehicleNumber: e.target.value }))}
            placeholder="Vehicle number"
            className="input-premium h-9 rounded-xl text-sm"
          />
          <input
            value={day.dayCab?.pickupLocation || ''}
            onChange={(e) => onChange(updateDayCab(day, { pickupLocation: e.target.value }))}
            placeholder="Pickup location"
            className="input-premium h-9 rounded-xl text-sm"
          />
          <input
            value={day.dayCab?.dropLocation || ''}
            onChange={(e) => onChange(updateDayCab(day, { dropLocation: e.target.value }))}
            placeholder="Drop location"
            className="input-premium h-9 rounded-xl text-sm"
          />
          <input
            value={day.dayCab?.driverName || ''}
            onChange={(e) => onChange(updateDayCab(day, { driverName: e.target.value }))}
            placeholder="Driver name"
            className="input-premium h-9 rounded-xl text-sm"
          />
          <input
            value={day.dayCab?.driverPhone || ''}
            onChange={(e) => onChange(updateDayCab(day, { driverPhone: e.target.value }))}
            placeholder="Driver phone"
            className="input-premium h-9 rounded-xl text-sm"
          />
        </div>
      )}

      {day.dayCab?.source === 'catalog' && day.dayCab?.cabId && (
        <div className="rounded-lg bg-white/50 dark:bg-surface/50 px-3 py-2 text-xs text-content-secondary space-y-1">
          <p>
            <span className="font-semibold text-content-primary capitalize">{day.dayCab.vehicleType?.replace(/_/g, ' ')}</span>
            {day.dayCab.pickupLocation && day.dayCab.dropLocation
              ? ` · ${day.dayCab.pickupLocation} → ${day.dayCab.dropLocation}`
              : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <input
              value={day.dayCab?.driverName || ''}
              onChange={(e) => onChange(updateDayCab(day, { driverName: e.target.value, source: 'catalog', cabId: day.dayCab.cabId }))}
              placeholder="Driver name (optional)"
              className="input-premium h-9 rounded-xl text-sm"
            />
            <input
              value={day.dayCab?.driverPhone || ''}
              onChange={(e) => onChange(updateDayCab(day, { driverPhone: e.target.value, source: 'catalog', cabId: day.dayCab.cabId }))}
              placeholder="Driver phone (optional)"
              className="input-premium h-9 rounded-xl text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SectionShell({ gradient, icon: Icon, title, subtitle, children, actions }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface/90 backdrop-blur-xl shadow-xl shadow-black/5"
    >
      <div className={cn('absolute inset-0 opacity-[0.07] bg-gradient-to-br', gradient)} />
      <div className="relative p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div className="flex items-start gap-4">
            <div className={cn('p-3 rounded-2xl text-white shadow-lg bg-gradient-to-br', gradient)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-content-primary tracking-tight">{title}</h3>
              <p className="text-sm text-content-muted mt-0.5">{subtitle}</p>
            </div>
          </div>
          {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
        </div>
        {children}
      </div>
    </motion.div>
  );
}

export function QuotationSyncBanner({ meta, onSync, syncing, autoSynced }) {
  if (!meta?.quoteNumber) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-sky-500/20 bg-gradient-to-r from-sky-500/10 via-cyan-500/5 to-teal-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-sky-500/15">
          <Sparkles className="w-4 h-4 text-sky-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-content-primary">
            {autoSynced ? 'Auto-loaded from executive quotation' : 'Linked quotation'}
            <span className="ml-2 font-mono text-sky-600">{meta.quoteNumber}</span>
          </p>
          <p className="text-xs text-content-muted mt-0.5">
            Itinerary & hotels match what the customer received · Ops can edit below
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="rounded-xl gap-2 border-sky-500/30 hover:bg-sky-500/10" disabled={syncing} onClick={onSync}>
        {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        Refresh from quote
      </Button>
    </motion.div>
  );
}

export function BookingHotelsEditor({
  hotels,
  onChange,
  onSave,
  saving,
  catalogHotels = [],
  onSendVoucher,
  sendingVoucher,
}) {
  const update = (i, field, value) => {
    onChange(hotels.map((h, idx) => (idx === i ? { ...h, [field]: value } : h)));
  };

  const applyCatalogToRow = (i, hotelId) => {
    if (!hotelId) return;
    const hotel = catalogHotels.find((h) => String(h._id) === String(hotelId));
    if (!hotel) return;
    onChange(hotels.map((h, idx) => (idx === i ? {
      ...h,
      hotelId: hotel._id,
      hotelName: hotel.name,
      destination: hotel.destination || hotel.location || '',
      category: hotel.category || '',
      roomType: hotel.roomTypes?.[0]?.name || hotel.roomType || '',
      mealPlan: hotel.mealPlan || '',
      address: hotel.address || hotel.location || '',
      contactPerson: hotel.contactPerson || '',
      phone: hotel.phone || '',
      email: hotel.email || '',
    } : h)));
  };

  const addHotel = () => {
    onChange([...hotels, { hotelName: '', destination: '', roomType: '', mealPlan: '', status: 'pending' }]);
  };

  const remove = (i) => onChange(hotels.filter((_, idx) => idx !== i));

  return (
    <SectionShell
      gradient="from-teal-500 to-emerald-600"
      icon={Hotel}
      title="Hotel Assignments"
      subtitle="Pulled from quotation — edit rooms, dates & confirmation status"
      actions={(
        <>
          <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={addHotel}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
          <Button variant="teal" size="sm" className="rounded-xl gap-1" disabled={saving} onClick={onSave}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Hotels
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        {(hotels.length ? hotels : [{ hotelName: '', status: 'pending' }]).map((h, i) => (
          <div key={i} className="rounded-2xl border border-subtle/80 bg-white/40 dark:bg-surface-elevated/40 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className={cn('text-[10px] font-bold uppercase px-2.5 py-1 rounded-full', CONFIRMATION_CONFIG[h.status]?.className || 'bg-slate-500/15')}>
                {CONFIRMATION_CONFIG[h.status]?.label || h.status || 'Pending'}
              </span>
              {hotels.length > 1 && (
                <button type="button" onClick={() => remove(i)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {catalogHotels.length > 0 && (
              <select
                value={h.hotelId || ''}
                onChange={(e) => applyCatalogToRow(i, e.target.value)}
                className="input-premium h-10 w-full rounded-xl text-sm"
              >
                <option value="">— Pick from hotel inventory —</option>
                {catalogHotels.map((opt) => (
                  <option key={opt._id} value={opt._id}>{opt.name} · {opt.location || opt.destination}</option>
                ))}
              </select>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={h.hotelName || ''} onChange={(e) => update(i, 'hotelName', e.target.value)} placeholder="Hotel name" className="input-premium h-10 rounded-xl text-sm font-medium" />
              <input value={h.destination || ''} onChange={(e) => update(i, 'destination', e.target.value)} placeholder="Destination / city" className="input-premium h-10 rounded-xl text-sm" />
              <input value={h.roomType || ''} onChange={(e) => update(i, 'roomType', e.target.value)} placeholder="Room type" className="input-premium h-10 rounded-xl text-sm" />
              <input value={h.mealPlan || ''} onChange={(e) => update(i, 'mealPlan', e.target.value)} placeholder="Meal plan (MAP/CP)" className="input-premium h-10 rounded-xl text-sm" />
              <input type="number" min="1" value={h.day || ''} onChange={(e) => update(i, 'day', Number(e.target.value) || undefined)} placeholder="Starting day" className="input-premium h-10 rounded-xl text-sm" />
              <input type="number" min="1" value={h.nights || 1} onChange={(e) => update(i, 'nights', Number(e.target.value) || 1)} placeholder="Nights" className="input-premium h-10 rounded-xl text-sm" />
              <input value={h.contactPerson || ''} onChange={(e) => update(i, 'contactPerson', e.target.value)} placeholder="Hotel contact person" className="input-premium h-10 rounded-xl text-sm" />
              <input value={h.phone || ''} onChange={(e) => update(i, 'phone', e.target.value)} placeholder="Hotel phone" className="input-premium h-10 rounded-xl text-sm" />
              <input type="email" value={h.email || ''} onChange={(e) => update(i, 'email', e.target.value)} placeholder="Hotel email" className="input-premium h-10 rounded-xl text-sm" />
              <input value={h.confirmationNumber || ''} onChange={(e) => update(i, 'confirmationNumber', e.target.value)} placeholder="Confirmation number" className="input-premium h-10 rounded-xl text-sm" />
              <input value={h.address || ''} onChange={(e) => update(i, 'address', e.target.value)} placeholder="Hotel address" className="input-premium h-10 rounded-xl text-sm sm:col-span-2" />
              <input type="date" value={h.checkIn ? String(h.checkIn).slice(0, 10) : ''} onChange={(e) => update(i, 'checkIn', e.target.value)} className="input-premium h-10 rounded-xl text-sm" />
              <input type="date" value={h.checkOut ? String(h.checkOut).slice(0, 10) : ''} onChange={(e) => update(i, 'checkOut', e.target.value)} className="input-premium h-10 rounded-xl text-sm" />
              <select value={h.status || 'pending'} onChange={(e) => update(i, 'status', e.target.value)} className="input-premium h-10 rounded-xl text-sm sm:col-span-2">
                {HOTEL_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-bold text-content-primary">
                  <Ticket className="h-3.5 w-3.5 text-amber-600" />
                  {h.voucherSentAt ? 'Hotel voucher sent' : h.voucherId ? 'Voucher generated' : 'Hotel voucher'}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-content-muted">
                  {h.day ? `Day ${h.day}${Number(h.nights) > 1 ? `–${Number(h.day) + Number(h.nights) - 1}` : ''} · ` : ''}
                  {h.email || 'Add hotel email to send'}{h.voucherSentAt ? ` · ${formatDate(h.voucherSentAt)}` : ''}
                </p>
                <p className="mt-0.5 text-[9px] text-content-muted">Same hotel on multiple days is combined into one voucher.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 rounded-xl gap-1.5 border-amber-500/30"
                disabled={!h._id || !h.email || saving || sendingVoucher === h._id}
                onClick={() => onSendVoucher?.(h, i)}
              >
                {sendingVoucher === h._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {h.voucherSentAt ? 'Resend Voucher' : 'Send Voucher'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function BookingTransportEditor({
  transport,
  onChange,
  onSave,
  saving,
  catalogCabs = [],
  packageCabs = [],
  vouchers = [],
  onSendVoucher,
  sendingVoucher,
  packageRouting = '',
  bookingId,
}) {
  const update = (i, patch) => {
    onChange(transport.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  };

  const applyCabToRow = (i, cab, source = 'catalog') => {
    if (!cab) return;
    update(i, {
      source,
      vehicleType: normalizeCabType(cab.vehicleType || cab.vehicleName || cab.name || 'suv'),
      vendorName: cab.sourcePackage || cab.vendorName || cab.vendor || '',
      pickupLocation: cab.pickupLocation || cab.pickup || '',
      dropLocation: cab.dropLocation || cab.drop || '',
      driverName: cab.driverName || '',
      driverPhone: cab.driverPhone || '',
      vehicleNumber: cab.vehicleNumber || '',
      contactPerson: cab.contactPerson || '',
      phone: cab.phone || cab.driverPhone || '',
      email: cab.email || '',
      finalCost: Number(cab.cost || cab.price || cab.finalCost || cab.amount || 0) || 0,
      days: Array.isArray(cab.days) ? cab.days.map(Number).filter(Boolean) : (cab.day ? [Number(cab.day)] : undefined),
      day: Number(cab.day) || undefined,
    });
  };

  const addRow = (source = 'manual') => {
    onChange([
      ...transport,
      {
        vehicleType: 'suv',
        pickupLocation: '',
        dropLocation: '',
        finalCost: '',
        advancePaid: '',
        source,
        status: 'pending',
      },
    ]);
  };

  const remove = (i) => onChange(transport.filter((_, idx) => idx !== i));

  const packageOptions = (packageCabs || []).length
    ? packageCabs
    : (catalogCabs || []).filter((c) => c.sourcePackage || c.fromPackage || c.source === 'package');

  return (
    <SectionShell
      gradient="from-violet-500 to-indigo-600"
      icon={Car}
      title="Transport & Cabs"
      subtitle="Package se auto details aati hain — manual edit / CRM catalog bhi allowed. Advance aur balance yahin dikhega."
      actions={(
        <>
          <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => addRow('manual')}>
            <Plus className="w-3.5 h-3.5" /> Add manual cab
          </Button>
          <Button variant="violet" size="sm" className="rounded-xl gap-1" disabled={saving} onClick={onSave}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Transport
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        {packageRouting ? (
          <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">Package routing</p>
            <pre className="whitespace-pre-wrap font-sans text-xs leading-5 text-slate-700">{packageRouting}</pre>
          </div>
        ) : null}

        {(transport.length ? transport : [{ vehicleType: 'suv', source: 'manual', status: 'pending' }]).map((t, i) => {
          const voucher = t.voucherId
            ? vouchers.find((item) => String(item._id) === String(t.voucherId))
            : null;
          const total = Number(t.finalCost) || 0;
          const advance = Number(t.advancePaid) || 0;
          const balance = Math.max(0, total - advance);
          const source = t.source || 'manual';

          return (
            <div key={t._id || i} className="rounded-2xl border border-subtle/80 bg-white/50 p-4 sm:p-5 space-y-4 dark:bg-surface-elevated/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-violet-600">
                    Vehicle #{i + 1}
                  </span>
                  <p className="mt-0.5 text-[11px] text-content-muted">
                    Source:{' '}
                    <span className="font-bold capitalize text-content-primary">{source}</span>
                    {source === 'package' ? ' · from quotation package' : null}
                  </p>
                </div>
                {transport.length > 1 ? (
                  <button type="button" onClick={() => remove(i)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Cab source">
                  <select
                    value={source}
                    onChange={(e) => update(i, { source: e.target.value })}
                    className="input-premium h-10 w-full rounded-xl text-sm"
                  >
                    <option value="package">Package (auto)</option>
                    <option value="catalog">CRM catalog</option>
                    <option value="manual">Manual</option>
                  </select>
                </Field>

                {source === 'package' && packageOptions.length > 0 ? (
                  <Field label="Pick from package cabs" className="sm:col-span-2">
                    <select
                      value=""
                      onChange={(e) => {
                        const cab = packageOptions.find((c) => String(c._id || c.id) === e.target.value);
                        if (cab) applyCabToRow(i, cab, 'package');
                      }}
                      className="input-premium h-10 w-full rounded-xl text-sm"
                    >
                      <option value="">— Select package cab to auto-fill —</option>
                      {packageOptions.map((c) => (
                        <option key={c._id || c.id || cabOptionLabel(c)} value={c._id || c.id}>
                          {cabOptionLabel(c)}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                {source === 'catalog' && catalogCabs.length > 0 ? (
                  <Field label="Pick from CRM cabs" className="sm:col-span-2">
                    <select
                      value=""
                      onChange={(e) => {
                        const cab = catalogCabs.find((c) => String(c._id || c.id) === e.target.value);
                        if (cab) applyCabToRow(i, cab, 'catalog');
                      }}
                      className="input-premium h-10 w-full rounded-xl text-sm"
                    >
                      <option value="">— Select CRM cab to auto-fill —</option>
                      {catalogCabs.map((c) => (
                        <option key={c._id || c.id || cabOptionLabel(c)} value={c._id || c.id}>
                          {cabOptionLabel(c)}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                {source === 'manual' ? (
                  <p className="sm:col-span-2 self-end rounded-xl border border-dashed border-violet-200 bg-violet-50/50 px-3 py-2 text-xs text-violet-800">
                    Manual mode — fields khud bharo. Package / catalog se bhi source change kar sakte ho.
                  </p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Vehicle type">
                  <select
                    value={t.vehicleType || 'suv'}
                    onChange={(e) => update(i, { vehicleType: e.target.value })}
                    className="input-premium h-10 w-full rounded-xl text-sm"
                  >
                    {VEHICLE_TYPES.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Vehicle number">
                  <input
                    value={t.vehicleNumber || ''}
                    onChange={(e) => update(i, { vehicleNumber: e.target.value })}
                    className="input-premium h-10 w-full rounded-xl text-sm"
                    placeholder="HP…"
                  />
                </Field>
                <Field label="Service days">
                  <input
                    value={(t.days || []).join(', ')}
                    onChange={(e) => update(i, {
                      days: e.target.value.split(',').map((day) => Number(day.trim())).filter(Boolean),
                    })}
                    className="input-premium h-10 w-full rounded-xl text-sm"
                    placeholder="1, 2, 4"
                  />
                </Field>
                <Field label="Pickup location">
                  <input
                    value={t.pickupLocation || ''}
                    onChange={(e) => update(i, { pickupLocation: e.target.value })}
                    className="input-premium h-10 w-full rounded-xl text-sm"
                  />
                </Field>
                <Field label="Drop location">
                  <input
                    value={t.dropLocation || ''}
                    onChange={(e) => update(i, { dropLocation: e.target.value })}
                    className="input-premium h-10 w-full rounded-xl text-sm"
                  />
                </Field>
                <Field label="Vendor / package name">
                  <input
                    value={t.vendorName || ''}
                    onChange={(e) => update(i, { vendorName: e.target.value })}
                    className="input-premium h-10 w-full rounded-xl text-sm"
                  />
                </Field>
                <Field label="Driver name">
                  <input
                    value={t.driverName || ''}
                    onChange={(e) => update(i, { driverName: e.target.value })}
                    className="input-premium h-10 w-full rounded-xl text-sm"
                  />
                </Field>
                <Field label="Driver phone">
                  <input
                    value={t.driverPhone || ''}
                    onChange={(e) => update(i, { driverPhone: e.target.value })}
                    className="input-premium h-10 w-full rounded-xl text-sm"
                  />
                </Field>
                <Field label="Vendor contact person">
                  <input
                    value={t.contactPerson || ''}
                    onChange={(e) => update(i, { contactPerson: e.target.value })}
                    className="input-premium h-10 w-full rounded-xl text-sm"
                  />
                </Field>
                <Field label="Vendor WhatsApp">
                  <input
                    value={t.phone || ''}
                    onChange={(e) => update(i, { phone: e.target.value })}
                    className="input-premium h-10 w-full rounded-xl text-sm"
                  />
                </Field>
                <Field label="Vendor email">
                  <input
                    type="email"
                    value={t.email || ''}
                    onChange={(e) => update(i, { email: e.target.value })}
                    className="input-premium h-10 w-full rounded-xl text-sm"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Cab total price (internal)">
                  <input
                    type="number"
                    min="0"
                    value={numberInputValue(t.finalCost)}
                    onChange={(e) => update(i, { finalCost: parseOptionalNumber(e.target.value) })}
                    className="input-premium h-10 w-full rounded-xl text-sm font-bold"
                    placeholder="Full cab cost"
                  />
                </Field>
                <Field label="Advance to cab / vendor">
                  <input
                    type="number"
                    min="0"
                    value={numberInputValue(t.advancePaid)}
                    onChange={(e) => update(i, { advancePaid: parseOptionalNumber(e.target.value) })}
                    className="input-premium h-10 w-full rounded-xl text-sm font-bold text-amber-800"
                    placeholder="Advance amount"
                  />
                </Field>
                <div className="rounded-xl border border-subtle bg-white px-3 py-2 dark:bg-slate-900/60">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-content-muted">Balance to cab</p>
                  <p className="mt-1 text-lg font-black tabular-nums text-content-primary">{formatINR(balance)}</p>
                  <p className="text-[10px] text-content-muted">Total − advance</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-sky-500/20 bg-sky-500/[0.05] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-content-primary">
                    <Ticket className="h-3.5 w-3.5 text-sky-600" />
                    {t.voucherSentAt ? 'Cab confirmation sent' : 'Cab confirmation for vendor'}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-content-muted">
                    {(t.days || []).length ? `Days ${(t.days || []).join(', ')} · ` : ''}
                    {total ? `Total ${formatINR(total)} · Advance ${formatINR(advance)} · Balance ${formatINR(balance)} · ` : ''}
                    {t.email || t.phone || t.driverPhone || 'Add vendor email or WhatsApp'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {voucher?.pdfUrl ? (
                    <a
                      href={voucher.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-sky-500/30 px-3 text-xs font-semibold text-sky-700 hover:bg-sky-500/10"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </a>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5 border-sky-500/30"
                    disabled={!t._id || (!(t.email) && !(t.phone || t.driverPhone)) || saving || sendingVoucher === t._id}
                    onClick={() => onSendVoucher?.(t, i)}
                  >
                    {sendingVoucher === t._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {t.voucherSentAt ? 'Resend Confirmation' : 'Send for Confirmation'}
                  </Button>
                </div>
              </div>

              {bookingId ? (
                <OpsInternalNotesPanel
                  bookingId={bookingId}
                  scope="cab"
                  compact
                  transportAssignmentId={t._id}
                  title={`Vehicle #${i + 1} · internal notes`}
                  notes={t.internalNotes || []}
                  disabledReason={t._id ? '' : 'Save transport first, then add a note'}
                  onNotesSynced={({ transportAssignmentId, notes: nextNotes }) => {
                    if (!transportAssignmentId) return;
                    onChange(
                      transport.map((row) =>
                        String(row._id) === String(transportAssignmentId)
                          ? { ...row, internalNotes: nextNotes }
                          : row
                      )
                    );
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

export function BookingItineraryTimeline({
  itinerary, onChange, onSave, saving, onPdf, generatingPdf, pdfUrl,
  catalogHotels = [], catalogCabs = [],
}) {
  const update = (i, field, value) => {
    onChange(itinerary.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)));
  };

  const addDay = () => {
    onChange([...itinerary, {
      day: itinerary.length + 1,
      title: '',
      description: '',
      meals: '',
      accommodation: '',
      transport: '',
      activities: '',
      dayHotel: undefined,
      dayCab: undefined,
    }]);
  };

  const removeDay = (i) => onChange(itinerary.filter((_, idx) => idx !== i).map((d, idx) => ({ ...d, day: idx + 1 })));

  const updateDay = (i, nextDay) => {
    onChange(itinerary.map((d, idx) => (idx === i ? nextDay : d)));
  };

  return (
    <SectionShell
      gradient="from-cyan-500 to-teal-600"
      icon={Calendar}
      title="Day-wise Itinerary"
      subtitle="Same plan the executive shared with the customer — refine for operations"
      actions={(
        <>
          <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={addDay}>
            <Plus className="w-3.5 h-3.5" /> Add Day
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl gap-1" disabled={generatingPdf} onClick={onPdf}>
            {generatingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            PDF
          </Button>
          <Button variant="teal" size="sm" className="rounded-xl gap-1" disabled={saving} onClick={onSave}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </Button>
        </>
      )}
    >
      {pdfUrl && (
        <a href={pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline mb-4">
          <ExternalLink className="w-3 h-3" /> Open itinerary PDF
        </a>
      )}

      <div className="relative pl-2 sm:pl-4">
        <div className="absolute left-[1.15rem] sm:left-[1.65rem] top-3 bottom-3 w-0.5 bg-gradient-to-b from-teal-500/60 via-cyan-400/40 to-transparent rounded-full" />
        <div className="space-y-5">
          {itinerary.map((day, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative pl-10 sm:pl-12"
            >
              <div className="absolute left-0 top-1 w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-teal-500/30 z-10">
                {day.day || i + 1}
              </div>
              <div className="rounded-2xl border border-subtle/70 bg-white/50 dark:bg-surface-elevated/50 p-4 sm:p-5 space-y-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <input
                    value={day.title || ''}
                    onChange={(e) => update(i, 'title', e.target.value)}
                    placeholder="Day title"
                    className="flex-1 text-base font-bold bg-transparent border-none outline-none text-content-primary placeholder:text-content-muted"
                  />
                  {itinerary.length > 1 && (
                    <button type="button" onClick={() => removeDay(i)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <textarea
                  value={day.description || ''}
                  onChange={(e) => update(i, 'description', e.target.value)}
                  placeholder="Day overview & highlights..."
                  rows={2}
                  className="input-premium w-full rounded-xl text-sm resize-none"
                />
                <div className="space-y-3">
                  <DayHotelPicker
                    day={day}
                    catalogHotels={catalogHotels}
                    onChange={(next) => updateDay(i, next)}
                  />
                  <DayCabPicker
                    day={day}
                    catalogCabs={catalogCabs}
                    onChange={(next) => updateDay(i, next)}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { field: 'meals', icon: Utensils, placeholder: 'Meals (B/L/D)', color: 'text-amber-600' },
                      { field: 'activities', icon: Compass, placeholder: 'Activities & sightseeing', color: 'text-rose-600' },
                    ].map(({ field, icon: Icon, placeholder, color }) => (
                      <div key={field} className="flex items-center gap-2 rounded-xl border border-subtle/60 bg-surface/60 px-3 py-2">
                        <Icon className={cn('w-3.5 h-3.5 shrink-0', color)} />
                        <input
                          value={day[field] || ''}
                          onChange={(e) => update(i, field, e.target.value)}
                          placeholder={placeholder}
                          className="flex-1 bg-transparent text-xs outline-none placeholder:text-content-muted"
                        />
                      </div>
                    ))}
                  </div>
                  {(day.accommodation || day.transport) && (
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      {day.accommodation && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-500/10 text-teal-700">
                          <Hotel className="w-3 h-3" /> {day.accommodation}
                        </span>
                      )}
                      {day.transport && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/10 text-violet-700">
                          <Bus className="w-3 h-3" /> {day.transport}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {day.date && (
                  <p className="text-[10px] text-content-muted flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {formatDate(day.date)}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

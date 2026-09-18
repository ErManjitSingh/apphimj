import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BedDouble,
  Building2,
  Check,
  ImageIcon,
  MapPin,
  Plus,
  Save,
  Star,
  Sun,
  Snowflake,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { HOTEL_CATEGORIES, MEAL_PLANS } from '../components/quotations/constants';
import { formatINR } from '../components/quotations/quotationUtils';
import { cn } from '../lib/utils';

const MEAL_RATE_KEYS = [
  { key: 'ep', label: 'EP', hint: 'Room only' },
  { key: 'cp', label: 'CP', hint: 'Breakfast' },
  { key: 'map', label: 'MAP', hint: 'Breakfast + Dinner' },
];

function emptyMealRates() {
  return { ep: '', cp: '', map: '', ap: '' };
}

function normalizeMealRates(raw = {}, fallback = {}) {
  const pick = (key) => {
    const value = raw?.[key] ?? fallback?.[key];
    if (value === '' || value == null) return '';
    return String(value);
  };
  return {
    ep: pick('ep'),
    cp: pick('cp'),
    map: pick('map'),
    ap: pick('ap'),
  };
}

function mealRatesToNumbers(raw = {}) {
  return {
    ep: Number(raw.ep) || 0,
    cp: Number(raw.cp) || 0,
    map: Number(raw.map) || 0,
    ap: Number(raw.ap) || 0,
  };
}

function primaryRateFromRoom(room = {}) {
  const on = room.rates?.onSeason || {};
  const flat = room.rates || {};
  return (
    Number(on.map) ||
    Number(on.cp) ||
    Number(on.ep) ||
    Number(flat.map) ||
    Number(flat.cp) ||
    Number(flat.ep) ||
    Number(room.baseRate) ||
    0
  );
}

function emptyRoomRow() {
  return {
    name: '',
    maxOccupancy: '2',
    baseRate: '',
    mealPlan: 'MAP',
    bedType: 'Double',
    rates: {
      ep: '',
      cp: '',
      map: '',
      ap: '',
      onSeason: emptyMealRates(),
      offSeason: emptyMealRates(),
    },
    extraBedRate: '',
    images: [],
  };
}

function hotelBasePath() {
  return '/hotel-control';
}

function hotelToForm(hotel) {
  const rooms = Array.isArray(hotel?.roomTypes) ? hotel.roomTypes.filter((r) => r?.name) : [];
  const fallbackRooms = rooms.length
    ? rooms
    : hotel?.roomType
      ? [
          {
            name: hotel.roomType,
            maxOccupancy: 2,
            baseRate: hotel.absolutePerNight || hotel.price || 0,
            mealPlan: hotel.mealPlan || 'MAP',
            bedType: '',
            rates: {
              map: hotel.absolutePerNight || hotel.price || 0,
            },
          },
        ]
      : [emptyRoomRow()];

  return {
    name: hotel?.name || '',
    destination: hotel?.destination || hotel?.displayCity || '',
    location: hotel?.location || hotel?.destination || '',
    category: hotel?.category || '4 Star',
    starRating: String(hotel?.starRating || (String(hotel?.category || '').match(/(\d)/)?.[1]) || '4'),
    roomType: hotel?.roomType || fallbackRooms[0]?.name || 'Deluxe',
    mealPlan: hotel?.mealPlan || 'MAP (Breakfast + Dinner)',
    price: String(hotel?.displayPrice ?? hotel?.absolutePerNight ?? hotel?.price ?? ''),
    coverImage: hotel?.coverImage || hotel?.images?.[0] || '',
    amenities: Array.isArray(hotel?.amenities) ? hotel.amenities.join(', ') : '',
    status: hotel?.status || 'active',
    specialNotes: hotel?.specialNotes || '',
    phone: hotel?.phone || '',
    email: hotel?.email || '',
    address: hotel?.address || '',
    contactPerson: hotel?.contactPerson || '',
    roomTypes: fallbackRooms.map((room) => {
      const flat = normalizeMealRates(room.rates || {}, {
        map: room.baseRate || hotel?.absolutePerNight || hotel?.price || '',
      });
      const onSeason = normalizeMealRates(room.rates?.onSeason, flat);
      const offRaw = room.rates?.offSeason;
      const hasOffSeason =
        offRaw &&
        typeof offRaw === 'object' &&
        ['ep', 'cp', 'map', 'ap'].some((k) => Number(offRaw[k]) > 0);
      const offSeason = hasOffSeason ? normalizeMealRates(offRaw) : emptyMealRates();
      const baseRate =
        onSeason.map ||
        onSeason.cp ||
        onSeason.ep ||
        flat.map ||
        flat.cp ||
        flat.ep ||
        String(room.baseRate || '');
      return {
        name: room.name || '',
        maxOccupancy: String(room.maxOccupancy || 2),
        baseRate: String(baseRate || ''),
        mealPlan: room.mealPlan || 'MAP',
        bedType: room.bedType || '',
        rates: {
          ...flat,
          onSeason,
          offSeason,
        },
        extraBedRate: String(room.extraBedRate || ''),
        images: Array.isArray(room.images) ? room.images.filter(Boolean) : [],
        sourceRoomId: room.sourceRoomId || null,
      };
    }),
  };
}

const EMPTY_FORM = hotelToForm(null);

function Field({ label, children, className = '', hint = '' }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[10px] text-slate-400">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100';

const rateInputClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm tabular-nums text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-orange-300 focus:ring-2 focus:ring-orange-100';

export default function HotelEditPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { user } = useAuth();
  const base = hotelBasePath();
  const canSave = user?.role === 'admin' || user?.role === 'sales_manager';

  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingKey, setUploadingKey] = useState('');

  const loadHotel = useCallback(async () => {
    if (isNew) {
      setForm(EMPTY_FORM);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await API.get(`/hotels/${id}`, { skipErrorToast: true });
      setForm(hotelToForm(res.data));
    } catch {
      setError('Hotel not found or failed to load.');
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    loadHotel();
  }, [loadHotel]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateRoom = (index, patch) => {
    setForm((prev) => {
      const roomTypes = [...(prev.roomTypes || [])];
      roomTypes[index] = { ...roomTypes[index], ...patch };
      return {
        ...prev,
        roomTypes,
        roomType: roomTypes[0]?.name || prev.roomType,
      };
    });
  };

  const updateRoomSeasonRate = (index, season, mealKey, value) => {
    setForm((prev) => {
      const roomTypes = [...(prev.roomTypes || [])];
      const room = { ...(roomTypes[index] || emptyRoomRow()) };
      const rates = {
        ...(room.rates || {}),
        onSeason: { ...(room.rates?.onSeason || emptyMealRates()) },
        offSeason: { ...(room.rates?.offSeason || emptyMealRates()) },
      };
      rates[season] = { ...rates[season], [mealKey]: value };
      if (season === 'onSeason') {
        rates[mealKey] = value;
      }
      const nextBase =
        rates.onSeason.map ||
        rates.onSeason.cp ||
        rates.onSeason.ep ||
        rates.map ||
        rates.cp ||
        rates.ep ||
        room.baseRate ||
        '';
      roomTypes[index] = {
        ...room,
        rates,
        baseRate: String(nextBase),
      };
      return { ...prev, roomTypes };
    });
  };

  const uploadImageFile = async (file, key) => {
    if (!file) return null;
    if (file.size > 8 * 1024 * 1024) {
      setError('Image must be under 8 MB');
      return null;
    }
    setUploadingKey(key);
    setError('');
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      const res = await API.post('/hotels/upload-image', {
        base64,
        name: file.name,
        hotelId: isNew ? 'new' : id,
      });
      return res.data?.url || null;
    } catch {
      setError('Image upload failed. Please try again.');
      return null;
    } finally {
      setUploadingKey('');
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const url = await uploadImageFile(file, 'cover');
    if (url) setField('coverImage', url);
  };

  const handleRoomUpload = async (index, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const url = await uploadImageFile(file, `room-${index}`);
    if (!url) return;
    setForm((prev) => {
      const roomTypes = [...(prev.roomTypes || [])];
      const room = { ...(roomTypes[index] || emptyRoomRow()) };
      const rest = (room.images || []).slice(1);
      roomTypes[index] = { ...room, images: [url, ...rest] };
      return { ...prev, roomTypes };
    });
  };

  const previewImage = form.coverImage;
  const roomCount = (form.roomTypes || []).filter((r) => r.name?.trim()).length;
  const lowestRate = useMemo(() => {
    const rates = (form.roomTypes || [])
      .map((r) => primaryRateFromRoom(r))
      .filter((n) => n > 0);
    return rates.length ? Math.min(...rates) : Number(form.price) || 0;
  }, [form.roomTypes, form.price]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError('');
    const amenities = String(form.amenities || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const roomTypes = (form.roomTypes || [])
      .map((room) => {
        const onSeason = mealRatesToNumbers(room.rates?.onSeason);
        const offSeason = mealRatesToNumbers(room.rates?.offSeason);
        const flat = {
          ep: onSeason.ep || Number(room.rates?.ep) || 0,
          cp: onSeason.cp || Number(room.rates?.cp) || 0,
          map: onSeason.map || Number(room.rates?.map) || 0,
          ap: onSeason.ap || Number(room.rates?.ap) || 0,
        };
        const baseRate = flat.map || flat.cp || flat.ep || Number(room.baseRate) || 0;
        return {
          name: String(room.name || '').trim(),
          maxOccupancy: Number(room.maxOccupancy) || 2,
          baseRate,
          mealPlan: String(room.mealPlan || '').trim() || 'MAP',
          bedType: String(room.bedType || '').trim(),
          rates: {
            ...flat,
            onSeason,
            offSeason,
          },
          extraBedRate: Number(room.extraBedRate) || 0,
          images: Array.isArray(room.images) ? room.images.filter(Boolean) : [],
          sourceRoomId: room.sourceRoomId || null,
        };
      })
      .filter((room) => room.name);
    const primaryRate = roomTypes[0]?.baseRate || Number(form.price) || 0;
    const payload = {
      name: form.name.trim(),
      destination: form.destination.trim(),
      location: form.location.trim() || form.destination.trim(),
      address: form.address.trim(),
      category: form.category,
      starRating: Number(form.starRating) || 0,
      roomType: form.roomType || roomTypes[0]?.name || 'Standard',
      mealPlan: form.mealPlan,
      price: primaryRate,
      absolutePerNight: primaryRate,
      coverImage: form.coverImage.trim(),
      images: form.coverImage.trim() ? [form.coverImage.trim()] : [],
      amenities,
      roomTypes,
      phone: form.phone.trim(),
      email: form.email.trim(),
      contactPerson: form.contactPerson.trim(),
      status: form.status || 'active',
      specialNotes: form.specialNotes || '',
    };
    if (isNew) payload.sourceType = 'manual';

    try {
      if (isNew) {
        const res = await API.post('/hotels', payload);
        navigate(`${base}/${res.data._id}/edit`, { replace: true });
      } else {
        await API.put(`/hotels/${id}`, payload);
        await loadHotel();
      }
    } catch {
      setError('Could not save hotel. Please check the fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="pb-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to={base}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-orange-500">
              Hotel Control
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isNew ? 'Add Hotel' : 'Edit Hotel'}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={base}
            className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>
          {canSave ? (
            <button
              type="submit"
              form="hotel-edit-form"
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : isNew ? 'Create Hotel' : 'Save Changes'}
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <form id="hotel-edit-form" onSubmit={handleSubmit} className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">Basic details</h2>
              <p className="mt-0.5 text-xs text-slate-500">Name, category, status and cover photo</p>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <Field label="Hotel name *" className="sm:col-span-2">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className={inputClass}
                  placeholder="Snow Peak Resort"
                />
              </Field>
              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) => setField('category', e.target.value)}
                  className={inputClass}
                >
                  {HOTEL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Star rating">
                <select
                  value={form.starRating}
                  onChange={(e) => setField('starRating', e.target.value)}
                  className={inputClass}
                >
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={String(n)}>
                      {n === 0 ? 'Not set' : `${n} Star`}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Default meal plan">
                <select
                  value={form.mealPlan}
                  onChange={(e) => setField('mealPlan', e.target.value)}
                  className={inputClass}
                >
                  {MEAL_PLANS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value)}
                  className={inputClass}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
              <Field label="Cover photo" className="sm:col-span-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={form.coverImage}
                    onChange={(e) => setField('coverImage', e.target.value)}
                    className={inputClass}
                    placeholder="https://... or upload below"
                  />
                  <label className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <Upload className="h-4 w-4" />
                    {uploadingKey === 'cover' ? 'Uploading…' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={!!uploadingKey}
                      onChange={handleCoverUpload}
                    />
                  </label>
                </div>
              </Field>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">Location & contact</h2>
              <p className="mt-0.5 text-xs text-slate-500">Where guests stay and how to reach the property</p>
            </div>
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <Field label="Destination">
                <input
                  value={form.destination}
                  onChange={(e) => setField('destination', e.target.value)}
                  className={inputClass}
                  placeholder="Manali"
                />
              </Field>
              <Field label="Location *">
                <input
                  required
                  value={form.location}
                  onChange={(e) => setField('location', e.target.value)}
                  className={inputClass}
                  placeholder="Near Mall Road"
                />
              </Field>
              <Field label="Full address" className="sm:col-span-2">
                <input
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  className={inputClass}
                  placeholder="Street, landmark, city"
                />
              </Field>
              <Field label="Contact person">
                <input
                  value={form.contactPerson}
                  onChange={(e) => setField('contactPerson', e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Phone">
                <input
                  value={form.phone}
                  onChange={(e) => setField('phone', e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Email" className="sm:col-span-2">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField('email', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Room categories & rates</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  On-season and off-season prices for EP, CP and MAP — every room
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    roomTypes: [...(prev.roomTypes || []), emptyRoomRow()],
                  }))
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-600 transition hover:bg-orange-100"
              >
                <Plus className="h-3.5 w-3.5" />
                Add room category
              </button>
            </div>
            <div className="space-y-4 p-5">
              {(form.roomTypes || []).map((room, index) => (
                <div
                  key={`room-${index}`}
                  className="overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 via-white to-orange-50/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white/80 px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {room.images?.[0] ? (
                        <img
                          src={room.images[0]}
                          alt={room.name || 'Room'}
                          className="h-12 w-14 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                        />
                      ) : (
                        <span className="flex h-12 w-14 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                          <BedDouble className="h-4 w-4" />
                        </span>
                      )}
                      <p className="truncate text-sm font-bold text-slate-800">
                        {room.name?.trim() || `Room category ${index + 1}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => {
                          const next = (prev.roomTypes || []).filter((_, i) => i !== index);
                          return {
                            ...prev,
                            roomTypes: next.length ? next : [emptyRoomRow()],
                            roomType: next[0]?.name || prev.roomType,
                          };
                        })
                      }
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 text-rose-500 hover:bg-rose-50"
                      aria-label="Remove room"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Category name" className="lg:col-span-2">
                      <input
                        value={room.name}
                        onChange={(e) => updateRoom(index, { name: e.target.value })}
                        className={inputClass}
                        placeholder="Superior Room"
                      />
                    </Field>
                    <Field label="Max occupancy">
                      <input
                        type="number"
                        min={1}
                        value={room.maxOccupancy}
                        onChange={(e) => updateRoom(index, { maxOccupancy: e.target.value })}
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Bed type">
                      <input
                        value={room.bedType}
                        onChange={(e) => updateRoom(index, { bedType: e.target.value })}
                        className={inputClass}
                        placeholder="Double"
                      />
                    </Field>
                    <Field label="Mattress / extra bed" hint="₹ per night">
                      <input
                        type="number"
                        min={0}
                        value={room.extraBedRate}
                        onChange={(e) => updateRoom(index, { extraBedRate: e.target.value })}
                        className={inputClass}
                        placeholder="0"
                      />
                    </Field>
                    <Field label="Room photo" className="sm:col-span-2 lg:col-span-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          value={room.images?.[0] || ''}
                          onChange={(e) => {
                            const url = e.target.value.trim();
                            const rest = (room.images || []).slice(1);
                            updateRoom(index, { images: url ? [url, ...rest] : rest });
                          }}
                          className={inputClass}
                          placeholder="https://... or upload"
                        />
                        <label className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-semibold text-orange-700 hover:bg-orange-100">
                          <Upload className="h-4 w-4" />
                          {uploadingKey === `room-${index}` ? 'Uploading…' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={!!uploadingKey}
                            onChange={(e) => handleRoomUpload(index, e)}
                          />
                        </label>
                      </div>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-3 px-4 pb-4 lg:grid-cols-2">
                    {[
                      {
                        season: 'onSeason',
                        title: 'On season',
                        subtitle: 'Peak / high season nightly rates',
                        icon: Sun,
                        tone: 'border-amber-100 bg-amber-50/50',
                        badge: 'bg-amber-100 text-amber-700',
                      },
                      {
                        season: 'offSeason',
                        title: 'Off season',
                        subtitle: 'Lean / low season nightly rates',
                        icon: Snowflake,
                        tone: 'border-sky-100 bg-sky-50/50',
                        badge: 'bg-sky-100 text-sky-700',
                      },
                    ].map((block) => {
                      const Icon = block.icon;
                      const seasonRates = room.rates?.[block.season] || emptyMealRates();
                      return (
                        <div
                          key={block.season}
                          className={cn('rounded-2xl border p-3.5', block.tone)}
                        >
                          <div className="mb-3 flex items-start justify-between gap-2">
                            <div>
                              <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                                <Icon className="h-4 w-4" />
                                {block.title}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-500">{block.subtitle}</p>
                            </div>
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                                block.badge
                              )}
                            >
                              ₹ / night
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {MEAL_RATE_KEYS.map((meal) => (
                              <Field
                                key={`${block.season}-${meal.key}`}
                                label={meal.label}
                                hint={meal.hint}
                              >
                                <input
                                  type="number"
                                  min={0}
                                  value={seasonRates[meal.key] ?? ''}
                                  onChange={(e) =>
                                    updateRoomSeasonRate(
                                      index,
                                      block.season,
                                      meal.key,
                                      e.target.value
                                    )
                                  }
                                  className={rateInputClass}
                                  placeholder="0"
                                />
                              </Field>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">Amenities & notes</h2>
            </div>
            <div className="space-y-4 p-5">
              <Field label="Amenities (comma separated)">
                <input
                  value={form.amenities}
                  onChange={(e) => setField('amenities', e.target.value)}
                  className={inputClass}
                  placeholder="Free WiFi, Parking, Restaurant, Spa"
                />
              </Field>
              <Field label="Special notes">
                <textarea
                  value={form.specialNotes}
                  onChange={(e) => setField('specialNotes', e.target.value)}
                  rows={4}
                  className={cn(inputClass, 'h-auto py-3')}
                  placeholder="Check-in tips, seasonal notes, inclusions..."
                />
              </Field>
            </div>
          </section>
        </form>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="relative h-48 bg-slate-100">
              {previewImage ? (
                <img src={previewImage} alt={form.name || 'Hotel'} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-300">
                  <ImageIcon className="h-10 w-10" />
                  <p className="text-xs font-medium">Cover preview</p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent px-4 pb-4 pt-10">
                <h3 className="truncate text-lg font-bold text-white">
                  {form.name?.trim() || 'Hotel name'}
                </h3>
                <p className="mt-1 flex items-center gap-1 truncate text-sm text-white/80">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {form.destination || form.location || 'Destination'}
                </p>
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  {form.starRating && form.starRating !== '0' ? `${form.starRating} Star` : 'Unrated'}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase',
                    form.status === 'inactive'
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-emerald-50 text-emerald-700'
                  )}
                >
                  {form.status === 'inactive' ? 'Inactive' : 'Active'}
                </span>
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  From (on season MAP)
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
                  {formatINR(lowestRate)}
                  <span className="ml-1 text-sm font-medium text-slate-400">/ night</span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-100 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Rooms</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                    <BedDouble className="h-3.5 w-3.5 text-orange-500" />
                    {roomCount}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Category</p>
                  <p className="mt-1 flex items-center gap-1.5 truncate text-sm font-bold text-slate-800">
                    <Building2 className="h-3.5 w-3.5 text-sky-500" />
                    {form.category || 'Hotel'}
                  </p>
                </div>
              </div>
              {(form.roomTypes || []).filter((r) => r.name?.trim()).length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Rate snapshot
                  </p>
                  {(form.roomTypes || [])
                    .filter((r) => r.name?.trim())
                    .slice(0, 4)
                    .map((room) => {
                      const on = room.rates?.onSeason || {};
                      const off = room.rates?.offSeason || {};
                      return (
                        <div
                          key={room.name}
                          className="rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2"
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <span className="truncate text-[12px] font-semibold text-slate-700">
                              {room.name}
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-400">
                              <Users className="h-3 w-3" />
                              {room.maxOccupancy || 2}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                            <div className="rounded-lg bg-amber-50 px-2 py-1.5 text-amber-800">
                              <p className="font-bold uppercase tracking-wide opacity-70">On</p>
                              <p className="mt-0.5 tabular-nums">
                                MAP {formatINR(Number(on.map) || 0)}
                              </p>
                              <p className="tabular-nums opacity-80">
                                CP {formatINR(Number(on.cp) || 0)} · EP{' '}
                                {formatINR(Number(on.ep) || 0)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-sky-50 px-2 py-1.5 text-sky-800">
                              <p className="font-bold uppercase tracking-wide opacity-70">Off</p>
                              <p className="mt-0.5 tabular-nums">
                                MAP {formatINR(Number(off.map) || 0)}
                              </p>
                              <p className="tabular-nums opacity-80">
                                CP {formatINR(Number(off.cp) || 0)} · EP{' '}
                                {formatINR(Number(off.ep) || 0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : null}
              {canSave ? (
                <button
                  type="submit"
                  form="hotel-edit-form"
                  disabled={saving}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-semibold text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-60"
                >
                  {saving ? (
                    'Saving...'
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {isNew ? 'Create Hotel' : 'Save Changes'}
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
}

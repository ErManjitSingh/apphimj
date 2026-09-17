import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, ImageIcon, Plus, RefreshCw, Search, Star, X } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../lib/permissions';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { Button } from '../components/ui/button';
import AppModal from '../components/ui/AppModal';
import { HOTEL_CATEGORIES, MEAL_PLANS } from '../components/quotations/constants';
import { formatINR } from '../components/quotations/quotationUtils';
import { cn } from '../lib/utils';

const EMPTY_FORM = {
  name: '',
  destination: '',
  location: '',
  category: '4 Star',
  roomType: 'Standard',
  mealPlan: 'MAP',
  price: '',
  coverImage: '',
  status: 'active',
};

function HotelCard({ hotel }) {
  const image = hotel.coverImage || hotel.images?.[0] || '';
  const price = hotel.displayPrice ?? hotel.absolutePerNight ?? hotel.price ?? 0;
  const stars = Math.round(Number(hotel.starRating) || 0);

  return (
    <article className="overflow-hidden rounded-2xl border border-subtle bg-white shadow-sm">
      <div className="relative h-36 bg-slate-100">
        {image ? (
          <img src={image} alt={hotel.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        {stars > 0 && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-semibold text-white">
            <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
            {stars}
          </span>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div>
          <h3 className="truncate text-sm font-bold text-content-primary">{hotel.name}</h3>
          <p className="truncate text-xs text-content-muted">
            {hotel.displayCity || hotel.destination || hotel.location || '—'}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {hotel.category || 'Hotel'}
          </span>
          <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
            {hotel.roomType || 'Standard'}
          </span>
          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            {hotel.mealPlan || 'MAP'}
          </span>
        </div>
        <div className="flex items-end justify-between pt-1">
          <div>
            <p className="text-base font-bold tabular-nums text-emerald-600">{formatINR(price)}</p>
            <p className="text-[10px] text-content-muted">Per night</p>
          </div>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
              hotel.status === 'inactive'
                ? 'bg-slate-100 text-slate-500'
                : 'bg-emerald-50 text-emerald-700'
            )}
          >
            {hotel.status || 'active'}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function HotelControlPage() {
  const { user } = useAuth();
  const canCreate = canAccess(user, 'packages', 'create') || canAccess(user, 'operations', 'create');
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const fetchHotels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/hotels', {
        params: { search: debouncedSearch || undefined },
        skipErrorToast: true,
      });
      setHotels(Array.isArray(res.data) ? res.data : []);
    } catch {
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  const destinations = useMemo(() => {
    const set = new Set();
    hotels.forEach((h) => {
      const d = h.destination || h.displayCity;
      if (d) set.add(d);
    });
    return [...set].sort();
  }, [hotels]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post('/hotels', {
        ...form,
        price: Number(form.price) || 0,
        absolutePerNight: Number(form.price) || 0,
        images: form.coverImage ? [form.coverImage] : [],
        sourceType: 'manual',
      });
      setModalOpen(false);
      setForm(EMPTY_FORM);
      fetchHotels();
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <Building2 className="h-7 w-7 text-sky-600" />
            <h1 className="text-2xl font-bold text-content-primary">Hotel Control</h1>
            <span className="rounded-lg bg-sky-100 px-2.5 py-1 text-sm font-bold text-sky-700">
              {hotels.length}
            </span>
          </div>
          <p className="text-sm text-content-muted">
            Hotels saved from packages (with price & photos) plus hotels you add yourself
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fetchHotels}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-subtle px-4 py-2 text-sm font-medium text-content-secondary hover:bg-surface-elevated disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {canCreate && (
            <Button
              type="button"
              onClick={() => {
                setForm(EMPTY_FORM);
                setModalOpen(true);
              }}
              className="rounded-xl gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Hotel
            </Button>
          )}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hotel, destination, meal plan..."
            className="input-premium h-10 w-full rounded-xl pl-10 text-sm"
          />
        </div>
        {destinations.length > 0 && (
          <p className="self-center text-xs text-content-muted">
            {destinations.length} destinations in inventory
          </p>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-subtle bg-surface-elevated/50" />
          ))}
        </div>
      ) : hotels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-subtle p-16 text-center">
          <Building2 className="mx-auto mb-3 h-12 w-12 text-content-muted" />
          <p className="text-content-muted">No hotels saved yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {hotels.map((hotel) => (
            <HotelCard key={hotel._id} hotel={hotel} />
          ))}
        </div>
      )}

      <AppModal open={modalOpen} onClose={() => setModalOpen(false)} size="lg" className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-content-primary">Add Hotel</h3>
          <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 hover:bg-surface-elevated">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-content-muted">Hotel Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-premium h-11 w-full rounded-xl"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-content-muted">Destination</label>
            <input
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              className="input-premium h-11 w-full rounded-xl"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-content-muted">Location *</label>
            <input
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="input-premium h-11 w-full rounded-xl"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-content-muted">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input-premium h-11 w-full rounded-xl"
            >
              {HOTEL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-content-muted">Room Type</label>
            <input
              value={form.roomType}
              onChange={(e) => setForm({ ...form, roomType: e.target.value })}
              className="input-premium h-11 w-full rounded-xl"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-content-muted">Meal Plan</label>
            <select
              value={form.mealPlan}
              onChange={(e) => setForm({ ...form, mealPlan: e.target.value })}
              className="input-premium h-11 w-full rounded-xl"
            >
              {MEAL_PLANS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-content-muted">Price / Night (₹)</label>
            <input
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="input-premium h-11 w-full rounded-xl"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-content-muted">Photo URL</label>
            <input
              value={form.coverImage}
              onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
              placeholder="https://..."
              className="input-premium h-11 w-full rounded-xl"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Hotel'}
            </Button>
          </div>
        </form>
      </AppModal>
    </motion.div>
  );
}

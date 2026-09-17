import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BedDouble,
  Building2,
  Clock3,
  Heart,
  ImageIcon,
  LayoutGrid,
  List,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Upload,
  Wifi,
  Car,
  UtensilsCrossed,
  Waves,
  Coffee,
  Mountain,
  X,
} from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../lib/permissions';
import { Button } from '../components/ui/button';
import AppModal from '../components/ui/AppModal';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { HOTEL_CATEGORIES, MEAL_PLANS } from '../components/quotations/constants';
import { formatINR } from '../components/quotations/quotationUtils';
import { cn } from '../lib/utils';

const EMPTY_FORM = {
  name: '',
  destination: '',
  location: '',
  category: '4 Star',
  starRating: '4',
  roomType: 'Deluxe',
  mealPlan: 'MAP (Breakfast + Dinner)',
  price: '',
  coverImage: '',
  amenities: '',
  status: 'active',
  specialNotes: '',
};

const AMENITY_ICONS = [
  { match: /wifi|wi-fi/i, icon: Wifi, label: 'Free WiFi' },
  { match: /park/i, icon: Car, label: 'Parking' },
  { match: /restaurant|dining/i, icon: UtensilsCrossed, label: 'Restaurant' },
  { match: /spa|pool/i, icon: Waves, label: 'Spa' },
  { match: /breakfast|cp|map|ap/i, icon: Coffee, label: 'Breakfast' },
  { match: /mountain|view/i, icon: Mountain, label: 'Mountain View' },
];

function hotelStars(hotel) {
  const fromField = Number(hotel.starRating);
  if (fromField > 0) return fromField;
  const match = String(hotel.category || '').match(/(\d)/);
  return match ? Number(match[1]) : 0;
}

function hotelPrice(hotel) {
  return Number(hotel.displayPrice ?? hotel.absolutePerNight ?? hotel.price ?? 0);
}

function hotelImage(hotel) {
  return hotel.coverImage || hotel.images?.[0] || '';
}

function hotelCity(hotel) {
  return hotel.displayCity || hotel.destination || hotel.location || '—';
}

function shortMeal(plan = '') {
  const raw = String(plan);
  if (/^MAP/i.test(raw)) return 'MAP';
  if (/^CP/i.test(raw)) return 'CP';
  if (/^AP/i.test(raw)) return 'AP';
  if (/^EP/i.test(raw)) return 'EP';
  return raw.split('(')[0].trim() || 'Hotel';
}

function AmenityRow({ amenities = [] }) {
  const list = Array.isArray(amenities) ? amenities.filter(Boolean) : [];
  const resolved =
    list.length > 0
      ? list.slice(0, 4).map((item) => {
          const found = AMENITY_ICONS.find((a) => a.match.test(item));
          return {
            key: item,
            icon: found?.icon || Wifi,
            label: item,
          };
        })
      : AMENITY_ICONS.slice(0, 3).map((a) => ({
          key: a.label,
          icon: a.icon,
          label: a.label,
        }));

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {resolved.map(({ key, icon: Icon, label }) => (
        <span key={key} className="inline-flex items-center gap-1 text-[10px] text-slate-500">
          <Icon className="h-3 w-3" />
          {label}
        </span>
      ))}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, hint }) {
  const tones = {
    blue: 'bg-sky-50 text-sky-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    orange: 'bg-orange-50 text-orange-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
          {hint ? <p className="mt-1 text-[11px] font-medium text-emerald-500">{hint}</p> : null}
        </div>
        <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tones[tone] || tones.blue)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function HotelCard({ hotel, onEdit, onToggleStatus, onDelete, canEdit, canDelete, favorited, onToggleFavorite }) {
  const image = hotelImage(hotel);
  const price = hotelPrice(hotel);
  const stars = hotelStars(hotel);
  const active = hotel.status !== 'inactive';

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative h-44 bg-slate-100">
        {image ? (
          <img src={image} alt={hotel.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <ImageIcon className="h-12 w-12" />
          </div>
        )}
        {stars > 0 && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-1 text-[11px] font-bold text-white shadow">
            <Star className="h-3 w-3 fill-white text-white" />
            {stars % 1 === 0 ? stars.toFixed(1) : stars}
          </span>
        )}
        <button
          type="button"
          onClick={() => onToggleFavorite?.(hotel._id)}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow-sm transition hover:text-rose-500"
          aria-label="Favorite"
        >
          <Heart className={cn('h-4 w-4', favorited && 'fill-rose-500 text-rose-500')} />
        </button>
        <span
          className={cn(
            'absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
            active ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
          )}
        >
          {active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="truncate text-[15px] font-bold text-slate-900">{hotel.name}</h3>
          <p className="mt-1 flex items-center gap-1 truncate text-[12px] text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-400" />
            {hotelCity(hotel)}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
            {hotel.category || 'Hotel'}
          </span>
          <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
            {hotel.roomType || 'Deluxe'}
          </span>
          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            {shortMeal(hotel.mealPlan)}
          </span>
        </div>

        <AmenityRow amenities={hotel.amenities} />

        <div className="flex items-end justify-between gap-2 pt-1">
          <div>
            <p className="text-lg font-bold tabular-nums text-emerald-600">{formatINR(price)}</p>
            <p className="text-[11px] text-slate-400">Per night</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(hotel)}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-orange-500 text-sm font-semibold text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600"
          >
            <Pencil className="h-3.5 w-3.5" />
            View / Edit
          </button>
          <DropdownMenuRoot>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                aria-label="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onSelect={() => onEdit(hotel)}>
                <Pencil className="h-4 w-4" />
                Edit hotel
              </DropdownMenuItem>
              {canEdit ? (
                <DropdownMenuItem onSelect={() => onToggleStatus(hotel)}>
                  <Clock3 className="h-4 w-4" />
                  Mark {active ? 'inactive' : 'active'}
                </DropdownMenuItem>
              ) : null}
              {canDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-rose-600 focus:text-rose-600"
                    onSelect={() => onDelete(hotel)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenuRoot>
        </div>
      </div>
    </article>
  );
}

function HotelFormModal({ open, onClose, form, setForm, onSubmit, saving, isEdit }) {
  return (
    <AppModal open={open} onClose={onClose} size="lg" className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">{isEdit ? 'Edit Hotel' : 'Add Hotel'}</h3>
          <p className="text-xs text-slate-500">Prices, photos, amenities and inventory status</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">Hotel Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input-premium h-11 w-full rounded-xl"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Destination</label>
          <input
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            className="input-premium h-11 w-full rounded-xl"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Location *</label>
          <input
            required
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            className="input-premium h-11 w-full rounded-xl"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
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
          <label className="mb-1 block text-xs font-medium text-slate-500">Star Rating</label>
          <select
            value={form.starRating}
            onChange={(e) => setForm({ ...form, starRating: e.target.value })}
            className="input-premium h-11 w-full rounded-xl"
          >
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={String(n)}>
                {n === 0 ? 'Not set' : `${n} Star`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Room Type</label>
          <input
            value={form.roomType}
            onChange={(e) => setForm({ ...form, roomType: e.target.value })}
            className="input-premium h-11 w-full rounded-xl"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Meal Plan</label>
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
          <label className="mb-1 block text-xs font-medium text-slate-500">Price / Night (₹)</label>
          <input
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="input-premium h-11 w-full rounded-xl"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="input-premium h-11 w-full rounded-xl"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">Photo URL</label>
          <input
            value={form.coverImage}
            onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
            placeholder="https://..."
            className="input-premium h-11 w-full rounded-xl"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Amenities (comma separated)
          </label>
          <input
            value={form.amenities}
            onChange={(e) => setForm({ ...form, amenities: e.target.value })}
            placeholder="Free WiFi, Parking, Restaurant"
            className="input-premium h-11 w-full rounded-xl"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">Notes</label>
          <textarea
            value={form.specialNotes}
            onChange={(e) => setForm({ ...form, specialNotes: e.target.value })}
            rows={2}
            className="input-premium w-full rounded-xl py-2"
          />
        </div>
        <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600">
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Hotel'}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}

function hotelToForm(hotel) {
  return {
    name: hotel.name || '',
    destination: hotel.destination || hotel.displayCity || '',
    location: hotel.location || hotel.destination || '',
    category: hotel.category || '4 Star',
    starRating: String(hotelStars(hotel) || 0),
    roomType: hotel.roomType || 'Deluxe',
    mealPlan: hotel.mealPlan || 'MAP (Breakfast + Dinner)',
    price: String(hotelPrice(hotel) || ''),
    coverImage: hotelImage(hotel),
    amenities: Array.isArray(hotel.amenities) ? hotel.amenities.join(', ') : '',
    status: hotel.status || 'active',
    specialNotes: hotel.specialNotes || '',
  };
}

export default function HotelControlPage() {
  const { user } = useAuth();
  const canCreate = canAccess(user, 'packages', 'create') || canAccess(user, 'operations', 'create') || user?.role === 'admin';
  const canEdit = canAccess(user, 'packages', 'edit') || canAccess(user, 'operations', 'edit') || user?.role === 'admin';
  const canDelete = canAccess(user, 'packages', 'delete') || canAccess(user, 'operations', 'delete') || user?.role === 'admin';
  const canImport = user?.role === 'admin' || canCreate;

  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [destination, setDestination] = useState('');
  const [starFilter, setStarFilter] = useState('');
  const [mealFilter, setMealFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [applied, setApplied] = useState({
    search: '',
    destination: '',
    star: '',
    meal: '',
    status: '',
  });
  const [sortBy, setSortBy] = useState('latest');
  const [viewMode, setViewMode] = useState('grid');
  const [favorites, setFavorites] = useState(() => new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchHotels = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/hotels', { skipErrorToast: true });
      setHotels(Array.isArray(res.data) ? res.data : []);
    } catch {
      setHotels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  const destinations = useMemo(() => {
    const set = new Set();
    hotels.forEach((h) => {
      const d = h.destination || h.displayCity;
      if (d) set.add(d);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [hotels]);

  const mealPlans = useMemo(() => {
    const set = new Set();
    hotels.forEach((h) => {
      if (h.mealPlan) set.add(h.mealPlan);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [hotels]);

  const stats = useMemo(() => {
    const total = hotels.length;
    const active = hotels.filter((h) => h.status !== 'inactive').length;
    const inactive = total - active;
    const destCount = destinations.length;
    const rated = hotels.filter((h) => hotelStars(h) > 0);
    const avgRating =
      rated.length > 0
        ? rated.reduce((sum, h) => sum + hotelStars(h), 0) / rated.length
        : 0;
    return { total, active, inactive, destCount, avgRating };
  }, [hotels, destinations.length]);

  const filteredHotels = useMemo(() => {
    let list = [...hotels];
    const q = applied.search.trim().toLowerCase();
    if (q) {
      list = list.filter((h) => {
        const hay = [
          h.name,
          h.destination,
          h.displayCity,
          h.location,
          h.category,
          h.mealPlan,
          h.roomType,
          ...(h.amenities || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (applied.destination) {
      list = list.filter(
        (h) => (h.destination || h.displayCity || '') === applied.destination
      );
    }
    if (applied.star) {
      const star = Number(applied.star);
      list = list.filter((h) => hotelStars(h) === star);
    }
    if (applied.meal) {
      list = list.filter((h) => (h.mealPlan || '') === applied.meal);
    }
    if (applied.status) {
      list = list.filter((h) => (h.status || 'active') === applied.status);
    }

    list.sort((a, b) => {
      if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      if (sortBy === 'price-asc') return hotelPrice(a) - hotelPrice(b);
      if (sortBy === 'price-desc') return hotelPrice(b) - hotelPrice(a);
      if (sortBy === 'rating') return hotelStars(b) - hotelStars(a);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    return list;
  }, [hotels, applied, sortBy]);

  const openCreate = () => {
    setEditingHotel(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (hotel) => {
    setEditingHotel(hotel);
    setForm(hotelToForm(hotel));
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const amenities = String(form.amenities || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      name: form.name.trim(),
      destination: form.destination.trim(),
      location: form.location.trim() || form.destination.trim(),
      category: form.category,
      starRating: Number(form.starRating) || 0,
      roomType: form.roomType,
      mealPlan: form.mealPlan,
      price: Number(form.price) || 0,
      absolutePerNight: Number(form.price) || 0,
      coverImage: form.coverImage.trim(),
      images: form.coverImage.trim() ? [form.coverImage.trim()] : [],
      amenities,
      status: form.status || 'active',
      specialNotes: form.specialNotes || '',
      sourceType: editingHotel?.sourceType || 'manual',
    };
    try {
      if (editingHotel?._id) {
        await API.put(`/hotels/${editingHotel._id}`, payload);
      } else {
        await API.post('/hotels', payload);
      }
      setModalOpen(false);
      setEditingHotel(null);
      setForm(EMPTY_FORM);
      await fetchHotels();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (hotel) => {
    const next = hotel.status === 'inactive' ? 'active' : 'inactive';
    await API.put(`/hotels/${hotel._id}`, { status: next });
    await fetchHotels();
  };

  const handleDelete = async (hotel) => {
    if (!window.confirm(`Delete "${hotel.name}"?`)) return;
    await API.delete(`/hotels/${hotel._id}`);
    await fetchHotels();
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      await API.post('/packages/import-hotels-from-catalog');
      await fetchHotels();
    } catch {
      /* toast handled by axios */
    } finally {
      setImporting(false);
    }
  };

  const applyFilters = (e) => {
    e?.preventDefault?.();
    setApplied({
      search: searchInput,
      destination,
      star: starFilter,
      meal: mealFilter,
      status: statusFilter,
    });
  };

  const resetFilters = () => {
    setSearchInput('');
    setDestination('');
    setStarFilter('');
    setMealFilter('');
    setStatusFilter('');
    setApplied({ search: '', destination: '', star: '', meal: '', status: '' });
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-8">
      <section
        className="relative overflow-hidden rounded-2xl min-h-[148px]"
        style={{
          backgroundImage:
            "linear-gradient(100deg, rgba(15,23,42,0.78) 0%, rgba(15,23,42,0.42) 55%, rgba(15,23,42,0.55) 100%), url('/login-himalaya-bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="relative z-10 flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-6">
          <div className="min-w-0 max-w-xl">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Hotel Control</h1>
            <p className="mt-1.5 text-base font-medium text-white/95">
              Manage your hotel inventory with ease
            </p>
            <p className="mt-1 text-sm text-white/70">
              Add, edit and manage hotels with prices, photos, amenities and more.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <div className="flex flex-wrap gap-2">
              {canCreate ? (
                <button
                  type="button"
                  onClick={openCreate}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/30 hover:bg-orange-600"
                >
                  <Plus className="h-4 w-4" />
                  Add Hotel
                </button>
              ) : null}
              {canImport ? (
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 disabled:opacity-60"
                >
                  <Upload className={cn('h-4 w-4', importing && 'animate-pulse')} />
                  {importing ? 'Importing...' : 'Import Hotels'}
                </button>
              ) : null}
            </div>
            <p
              className="text-right text-[15px] font-medium italic text-white/90"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Better Stays, Happier Journeys
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatCard label="Total Hotels" value={stats.total} icon={Building2} tone="blue" hint="From live inventory" />
        <StatCard label="Active Hotels" value={stats.active} icon={BedDouble} tone="indigo" hint="Ready to sell" />
        <StatCard label="Inactive Hotels" value={stats.inactive} icon={Clock3} tone="orange" hint="Hidden from quotes" />
        <StatCard label="Destinations" value={stats.destCount} icon={MapPin} tone="blue" hint="Unique cities" />
        <StatCard
          label="Avg. Rating"
          value={stats.avgRating ? stats.avgRating.toFixed(1) : '—'}
          icon={Star}
          tone="amber"
          hint="Star category avg"
        />
      </div>

      <form
        onSubmit={applyFilters}
        className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by hotel name, destination, package..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="">All Destinations</option>
            {destinations.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={starFilter}
            onChange={(e) => setStarFilter(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="">All Stars</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={String(n)}>
                {n} Star
              </option>
            ))}
          </select>
          <select
            value={mealFilter}
            onChange={(e) => setMealFilter(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="">All Meal Plans</option>
            {mealPlans.map((m) => (
              <option key={m} value={m}>
                {shortMeal(m)} — {m}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-orange-200 px-4 text-sm font-semibold text-orange-600 hover:bg-orange-50"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold text-slate-900">
          All Hotels{' '}
          <span className="font-semibold text-slate-400">({filteredHotels.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-lg p-2',
                viewMode === 'grid' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-lg p-2',
                viewMode === 'list' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="latest">Latest Added</option>
            <option value="name">Name A–Z</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-2xl border border-slate-100 bg-slate-100" />
          ))}
        </div>
      ) : filteredHotels.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center">
          <Building2 className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="font-medium text-slate-600">No hotels found</p>
          <p className="mt-1 text-sm text-slate-400">Try resetting filters or import hotels from packages</p>
          {canCreate ? (
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Add Hotel
            </button>
          ) : null}
        </div>
      ) : (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
              : 'grid grid-cols-1 gap-3'
          )}
        >
          {filteredHotels.map((hotel) => (
            <HotelCard
              key={hotel._id}
              hotel={hotel}
              onEdit={openEdit}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              canEdit={canEdit}
              canDelete={canDelete}
              favorited={favorites.has(hotel._id)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}

      <HotelFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingHotel(null);
        }}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        saving={saving}
        isEdit={!!editingHotel}
      />
    </motion.div>
  );
}

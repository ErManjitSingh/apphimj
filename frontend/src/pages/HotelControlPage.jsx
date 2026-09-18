import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BedDouble,
  Building2,
  ChevronLeft,
  ChevronRight,
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
} from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../lib/permissions';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { formatINR } from '../components/quotations/quotationUtils';
import { cn } from '../lib/utils';

const PAGE_SIZE = 10;

function normalizeHotelRooms(hotel) {
  const list = Array.isArray(hotel?.roomTypes) ? hotel.roomTypes.filter((r) => r?.name) : [];
  if (list.length) return list;
  if (hotel?.roomType) {
    return [
      {
        name: hotel.roomType,
        maxOccupancy: 2,
        baseRate: hotelPrice(hotel),
        mealPlan: hotel.mealPlan || '',
        bedType: '',
      },
    ];
  }
  return [];
}

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

function roomMapRate(room, season = 'onSeason') {
  const seasonal = room?.rates?.[season];
  return Number(
    seasonal?.map ||
      seasonal?.cp ||
      seasonal?.ep ||
      room?.rates?.map ||
      room?.rates?.cp ||
      room?.baseRate ||
      0
  );
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

function HotelActionsMenu({ hotel, onEdit, onToggleStatus, onDelete, canEdit, canDelete, active }) {
  return (
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
  );
}

function HotelListRow({ hotel, onEdit, onToggleStatus, onDelete, canEdit, canDelete }) {
  const image = hotelImage(hotel);
  const price = hotelPrice(hotel);
  const stars = hotelStars(hotel);
  const active = hotel.status !== 'inactive';
  const rooms = normalizeHotelRooms(hotel);

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-orange-200 hover:shadow-md sm:flex-row sm:items-center sm:gap-4 sm:p-3.5">
      <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-20 sm:w-28">
        {image ? (
          <img src={image} alt={hotel.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-300">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-[15px] font-bold text-slate-900">{hotel.name}</h3>
          {stars > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-600">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              {stars.toFixed(1)}
            </span>
          ) : null}
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
              active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
            )}
          >
            {active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="mt-1 flex items-center gap-1 truncate text-[12px] text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-orange-400" />
          {hotelCity(hotel)}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
            {hotel.category || 'Hotel'}
          </span>
          <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
            {hotel.roomType || rooms[0]?.name || 'Deluxe'}
          </span>
          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            {shortMeal(hotel.mealPlan)}
          </span>
          {rooms.length > 0 ? (
            <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
              {rooms.length} room categor{rooms.length === 1 ? 'y' : 'ies'}
            </span>
          ) : null}
        </div>
        {rooms.length > 0 ? (
          <div className="mt-2.5 space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Room categories</p>
            <div className="flex flex-wrap gap-1.5">
              {rooms.slice(0, 6).map((room) => (
                <span
                  key={room.name}
                  className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1 text-[11px] text-slate-700"
                >
                  {room.images?.[0] ? (
                    <img
                      src={room.images[0]}
                      alt=""
                      className="h-5 w-6 rounded object-cover"
                    />
                  ) : (
                    <BedDouble className="h-3 w-3 text-orange-500" />
                  )}
                  <span className="font-semibold">{room.name}</span>
                  <span className="font-bold tabular-nums text-amber-700">
                    On MAP {formatINR(roomMapRate(room, 'onSeason'))}
                  </span>
                  <span className="font-bold tabular-nums text-sky-700">
                    Off MAP {formatINR(roomMapRate(room, 'offSeason'))}
                  </span>
                  {room.maxOccupancy ? (
                    <span className="text-slate-400">· {room.maxOccupancy} pax</span>
                  ) : null}
                </span>
              ))}
              {rooms.length > 6 ? (
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                  +{rooms.length - 6} more
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-center">
        <div className="text-left sm:text-right">
          <p className="text-lg font-bold tabular-nums text-emerald-600">{formatINR(price)}</p>
          <p className="text-[11px] text-slate-400">Per night</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(hotel)}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-3.5 text-sm font-semibold text-white shadow-sm shadow-orange-500/25 transition hover:bg-orange-600"
          >
            <Pencil className="h-3.5 w-3.5" />
            View / Edit
          </button>
          <HotelActionsMenu
            hotel={hotel}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
            canEdit={canEdit}
            canDelete={canDelete}
            active={active}
          />
        </div>
      </div>
    </article>
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
            {hotel.roomType || normalizeHotelRooms(hotel)[0]?.name || 'Deluxe'}
          </span>
          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            {shortMeal(hotel.mealPlan)}
          </span>
          {normalizeHotelRooms(hotel).length > 0 ? (
            <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
              {normalizeHotelRooms(hotel).length} rooms
            </span>
          ) : null}
        </div>

        {normalizeHotelRooms(hotel).length > 0 ? (
          <div className="space-y-1">
            {normalizeHotelRooms(hotel).slice(0, 3).map((room) => (
              <div
                key={room.name}
                className="rounded-lg bg-slate-50 px-2 py-1.5 text-[11px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 truncate font-semibold text-slate-700">
                    {room.images?.[0] ? (
                      <img src={room.images[0]} alt="" className="h-5 w-6 shrink-0 rounded object-cover" />
                    ) : null}
                    <span className="truncate">{room.name}</span>
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px]">
                  <span className="font-bold tabular-nums text-amber-700">
                    On MAP {formatINR(roomMapRate(room, 'onSeason'))}
                  </span>
                  <span className="font-bold tabular-nums text-sky-700">
                    Off MAP {formatINR(roomMapRate(room, 'offSeason'))}
                  </span>
                  <span className="tabular-nums text-slate-500">
                    CP {formatINR(Number(room.rates?.onSeason?.cp || room.rates?.cp || 0))}
                  </span>
                  <span className="tabular-nums text-slate-500">
                    EP {formatINR(Number(room.rates?.onSeason?.ep || room.rates?.ep || 0))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <AmenityRow amenities={hotel.amenities} />
        )}

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
          <HotelActionsMenu
            hotel={hotel}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            onDelete={onDelete}
            canEdit={canEdit}
            canDelete={canDelete}
            active={active}
          />
        </div>
      </div>
    </article>
  );
}

export default function HotelControlPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const hotelBase = pathname.includes('/sales-executive')
    ? '/sales-executive/hotel-control'
    : '/hotel-control';
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
  const [viewMode, setViewMode] = useState('list');
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = useState(() => new Set());

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

  const totalPages = Math.max(1, Math.ceil(filteredHotels.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageHotels = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredHotels.slice(start, start + PAGE_SIZE);
  }, [filteredHotels, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [applied, sortBy]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openCreate = () => navigate(`${hotelBase}/new`);
  const openEdit = (hotel) => navigate(`${hotelBase}/${hotel._id}/edit`);

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
      await API.post('/hotels/sync-rooms');
      await fetchHotels();
    } catch {
      /* toast handled by axios */
    } finally {
      setImporting(false);
    }
  };

  const handleSyncRooms = async () => {
    setImporting(true);
    try {
      await API.post('/hotels/sync-rooms');
      await fetchHotels();
    } catch {
      /* toast handled by axios */
    } finally {
      setImporting(false);
    }
  };

  const applyFilters = (e) => {
    e?.preventDefault?.();
    setPage(1);
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
    setPage(1);
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
              {canEdit ? (
                <button
                  type="button"
                  onClick={handleSyncRooms}
                  disabled={importing}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 disabled:opacity-60"
                >
                  <RefreshCw className={cn('h-4 w-4', importing && 'animate-spin')} />
                  {importing ? 'Syncing...' : 'Sync Rooms'}
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
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-100 bg-slate-100" />
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
        <>
          {viewMode === 'list' ? (
            <div className="space-y-3">
              {pageHotels.map((hotel) => (
                <HotelListRow
                  key={hotel._id}
                  hotel={hotel}
                  onEdit={openEdit}
                  onToggleStatus={handleToggleStatus}
                  onDelete={handleDelete}
                  canEdit={canEdit}
                  canDelete={canDelete}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {pageHotels.map((hotel) => (
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

          {filteredHotels.length > PAGE_SIZE ? (
            <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm sm:flex-row">
              <p className="text-sm text-slate-500">
                Showing{' '}
                <span className="font-semibold text-slate-800">
                  {(currentPage - 1) * PAGE_SIZE + 1}
                  –
                  {Math.min(currentPage * PAGE_SIZE, filteredHotels.length)}
                </span>{' '}
                of <span className="font-semibold text-slate-800">{filteredHotels.length}</span> hotels
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPages <= 7) return true;
                      if (p === 1 || p === totalPages) return true;
                      return Math.abs(p - currentPage) <= 1;
                    })
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === '…' ? (
                        <span key={`e-${idx}`} className="px-1 text-slate-400">
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setPage(item)}
                          className={cn(
                            'flex h-9 min-w-9 items-center justify-center rounded-xl px-2.5 text-sm font-semibold transition',
                            currentPage === item
                              ? 'bg-orange-500 text-white'
                              : 'text-slate-600 hover:bg-slate-50'
                          )}
                        >
                          {item}
                        </button>
                      )
                    )}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </motion.div>
  );
}

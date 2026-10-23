import { Link } from 'react-router-dom';
import { MoreHorizontal, Pencil, Star } from 'lucide-react';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../../ui/dropdown-menu';

export default function HotelRowActions({ hotelId }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        to={`/operations-manager/hotels/${hotelId}/edit`}
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-subtle bg-white text-content-muted hover:text-blue-600 hover:border-blue-200 transition-colors"
        aria-label="Edit hotel"
      >
        <Pencil className="w-3.5 h-3.5" />
      </Link>
      <DropdownMenuRoot>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-subtle bg-white text-content-muted hover:text-content-primary hover:bg-slate-50 transition-colors"
            aria-label="Hotel actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link to={`/operations-manager/hotels/${hotelId}/edit`} className="gap-2 cursor-pointer">
              Edit hotel
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuRoot>
    </div>
  );
}

export function HotelCategoryCell({ category }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-content-primary">
      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
      {category || '—'}
    </span>
  );
}

export function HotelStatusBadge({ status = 'active' }) {
  const active = status === 'active';
  return (
    <span
      className={
        active
          ? 'inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100'
          : 'inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200'
      }
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

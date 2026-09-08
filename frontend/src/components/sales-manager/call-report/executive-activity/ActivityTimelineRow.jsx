import {
  LogIn, LogOut, Eye, List, LayoutGrid, UserPlus, Pencil, RefreshCw, UserCog,
  FileText, CalendarClock, StickyNote, PhoneOutgoing, PhoneCall, Hotel,
} from 'lucide-react';
import { formatCallDuration } from '../../../../lib/callSession';
import { formatTime } from './activityFormat';

const TYPE_META = {
  login: { icon: LogIn, wrap: 'bg-emerald-100 text-emerald-600' },
  logout: { icon: LogOut, wrap: 'bg-slate-200 text-slate-600' },
  lead_viewed: { icon: Eye, wrap: 'bg-sky-100 text-sky-600' },
  leads_list_opened: { icon: List, wrap: 'bg-sky-100 text-sky-600' },
  module_opened: { icon: LayoutGrid, wrap: 'bg-slate-100 text-slate-600' },
  lead_created: { icon: UserPlus, wrap: 'bg-emerald-100 text-emerald-600' },
  lead_edited: { icon: Pencil, wrap: 'bg-indigo-100 text-indigo-600' },
  status_changed: { icon: RefreshCw, wrap: 'bg-indigo-100 text-indigo-600' },
  lead_assigned: { icon: UserCog, wrap: 'bg-violet-100 text-violet-600' },
  lead_reassigned: { icon: UserCog, wrap: 'bg-violet-100 text-violet-600' },
  quotation_created: { icon: FileText, wrap: 'bg-fuchsia-100 text-fuchsia-600' },
  quotation_submitted: { icon: FileText, wrap: 'bg-fuchsia-100 text-fuchsia-600' },
  quotation_sent: { icon: FileText, wrap: 'bg-fuchsia-100 text-fuchsia-600' },
  quotation_approved: { icon: FileText, wrap: 'bg-emerald-100 text-emerald-600' },
  quotation_rejected: { icon: FileText, wrap: 'bg-red-100 text-red-600' },
  followup_created: { icon: CalendarClock, wrap: 'bg-amber-100 text-amber-600' },
  followup_completed: { icon: CalendarClock, wrap: 'bg-emerald-100 text-emerald-600' },
  followup_rescheduled: { icon: CalendarClock, wrap: 'bg-amber-100 text-amber-600' },
  note_added: { icon: StickyNote, wrap: 'bg-slate-100 text-slate-600' },
  call_note_added: { icon: PhoneCall, wrap: 'bg-teal-100 text-teal-600' },
  booking_created: { icon: Hotel, wrap: 'bg-rose-100 text-rose-600' },
  booking_updated: { icon: Hotel, wrap: 'bg-rose-100 text-rose-600' },
  call_started: { icon: PhoneOutgoing, wrap: 'bg-sky-100 text-sky-600' },
  call_ended: { icon: PhoneCall, wrap: 'bg-teal-100 text-teal-600' },
};
const DEFAULT_META = { icon: StickyNote, wrap: 'bg-slate-100 text-slate-600' };

export default function ActivityTimelineRow({ event, onClick }) {
  const meta = TYPE_META[event.type] || DEFAULT_META;
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      className="flex w-full items-start gap-3 rounded-xl border border-subtle bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-violet-200"
    >
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.wrap}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold tabular-nums text-content-primary">{formatTime(event.at)}</p>
        </div>
        <p className="mt-1 text-sm font-semibold text-content-primary">{event.title}</p>
        {event.description && (
          <p className="truncate text-xs text-content-muted">{event.description}</p>
        )}
        {event.type === 'call_ended' && (
          <p className="mt-1 text-xs text-content-secondary">
            Duration: <span className="font-semibold tabular-nums">{formatCallDuration(event.meta?.duration || 0)}</span>
          </p>
        )}
      </div>
    </button>
  );
}

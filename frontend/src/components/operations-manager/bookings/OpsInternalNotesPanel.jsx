import { useEffect, useMemo, useState } from 'react';
import { Loader2, NotebookPen, Save, StickyNote } from 'lucide-react';
import API from '../../../api/axios';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';

const THEMES = {
  hotel: {
    shell: 'border-amber-300/60 bg-gradient-to-br from-amber-50 via-orange-50/80 to-stone-100 shadow-[0_12px_40px_-18px_rgba(180,83,9,0.45)]',
    badge: 'bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/20',
    accent: 'text-amber-700',
    iconWrap: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30',
    textarea: 'border-amber-200/80 bg-white/90 focus:border-amber-400 focus:ring-amber-100',
    card: 'border-amber-200/70 bg-white/85',
    button: 'bg-amber-600 hover:bg-amber-500 text-white',
    rail: 'from-amber-400 to-orange-500',
    empty: 'border-amber-200/70 bg-amber-50/50 text-amber-900/70',
  },
  cab: {
    shell: 'border-cyan-300/60 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 text-slate-100 shadow-[0_12px_40px_-18px_rgba(8,145,178,0.55)]',
    badge: 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/25',
    accent: 'text-cyan-300',
    iconWrap: 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/30',
    textarea: 'border-cyan-500/30 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-cyan-500/20',
    card: 'border-cyan-500/20 bg-slate-950/55',
    button: 'bg-cyan-400 hover:bg-cyan-300 text-slate-950',
    rail: 'from-cyan-400 to-sky-500',
    empty: 'border-cyan-500/25 bg-slate-950/40 text-slate-400',
  },
};

function formatStamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Attractive ops-only notes log under Hotel Master / Cab booking.
 * Each save stamps server date + time.
 */
export default function OpsInternalNotesPanel({
  bookingId,
  scope = 'hotel',
  notes: notesProp = [],
  onSaved,
}) {
  const theme = THEMES[scope] || THEMES.hotel;
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [localNotes, setLocalNotes] = useState(null);

  useEffect(() => {
    setLocalNotes(null);
  }, [notesProp]);

  const notes = useMemo(() => {
    const list = localNotes ?? notesProp ?? [];
    return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [localNotes, notesProp]);

  const title = scope === 'cab' ? 'Cab internal notes' : 'Hotel internal notes';
  const hint =
    scope === 'cab'
      ? 'Vendor payment, pickup changes, driver tips — anything ops needs to remember.'
      : 'Room upgrades, advance paid offline, hotel follow-ups — save anything for the team.';

  const save = async () => {
    const text = draft.trim();
    if (!text) {
      toast.error('Write a note before saving');
      return;
    }
    if (!bookingId) return;
    setSaving(true);
    try {
      const { data } = await API.post(
        `/operations-manager/bookings/${bookingId}/ops-notes`,
        { scope, text },
        { skipSuccessToast: true }
      );
      setLocalNotes(data.notes || []);
      setDraft('');
      toast.success('Note saved with date & time');
      onSaved?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn('mt-5 overflow-hidden rounded-3xl border p-4 sm:p-5', theme.shell)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={cn('inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', theme.iconWrap)}>
            <NotebookPen className="h-5 w-5" />
          </span>
          <div>
            <p className={cn('text-[10px] font-bold uppercase tracking-[0.18em]', theme.accent)}>
              Ops log · internal only
            </p>
            <h3 className={cn('mt-1 text-base font-black', scope === 'cab' ? 'text-white' : 'text-slate-900')}>
              {title}
            </h3>
            <p className={cn('mt-1 max-w-xl text-xs leading-relaxed', scope === 'cab' ? 'text-slate-400' : 'text-slate-600')}>
              {hint}
            </p>
          </div>
        </div>
        <span className={cn('inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[10px] font-bold uppercase', theme.badge)}>
          <StickyNote className="h-3 w-3" />
          {notes.length} saved
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Type anything to remember… then Save note"
          className={cn(
            'w-full resize-y rounded-2xl border px-3.5 py-3 text-sm outline-none transition focus:ring-4',
            theme.textarea
          )}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={cn('text-[11px]', scope === 'cab' ? 'text-slate-500' : 'text-slate-500')}>
            Save pe aaj ki date & time auto lock ho jayegi.
          </p>
          <Button
            type="button"
            size="sm"
            className={cn('rounded-xl gap-1.5 border-0 font-bold', theme.button)}
            disabled={saving || !draft.trim()}
            onClick={save}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save note
          </Button>
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        {!notes.length ? (
          <p className={cn('rounded-2xl border border-dashed px-4 py-6 text-center text-sm', theme.empty)}>
            Abhi koi note nahi — pehla note save karke timeline shuru karo.
          </p>
        ) : (
          notes.map((note) => (
            <article
              key={note._id || `${note.createdAt}-${note.text?.slice(0, 12)}`}
              className={cn('relative overflow-hidden rounded-2xl border p-3.5 pl-4', theme.card)}
            >
              <span className={cn('absolute left-0 top-0 h-full w-1 bg-gradient-to-b', theme.rail)} />
              <p className={cn('whitespace-pre-wrap text-sm leading-relaxed', scope === 'cab' ? 'text-slate-100' : 'text-slate-800')}>
                {note.text}
              </p>
              <div className={cn('mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold', scope === 'cab' ? 'text-cyan-200/80' : 'text-amber-800/80')}>
                <span>{formatStamp(note.createdAt)}</span>
                {note.createdByName ? <span>· {note.createdByName}</span> : null}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

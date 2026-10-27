import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, NotebookPen, Save, StickyNote } from 'lucide-react';
import API from '../../../api/axios';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { toast } from '../../../context/ToastContext';

const THEMES = {
  hotel: {
    shell: 'border-amber-300/60 bg-gradient-to-br from-amber-50 via-orange-50/80 to-stone-100 shadow-[0_10px_28px_-16px_rgba(180,83,9,0.4)]',
    badge: 'bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/20',
    accent: 'text-amber-700',
    iconWrap: 'bg-amber-500 text-white shadow-md shadow-amber-500/25',
    textarea: 'border-amber-200/80 bg-white/90 focus:border-amber-400 focus:ring-amber-100',
    card: 'border-amber-200/70 bg-white/90',
    button: 'bg-amber-600 hover:bg-amber-500 text-white',
    rail: 'from-amber-400 to-orange-500',
    empty: 'border-amber-200/70 bg-amber-50/50 text-amber-900/70',
    meta: 'text-amber-800/80',
    text: 'text-slate-800',
    title: 'text-slate-900',
  },
  cab: {
    shell: 'border-cyan-300/50 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 text-slate-100 shadow-[0_10px_28px_-16px_rgba(8,145,178,0.45)]',
    badge: 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/25',
    accent: 'text-cyan-300',
    iconWrap: 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/25',
    textarea: 'border-cyan-500/30 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-cyan-500/20',
    card: 'border-cyan-500/20 bg-slate-950/55',
    button: 'bg-cyan-400 hover:bg-cyan-300 text-slate-950',
    rail: 'from-cyan-400 to-sky-500',
    empty: 'border-cyan-500/25 bg-slate-950/40 text-slate-400',
    meta: 'text-cyan-200/80',
    text: 'text-slate-100',
    title: 'text-white',
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

function noteKey(note, index) {
  return note._id || `${note.createdAt || 't'}-${index}-${String(note.text || '').slice(0, 16)}`;
}

/**
 * Clean ops notes panel. Saves locally without refreshing the booking page.
 */
export default function OpsInternalNotesPanel({
  bookingId,
  scope = 'hotel',
  notes: notesProp = [],
  onNotesSynced,
  hotelAssignmentId,
  transportAssignmentId,
  title: titleProp,
  compact = false,
  disabledReason = '',
}) {
  const theme = THEMES[scope] || THEMES.hotel;
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(() => [...(notesProp || [])]);
  const skipPropSync = useRef(false);

  useEffect(() => {
    if (skipPropSync.current) {
      skipPropSync.current = false;
      return;
    }
    setNotes([...(notesProp || [])]);
  }, [notesProp, hotelAssignmentId, transportAssignmentId]);

  const orderedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [notes]
  );

  const title =
    titleProp ||
    (scope === 'cab' ? 'Cab internal notes' : 'Hotel internal notes');

  const save = async () => {
    const text = draft.trim();
    if (!text) {
      toast.error('Write a note before saving');
      return;
    }
    if (!bookingId) return;
    if (disabledReason) {
      toast.error(disabledReason);
      return;
    }
    setSaving(true);
    try {
      const payload = { scope, text };
      if (hotelAssignmentId) payload.hotelAssignmentId = hotelAssignmentId;
      if (transportAssignmentId) payload.transportAssignmentId = transportAssignmentId;
      const { data } = await API.post(
        `/operations-manager/bookings/${bookingId}/ops-notes`,
        payload,
        { skipSuccessToast: true }
      );
      const nextNotes = data.notes || [...notes, data.note].filter(Boolean);
      skipPropSync.current = true;
      setNotes(nextNotes);
      setDraft('');
      onNotesSynced?.({
        scope,
        hotelAssignmentId,
        transportAssignmentId,
        notes: nextNotes,
        note: data.note,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border',
        compact ? 'mt-4 p-3.5' : 'mt-5 rounded-3xl p-4 sm:p-5',
        theme.shell
      )}
    >
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded-xl',
              compact ? 'h-9 w-9' : 'h-11 w-11 rounded-2xl',
              theme.iconWrap
            )}
          >
            <NotebookPen className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </span>
          <div>
            <p className={cn('text-[10px] font-bold uppercase tracking-[0.16em]', theme.accent)}>
              Ops log · internal only
            </p>
            <h4 className={cn('mt-0.5 font-black', compact ? 'text-sm' : 'text-base', theme.title)}>
              {title}
            </h4>
            {!compact ? (
              <p className={cn('mt-1 max-w-xl text-xs leading-relaxed', scope === 'cab' ? 'text-slate-400' : 'text-slate-600')}>
                Save pe date & time lock ho jayegi — page refresh nahi hoga.
              </p>
            ) : null}
          </div>
        </div>
        <span className={cn('inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[10px] font-bold uppercase', theme.badge)}>
          <StickyNote className="h-3 w-3" />
          {orderedNotes.length} saved
        </span>
      </div>

      <div className={cn(compact ? 'mt-3 space-y-2.5' : 'mt-4 space-y-3')}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={compact ? 2 : 3}
          placeholder="Type anything to remember… then Save note"
          disabled={Boolean(disabledReason) || saving}
          className={cn(
            'w-full resize-y rounded-xl border px-3 py-2.5 text-sm outline-none transition focus:ring-4 disabled:opacity-60',
            theme.textarea
          )}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={cn('text-[11px]', scope === 'cab' ? 'text-slate-500' : 'text-slate-500')}>
            {disabledReason || 'Save pe date & time auto lock.'}
          </p>
          <Button
            type="button"
            size="sm"
            className={cn('rounded-xl gap-1.5 border-0 font-bold', theme.button)}
            disabled={saving || !draft.trim() || Boolean(disabledReason)}
            onClick={save}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save note
          </Button>
        </div>
      </div>

      <div className={cn('space-y-2', compact ? 'mt-3' : 'mt-5 space-y-2.5')}>
        {!orderedNotes.length ? (
          <p className={cn('rounded-xl border border-dashed px-3 py-4 text-center text-xs', theme.empty)}>
            No notes yet for this {scope === 'cab' ? 'cab' : 'hotel'}.
          </p>
        ) : (
          orderedNotes.map((note, index) => (
            <article
              key={noteKey(note, index)}
              className={cn('relative overflow-hidden rounded-xl border p-3 pl-3.5', theme.card)}
            >
              <span className={cn('absolute left-0 top-0 h-full w-1 bg-gradient-to-b', theme.rail)} />
              <p className={cn('whitespace-pre-wrap text-sm leading-relaxed', theme.text)}>
                {note.text}
              </p>
              <div className={cn('mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold', theme.meta)}>
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

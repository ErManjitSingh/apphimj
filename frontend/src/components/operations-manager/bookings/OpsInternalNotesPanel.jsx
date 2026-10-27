import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, NotebookPen, Send, StickyNote } from 'lucide-react';
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
    thread: 'border-amber-200/60 bg-white/55',
    bubble: 'bg-white border-amber-200/80 text-slate-800 shadow-sm',
    meta: 'text-amber-800/70',
    composer: 'border-amber-200/80 bg-white/90 focus:border-amber-400 focus:ring-amber-100',
    button: 'bg-amber-600 hover:bg-amber-500 text-white',
    empty: 'text-amber-900/60',
  },
  cab: {
    shell: 'border-cyan-300/50 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950 text-slate-100 shadow-[0_10px_28px_-16px_rgba(8,145,178,0.45)]',
    badge: 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/25',
    accent: 'text-cyan-300',
    iconWrap: 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/25',
    thread: 'border-cyan-500/20 bg-slate-950/45',
    bubble: 'bg-slate-800/90 border-cyan-500/25 text-slate-100 shadow-sm',
    meta: 'text-cyan-200/70',
    composer: 'border-cyan-500/30 bg-slate-950/50 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-cyan-500/20',
    button: 'bg-cyan-400 hover:bg-cyan-300 text-slate-950',
    empty: 'text-slate-400',
  },
};

function formatStamp(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function noteKey(note, index) {
  return note._id || `${note.createdAt || 't'}-${index}-${String(note.text || '').slice(0, 16)}`;
}

/**
 * WhatsApp-style ops notes: thread on top, composer at bottom.
 * Saves without refreshing the whole booking page.
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
  const threadRef = useRef(null);
  const bottomRef = useRef(null);
  const skipPropSync = useRef(false);

  const orderedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)),
    [notes]
  );

  useEffect(() => {
    if (skipPropSync.current) {
      skipPropSync.current = false;
      return;
    }
    setNotes([...(notesProp || [])]);
  }, [notesProp, hotelAssignmentId, transportAssignmentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [orderedNotes.length]);

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

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!saving && draft.trim() && !disabledReason) save();
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
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'inline-flex shrink-0 items-center justify-center rounded-xl',
              compact ? 'h-8 w-8' : 'h-10 w-10 rounded-2xl',
              theme.iconWrap
            )}
          >
            <NotebookPen className={compact ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5'} />
          </span>
          <div className="min-w-0">
            <p className={cn('text-[10px] font-bold uppercase tracking-[0.16em]', theme.accent)}>
              Ops chat · internal
            </p>
            <h4 className={cn('truncate font-black', compact ? 'text-sm' : 'text-base', scope === 'cab' ? 'text-white' : 'text-slate-900')}>
              {title}
            </h4>
          </div>
        </div>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase', theme.badge)}>
          <StickyNote className="h-3 w-3" />
          {orderedNotes.length}
        </span>
      </div>

      <div
        ref={threadRef}
        className={cn(
          'rounded-2xl border p-2.5',
          theme.thread,
          compact ? 'max-h-52' : 'max-h-72',
          'overflow-y-auto overscroll-contain'
        )}
      >
        {!orderedNotes.length ? (
          <p className={cn('px-2 py-8 text-center text-xs', theme.empty)}>
            Pehla note bhejo — yahan WhatsApp ki tarah niche dikhega.
          </p>
        ) : (
          <div className="space-y-2">
            {orderedNotes.map((note, index) => (
              <div key={noteKey(note, index)} className="flex justify-end">
                <article
                  className={cn(
                    'max-w-[92%] rounded-2xl rounded-br-md border px-3 py-2',
                    theme.bubble
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.text}</p>
                  <p className={cn('mt-1 text-right text-[10px] font-semibold', theme.meta)}>
                    {note.createdByName ? `${note.createdByName} · ` : ''}
                    {formatStamp(note.createdAt)}
                  </p>
                </article>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          rows={compact ? 2 : 2}
          placeholder={disabledReason || 'Type a note… Enter to send'}
          disabled={Boolean(disabledReason) || saving}
          className={cn(
            'min-h-[44px] flex-1 resize-none rounded-2xl border px-3 py-2.5 text-sm outline-none transition focus:ring-4 disabled:opacity-60',
            theme.composer
          )}
        />
        <Button
          type="button"
          size="sm"
          className={cn('h-11 w-11 shrink-0 rounded-2xl border-0 p-0', theme.button)}
          disabled={saving || !draft.trim() || Boolean(disabledReason)}
          onClick={save}
          aria-label="Send note"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

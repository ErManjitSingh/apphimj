import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../../api/axios';
import PageHeader from '../ui/PageHeader';
import { cn } from '../../lib/utils';

const TYPE_STYLE = {
  departure: 'border-l-teal-500 bg-teal-500/5',
  return: 'border-l-violet-500 bg-violet-500/5',
};

const TYPE_LABEL = {
  departure: 'Departure',
  return: 'Arrival',
};

function dayKey(d) {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
}

export default function OperationsCalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = searchParams.get('type'); // departure | return | null
  const todayOnly = searchParams.get('today') === '1';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/operations-manager/calendar', { skipSuccessToast: true })
      .then((r) => setEvents(Array.isArray(r.data) ? r.data : []))
      .finally(() => setLoading(false));
  }, []);

  const todayKey = dayKey(new Date());

  const filtered = useMemo(() => {
    let list = [...events];
    if (typeFilter === 'departure' || typeFilter === 'return') {
      list = list.filter((e) => e.type === typeFilter);
    }
    if (todayOnly) {
      list = list.filter((e) => dayKey(e.start) === todayKey);
    }
    return list.sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [events, typeFilter, todayOnly, todayKey]);

  const description = todayOnly
    ? typeFilter === 'return'
      ? "Today's arrivals (return dates)"
      : typeFilter === 'departure'
        ? "Today's departures (travel dates)"
        : "Today's calendar events"
    : typeFilter === 'return'
      ? 'Return / arrival milestones'
      : typeFilter === 'departure'
        ? 'Departure milestones'
        : 'Departures, returns and trip milestones';

  const clearFocus = () => {
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Operations Calendar"
        description={description}
        breadcrumbs={['Operations', 'Calendar']}
      />

      {(typeFilter || todayOnly) && (
        <div className="flex flex-wrap items-center gap-2">
          {todayOnly && (
            <span className="inline-flex items-center rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 border border-sky-100">
              Today only
            </span>
          )}
          {typeFilter && (
            <span className="inline-flex items-center rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 border border-violet-100">
              {TYPE_LABEL[typeFilter] || typeFilter}
            </span>
          )}
          <button
            type="button"
            onClick={clearFocus}
            className="text-xs font-semibold text-content-muted hover:text-content-primary underline-offset-2 hover:underline"
          >
            Clear filter
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-subtle bg-surface/80 divide-y divide-subtle">
        {loading ? (
          <div className="p-16 text-center text-content-muted animate-pulse">Loading calendar...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-content-muted">No events match this filter</div>
        ) : (
          filtered.map((e) => (
            <div
              key={`${e._id}-${e.type}`}
              className={cn('flex items-center gap-4 px-5 py-4 border-l-4', TYPE_STYLE[e.type] || 'border-l-slate-400')}
            >
              <div className="text-center shrink-0 w-14">
                <p className="text-xs font-semibold uppercase text-content-muted">
                  {new Date(e.start).toLocaleDateString('en-IN', { month: 'short' })}
                </p>
                <p className="text-2xl font-black text-content-primary">{new Date(e.start).getDate()}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-content-primary">{e.title}</p>
                <p className="text-xs text-content-muted">
                  {e.bookingNumber} · {TYPE_LABEL[e.type] || e.type}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

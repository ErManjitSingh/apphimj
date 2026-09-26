import { FOLLOWUP_STATUSES, FOLLOWUP_PRIORITIES } from './constants';

export function isSameDay(a, b = new Date()) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

export function isToday(scheduledAt) {
  return isSameDay(scheduledAt, new Date());
}

export function isPast(scheduledAt) {
  return new Date(scheduledAt) < new Date();
}

export function isFuture(scheduledAt) {
  return new Date(scheduledAt) > new Date() && !isToday(scheduledAt);
}

export function daysOverdue(scheduledAt) {
  const diff = Date.now() - new Date(scheduledAt).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

const ORG_TZ = 'Asia/Kolkata';

export function formatFollowUpDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: ORG_TZ,
  });
}

export function formatFollowUpTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: ORG_TZ,
  });
}

export function formatFollowUpDateTime(iso) {
  return `${formatFollowUpDate(iso)} · ${formatFollowUpTime(iso)}`;
}

export function getStatusConfig(status) {
  return FOLLOWUP_STATUSES.find((s) => s.value === status) || FOLLOWUP_STATUSES[0];
}

export function getPriorityConfig(priority) {
  return FOLLOWUP_PRIORITIES.find((p) => p.value === priority) || FOLLOWUP_PRIORITIES[1];
}

export function computeFollowUpKpis(followups) {
  const today = followups.filter((f) => isToday(f.scheduledAt));
  const missed = followups.filter((f) => f.status === 'missed' || (f.status === 'pending' && isPast(f.scheduledAt) && !isToday(f.scheduledAt)));
  const upcoming = followups.filter((f) => f.status === 'pending' && isFuture(f.scheduledAt));
  const completed = followups.filter((f) => f.status === 'completed');
  const total = followups.length || 1;
  const conversionRate = Math.round((completed.length / total) * 100 * 10) / 10;

  return {
    today: today.length,
    missed: missed.length,
    upcoming: upcoming.length,
    completed: completed.length,
    conversion: conversionRate,
    sparklines: {
      today: [3, 4, 5, 4, 6, 5, today.length],
      missed: [1, 2, 1, 3, 2, 2, missed.length],
      upcoming: [8, 7, 9, 10, 8, 9, upcoming.length],
      completed: [12, 14, 13, 15, 16, 17, completed.length],
      conversion: [18, 20, 21, 22, 23, 24, conversionRate],
    },
  };
}

export function getMissedFollowUps(followups) {
  return followups
    .filter((f) => f.status === 'missed' || (f.status === 'pending' && isPast(f.scheduledAt) && !isToday(f.scheduledAt)))
    .map((f) => ({
      ...f,
      daysOverdue: daysOverdue(f.scheduledAt),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export function buildNotifications(followups) {
  const alerts = [];
  const ref = REF_TODAY;

  followups.forEach((f) => {
    const scheduled = new Date(f.scheduledAt);
    const diffHrs = (scheduled - ref) / (1000 * 60 * 60);

    if (f.status === 'missed' || (f.status === 'pending' && isPast(f.scheduledAt) && !isToday(f.scheduledAt))) {
      alerts.push({
        id: `missed-${f._id}`,
        type: 'missed',
        title: 'Missed Follow-up',
        message: `${f.lead?.name} — ${daysOverdue(f.scheduledAt)} day(s) overdue`,
        time: formatFollowUpDateTime(f.scheduledAt),
        priority: f.priority,
        followup: f,
      });
    } else if (f.status === 'pending' && isToday(f.scheduledAt)) {
      alerts.push({
        id: `today-${f._id}`,
        type: 'upcoming',
        title: 'Upcoming Today',
        message: `${f.lead?.name} at ${formatFollowUpTime(f.scheduledAt)}`,
        time: 'Today',
        priority: f.priority,
        followup: f,
      });
    } else if (f.status === 'pending' && diffHrs > 0 && diffHrs <= 24) {
      alerts.push({
        id: `soon-${f._id}`,
        type: 'upcoming',
        title: 'Follow-up Reminder',
        message: `${f.lead?.name} — ${formatFollowUpDateTime(f.scheduledAt)}`,
        time: 'Within 24h',
        priority: f.priority,
        followup: f,
      });
    }

    if (f.priority === 'urgent' && f.status === 'pending') {
      alerts.push({
        id: `urgent-${f._id}`,
        type: 'priority',
        title: 'High Priority Alert',
        message: `${f.lead?.name} — ${f.notes?.slice(0, 50)}`,
        time: formatFollowUpTime(f.scheduledAt),
        priority: 'urgent',
        followup: f,
      });
    }
  });

  const order = { missed: 0, priority: 1, upcoming: 2 };
  return alerts
    .sort((a, b) => (order[a.type] ?? 3) - (order[b.type] ?? 3))
    .slice(0, 8);
}

export function toCalendarEvents(followups) {
  return followups.map((f) => ({
    id: f._id,
    title: f.lead?.name || 'Follow-up',
    start: f.scheduledAt,
    extendedProps: { followup: f },
    backgroundColor: STATUS_COLORS[f.status] || '#2563eb',
    borderColor: 'transparent',
  }));
}

const STATUS_COLORS = {
  pending: '#f59e0b',
  completed: '#10b981',
  missed: '#ef4444',
  rescheduled: '#8b5cf6',
};

export function buildTimelineEntries(followups) {
  const entries = [];
  followups.forEach((f) => {
    if (f.history?.length) {
      f.history.forEach((h, i) => {
        entries.push({
          id: `${f._id}-h-${i}`,
          followupId: f._id,
          customerName: f.lead?.name,
          destination: f.lead?.destination,
          ...h,
        });
      });
    } else {
      entries.push({
        id: f._id,
        followupId: f._id,
        customerName: f.lead?.name,
        destination: f.lead?.destination,
        date: f.scheduledAt,
        executive: f.assignedTo?.name || 'Unassigned',
        remarks: f.notes,
        status: f.status,
      });
    }
  });
  return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function enrichFollowUp(f) {
  const effectiveStatus =
    f.status === 'pending' && isPast(f.scheduledAt) && !isToday(f.scheduledAt) ? 'missed' : f.status;
  return { ...f, effectiveStatus };
}

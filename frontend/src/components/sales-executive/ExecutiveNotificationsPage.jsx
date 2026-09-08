import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, UserPlus, CalendarClock, FileCheck, Trophy } from 'lucide-react';
import API from '../../api/axios';
import { useLogModuleOpened } from '../../hooks/useLogModuleOpened';
import ExecutivePageShell from './ExecutivePageShell';
import { executiveCard, executiveSpinner } from './executivePageStyles';
import { cn } from '../../lib/utils';

const TYPE_META = {
  new_lead: { icon: UserPlus, color: 'text-violet-600 bg-violet-500/10' },
  followup: { icon: CalendarClock, color: 'text-violet-600 bg-violet-500/10' },
  quote_approved: { icon: FileCheck, color: 'text-emerald-600 bg-emerald-500/10' },
  converted: { icon: Trophy, color: 'text-amber-600 bg-amber-500/10' },
};

export default function ExecutiveNotificationsPage() {
  useLogModuleOpened('notifications');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/sales-executive/notifications')
      .then((r) => setItems(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ExecutivePageShell
      title="Notifications"
      description="Lead assignments, reminders, and conversion alerts"
    >
      <div className={`${executiveCard} divide-y divide-subtle`}>
        {loading ? (
          <div className="flex justify-center py-12"><div className={executiveSpinner} /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-content-muted flex flex-col items-center gap-2">
            <Bell className="w-8 h-8 opacity-40" />
            No notifications
          </div>
        ) : items.map((n, i) => {
          const meta = TYPE_META[n.type] || { icon: Bell, color: 'text-content-muted bg-surface-elevated' };
          const Icon = meta.icon;
          return (
            <motion.div
              key={n._id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn('p-5 flex gap-4', !n.read && 'bg-violet-500/[0.03]')}
            >
              <div className={cn('p-2.5 rounded-xl shrink-0 h-fit', meta.color)}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-content-primary">{n.title}</p>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-violet-500" />}
                </div>
                <p className="text-sm text-content-secondary mt-0.5">{n.message}</p>
                <p className="text-xs text-content-muted mt-1">{n.time}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </ExecutivePageShell>
  );
}

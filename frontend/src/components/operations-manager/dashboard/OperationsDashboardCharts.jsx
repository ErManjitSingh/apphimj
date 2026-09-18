import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ClipboardList,
  LogIn,
  LogOut,
  Users,
} from 'lucide-react';
import OperationsDonutChart from './OperationsDonutChart';

const BRANCH_COLORS = ['#3B82F6', '#14B8A6', '#8B5CF6', '#F97316', '#22C55E', '#EC4899'];
const STATUS_COLORS = {
  confirmed: '#22C55E',
  pending: '#F97316',
  active: '#8B5CF6',
  completed: '#94A3B8',
};

function PanelCard({ title, children, footerLink, footerLabel, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-subtle bg-white shadow-sm overflow-hidden h-full flex flex-col"
    >
      <div className="px-5 py-4 border-b border-subtle">
        <h3 className="font-bold text-content-primary">{title}</h3>
      </div>
      <div className="p-5 flex-1">{children}</div>
      {footerLink && (
        <div className="px-5 py-3 border-t border-subtle bg-slate-50/50">
          <Link
            to={footerLink}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            {footerLabel}
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}

function ScheduleRow({ icon: Icon, iconClass, title, count, subtitle }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-subtle last:border-0">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-content-primary">{title}</p>
          <span className="text-lg font-bold text-content-primary tabular-nums">{count}</span>
        </div>
        <p className="text-xs text-content-muted mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

export default function OperationsDashboardCharts({ branchStats, bookingsByStatus, todaySchedule }) {
  const branchData = (branchStats || []).map((b, i) => ({
    name: b.name,
    value: b.count,
    color: BRANCH_COLORS[i % BRANCH_COLORS.length],
  }));

  const statusData = (bookingsByStatus || [])
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: s.label,
      value: s.count,
      color: STATUS_COLORS[s.status] || '#94A3B8',
    }));

  const schedule = todaySchedule || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <PanelCard
        title="Team Statistics"
        footerLink="/operations-manager/reports"
        footerLabel="View details"
        delay={0.05}
      >
        <OperationsDonutChart data={branchData} totalLabel="Bookings" />
      </PanelCard>

      <PanelCard
        title="Bookings by Status"
        footerLink="/operations-manager/bookings/pending"
        footerLabel="View All Bookings"
        delay={0.1}
      >
        <OperationsDonutChart data={statusData} totalLabel="Bookings" />
      </PanelCard>

      <PanelCard
        title="Today's Schedule"
        footerLink="/operations-manager/calendar"
        footerLabel="View Full Schedule"
        delay={0.15}
      >
        <div>
          <ScheduleRow
            icon={LogIn}
            iconClass="bg-violet-100 text-violet-600"
            title="Arrivals"
            count={schedule.arrivals?.count ?? 0}
            subtitle={schedule.arrivals?.subtitle || 'No arrivals today'}
          />
          <ScheduleRow
            icon={LogOut}
            iconClass="bg-blue-100 text-blue-600"
            title="Departures"
            count={schedule.departures?.count ?? 0}
            subtitle={schedule.departures?.subtitle || 'No departures today'}
          />
          <ScheduleRow
            icon={Users}
            iconClass="bg-emerald-100 text-emerald-600"
            title="Guests On Trip"
            count={schedule.guestsOnTrip?.count ?? 0}
            subtitle={schedule.guestsOnTrip?.subtitle || 'No guests on trip'}
          />
          <ScheduleRow
            icon={ClipboardList}
            iconClass="bg-orange-100 text-orange-600"
            title="Pending Tasks"
            count={schedule.pendingTasks?.count ?? 0}
            subtitle={schedule.pendingTasks?.subtitle || 'All tasks clear'}
          />
        </div>
      </PanelCard>
    </div>
  );
}

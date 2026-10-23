import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListTodo, Loader2 } from 'lucide-react';
import API from '../../../api/axios';
import PageHeader from '../../ui/PageHeader';
import { Button } from '../../ui/button';
import OperationsDataTable from '../ui/OperationsDataTable';
import OperationsFilterTabs from '../ui/OperationsFilterTabs';
import { formatDate } from '../operationsUtils';
import { cn } from '../../../lib/utils';

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const STATUS_STYLE = {
  pending: 'bg-amber-500/15 text-amber-700',
  in_progress: 'bg-sky-500/15 text-sky-700',
  completed: 'bg-emerald-500/15 text-emerald-700',
  cancelled: 'bg-slate-500/15 text-slate-600',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const fetchTasks = useCallback(() => {
    setLoading(true);
    API.get('/operations-manager/tasks', { params: { status: filter || undefined } })
      .then((r) => setTasks(r.data || []))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    await API.patch(`/operations-manager/tasks/${id}`, { status });
    fetchTasks();
    setUpdating(null);
  };

  const columns = useMemo(() => [
    {
      key: 'title',
      header: 'Task',
      render: (t) => (
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-teal-500/10 shrink-0 mt-0.5">
            <ListTodo className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <p className="font-semibold">{t.title}</p>
            <p className="text-xs text-content-muted capitalize mt-0.5">{t.type?.replace(/_/g, ' ')}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      className: 'text-content-muted whitespace-nowrap',
      render: (t) => formatDate(t.dueDate),
    },
    {
      key: 'booking',
      header: 'Booking',
      render: (t) => (
        t.booking ? (
          <Link
            to={`/operations-manager/booking/${t.booking}`}
            className="text-xs font-medium text-teal-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            View booking
          </Link>
        ) : '—'
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <span className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-lg capitalize', STATUS_STYLE[t.status])}>
          {t.status?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (t) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {t.status === 'pending' && (
            <Button variant="outline" size="sm" className="h-8 rounded-xl" disabled={updating === t._id} onClick={() => updateStatus(t._id, 'in_progress')}>
              {updating === t._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Start'}
            </Button>
          )}
          {t.status === 'in_progress' && (
            <Button variant="teal" size="sm" className="h-8 rounded-xl" disabled={updating === t._id} onClick={() => updateStatus(t._id, 'completed')}>
              Done 👍
            </Button>
          )}
        </div>
      ),
    },
  ], [updating]);

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Operations Tasks"
        description="Hotel confirmation, cab assignment, vouchers & payment verification"
        breadcrumbs={['Operations', 'Tasks']}
      />

      <OperationsFilterTabs options={STATUS_FILTERS} value={filter} onChange={setFilter} />

      <OperationsDataTable
        columns={columns}
        data={tasks}
        loading={loading}
        emptyIcon={ListTodo}
        emptyTitle="No tasks found"
        emptyDescription="Tasks are auto-created when bookings need hotel, cab, or voucher confirmation."
        footer={tasks.length ? `${tasks.length} task${tasks.length === 1 ? '' : 's'}` : undefined}
      />
    </div>
  );
}

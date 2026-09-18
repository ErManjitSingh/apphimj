import { useEffect, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import API from '../../../api/axios';
import Avatar from '../../ui/Avatar';
import { useWizardForm } from '../WizardFormContext';
import { cn } from '../../../lib/utils';

/**
 * Admin / lead_provider / manager create-lead assignment.
 * Default: leave unassigned (skip auto-assign). Optional: pick SE / SM / TL.
 */
export default function LeadCreateAssignmentSection() {
  const { watch, setValue } = useWizardForm();
  const assignmentMode = watch('assignmentMode') || 'unassigned';
  const assignedTo = watch('assignedTo') || '';
  const assigneeRole = watch('assigneeRole') || 'sales_executive';

  const [assignees, setAssignees] = useState({
    salesExecutives: [],
    salesManagers: [],
    teamLeaders: [],
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    API.get('/leads/assignees', { skipErrorToast: true })
      .then((res) => {
        setAssignees({
          salesExecutives: res.data.salesExecutives || [],
          salesManagers: res.data.salesManagers || [],
          teamLeaders: res.data.teamLeaders || [],
        });
      })
      .catch(() => setLoadError('Could not load team members.'))
      .finally(() => setLoading(false));
  }, []);

  const people =
    assigneeRole === 'sales_manager'
      ? assignees.salesManagers
      : assigneeRole === 'team_leader'
        ? assignees.teamLeaders
        : assignees.salesExecutives;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
            <UserPlus className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">Assignment</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Leave unassigned for later, or pick who should handle this lead
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setValue('assignmentMode', 'unassigned');
              setValue('assignedTo', '');
            }}
            className={cn(
              'rounded-xl border p-3.5 text-left transition-all',
              assignmentMode === 'unassigned'
                ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200'
                : 'border-slate-200 hover:border-violet-200 hover:bg-slate-50'
            )}
          >
            <p className="text-sm font-bold text-slate-900">Leave unassigned</p>
            <p className="text-xs text-slate-500 mt-1">
              Goes to Unassigned pool — assign later from Lead Management
            </p>
          </button>
          <button
            type="button"
            onClick={() => setValue('assignmentMode', 'assign')}
            className={cn(
              'rounded-xl border p-3.5 text-left transition-all',
              assignmentMode === 'assign'
                ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200'
                : 'border-slate-200 hover:border-violet-200 hover:bg-slate-50'
            )}
          >
            <p className="text-sm font-bold text-slate-900">Assign now</p>
            <p className="text-xs text-slate-500 mt-1">Choose sales executive, team leader, or manager</p>
          </button>
        </div>

        {assignmentMode === 'assign' && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'sales_executive', label: 'Sales Executive' },
                { value: 'team_leader', label: 'Team Leader' },
                { value: 'sales_manager', label: 'Sales Manager' },
              ].map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => {
                    setValue('assigneeRole', role.value);
                    setValue('assignedTo', '');
                  }}
                  className={cn(
                    'h-9 px-3 rounded-lg text-xs font-bold border transition-colors',
                    assigneeRole === role.value
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {role.label}
                </button>
              ))}
            </div>

            {loadError && (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                {loadError}
              </p>
            )}
            {loading ? (
              <p className="text-sm text-slate-500">Loading team…</p>
            ) : people.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                No users found for this role.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                {people.map((person) => (
                  <button
                    key={person._id}
                    type="button"
                    onClick={() => setValue('assignedTo', person._id)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                      assignedTo === person._id
                        ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200'
                        : 'border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <Avatar name={person.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{person.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {person.roleName || person.role || assigneeRole}
                      </p>
                    </div>
                    {assignedTo === person._id && (
                      <Users className="w-4 h-4 text-violet-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

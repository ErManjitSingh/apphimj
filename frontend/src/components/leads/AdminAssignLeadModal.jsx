import { useEffect, useMemo, useState } from 'react';
import { X, UserPlus, Briefcase, Crown, Users, Search } from 'lucide-react';
import { Button } from '../ui/button';
import AppModal from '../ui/AppModal';
import Avatar from '../ui/Avatar';
import { cn } from '../../lib/utils';

const ROLE_OPTIONS = [
  { value: 'sales_executive', label: 'Sales Executive', icon: Users, desc: 'Handle lead directly' },
  { value: 'team_leader', label: 'Team Leader', icon: Crown, desc: 'Manage team and assign to executives' },
  { value: 'sales_manager', label: 'Sales Manager', icon: Briefcase, desc: 'Oversee and distribute leads' },
];

export default function AdminAssignLeadModal({
  open,
  lead,
  assignees,
  loading,
  onClose,
  onAssign,
  allowedRoles = ['sales_manager', 'team_leader', 'sales_executive'],
}) {
  const isBulk = lead?.bulk;
  const roleOptions = ROLE_OPTIONS.filter((r) => allowedRoles.includes(r.value));
  const preferredDefault =
    roleOptions.find((r) => r.value === 'sales_executive')?.value ||
    roleOptions[0]?.value ||
    'sales_executive';
  const [role, setRole] = useState(preferredDefault);
  const [assigneeId, setAssigneeId] = useState('');
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (open) {
      setRole(preferredDefault);
      setAssigneeId('');
      setUserSearch('');
    }
  }, [open, preferredDefault]);

  const people =
    role === 'sales_manager'
      ? assignees?.salesManagers || []
      : role === 'team_leader'
        ? assignees?.teamLeaders || []
        : assignees?.salesExecutives || [];

  useEffect(() => {
    if (!open || loading || !assignees) return;
    const counts = {
      sales_manager: (assignees.salesManagers || []).length,
      team_leader: (assignees.teamLeaders || []).length,
      sales_executive: (assignees.salesExecutives || []).length,
    };
    if (counts[role] > 0) return;
    const fallback = roleOptions.find((r) => counts[r.value] > 0);
    if (fallback) {
      setRole(fallback.value);
      setAssigneeId('');
    }
  }, [open, loading, assignees, role, roleOptions]);

  const filteredPeople = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return people;
    return people.filter((person) => {
      const name = String(person.name || '').toLowerCase();
      const email = String(person.email || '').toLowerCase();
      const phone = String(person.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [people, userSearch]);

  const handleClose = () => {
    setRole(preferredDefault);
    setAssigneeId('');
    setUserSearch('');
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!assigneeId) return;
    const leadIds = isBulk ? lead.leadIds : [lead._id];
    onAssign({ assigneeRole: role, assigneeId, leadIds });
    setAssigneeId('');
  };

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    setAssigneeId('');
    setUserSearch('');
  };

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      size="md"
      className="overflow-hidden flex flex-col !max-h-[min(calc(100vh-1.5rem),640px)]"
      panelClassName="max-w-[min(28rem,calc(100vw-1.5rem))]"
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-subtle px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-base font-bold flex items-center gap-2 sm:text-lg min-w-0">
            <UserPlus className="w-5 h-5 text-violet-600 shrink-0" />
            <span className="truncate">{isBulk ? `Assign ${lead?.count} Leads` : 'Assign Lead'}</span>
          </h2>
          <button type="button" onClick={handleClose} className="p-2 rounded-xl hover:bg-surface-elevated shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">
          {!isBulk && lead && (
            <div className="p-3 rounded-xl bg-surface-elevated/50 border border-subtle text-sm">
              <p className="font-semibold text-content-primary">{lead.name}</p>
              <p className="text-content-muted truncate">
                {lead.destination} · {lead.sourceLabel || lead.source}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-content-muted mb-2">
              Assign to role
            </label>
            <div className={cn('grid gap-2', roleOptions.length > 1 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1')}>
              {roleOptions.map((opt) => {
                const Icon = opt.icon;
                const selected = role === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleRoleChange(opt.value)}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      selected
                        ? 'border-violet-500/40 bg-violet-500/10 ring-2 ring-violet-500/20'
                        : 'border-subtle bg-surface-elevated/40 hover:border-violet-500/25'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 mb-1.5', selected ? 'text-violet-600' : 'text-content-muted')} />
                    <p className="text-xs font-semibold text-content-primary">{opt.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-content-muted mb-1.5">
              Select {roleOptions.find((r) => r.value === role)?.label}
            </label>
            {loading ? (
              <p className="text-sm text-content-muted py-2">Loading team members…</p>
            ) : people.length === 0 ? (
              <p className="text-sm text-amber-600 py-2">No active users found for this role.</p>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search user…"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-subtle bg-white text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 sm:max-h-48">
                  {filteredPeople.length === 0 ? (
                    <p className="text-sm text-content-muted py-2">No users match “{userSearch.trim()}”.</p>
                  ) : (
                    filteredPeople.map((person) => {
                      const selected = assigneeId === person._id;
                      return (
                        <button
                          key={person._id}
                          type="button"
                          onClick={() => setAssigneeId(person._id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                            selected
                              ? 'border-brand-500/40 bg-brand-500/10 ring-2 ring-brand-500/20'
                              : 'border-subtle hover:bg-surface-elevated'
                          )}
                        >
                          <Avatar name={person.name} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-content-primary truncate">{person.name}</p>
                            <p className="text-xs text-content-muted truncate">{person.email || person.roleName}</p>
                          </div>
                          {selected && (
                            <span className="text-[10px] font-bold uppercase text-brand-600 bg-brand-500/15 px-2 py-0.5 rounded-full shrink-0">
                              Selected
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-subtle bg-surface px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button type="button" variant="secondary" onClick={handleClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={!assigneeId || loading} className="w-full sm:w-auto">
              Confirm Assignment
            </Button>
          </div>
        </div>
      </form>
    </AppModal>
  );
}

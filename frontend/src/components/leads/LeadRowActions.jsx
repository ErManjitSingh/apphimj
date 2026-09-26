import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Eye,
  Pencil,
  UserCheck,
  UserPlus,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import Avatar from '../ui/Avatar';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';

function MenuActionIcon({ icon: Icon, tone }) {
  const tones = {
    sky: 'bg-sky-500/12 text-sky-600 ring-sky-500/20',
    violet: 'bg-violet-500/12 text-violet-600 ring-violet-500/20',
    emerald: 'bg-emerald-500/12 text-emerald-600 ring-emerald-500/20',
    fuchsia: 'bg-fuchsia-500/12 text-fuchsia-600 ring-fuchsia-500/20',
    rose: 'bg-rose-500/12 text-rose-600 ring-rose-500/20',
  };

  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
        tones[tone]
      )}
    >
      <Icon className="w-3.5 h-3.5" />
    </span>
  );
}

function ActionCluster({ children, className }) {
  return (
    <div
      className={cn(
        'inline-flex items-stretch rounded-xl',
        'bg-white dark:bg-slate-900',
        'ring-1 ring-violet-500/20 shadow-sm shadow-violet-500/10',
        className
      )}
    >
      {children}
    </div>
  );
}

function AssignButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-l-xl px-2.5 text-[11px] font-semibold text-white',
        'bg-gradient-to-r from-violet-600 via-indigo-600 to-brand-600',
        'hover:brightness-110 active:scale-[0.98] transition-all',
        'shadow-inner shadow-white/10'
      )}
    >
      <UserPlus className="w-3.5 h-3.5 shrink-0" />
      <span>Assign</span>
    </button>
  );
}

/** Shows assignee name in place of Assign — click opens assign modal to change. */
function AssignedNameButton({ name, onClick, clickable }) {
  const className = cn(
    'inline-flex h-8 max-w-[120px] items-center gap-1.5 rounded-l-xl border border-r-0 border-emerald-500/30',
    'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent pl-1.5 pr-2.5',
    clickable && 'hover:from-emerald-500/25 hover:via-teal-500/15 cursor-pointer transition-colors'
  );

  if (!clickable) {
    return (
      <div title={name} className={className}>
        <Avatar name={name} size="sm" className="!h-5 !w-5 !text-[8px] ring-2 ring-emerald-500/25 shrink-0" />
        <span className="truncate text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">{name}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      title={`${name} — click to change`}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className={className}
    >
      <Avatar name={name} size="sm" className="!h-5 !w-5 !text-[8px] ring-2 ring-emerald-500/25 shrink-0" />
      <span className="truncate text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">{name}</span>
    </button>
  );
}

const MoreMenuButton = forwardRef(function MoreMenuButton(
  { solo = false, className, onPointerDown, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown?.(e);
      }}
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center',
        'text-content-muted hover:text-violet-600',
        'bg-white dark:bg-slate-900 hover:bg-violet-500/10',
        'border-violet-500/15 transition-colors',
        solo ? 'rounded-xl border' : 'rounded-none rounded-r-xl border-l',
        className
      )}
      aria-label="More actions"
      {...props}
    >
      <MoreHorizontal className="w-4 h-4" />
    </button>
  );
});

export default function LeadRowActions({
  lead,
  onRowClick,
  onDelete,
  onAssign,
  canEditLead = true,
  actions,
  showAssignButton = true,
}) {
  const assignedName = lead.assignedTo?.name;
  const canAssign = Boolean(actions.assign && onAssign);
  const showAssign = showAssignButton && canAssign && !assignedName;
  const showAssignedName = Boolean(assignedName) && (showAssignButton || canAssign);
  const showEdit = actions.edit && canEditLead;
  const showAssignMenu = canAssign;
  const showDelete = actions.delete && onDelete;
  const hasMenuItems = actions.view || showEdit || showAssignMenu || showDelete;
  const hasLeading = showAssign || showAssignedName;

  const menuContent = (
    <DropdownMenuContent
      align="end"
      side="left"
      sideOffset={8}
      collisionPadding={12}
      className="z-[200] min-w-[232px] rounded-2xl border-violet-500/15 bg-surface p-1.5 shadow-xl shadow-violet-500/10"
    >
      <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-violet-600/80">
        Lead Actions
      </DropdownMenuLabel>
      {actions.view && (
        <DropdownMenuItem
          onClick={() => onRowClick?.(lead)}
          className="gap-3 rounded-xl px-2 py-2.5 focus:bg-violet-500/8"
        >
          <MenuActionIcon icon={Eye} tone="sky" />
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold text-content-primary">View Lead</p>
            <p className="text-[11px] text-content-muted">Open quick preview</p>
          </div>
        </DropdownMenuItem>
      )}
      {showEdit && (
        <DropdownMenuItem asChild className="gap-3 rounded-xl px-2 py-2.5 focus:bg-violet-500/8">
          <Link to={`/leads/${lead._id}/edit`}>
            <MenuActionIcon icon={Pencil} tone="violet" />
            <div className="min-w-0 text-left">
              <p className="text-sm font-semibold text-content-primary">Edit Lead</p>
              <p className="text-[11px] text-content-muted">Update customer details</p>
            </div>
          </Link>
        </DropdownMenuItem>
      )}
      {showAssignMenu && (
        <DropdownMenuItem
          onClick={() => onAssign(lead)}
          className="gap-3 rounded-xl px-2 py-2.5 focus:bg-violet-500/8"
        >
          <MenuActionIcon icon={UserCheck} tone="emerald" />
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold text-content-primary">
              {assignedName ? 'Reassign' : 'Assign Lead'}
            </p>
            <p className="text-[11px] text-content-muted">
              {assignedName
                ? `Currently: ${assignedName}`
                : 'Pick sales executive or manager'}
            </p>
          </div>
        </DropdownMenuItem>
      )}

      {showDelete && (
        <>
          <DropdownMenuSeparator className="my-1.5 bg-violet-500/10" />
          <DropdownMenuItem
            className="gap-3 rounded-xl px-2 py-2.5 text-rose-600 focus:bg-rose-500/10 focus:text-rose-600"
            onClick={() => onDelete(lead._id)}
          >
            <MenuActionIcon icon={Trash2} tone="rose" />
            <div className="min-w-0 text-left">
              <p className="text-sm font-semibold">Delete Lead</p>
              <p className="text-[11px] text-rose-500/80">Permanent removal</p>
            </div>
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  );

  if (!hasLeading && !hasMenuItems) return null;

  if (!hasLeading && hasMenuItems) {
    return (
      <div className="relative z-10" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <DropdownMenuRoot modal={false}>
          <DropdownMenuTrigger asChild>
            <MoreMenuButton solo className="ring-1 ring-violet-500/20 shadow-sm shadow-violet-500/10" />
          </DropdownMenuTrigger>
          {menuContent}
        </DropdownMenuRoot>
      </div>
    );
  }

  return (
    <div className="relative z-10" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      <ActionCluster>
        {showAssign && <AssignButton onClick={() => onAssign(lead)} />}
        {showAssignedName && (
          <AssignedNameButton
            name={assignedName}
            clickable={canAssign}
            onClick={() => onAssign(lead)}
          />
        )}
        {hasMenuItems && (
          <DropdownMenuRoot modal={false}>
            <DropdownMenuTrigger asChild>
              <MoreMenuButton />
            </DropdownMenuTrigger>
            {menuContent}
          </DropdownMenuRoot>
        )}
      </ActionCluster>
    </div>
  );
}

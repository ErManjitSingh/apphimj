import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { useSidebarTheme } from './SidebarThemeContext';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';

const ROLE_LABELS = {
  admin: 'Admin',
  accountant: 'Accountant',
  lead_provider: 'Lead Provider',
  sales_executive: 'Sales Executive',
  sales_manager: 'Sales Manager',
  team_leader: 'Team Leader',
  operations_manager: 'Operations Manager',
  hr: 'HR Admin',
  hr_manager: 'HR Manager',
};

function getInitials(name) {
  return (
    String(name || 'U')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'
  );
}

function roleLabel(role) {
  return ROLE_LABELS[role] || String(role || 'User').replace(/_/g, ' ');
}

export default function SidebarAccountFooter() {
  const { collapsed, setMobileOpen } = useSidebar();
  const { accent, profilePath } = useSidebarTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isLight = accent.titleGradient === 'text-slate-900';

  const handleLogout = async () => {
    window.setTimeout(() => setMobileOpen(false), 0);
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const closeMobile = () => window.setTimeout(() => setMobileOpen(false), 0);

  if (!isLight) {
    const logoutClass = 'text-rose-200 hover:bg-rose-500/15 hover:text-white';
    if (collapsed) {
      return (
        <div className="border-t border-white/10 p-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleLogout}
                className={cn('flex h-10 w-full items-center justify-center rounded-xl', logoutClass)}
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Logout</TooltipContent>
          </Tooltip>
        </div>
      );
    }
    return (
      <div className="border-t border-white/10 px-3 py-3">
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-[13px] font-semibold',
            logoutClass
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
        </button>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="mt-auto border-t border-slate-100 p-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => {
                closeMobile();
                navigate(profilePath || '/profile');
              }}
              className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-xs font-bold text-white shadow-md shadow-orange-500/25"
            >
              {getInitials(user?.name)}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{user?.name || 'Profile'}</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="mt-auto shrink-0 border-t border-slate-100 px-3 pb-3 pt-3">
      <DropdownMenuRoot>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-2.5 py-2 text-left shadow-sm transition hover:bg-slate-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-[11px] font-bold text-white shadow-sm shadow-orange-500/20">
              {getInitials(user?.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-slate-800">
                {user?.name || 'User'}
              </span>
              <span className="block truncate text-[11px] text-slate-400">
                {roleLabel(user?.role)}
              </span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-52">
          <DropdownMenuItem asChild>
            <Link to={profilePath || '/profile'} onClick={closeMobile} className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              handleLogout();
            }}
            className="text-rose-600 focus:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenuRoot>
    </div>
  );
}

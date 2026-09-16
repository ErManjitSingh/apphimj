import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Plus, Bell, Sun, Moon, Menu, X, LogOut, User, LogIn, ChevronDown, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { NOTIFICATIONS_ENABLED } from '../config/notifications';
import { getTopBarAccent } from './topbarAccent';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import { cn } from '../lib/utils';
import AttendanceTopBarAction from './attendance/AttendanceTopBarAction';
import HeaderLatestActivity from './HeaderLatestActivity';
import API from '../api/axios';
import {
  hydrateSelectedBranch,
  setAvailableBranches,
  setSelectedBranch,
} from '../store/slices/branchSlice';
import { refreshAppData } from '../lib/appRefresh';
import { useSidebar } from '../context/SidebarContext';

function getInitials(name) {
  return (
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'
  );
}

function getProfilePath(pathname) {
  if (pathname.startsWith('/hr')) return '/hr/profile';
  if (pathname.startsWith('/operations-manager')) return '/operations-manager/profile';
  if (pathname.startsWith('/sales-manager')) return '/sales-manager/profile';
  if (pathname.startsWith('/team-leader')) return '/team-leader/profile';
  if (pathname.startsWith('/sales-executive')) return '/sales-executive/profile';
  return '/profile';
}

function IconButton({ children, className, accent, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'relative flex items-center justify-center h-8 w-8 rounded-lg',
        'bg-white/80 text-slate-500 ring-1 ring-orange-100/80',
        'transition-all duration-150 hover:text-orange-600 hover:bg-orange-50 hover:ring-orange-200',
        accent.iconHover,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export default function TopBar({ onMenuClick }) {
  const { mobileOpen, toggleMobileOpen } = useSidebar();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const { toggleTheme, isDark } = useTheme();
  const { user, logout, hasPermission } = useAuth();
  const { unreadCount, openDrawer } = useNotifications();
  const { selectedBranchId } = useSelector((s) => s.branch);
  const navigate = useNavigate();
  const location = useLocation();
  const accent = getTopBarAccent(location.pathname);
  const profilePath = getProfilePath(location.pathname);
  const isAdmin = user?.role === 'admin';
  const isLeadProvider = user?.role === 'lead_provider';
  const canSwitchBranches = isAdmin || isLeadProvider;
  const canAddLead = isAdmin || isLeadProvider || hasPermission?.('leads', 'create');
  const adminRoleLine = user?.roleName || user?.role;
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    dispatch(hydrateSelectedBranch());
  }, [dispatch]);

  useEffect(() => {
    if (!canSwitchBranches) return;
    API.get('/branches', { skipSuccessToast: true, skipErrorToast: true })
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        dispatch(setAvailableBranches(list));
        if (!list.length) return;
        const storedBranchId =
          typeof window !== 'undefined'
            ? window.localStorage.getItem('crm.selectedBranchId')
            : null;
        const resolvedBranchId =
          selectedBranchId && list.some((b) => b._id === selectedBranchId)
            ? selectedBranchId
            : storedBranchId && list.some((b) => b._id === storedBranchId)
              ? storedBranchId
              : null;
        if (!resolvedBranchId) {
          const preferredBranchId =
            user?.branchId && list.some((b) => b._id === user.branchId)
              ? user.branchId
              : list[0]._id;
          dispatch(setSelectedBranch(preferredBranchId));
        } else if (resolvedBranchId !== selectedBranchId) {
          dispatch(setSelectedBranch(resolvedBranchId));
        }
      })
      .catch(() => {
        dispatch(setAvailableBranches([]));
      });
  }, [dispatch, canSwitchBranches, selectedBranchId, user?.branchId]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  const handleAppRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['header-activity'] });
    refreshAppData(queryClient).finally(() => {
      window.setTimeout(() => setIsRefreshing(false), 900);
    });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-orange-100/60 bg-white/85 backdrop-blur-2xl">
      <div className={cn('absolute inset-x-0 top-0 h-px bg-gradient-to-r', accent.stripe)} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(249,115,22,0.07)_0%,rgba(255,255,255,0)_45%,rgba(251,191,36,0.08)_100%)]" />
      <div className="relative flex items-center gap-2 px-3 lg:px-5 h-14">
        <button
          type="button"
          onClick={() => toggleMobileOpen()}
          className={cn(
            'lg:hidden flex items-center justify-center h-8 w-8 rounded-lg',
            'bg-white/80 text-slate-500 ring-1 ring-orange-100',
            accent.iconHover
          )}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        {user ? <HeaderLatestActivity /> : <div className="flex-1" />}

        <div className="flex items-center gap-1.5 shrink-0">
          {user && (
            <IconButton
              accent={accent}
              onClick={handleAppRefresh}
              disabled={isRefreshing}
              title="Refresh data"
              aria-label="Refresh data"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
            </IconButton>
          )}

          {canAddLead && (
            <Link
              to={user?.role === 'sales_executive' ? '/sales-executive/leads/add' : '/leads/new'}
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 shadow-sm shadow-orange-500/25 hover:from-orange-400 hover:to-amber-400 active:scale-[0.98] transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Lead
            </Link>
          )}

          <AttendanceTopBarAction accent={accent} />

          {canAddLead && (
            <Link
              to={user?.role === 'sales_executive' ? '/sales-executive/leads/add' : '/leads/new'}
              className="sm:hidden flex items-center justify-center h-8 w-8 rounded-lg text-white bg-orange-500 shadow-sm"
              aria-label="Add Lead"
            >
              <Plus className="w-4 h-4" />
            </Link>
          )}

          <span className="hidden sm:block mx-0.5 h-5 w-px bg-orange-100" />

          {NOTIFICATIONS_ENABLED && (
            <IconButton
              accent={accent}
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              onClick={openDrawer}
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </IconButton>
          )}

          <IconButton accent={accent} onClick={toggleTheme} aria-label="Toggle theme">
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </IconButton>

          {user ? (
            <DropdownMenuRoot>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 pl-1 pr-1.5 h-8 rounded-lg bg-white/90 ring-1 ring-orange-100 hover:bg-orange-50/80 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40"
                >
                  <div className="relative">
                    <div className={cn('w-6 h-6 rounded-md bg-gradient-to-br flex items-center justify-center text-[9px] font-bold text-white', accent.avatar)}>
                      {getInitials(user.name)}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                  <div className="hidden lg:block text-left min-w-0 max-w-[96px]">
                    <p className="text-[11px] font-semibold text-slate-800 truncate leading-none">{user.name}</p>
                    <p className="mt-0.5 text-[9px] font-medium text-orange-500 truncate leading-none">{adminRoleLine}</p>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400 hidden lg:block shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5">
                <DropdownMenuLabel className="px-2 py-2">
                  <p className="font-bold text-content-primary truncate">{user.name}</p>
                  <p className="text-xs font-normal text-content-muted truncate mt-0.5">{user.email}</p>
                  <span className="inline-block mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700">
                    ● Online
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={profilePath} className="cursor-pointer rounded-lg">
                    <User className="w-4 h-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 focus:bg-red-500/10 rounded-lg cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuRoot>
          ) : (
            <Link
              to="/login"
              className={cn(
                'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold text-white',
                'bg-gradient-to-r shadow-md transition-all', accent.addBtn
              )}
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

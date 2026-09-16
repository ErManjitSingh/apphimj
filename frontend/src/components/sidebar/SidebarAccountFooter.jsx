import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { useSidebarTheme } from './SidebarThemeContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../../lib/utils';

export default function SidebarAccountFooter() {
  const { collapsed, setMobileOpen } = useSidebar();
  const { accent } = useSidebarTheme();
  const { logout } = useAuth();
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

  const logoutClass = isLight
    ? 'text-rose-600 hover:bg-rose-50'
    : 'text-rose-200 hover:bg-rose-500/15 hover:text-white';

  if (collapsed) {
    return (
      <div className={cn('border-t p-2', isLight ? 'border-slate-100' : 'border-white/10')}>
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
    <div className={cn('border-t px-3 py-3', isLight ? 'border-slate-100' : 'border-white/10')}>
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

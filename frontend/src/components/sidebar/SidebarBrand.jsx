import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, X } from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { useSidebarTheme } from './SidebarThemeContext';
import { APP_BRAND_NAME, APP_DEFAULT_SUBTITLE } from '../../config/branding';
import BrandLogo from '../BrandLogo';
import { cn } from '../../lib/utils';

export default function SidebarBrand({ title = APP_BRAND_NAME, subtitle = APP_DEFAULT_SUBTITLE }) {
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const { accent } = useSidebarTheme();
  const isLight = accent.titleGradient === 'text-slate-900';

  if (collapsed) {
    return (
      <div className="px-2.5 pt-5 pb-3">
        <button
          type="button"
          onClick={toggleCollapsed}
          className="group w-full flex flex-col items-center gap-2"
          aria-label="Expand sidebar"
        >
          <BrandLogo className="w-10 h-10 shadow-lg shadow-black/30" />
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 pt-4 pb-3">
      <div className="flex items-center gap-3">
        <BrandLogo className="w-10 h-10 shadow-lg shadow-black/30" />

        <AnimatePresence mode="wait">
          <motion.div
            key="brand-text"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            className="flex-1 min-w-0"
          >
            <h1 className={cn('text-[15px] font-bold tracking-tight leading-tight', accent.titleGradient)}>
              {title}
            </h1>
            {subtitle && (
              <p className={cn('text-[11px] font-medium truncate mt-0.5', accent.subtitleText || 'text-slate-400')}>
                {subtitle}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {mobileOpen && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'shrink-0 p-1.5 rounded-lg transition-colors lg:hidden',
              isLight
                ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
            )}
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={toggleCollapsed}
          className={cn(
            'shrink-0 p-1.5 rounded-lg transition-colors hidden lg:flex',
            isLight
              ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
          )}
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

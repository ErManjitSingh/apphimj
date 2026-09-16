import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from '../../context/SidebarContext';

export default function SidebarQuickActions({ actions }) {
  const { collapsed, setMobileOpen } = useSidebar();
  const showCustomActions = Array.isArray(actions) && actions.length > 0;

  if (collapsed || !showCustomActions) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-2 pb-2">
        <div className="space-y-0.5">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.path}
                to={action.path}
                onClick={() => {
                  window.setTimeout(() => setMobileOpen(false), 0);
                }}
                className="group flex items-center gap-2.5 rounded-xl px-2 py-2 text-[13px] font-medium text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-violet-400" strokeWidth={2} />
                <span className="flex-1 truncate">{action.label}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

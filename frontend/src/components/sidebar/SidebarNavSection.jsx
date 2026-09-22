import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from '../../context/SidebarContext';
import { cn } from '../../lib/utils';

export default function SidebarNavSection({ label }) {
  const { collapsed } = useSidebar();

  if (collapsed) {
    return <div className="my-2 mx-2 border-t border-sidebar-border/70" aria-hidden />;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-4 pb-1.5 px-3 first:pt-2"
      >
        <p
          className={cn(
            'text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-text',
            'select-none'
          )}
        >
          {label}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

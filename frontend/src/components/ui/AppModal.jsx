import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
};

export default function AppModal({
  open,
  onClose,
  children,
  size = 'lg',
  className,
  panelClassName,
  closeOnBackdrop = true,
  lockDismiss = false,
  /** Stacking order — raise for dialogs that open above another modal (e.g. confirm). */
  zIndexClass = 'z-[200]',
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => {
      if (!lockDismiss && e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, lockDismiss]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <div
          className={cn(
            'fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4 md:p-6',
            zIndexClass
          )}
          role="presentation"
        >
          <motion.div
            key="app-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-[8px]"
            onClick={closeOnBackdrop ? onClose : undefined}
            aria-hidden="true"
          />
          <motion.div
            key="app-modal-panel"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className={cn(
              'relative z-10 w-full',
              SIZES[size] || size,
              'max-h-[min(100dvh,100vh)] sm:max-h-[min(calc(100vh-2rem),920px)]',
              panelClassName
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                'rounded-t-2xl border border-subtle/80 bg-surface shadow-2xl shadow-black/50 sm:rounded-2xl',
                'max-h-[inherit] overflow-y-auto',
                className,
              )}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

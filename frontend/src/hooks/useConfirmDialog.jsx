import { useCallback, useRef, useState } from 'react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const DEFAULT_DIALOG = {
  open: false,
  title: 'Please confirm',
  message: 'Are you sure you want to continue?',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  tone: 'danger',
};

export function useConfirmDialog() {
  const [dialog, setDialog] = useState(DEFAULT_DIALOG);
  const resolveRef = useRef(null);

  // Stable identity (refs + setState only) so consumers can safely list `confirm`
  // in their own useCallback/useMemo deps without forcing a new closure every render.
  const confirm = useCallback(
    (config = {}) =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        setDialog({
          ...DEFAULT_DIALOG,
          ...config,
          open: true,
        });
      }),
    []
  );

  const close = useCallback((result) => {
    setDialog((prev) => ({ ...prev, open: false }));
    if (resolveRef.current) {
      resolveRef.current(Boolean(result));
      resolveRef.current = null;
    }
  }, []);

  const dialogNode = (
    <ConfirmDialog
      open={dialog.open}
      title={dialog.title}
      message={dialog.message}
      confirmLabel={dialog.confirmLabel}
      cancelLabel={dialog.cancelLabel}
      tone={dialog.tone}
      onConfirm={() => close(true)}
      onCancel={() => close(false)}
    />
  );

  return { confirm, dialogNode };
}

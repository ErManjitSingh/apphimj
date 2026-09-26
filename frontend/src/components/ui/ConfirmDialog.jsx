import { AlertTriangle } from 'lucide-react';
import AppModal from './AppModal';
import { Button } from './button';

export default function ConfirmDialog({
  open,
  title = 'Please confirm',
  message = 'Are you sure you want to continue?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  const isDanger = tone === 'danger';

  return (
    <AppModal open={open} onClose={onCancel} size="sm" zIndexClass="z-[320]" className="overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
              isDanger ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-content-primary">{title}</h3>
            <p className="text-sm text-content-muted mt-1">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={isDanger ? 'destructive' : 'default'}
            onClick={onConfirm}
            className="w-full sm:w-auto"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </AppModal>
  );
}

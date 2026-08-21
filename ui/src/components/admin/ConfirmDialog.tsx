import { type ReactNode, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/20 p-4 backdrop-blur-sm overflow-y-auto">
      <Card className="w-full max-w-md max-h-[90dvh] overflow-y-auto my-auto shadow-xl">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="text-sm text-muted-foreground">{message}</div>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onCancel} className="min-h-[40px] px-4">
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={onConfirm} className="min-h-[40px] px-4">
              {confirmLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

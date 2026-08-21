import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function DetailDrawer({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside
        className={cn(
          'relative flex h-[100dvh] max-h-[100dvh] w-full flex-col border-l border-border bg-card shadow-2xl',
          wide ? 'max-w-full sm:max-w-2xl' : 'max-w-full sm:max-w-lg',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
          <h2 className="text-base sm:text-lg font-semibold pr-2 line-clamp-1">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" className="h-9 w-9 shrink-0">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 sm:px-6 py-3.5 bg-muted/20">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}

export function DetailSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group mb-4 rounded-lg border border-border bg-background">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
        {title}
      </summary>
      <div className="border-t border-border px-4 py-3">{children}</div>
    </details>
  );
}

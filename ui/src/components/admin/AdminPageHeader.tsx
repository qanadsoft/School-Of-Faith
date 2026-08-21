import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function AdminPageHeader({
  title,
  action,
  filters,
  className,
}: {
  title: string;
  action?: ReactNode;
  filters?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-6 space-y-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-serif font-medium tracking-tight">{title}</h1>
        {action}
      </div>
      {filters}
    </div>
  );
}

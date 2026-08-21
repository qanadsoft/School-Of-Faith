import { cn } from '@/lib/utils';

export type StatusTone = 'positive' | 'neutral' | 'negative' | 'archived';

const toneClasses: Record<StatusTone, string> = {
  positive: 'border-green-200 bg-green-100 text-green-700',
  neutral: 'border-transparent bg-secondary text-secondary-foreground',
  negative: 'border-destructive/20 bg-destructive/10 text-destructive',
  archived: 'border-transparent bg-muted/80 text-muted-foreground',
};

/** Maps common status strings to tones — reuse member tag pill shape */
const statusToneMap: Record<string, StatusTone> = {
  active: 'neutral',
  pending: 'neutral',
  registered: 'neutral',
  valid: 'positive',
  completed: 'positive',
  attended: 'positive',
  answered: 'positive',
  cancelled: 'negative',
  failed: 'negative',
  revoked: 'negative',
  no_show: 'negative',
  archived: 'archived',
  inactive: 'archived',
  used: 'archived',
};

export function statusToTone(status: string): StatusTone {
  return statusToneMap[status.toLowerCase()] ?? 'neutral';
}

export function StatusBadge({
  status,
  tone,
  className,
}: {
  status: string;
  tone?: StatusTone;
  className?: string;
}) {
  const resolved = tone ?? statusToTone(status);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
        toneClasses[resolved],
        className,
      )}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

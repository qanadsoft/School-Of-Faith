import { useNavigate } from 'react-router-dom';
import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  path,
  onClick,
  className,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  path?: string;
  onClick?: () => void;
  className?: string;
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (path) {
      navigate(path);
    }
  };

  const isClickable = !!path || !!onClick;

  return (
    <Card
      onClick={isClickable ? handleClick : undefined}
      className={cn(
        'rounded-2xl border border-border/80 bg-white shadow-sm transition-all duration-200 dark:bg-card dark:border-border',
        isClickable && 'cursor-pointer hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md active:scale-[0.98]',
        className,
      )}
    >
      <CardContent className="flex flex-col items-center justify-center p-5 text-center sm:p-6 min-h-[145px]">
        <div className={cn('mb-3 flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-105', iconBg)}>
          <Icon className={cn('h-5 w-5 stroke-[1.8]', iconColor)} />
        </div>
        <div className="text-2xl sm:text-3xl font-sans font-bold text-foreground tracking-tight">
          {value}
        </div>
        <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1">
          {label}
        </div>
      </CardContent>
    </Card>
  );
}

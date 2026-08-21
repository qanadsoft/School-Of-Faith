import { Card, CardContent } from '@/components/ui/Card';
import { Sparkles } from 'lucide-react';

export function ActivityList({
  items,
  emptyLabel = 'recent activity',
}: {
  items: Array<{ id: string; description: string; meta?: string }>;
  emptyLabel?: string;
}) {
  return (
    <Card className="rounded-2xl border border-border/80 bg-white shadow-sm dark:bg-card dark:border-border overflow-hidden">
      <CardContent className="p-6 sm:p-7 space-y-6">
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C59B46]/10 text-[#C59B46]">
              <Sparkles className="h-4 w-4" />
            </div>
            <h3 className="font-serif text-xl font-semibold text-foreground tracking-tight">Recent Activity</h3>
          </div>
          <span className="text-xs text-muted-foreground font-light">Latest Platform Events</span>
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No {emptyLabel} recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {items.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-4 py-3.5 px-3 rounded-xl transition-colors hover:bg-muted/40"
              >
                <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#C59B46] shadow-sm shadow-[#C59B46]/30" />
                <div className="flex-1 space-y-0.5">
                  <p className="text-sm font-medium text-foreground leading-snug">{a.description}</p>
                  {a.meta && <p className="text-xs text-muted-foreground font-light">{a.meta}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { MemberDetailLayout } from '@/components/MemberDetailLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth';
import { useTickets } from '@/lib/hooks';

const ticketStatusColors: Record<string, string> = {
  valid: 'bg-green-100 text-green-700',
  used: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
};

const attendColors: Record<string, string> = {
  registered: 'bg-primary/10 text-primary',
  attended: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-gray-100 text-gray-600',
};

export function MemberEventTicketsPage() {
  const { profile } = useAuth();
  const { tickets, loading } = useTickets(profile?.id);

  if (loading) return <MemberDetailLayout title="Event Tickets"><p className="text-muted-foreground">Loading...</p></MemberDetailLayout>;

  return (
    <MemberDetailLayout title="Event Tickets">
      {tickets.length === 0 ? (
        <p className="text-muted-foreground">You have no event tickets.</p>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-serif text-lg font-medium">{t.event?.title}</h3>
                    <p className="text-sm text-muted-foreground">{t.event?.location}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(t.event?.starts_at ?? '').toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ticketStatusColors[t.ticket_status] ?? ticketStatusColors.valid}`}>
                        Ticket: {t.ticket_status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-primary">{t.ticket_number}</p>
                    <p className="text-xs text-muted-foreground">Issued {new Date(t.issued_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MemberDetailLayout>
  );
}

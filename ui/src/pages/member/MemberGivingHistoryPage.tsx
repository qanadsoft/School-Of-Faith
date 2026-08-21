import { MemberDetailLayout } from '@/components/MemberDetailLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth';
import { useDonations } from '@/lib/hooks';

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-700',
};

export function MemberGivingHistoryPage() {
  const { profile } = useAuth();
  const { donations, loading } = useDonations(profile?.id);

  if (loading) return <MemberDetailLayout title="Giving History"><p className="text-muted-foreground">Loading...</p></MemberDetailLayout>;

  const total = donations
    .filter((d) => d.payment_status === 'completed')
    .reduce((s, d) => s + (Number(d.amount) || 0), 0);

  return (
    <MemberDetailLayout title="Giving History">
      <Card className="mb-4">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Given</p>
          <p className="text-3xl font-serif font-bold text-[#C59B46]">${total.toFixed(2)}</p>
        </CardContent>
      </Card>
      {donations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <p className="font-medium text-foreground">You have no giving history yet.</p>
          <p className="text-xs mt-1">When you make a contribution or donate to a campaign, your receipts will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {donations.map((d) => {
            const amt = Number(d.amount) || 0;
            return (
              <Card key={d.id} className="transition-all hover:shadow-sm">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-semibold text-lg text-foreground">
                        ${amt.toFixed(2)} <span className="text-xs font-sans text-muted-foreground">{d.currency || 'USD'}</span>
                      </h3>
                      <Badge variant={d.donation_type?.includes('monthly') ? 'default' : 'secondary'} className="text-[10px] capitalize">
                        {d.donation_type?.replace('_', ' ') || 'One-Time'}
                      </Badge>
                    </div>
                    <p className="text-xs font-medium text-foreground/80 mt-0.5">{d.campaign || d.fund || 'Where needed most'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(d.donated_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors[d.payment_status] ?? statusColors.pending}`}>
                      {d.payment_status}
                    </span>
                    <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">{d.transaction_id}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </MemberDetailLayout>
  );
}

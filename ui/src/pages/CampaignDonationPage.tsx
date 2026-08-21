import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Lock, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { IMAGES } from '@/data/seed';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const amounts = [25, 50, 100, 250];

interface CampaignDetail {
  id: string;
  title: string;
  description: string;
  image_url?: string | null;
  goal_amount: number;
  amount_raised: number;
  progress_percentage: number;
  start_date?: string;
  end_date?: string | null;
  is_active: boolean;
  total_donations?: number;
}

export function CampaignDonationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [tab, setTab] = useState<'monthly' | 'onetime'>('monthly');
  const [amount, setAmount] = useState<number | null>(100);
  const [customAmount, setCustomAmount] = useState('100');

  // Submitting state & Confirmation Modal
  const [submitting, setSubmitting] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadCampaign = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setFetchError(null);
      const data = await api.getCampaign(id);
      if (data) {
        setCampaign(data);
      } else {
        setFetchError('Campaign not found.');
      }
    } catch (err: any) {
      console.error('Failed to load campaign detail:', err);
      setFetchError(err?.message || 'Failed to load campaign.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const selectedAmount = customAmount ? parseFloat(customAmount) : (amount ?? 0);

  const handlePresetSelect = (amt: number) => {
    setAmount(amt);
    setCustomAmount(String(amt));
  };

  const handleCustomAmountChange = (val: string) => {
    setCustomAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && amounts.includes(parsed)) {
      setAmount(parsed);
    } else {
      setAmount(null);
    }
  };

  const handleDonate = async () => {
    if (!campaign) return;
    setErrorMsg(null);

    if (!selectedAmount || isNaN(selectedAmount) || selectedAmount <= 0) {
      setErrorMsg('Please select or enter a valid donation amount.');
      return;
    }

    try {
      setSubmitting(true);
      const donationType = tab === 'monthly' ? 'monthly' : 'one_time';

      const res = await api.submitDonation({
        memberId: profile?.id || null,
        campaignId: campaign.id,
        amount: selectedAmount,
        currency: 'USD',
        method: 'card',
        donationType,
        fund: campaign.title,
        campaignName: campaign.title,
        paymentStatus: 'completed',
      });

      setDonationSuccess({
        amount: selectedAmount,
        donationType,
        fund: campaign.title,
        transactionId: res?.transaction_id || `TXN-${Date.now().toString(36).toUpperCase()}`,
      });

      // Reload campaign stats to reflect new contribution
      loadCampaign();
    } catch (err: any) {
      console.error('Donation submission error:', err);
      setErrorMsg(err?.message || 'Failed to complete donation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col space-y-6 p-4 pb-24 md:p-8">
        <div className="h-8 w-40 bg-muted/60 rounded-md animate-pulse" />
        <div className="h-64 rounded-2xl bg-muted/40 animate-pulse" />
        <div className="h-96 rounded-2xl bg-muted/40 animate-pulse" />
      </div>
    );
  }

  if (fetchError || !campaign) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center space-y-4 p-8 text-center min-h-[50vh]">
        <h2 className="text-2xl font-serif font-medium">Campaign Not Found</h2>
        <p className="text-muted-foreground">{fetchError || 'The requested fundraising campaign could not be found.'}</p>
        <Link to="/give">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Current Campaigns
          </Button>
        </Link>
      </div>
    );
  }

  const amountRaised = Number(campaign.amount_raised) || 0;
  const goalAmount = Number(campaign.goal_amount) || 0;
  const progressPct = goalAmount > 0
    ? Math.min(100, Math.max(0, Math.round((amountRaised / goalAmount) * 100)))
    : 0;
  const imgUrl = campaign.image_url || IMAGES.MISSIONS_IMG;

  return (
    <div className="mx-auto flex max-w-3xl flex-col space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      {/* Back Navigation */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/give')}
          className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Current Campaigns
        </button>
      </div>

      {/* Campaign Detail Header Card */}
      <Card className="overflow-hidden border-border/60">
        <div className="relative h-56 md:h-72 overflow-hidden bg-muted">
          <img
            src={imgUrl}
            alt={campaign.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6">
            <div className="space-y-1">
              <span className="inline-block rounded-full bg-primary/90 px-3 py-0.5 text-xs font-semibold text-primary-foreground tracking-wide uppercase">
                Featured Campaign
              </span>
              <h1 className="font-serif text-2xl md:text-3xl font-medium text-white">{campaign.title}</h1>
            </div>
          </div>
        </div>
        <CardContent className="p-6 space-y-4">
          <p className="text-base font-light text-muted-foreground leading-relaxed">
            {campaign.description}
          </p>

          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="text-primary font-medium">
                ${amountRaised.toLocaleString()} raised
              </span>
              <span className="text-muted-foreground">
                Goal: ${goalAmount.toLocaleString()}
              </span>
            </div>

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-[#E5E0D8] dark:bg-muted/80">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dedicated Donation Form */}
      <Card className="p-6 md:p-8">
        <div className="mb-6 text-center space-y-1">
          <h2 className="text-2xl font-serif font-medium">Support this Mission</h2>
          <p className="text-sm text-muted-foreground">
            Designation: <span className="font-semibold text-foreground">{campaign.title}</span>
          </p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'monthly' | 'onetime')}>
          <TabsList className="mx-auto grid w-full max-w-[400px] grid-cols-2">
            <TabsTrigger value="monthly">Monthly Partner</TabsTrigger>
            <TabsTrigger value="onetime">One-Time Gift</TabsTrigger>
          </TabsList>

          {/* Monthly Partner */}
          <TabsContent value="monthly" className="space-y-6 pt-8">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {amounts.map((amt) => {
                const isActive = amount === amt || parseFloat(customAmount) === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handlePresetSelect(amt)}
                    className={`rounded-lg border-2 py-4 text-lg font-semibold transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    ${amt}
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">$</span>
              <input
                type="number"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className="flex h-12 w-full rounded-md border border-input bg-background pl-8 pr-3 text-lg font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {errorMsg && (
              <p className="text-sm font-medium text-destructive">{errorMsg}</p>
            )}

            <Button
              onClick={handleDonate}
              disabled={submitting}
              className="h-14 w-full text-lg font-medium shadow-lg transition-all hover:shadow-xl"
            >
              {submitting ? 'Processing Contribution...' : `Become a Monthly Partner ($${selectedAmount || 0}/mo)`}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Secure, encrypted transaction. Cancel anytime.</p>
          </TabsContent>

          {/* One-Time Gift */}
          <TabsContent value="onetime" className="space-y-6 pt-8">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {amounts.map((amt) => {
                const isActive = amount === amt || parseFloat(customAmount) === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handlePresetSelect(amt)}
                    className={`rounded-lg border-2 py-4 text-lg font-semibold transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    ${amt}
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">$</span>
              <input
                type="number"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className="flex h-12 w-full rounded-md border border-input bg-background pl-8 pr-3 text-lg font-medium ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            {errorMsg && (
              <p className="text-sm font-medium text-destructive">{errorMsg}</p>
            )}

            <Button
              onClick={handleDonate}
              disabled={submitting}
              className="h-14 w-full text-lg font-medium shadow-lg transition-all hover:shadow-xl"
            >
              {submitting ? 'Processing Contribution...' : `Give $${selectedAmount || 0} Now`}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Secure, encrypted transaction.</p>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Security note */}
      <div className="flex items-center justify-center gap-2 pt-4 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span>Your payment is processed securely with bank-level encryption.</span>
        <CreditCard className="h-4 w-4" />
      </div>

      {/* Success Modal */}
      {donationSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <Card className="w-full max-w-md max-h-[90dvh] overflow-y-auto p-4 sm:p-6 space-y-5 shadow-2xl relative my-auto animate-in fade-in zoom-in duration-200">
            <button
              type="button"
              onClick={() => setDonationSuccess(null)}
              className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-2xl font-serif font-medium">Thank You for Your Generosity!</h3>
              <p className="text-sm text-muted-foreground">
                Your contribution towards <span className="font-semibold text-foreground">{campaign.title}</span> has been received.
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold text-foreground">${Number(donationSuccess.amount).toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency:</span>
                <span className="font-medium text-foreground capitalize">
                  {donationSuccess.donationType === 'monthly' ? 'Monthly Partner' : 'One-Time Gift'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Campaign:</span>
                <span className="font-medium text-foreground">{donationSuccess.fund}</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-2">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-mono text-xs text-muted-foreground">{donationSuccess.transactionId}</span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => {
                setDonationSuccess(null);
                navigate('/give');
              }}
            >
              Return to Give Page
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

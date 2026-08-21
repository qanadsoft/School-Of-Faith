import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { HeartHandshake, BookOpen, Globe, Users, CreditCard, Lock, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { impactStats, IMAGES } from '@/data/seed';
import { api, asList } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const iconMap = { HeartHandshake, BookOpen, Globe, Users };
const amounts = [25, 50, 100, 250];

interface CampaignItem {
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

export function GivePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const formRef = useRef<HTMLDivElement>(null);

  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  const [tab, setTab] = useState<'monthly' | 'onetime'>('monthly');
  const [amount, setAmount] = useState<number | null>(100);
  const [customAmount, setCustomAmount] = useState('100');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('general');
  const [designation, setDesignation] = useState('Where needed most');

  // Submitting state & Confirmation Modal
  const [submitting, setSubmitting] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      const data = await api.getCampaigns();
      const list = asList<CampaignItem>(data);
      setCampaigns(list);

      // Check if URL query parameter has ?campaign=
      const campaignParam = searchParams.get('campaign');
      if (campaignParam) {
        const found = list.find(
          (c) => c.id === campaignParam || c.title.toLowerCase() === campaignParam.toLowerCase()
        );
        if (found) {
          setSelectedCampaignId(found.id);
          setDesignation(found.title);
        }
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  // When search params change dynamically
  useEffect(() => {
    const campaignParam = searchParams.get('campaign');
    if (campaignParam && campaigns.length > 0) {
      const found = campaigns.find(
        (c) => c.id === campaignParam || c.title.toLowerCase() === campaignParam.toLowerCase()
      );
      if (found) {
        setSelectedCampaignId(found.id);
        setDesignation(found.title);
      }
    } else if (!campaignParam) {
      setSelectedCampaignId('general');
      setDesignation('Where needed most');
    }
  }, [searchParams, campaigns]);

  const selectedAmount = customAmount ? parseFloat(customAmount) : (amount ?? 0);

  const handleSelectCampaign = (camp: CampaignItem) => {
    navigate(`/give/campaign/${camp.id}`);
  };

  const handleDesignationSelect = (val: string) => {
    if (val === 'general') {
      setSelectedCampaignId('general');
      setDesignation('Where needed most');
      setSearchParams({});
    } else {
      const found = campaigns.find((c) => c.id === val);
      if (found) {
        setSelectedCampaignId(found.id);
        setDesignation(found.title);
        setSearchParams({ campaign: found.id });
      }
    }
  };

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
    setErrorMsg(null);
    if (!selectedAmount || isNaN(selectedAmount) || selectedAmount <= 0) {
      setErrorMsg('Please select or enter a valid donation amount.');
      return;
    }

    try {
      setSubmitting(true);
      const donationType = tab === 'monthly' ? 'monthly' : 'one_time';
      const campId = selectedCampaignId !== 'general' ? selectedCampaignId : null;

      const res = await api.submitDonation({
        memberId: profile?.id || null,
        campaignId: campId,
        amount: selectedAmount,
        currency: 'USD',
        method: 'card',
        donationType,
        fund: designation,
        campaignName: designation,
        paymentStatus: 'completed',
      });

      setDonationSuccess({
        amount: selectedAmount,
        donationType,
        fund: designation,
        transactionId: res?.transaction_id || `TXN-${Date.now().toString(36).toUpperCase()}`,
      });

      // Reload campaigns to refresh amounts raised and progress dynamically
      loadCampaigns();
    } catch (err: any) {
      console.error('Donation submission error:', err);
      setErrorMsg(err?.message || 'Failed to complete donation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      {/* Header */}
      <div className="space-y-2 pt-4">
        <h1 className="text-4xl font-serif font-medium tracking-tight">
          Give
        </h1>
        <p className="font-light text-lg text-muted-foreground">
          Your generosity fuels the global discipleship movement. Together, we are training leaders, reaching nations, and transforming lives.
        </p>
      </div>

      {/* Impact Stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {impactStats.map((stat) => {
          const Icon = iconMap[stat.icon as keyof typeof iconMap] || HeartHandshake;
          return (
            <Card key={stat.label} className="text-center">
              <CardContent className="flex flex-col items-center p-4">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-2xl font-serif font-bold">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Giving Form */}
      <div ref={formRef}>
        <Card className="p-6 md:p-8">
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
              <div className="space-y-3">
                <label className="text-sm font-medium">Designation</label>
                <Select
                  value={selectedCampaignId}
                  onChange={(e) => handleDesignationSelect(e.target.value)}
                  className="h-10"
                >
                  <option value="general">Where needed most</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              </div>

              {errorMsg && (
                <p className="text-sm font-medium text-destructive">{errorMsg}</p>
              )}

              <Button
                onClick={handleDonate}
                disabled={submitting}
                className="h-14 w-full text-lg font-medium shadow-lg transition-all hover:shadow-xl"
              >
                {submitting ? 'Processing Contribution...' : 'Become a Faith Partner'}
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
              <div className="space-y-3">
                <label className="text-sm font-medium">Designation</label>
                <Select
                  value={selectedCampaignId}
                  onChange={(e) => handleDesignationSelect(e.target.value)}
                  className="h-10"
                >
                  <option value="general">Where needed most</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </Select>
              </div>

              {errorMsg && (
                <p className="text-sm font-medium text-destructive">{errorMsg}</p>
              )}

              <Button
                onClick={handleDonate}
                disabled={submitting}
                className="h-14 w-full text-lg font-medium shadow-lg transition-all hover:shadow-xl"
              >
                {submitting ? 'Processing Contribution...' : 'Give Now'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Secure, encrypted transaction.</p>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Dynamic Campaigns List */}
      <section className="space-y-6 pt-8">
        <h2 className="text-2xl font-serif font-medium">
          Current <span className="italic font-light text-primary">Campaigns</span>
        </h2>
        {loadingCampaigns ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <p>No active campaigns at this time. All gifts go to where needed most.</p>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {campaigns.map((camp) => {
              const amountRaised = Number(camp.amount_raised) || 0;
              const goalAmount = Number(camp.goal_amount) || 0;
              const progressPct = goalAmount > 0
                ? Math.min(100, Math.max(0, Math.round((amountRaised / goalAmount) * 100)))
                : 0;
              const imgUrl = camp.image_url || IMAGES.MISSIONS_IMG;
              const isSelected = selectedCampaignId === camp.id;

              return (
                <Card
                  key={camp.id}
                  onClick={() => handleSelectCampaign(camp)}
                  className={`group cursor-pointer overflow-hidden border-border/60 transition-all hover:border-primary/60 hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary border-primary shadow-md' : ''
                  }`}
                >
                  <div className="relative h-48 overflow-hidden bg-muted">
                    <img
                      src={imgUrl}
                      alt={camp.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-4">
                      <h3 className="font-serif text-xl font-medium text-white">{camp.title}</h3>
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <p className="mb-4 text-sm font-light text-muted-foreground line-clamp-2">
                      {camp.description}
                    </p>

                    <div className="mb-2 flex items-center justify-between text-sm font-medium">
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

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
                Your contribution has been received and will make an eternal difference.
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
                <span className="text-muted-foreground">Designation:</span>
                <span className="font-medium text-foreground">{donationSuccess.fund}</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-2">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-mono text-xs text-muted-foreground">{donationSuccess.transactionId}</span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => setDonationSuccess(null)}
            >
              Done
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

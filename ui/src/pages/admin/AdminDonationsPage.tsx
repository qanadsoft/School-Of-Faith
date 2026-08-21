import { useEffect, useState } from 'react';
import { Plus, CreditCard, DollarSign, Calendar, TrendingUp, Edit2, Archive, CheckCircle, XCircle } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { StatCard } from '@/components/admin/StatCard';
import { AdminErrorState } from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { api, asList } from '@/lib/api';

type DonationRow = {
  id: string;
  member_id: string;
  campaign_id?: string;
  amount: number;
  currency: string;
  fund: string;
  method: string;
  donation_type: string;
  payment_status: string;
  donated_at: string;
  transaction_id: string;
  member?: { id: string; first_name: string; last_name: string; email?: string };
  campaign_detail?: { id: string; title: string };
};

type CampaignRow = {
  id: string;
  title: string;
  description: string;
  image_url?: string | null;
  goal_amount: number;
  amount_raised: number;
  remaining_amount: number;
  progress_percentage: number;
  total_donations: number;
  start_date?: string;
  end_date?: string | null;
  is_active: boolean;
  archived: boolean;
  created_at: string;
};

type Member = { id: string; first_name: string; last_name: string };

const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'];

function maskTxn(id?: string) {
  if (!id) return '—';
  if (id.length <= 8) return id;
  return `••••${id.slice(-4)}`;
}

export function AdminDonationsPage() {
  const [activeTab, setActiveTab] = useState<'donations' | 'campaigns'>('donations');

  // Donations data
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [stats, setStats] = useState<any>({
    total_donations: 0,
    total_raised: 0,
    monthly_raised: 0,
    onetime_raised: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [fundFilter, setFundFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Add donation drawer
  const [donationDrawerOpen, setDonationDrawerOpen] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [amount, setAmount] = useState('');
  const [fund, setFund] = useState('Where needed most');
  const [donationType, setDonationType] = useState('one_time');
  const [paymentStatus, setPaymentStatus] = useState('completed');
  const [savingDonation, setSavingDonation] = useState(false);
  const [saveDonationError, setSaveDonationError] = useState('');

  // Campaign drawer (Add / Edit)
  const [campaignDrawerOpen, setCampaignDrawerOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignRow | null>(null);
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignDesc, setCampaignDesc] = useState('');
  const [campaignImage, setCampaignImage] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [campaignStartDate, setCampaignStartDate] = useState('');
  const [campaignEndDate, setCampaignEndDate] = useState('');
  const [campaignIsActive, setCampaignIsActive] = useState(true);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [saveCampaignError, setSaveCampaignError] = useState('');

  const refresh = async () => {
    try {
      setLoading(true);
      setError(false);
      const [donData, mData, campData, statsData] = await Promise.all([
        api.getAdminDonations(),
        api.getAdminMembers(),
        api.getAdminCampaigns(),
        api.getAdminDonationStats(),
      ]);
      setDonations(asList<DonationRow>(donData));
      setMembers(asList<Member>(mData));
      setCampaigns(asList<CampaignRow>(campData));
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error('Failed to load donations admin:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const addDonation = async () => {
    setSaveDonationError('');
    const amt = parseFloat(amount);
    if (!memberId) { setSaveDonationError('Please select a member.'); return; }
    if (isNaN(amt) || amt <= 0) { setSaveDonationError('Please enter a valid positive amount.'); return; }
    if (!fund.trim()) { setSaveDonationError('Fund/campaign is required.'); return; }

    try {
      setSavingDonation(true);
      const txnId = `TXN-ADMIN-${Date.now().toString(36).toUpperCase()}`;
      await api.createDonation({
        memberId,
        amount: amt,
        currency: 'USD',
        method: 'admin',
        transactionId: txnId,
        donationType,
        fund: fund.trim(),
        paymentStatus,
      });
      setMemberId(''); setAmount(''); setFund('Where needed most'); setPaymentStatus('completed');
      setDonationDrawerOpen(false);
      refresh();
    } catch (err: any) {
      setSaveDonationError(err?.message ?? 'Failed to add donation.');
    } finally {
      setSavingDonation(false);
    }
  };

  const openNewCampaign = () => {
    setEditingCampaign(null);
    setCampaignTitle('');
    setCampaignDesc('');
    setCampaignImage('');
    setCampaignGoal('');
    setCampaignStartDate(new Date().toISOString().split('T')[0]);
    setCampaignEndDate('');
    setCampaignIsActive(true);
    setSaveCampaignError('');
    setCampaignDrawerOpen(true);
  };

  const openEditCampaign = (camp: CampaignRow) => {
    setEditingCampaign(camp);
    setCampaignTitle(camp.title);
    setCampaignDesc(camp.description || '');
    setCampaignImage(camp.image_url || '');
    setCampaignGoal(String(camp.goal_amount || 0));
    setCampaignStartDate(camp.start_date || '');
    setCampaignEndDate(camp.end_date || '');
    setCampaignIsActive(camp.is_active);
    setSaveCampaignError('');
    setCampaignDrawerOpen(true);
  };

  const saveCampaign = async () => {
    setSaveCampaignError('');
    if (!campaignTitle.trim()) {
      setSaveCampaignError('Campaign title is required.');
      return;
    }
    const goal = parseFloat(campaignGoal);
    if (isNaN(goal) || goal < 0) {
      setSaveCampaignError('Please enter a valid goal amount.');
      return;
    }

    try {
      setSavingCampaign(true);
      if (editingCampaign) {
        await api.updateAdminCampaign(editingCampaign.id, {
          title: campaignTitle.trim(),
          description: campaignDesc.trim(),
          imageUrl: campaignImage.trim() || null,
          goalAmount: goal,
          startDate: campaignStartDate || undefined,
          endDate: campaignEndDate || null,
          isActive: campaignIsActive,
        });
      } else {
        await api.createAdminCampaign({
          title: campaignTitle.trim(),
          description: campaignDesc.trim(),
          imageUrl: campaignImage.trim() || null,
          goalAmount: goal,
          startDate: campaignStartDate || undefined,
          endDate: campaignEndDate || null,
          isActive: campaignIsActive,
        });
      }
      setCampaignDrawerOpen(false);
      refresh();
    } catch (err: any) {
      setSaveCampaignError(err?.message || 'Failed to save campaign.');
    } finally {
      setSavingCampaign(false);
    }
  };

  const toggleCampaignActive = async (camp: CampaignRow) => {
    try {
      await api.updateAdminCampaign(camp.id, { isActive: !camp.is_active });
      refresh();
    } catch (err) {
      console.error('Failed to toggle campaign status:', err);
    }
  };

  const archiveCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to archive this campaign?')) return;
    try {
      await api.deleteAdminCampaign(id);
      refresh();
    } catch (err) {
      console.error('Failed to archive campaign:', err);
    }
  };

  const getMemberName = (d: DonationRow) => {
    if (d.member?.first_name) return `${d.member.first_name} ${d.member.last_name}`;
    const m = members.find((m) => m.id === d.member_id);
    return m ? `${m.first_name} ${m.last_name}` : 'General Giver';
  };

  // Unique funds
  const uniqueFunds = Array.from(new Set(donations.map((d) => d.fund).filter(Boolean))).sort();

  const filteredDonations = donations.filter((d) => {
    const q = search.toLowerCase();
    const fundOk = !fundFilter || d.fund === fundFilter;
    const statusOk = !statusFilter || d.payment_status === statusFilter;
    const typeOk = !typeFilter || d.donation_type?.toLowerCase().includes(typeFilter.toLowerCase());
    return (
      fundOk &&
      statusOk &&
      typeOk &&
      (getMemberName(d).toLowerCase().includes(q) ||
        d.fund?.toLowerCase().includes(q) ||
        maskTxn(d.transaction_id).toLowerCase().includes(q))
    );
  });

  const donationColumns: DataTableColumn<DonationRow>[] = [
    { key: 'member', header: 'Member', sortable: true, render: (d) => getMemberName(d) },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (d) => <span className="font-semibold">${Number(d.amount).toFixed(2)} {d.currency}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (d) => (
        <Badge variant={d.donation_type?.includes('monthly') ? 'default' : 'secondary'} className="text-[10px] capitalize">
          {d.donation_type?.replace('_', ' ') || 'one time'}
        </Badge>
      ),
    },
    { key: 'fund', header: 'Fund / Designation', render: (d) => d.fund },
    { key: 'method', header: 'Method', render: (d) => <span className="capitalize">{d.method}</span> },
    { key: 'status', header: 'Status', render: (d) => <StatusBadge status={d.payment_status} /> },
    { key: 'txn', header: 'Transaction', render: (d) => <span className="font-mono text-xs text-muted-foreground">{maskTxn(d.transaction_id)}</span> },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (d) => new Date(d.donated_at).toLocaleDateString(),
    },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Donations & Campaigns"
        action={
          <div className="flex gap-2">
            {activeTab === 'campaigns' ? (
              <Button onClick={openNewCampaign}>
                <Plus className="h-4 w-4" /> Create Campaign
              </Button>
            ) : (
              <Button onClick={() => { setMemberId(''); setAmount(''); setFund('Where needed most'); setPaymentStatus('completed'); setSaveDonationError(''); setDonationDrawerOpen(true); }}>
                <Plus className="h-4 w-4" /> Add Donation
              </Button>
            )}
          </div>
        }
      />

      {/* Dynamic Statistics Cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Completed Raised"
          value={`$${Number(stats.total_raised || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/40"
        />
        <StatCard
          label="Total Contributions"
          value={String(stats.total_donations || 0)}
          icon={CreditCard}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-50 dark:bg-blue-950/40"
        />
        <StatCard
          label="Monthly Partner Giving"
          value={`$${Number(stats.monthly_raised || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={TrendingUp}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-50 dark:bg-amber-950/40"
        />
        <StatCard
          label="One-Time Giving"
          value={`$${Number(stats.onetime_raised || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Calendar}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBg="bg-purple-50 dark:bg-purple-950/40"
        />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('donations')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'donations'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          All Donations ({donations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('campaigns')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'campaigns'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          Fundraising Campaigns ({campaigns.length})
        </button>
      </div>

      {error ? (
        <AdminErrorState label="donations and campaigns" />
      ) : activeTab === 'donations' ? (
        <DataTable
          columns={donationColumns}
          data={filteredDonations}
          loading={loading}
          emptyLabel="donations"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by member, fund, or transaction…"
          filters={
            <div className="flex flex-wrap gap-2">
              <Select
                value={fundFilter}
                onChange={(e) => setFundFilter(e.target.value)}
                className="max-w-[180px]"
              >
                <option value="">All funds</option>
                {uniqueFunds.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="max-w-[150px]"
              >
                <option value="">All statuses</option>
                {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="max-w-[150px]"
              >
                <option value="">All types</option>
                <option value="monthly">Monthly</option>
                <option value="one_time">One-Time</option>
              </Select>
            </div>
          }
        />
      ) : (
        /* Campaigns Table & Cards */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
              >
                <div className="relative h-40 bg-muted">
                  {camp.image_url ? (
                    <img
                      src={camp.image_url}
                      alt={camp.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
                      No Image Provided
                    </div>
                  )}
                  <div className="absolute right-3 top-3">
                    <Badge variant={camp.is_active ? 'default' : 'secondary'}>
                      {camp.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div className="flex-1 p-5 space-y-3">
                  <div>
                    <h3 className="font-serif text-lg font-medium text-foreground">{camp.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {camp.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-primary font-semibold">
                        ${Number(camp.amount_raised).toLocaleString()} raised
                      </span>
                      <span className="text-muted-foreground">
                        Goal: ${Number(camp.goal_amount).toLocaleString()}
                      </span>
                    </div>
                    <Progress value={camp.progress_percentage || 0} className="h-2" />
                    <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                      <span>{camp.progress_percentage || 0}% Funded</span>
                      <span>{camp.total_donations || 0} Donations</span>
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-3 flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleCampaignActive(camp)}
                      className="text-xs"
                    >
                      {camp.is_active ? (
                        <>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Deactivate
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Activate
                        </>
                      )}
                    </Button>
                    <div className="flex gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditCampaign(camp)}
                        title="Edit campaign"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => archiveCampaign(camp.id)}
                        className="text-destructive hover:text-destructive"
                        title="Archive campaign"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add donation drawer */}
      <DetailDrawer
        open={donationDrawerOpen}
        title="Add Donation Record"
        onClose={() => setDonationDrawerOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDonationDrawerOpen(false)}>Cancel</Button>
            <Button onClick={addDonation} disabled={savingDonation}>{savingDonation ? 'Saving…' : 'Add Donation'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          {saveDonationError && (
            <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {saveDonationError}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Member *</label>
            <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Select member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Amount (USD) *</label>
            <Input
              type="number"
              min={0.01}
              step={0.01}
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Donation Frequency</label>
            <Select value={donationType} onChange={(e) => setDonationType(e.target.value)}>
              <option value="one_time">One-Time Gift</option>
              <option value="monthly">Monthly Partner</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Fund / Campaign *</label>
            <Select value={fund} onChange={(e) => setFund(e.target.value)}>
              <option value="Where needed most">Where needed most</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.title}>{c.title}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Payment Status</label>
            <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
              {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>
      </DetailDrawer>

      {/* Add / Edit Campaign Drawer */}
      <DetailDrawer
        open={campaignDrawerOpen}
        title={editingCampaign ? 'Edit Fundraising Campaign' : 'Create New Campaign'}
        onClose={() => setCampaignDrawerOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setCampaignDrawerOpen(false)}>Cancel</Button>
            <Button onClick={saveCampaign} disabled={savingCampaign}>
              {savingCampaign ? 'Saving…' : editingCampaign ? 'Save Changes' : 'Create Campaign'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {saveCampaignError && (
            <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {saveCampaignError}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Campaign Title *</label>
            <Input
              placeholder="e.g. Southeast Asia Outreach"
              value={campaignTitle}
              onChange={(e) => setCampaignTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              className="w-full rounded-md border border-input bg-background p-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={3}
              placeholder="Describe the mission and impact of this campaign..."
              value={campaignDesc}
              onChange={(e) => setCampaignDesc(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Goal Amount (USD) *</label>
            <Input
              type="number"
              min={0}
              step={100}
              placeholder="100000"
              value={campaignGoal}
              onChange={(e) => setCampaignGoal(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Image URL</label>
            <Input
              placeholder="https://images.unsplash.com/..."
              value={campaignImage}
              onChange={(e) => setCampaignImage(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Start Date</label>
              <Input
                type="date"
                value={campaignStartDate}
                onChange={(e) => setCampaignStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">End Date (Optional)</label>
              <Input
                type="date"
                value={campaignEndDate}
                onChange={(e) => setCampaignEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="campaignActiveCheckbox"
              checked={campaignIsActive}
              onChange={(e) => setCampaignIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="campaignActiveCheckbox" className="text-sm font-medium">
              Publish & make visible to members on Give page
            </label>
          </div>
        </div>
      </DetailDrawer>
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { AdminErrorState } from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/Button';
import { Select, Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { api, asList } from '@/lib/api';
import type { PrayerRequest, PrayerFocus, PrayerStats } from '@/lib/supabase';
import { Heart, Check, X, Archive, Trash2, Plus, Sparkles, Eye, EyeOff, Edit3, MessageSquare } from 'lucide-react';

export function AdminPrayerRequestsPage() {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [focuses, setFocuses] = useState<PrayerFocus[]>([]);
  const [stats, setStats] = useState<PrayerStats>({
    totalRequests: 0,
    pending: 0,
    approved: 0,
    answered: 0,
    totalPrayers: 0,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<PrayerRequest | null>(null);

  // Focus Editor Modal State
  const [editingFocus, setEditingFocus] = useState<PrayerFocus | null>(null);
  const [showFocusModal, setShowFocusModal] = useState(false);
  const [focusForm, setFocusForm] = useState({
    title: '',
    topic: 'Global Missions',
    scripture: '',
    description: '',
    activeDate: new Date().toISOString().split('T')[0],
    isPublished: true,
  });

  const refresh = async () => {
    try {
      setLoading(true);
      const [reqData, statsData, focusData] = await Promise.all([
        api.getAdminPrayerRequests(statusFilter || undefined),
        api.getAdminPrayerStats(),
        api.getAdminPrayerFocuses(),
      ]);
      setRequests(asList<PrayerRequest>(reqData));
      if (statsData && typeof statsData === 'object') {
        setStats(statsData as PrayerStats);
      }
      setFocuses(asList<PrayerFocus>(focusData));
    } catch (err) {
      console.error('Failed to load admin prayer data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [statusFilter]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await api.updatePrayerRequestStatus(id, newStatus);
      if (selected && selected.id === id) {
        setSelected((prev) => (prev ? { ...prev, status: newStatus as any } : null));
      }
      refresh();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prayer request?')) return;
    try {
      await api.deleteAdminPrayerRequest(id);
      setSelected(null);
      refresh();
    } catch (err) {
      console.error('Failed to delete prayer request:', err);
    }
  };

  // Focus Actions
  const openNewFocusModal = () => {
    setEditingFocus(null);
    setFocusForm({
      title: '',
      topic: 'Global Missions',
      scripture: '',
      description: '',
      activeDate: new Date().toISOString().split('T')[0],
      isPublished: true,
    });
    setShowFocusModal(true);
  };

  const openEditFocusModal = (f: PrayerFocus) => {
    setEditingFocus(f);
    setFocusForm({
      title: f.title,
      topic: f.topic || 'Global Missions',
      scripture: f.scripture || '',
      description: f.description,
      activeDate: f.active_date ? f.active_date.split('T')[0] : new Date().toISOString().split('T')[0],
      isPublished: f.is_published,
    });
    setShowFocusModal(true);
  };

  const handleSaveFocus = async () => {
    if (!focusForm.title.trim() || !focusForm.description.trim()) return;
    try {
      if (editingFocus) {
        await api.updateAdminPrayerFocus(editingFocus.id, focusForm);
      } else {
        await api.createAdminPrayerFocus(focusForm);
      }
      setShowFocusModal(false);
      refresh();
    } catch (err) {
      console.error('Failed to save prayer focus:', err);
    }
  };

  const handleToggleFocusPublish = async (id: string) => {
    try {
      await api.toggleAdminPrayerFocusPublish(id);
      refresh();
    } catch (err) {
      console.error('Failed to toggle publish:', err);
    }
  };

  const handleDeleteFocus = async (id: string) => {
    if (!confirm('Delete this daily prayer focus?')) return;
    try {
      await api.deleteAdminPrayerFocus(id);
      refresh();
    } catch (err) {
      console.error('Failed to delete prayer focus:', err);
    }
  };

  const filtered = requests.filter((r) => {
    const q = search.toLowerCase();
    const titleMatch = (r.title || '').toLowerCase().includes(q);
    const descMatch = (r.description || '').toLowerCase().includes(q);
    const memberName = `${r.member?.first_name ?? ''} ${r.member?.last_name ?? ''}`.toLowerCase();
    const authorName = (r.author_name || '').toLowerCase();
    return titleMatch || descMatch || memberName.includes(q) || authorName.includes(q);
  });

  const columns: DataTableColumn<PrayerRequest>[] = [
    {
      key: 'title',
      header: 'Request / Title',
      sortable: true,
      className: 'w-[34%]',
      render: (r) => (
        <div className="space-y-0.5 pr-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{r.title || 'Prayer Request'}</span>
            <Badge variant={r.type === 'praise' ? 'default' : 'secondary'} className="text-[10px]">
              {r.type === 'praise' ? 'Praise' : 'Request'}
            </Badge>
          </div>
          <p className="line-clamp-1 text-xs text-muted-foreground">{r.description}</p>
        </div>
      ),
    },
    {
      key: 'member',
      header: 'Member / Author',
      className: 'w-[18%]',
      render: (r) => {
        if (r.is_anonymous) return <span className="italic text-muted-foreground">Anonymous</span>;
        const name = r.author_name || `${r.member?.first_name ?? ''} ${r.member?.last_name ?? ''}`.trim();
        return name || '—';
      },
    },
    {
      key: 'prays',
      header: 'Prayers',
      sortable: true,
      className: 'w-[10%]',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 font-medium text-primary text-xs">
          <Heart className="h-3.5 w-3.5 fill-primary" /> {r.prays ?? r.prayer_count ?? 0}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      className: 'w-[12%]',
      render: (r) => {
        switch (r.status) {
          case 'pending':
            return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs font-medium">Pending</Badge>;
          case 'approved':
            return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-medium">Approved</Badge>;
          case 'answered':
            return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs font-medium">Answered</Badge>;
          case 'rejected':
            return <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs font-medium">Rejected</Badge>;
          case 'archived':
            return <Badge variant="outline" className="text-xs text-muted-foreground font-medium">Archived</Badge>;
          default:
            return <StatusBadge status={r.status} />;
        }
      },
    },
    {
      key: 'date',
      header: 'Submitted',
      sortable: true,
      className: 'w-[12%]',
      render: (r) => (r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'),
    },
    {
      key: 'actions',
      header: 'Quick Action',
      className: 'w-[14%]',
      render: (r) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {r.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2.5 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={() => updateStatus(r.id, 'approved')}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                onClick={() => updateStatus(r.id, 'rejected')}
              >
                Reject
              </Button>
            </>
          )}
          {r.status === 'approved' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => updateStatus(r.id, 'answered')}
            >
              Mark Answered
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Prayer Management"
        action={
          <Button onClick={openNewFocusModal} className="gap-2">
            <Plus className="h-4 w-4" /> New Daily Focus
          </Button>
        }
      />

      {/* Admin Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-6">
        <Card className="bg-card">
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Requests</span>
            <div className="mt-1 text-2xl font-serif font-medium">{stats.totalRequests}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">Pending Review</span>
            <div className="mt-1 text-2xl font-serif font-medium text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Approved / Wall</span>
            <div className="mt-1 text-2xl font-serif font-medium text-emerald-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Answered</span>
            <div className="mt-1 text-2xl font-serif font-medium text-blue-600">{stats.answered}</div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Total Prayers</span>
            <div className="mt-1 text-2xl font-serif font-medium text-primary">{stats.totalPrayers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Prayer Focus Admin Cards */}
      {focuses.length > 0 && (
        <section className="mb-10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-xl font-medium text-foreground">
                Today's Prayer Focus
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Active published focus is showcased on the Member Prayer page
              </p>
            </div>
            <Badge variant="outline" className="text-xs px-3 py-1 rounded-full">
              {focuses.length} {focuses.length === 1 ? 'Active Focus' : 'Focuses'}
            </Badge>
          </div>

          <div className={focuses.length === 1 ? 'max-w-3xl' : 'grid grid-cols-1 gap-6 md:grid-cols-2'}>
            {focuses.map((f) => (
              <Card key={f.id} className="relative overflow-hidden border border-border/80 shadow-sm rounded-2xl bg-card">
                <CardContent className="p-6 md:p-7 space-y-4">
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="font-serif text-2xl font-medium text-foreground leading-tight">
                          {f.title}
                        </h4>
                        <Badge
                          variant={f.is_published ? 'default' : 'secondary'}
                          className={`text-xs px-3 py-0.5 rounded-full font-medium ${
                            f.is_published
                              ? 'bg-[#C69A50] text-white hover:bg-[#b88c44] dark:bg-primary dark:text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {f.is_published ? 'Published' : 'Draft'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                        <span>Topic: <strong className="font-medium text-foreground">{f.topic}</strong></span>
                        <span>·</span>
                        <span>Date: <strong className="font-medium text-foreground">{f.active_date ? new Date(f.active_date).toLocaleDateString() : 'Today'}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-emerald-600 rounded-full"
                        title={f.is_published ? 'Unpublish' : 'Publish'}
                        onClick={() => handleToggleFocusPublish(f.id)}
                      >
                        {f.is_published ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full"
                        title="Delete Focus"
                        onClick={() => handleDeleteFocus(f.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Scripture Box */}
                  {f.scripture && (
                    <div className="rounded-xl bg-[#FAF7F2] dark:bg-muted/40 p-4 text-xs md:text-sm italic text-foreground/90 border border-[#EFE8DC] dark:border-border leading-relaxed font-light">
                      {f.scripture}
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-sm font-light text-muted-foreground leading-relaxed">
                    {f.description}
                  </p>

                  {/* Bottom Row: Prayers Counter & Edit Button */}
                  <div className="flex items-center justify-between pt-4 border-t border-border/60 text-xs">
                    <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                      <Heart className="h-4 w-4 fill-[#C69A50] text-[#C69A50] dark:fill-primary dark:text-primary" />
                      <span>{f.prayer_count ?? 0} {f.prayer_count === 1 ? 'Person Praying' : 'People Praying'}</span>
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditFocusModal(f)}
                      className="h-8 text-xs gap-1.5 px-4 rounded-full border-border/80 hover:bg-muted font-medium"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Edit Focus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Prayer Requests Data Table (Directly Visible without Tab Click!) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-medium text-foreground">
            Prayer Requests & Praise Reports ({stats.totalRequests})
          </h3>
        </div>

        {error ? (
          <AdminErrorState label="prayer requests" />
        ) : (
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            emptyLabel="prayer requests"
            search={search}
            onSearchChange={setSearch}
            filters={
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="max-w-[160px]"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="answered">Answered</option>
                <option value="rejected">Rejected</option>
                <option value="archived">Archived</option>
              </Select>
            }
            onRowClick={setSelected}
          />
        )}
      </section>

      {/* Detail Drawer for Prayer Request */}
      <DetailDrawer
        open={!!selected}
        title={selected?.title || 'Prayer Request Details'}
        onClose={() => setSelected(null)}
        footer={
          selected ? (
            <div className="flex flex-wrap items-center gap-2 justify-end">
              {selected.status !== 'approved' && (
                <Button
                  variant="default"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  onClick={() => updateStatus(selected.id, 'approved')}
                >
                  <Check className="h-4 w-4" /> Approve for Wall
                </Button>
              )}
              {selected.status !== 'rejected' && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 gap-1.5"
                  onClick={() => updateStatus(selected.id, 'rejected')}
                >
                  <X className="h-4 w-4" /> Reject
                </Button>
              )}
              {selected.status !== 'answered' && (
                <Button
                  variant="outline"
                  className="text-blue-600 hover:bg-blue-50 gap-1.5"
                  onClick={() => updateStatus(selected.id, 'answered')}
                >
                  <Sparkles className="h-4 w-4" /> Mark Answered
                </Button>
              )}
              {selected.status !== 'archived' && (
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => updateStatus(selected.id, 'archived')}
                >
                  <Archive className="h-4 w-4" /> Archive
                </Button>
              )}
              <Button
                variant="ghost"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => deleteRequest(selected.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant={selected.type === 'praise' ? 'default' : 'secondary'}>
                {selected.type === 'praise' ? 'Praise Report' : 'Prayer Request'}
              </Badge>
              <StatusBadge status={selected.status ?? 'pending'} />
            </div>

            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Author / Member</span>
              <p className="font-medium text-foreground mt-0.5">
                {selected.is_anonymous ? 'Anonymous' : selected.author_name || `${selected.member?.first_name ?? ''} ${selected.member?.last_name ?? ''}`.trim() || '—'}
                {selected.member?.email && <span className="ml-2 text-xs text-muted-foreground font-normal">({selected.member.email})</span>}
              </p>
            </div>

            <div>
              <span className="text-xs text-muted-foreground uppercase font-semibold">Content</span>
              <p className="mt-1 text-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-3 rounded-xl border border-border">
                {selected.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
              <div>
                <span className="text-xs text-muted-foreground">Community Prayers</span>
                <p className="font-semibold text-primary mt-0.5 flex items-center gap-1">
                  <Heart className="h-4 w-4 fill-primary" /> {selected.prays ?? selected.prayer_count ?? 0} people praying
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Date Submitted</span>
                <p className="font-medium mt-0.5">
                  {selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}
                </p>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Focus Editor Modal */}
      {showFocusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-serif text-xl font-semibold">
                {editingFocus ? 'Edit Daily Prayer Focus' : 'Create Daily Prayer Focus'}
              </h3>
              <button
                onClick={() => setShowFocusModal(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Title</label>
                <Input
                  placeholder="e.g. Global Missions & Outreach"
                  value={focusForm.title}
                  onChange={(e) => setFocusForm({ ...focusForm, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Topic</label>
                  <Input
                    placeholder="e.g. Global Missions"
                    value={focusForm.topic}
                    onChange={(e) => setFocusForm({ ...focusForm, topic: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Active Date</label>
                  <Input
                    type="date"
                    value={focusForm.activeDate}
                    onChange={(e) => setFocusForm({ ...focusForm, activeDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Scripture / Quote (Optional)</label>
                <Input
                  placeholder='e.g. "Therefore go and make disciples..." — Matthew 28:19'
                  value={focusForm.scripture}
                  onChange={(e) => setFocusForm({ ...focusForm, scripture: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase text-muted-foreground">Description</label>
                <Textarea
                  placeholder="Share what the community should focus on in prayer today..."
                  className="min-h-[100px]"
                  value={focusForm.description}
                  onChange={(e) => setFocusForm({ ...focusForm, description: e.target.value })}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={focusForm.isPublished}
                  onChange={(e) => setFocusForm({ ...focusForm, isPublished: e.target.checked })}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                Publish immediately to Member Prayer page
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button variant="outline" onClick={() => setShowFocusModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFocus}>
                {editingFocus ? 'Save Changes' : 'Create Focus'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import { Plus, Trash2, BookOpen, Eye, FileText, CheckCircle2, Edit2 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminErrorState } from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { api, asList } from '@/lib/api';
import { BrandPdfReaderModal, type ReadingPlanData } from '@/components/BrandPdfReaderModal';

type PlanRow = {
  id: string;
  name: string;
  description: string;
  total_days: number;
  active: boolean;
  pdf_url?: string | null;
  badge_text?: string;
  is_featured?: boolean;
  item_count?: number;
};

type PlanItem = {
  id: string;
  plan_id: string;
  day_number: number;
  title: string;
  reference: string;
  key_verse?: string;
  devotional?: string;
  prayer?: string;
};

type ProgressRow = {
  member_id: string;
  first_name: string;
  last_name: string;
  completed_days: number;
  total_days: number;
};

type Member = { id: string; first_name: string; last_name: string };

function blankForm(p?: PlanRow) {
  return {
    name: p?.name ?? '',
    description: p?.description ?? '',
    totalDays: p ? String(p.total_days) : '30',
    active: p?.active ?? true,
    pdfUrl: p?.pdf_url ?? '',
    badgeText: p?.badge_text ?? 'New Resource',
    isFeatured: p?.is_featured ?? true,
  };
}

export function AdminReadingPlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  // plan drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<PlanRow | null>(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PlanRow | null>(null);

  // items + progress panel
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailPlan, setDetailPlan] = useState<PlanRow | null>(null);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Item edit state
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemRef, setItemRef] = useState('');
  const [itemKeyVerse, setItemKeyVerse] = useState('');
  const [itemDevotional, setItemDevotional] = useState('');
  const [itemPrayer, setItemPrayer] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  // mark progress
  const [members, setMembers] = useState<Member[]>([]);
  const [progressMemberId, setProgressMemberId] = useState('');
  const [progressItemId, setProgressItemId] = useState('');
  const [markingSaving, setMarkingSaving] = useState(false);

  // Preview Modal
  const [previewPlan, setPreviewPlan] = useState<ReadingPlanData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(false);
      const [planData, memberData] = await Promise.all([
        api.getAdminReadingPlans(),
        api.getAdminMembers(),
      ]);
      setPlans(asList<PlanRow>(planData));
      setMembers(asList<Member>(memberData));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // ── Plan CRUD ────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setSelected(null);
    setForm(blankForm());
    setSaveError('');
    setDrawerOpen(true);
  };

  const openEdit = (p: PlanRow) => {
    setSelected(p);
    setForm(blankForm(p));
    setSaveError('');
    setDrawerOpen(true);
  };

  const save = async () => {
    setSaveError('');
    if (!form.name.trim()) {
      setSaveError('Plan name is required.');
      return;
    }
    const days = parseInt(form.totalDays);
    if (isNaN(days) || days < 1) {
      setSaveError('Total days must be at least 1.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        totalDays: days,
        active: form.active,
        pdfUrl: form.pdfUrl.trim() || null,
        badgeText: form.badgeText.trim() || 'New Resource',
        isFeatured: form.isFeatured,
      };
      if (selected) {
        await api.updateReadingPlan(selected.id, payload);
      } else {
        await api.createReadingPlan(payload);
      }
      setDrawerOpen(false);
      refresh();
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save reading plan.');
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async () => {
    if (!deleteTarget) return;
    await api.deleteReadingPlan(deleteTarget.id);
    setDeleteTarget(null);
    refresh();
  };

  // ── Items + Progress ──────────────────────────────────────────────────────────
  const openDetail = async (p: PlanRow) => {
    setDetailPlan(p);
    setProgressMemberId('');
    setProgressItemId('');
    setEditingItem(null);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const [itemData, progData] = await Promise.all([
        api.getAdminReadingPlanItems(p.id),
        api.getReadingPlanProgress(p.id),
      ]);
      setItems(asList<PlanItem>(itemData));
      setProgress(asList<ProgressRow>(progData));
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!detailPlan) return;
    const [itemData, progData] = await Promise.all([
      api.getAdminReadingPlanItems(detailPlan.id),
      api.getReadingPlanProgress(detailPlan.id),
    ]);
    setItems(asList<PlanItem>(itemData));
    setProgress(asList<ProgressRow>(progData));
  };

  const openPreview = async (p: PlanRow) => {
    try {
      const itemData = await api.getAdminReadingPlanItems(p.id);
      setPreviewPlan({
        id: p.id,
        name: p.name,
        description: p.description,
        total_days: p.total_days,
        pdf_url: p.pdf_url,
        badge_text: p.badge_text,
        items: asList<PlanItem>(itemData),
      });
      setPreviewOpen(true);
    } catch (err) {
      console.error('Failed to preview plan:', err);
    }
  };

  const handleStartEditItem = (item: PlanItem) => {
    setEditingItem(item);
    setItemTitle(item.title);
    setItemRef(item.reference);
    setItemKeyVerse(item.key_verse || '');
    setItemDevotional(item.devotional || '');
    setItemPrayer(item.prayer || '');
  };

  const handleSaveItem = async () => {
    if (!editingItem || !detailPlan) return;
    setSavingItem(true);
    try {
      await api.updateAdminReadingPlanItem(editingItem.id, {
        dayNumber: editingItem.day_number,
        title: itemTitle.trim() || `Day ${editingItem.day_number}`,
        reference: itemRef.trim(),
        keyVerse: itemKeyVerse.trim(),
        devotional: itemDevotional.trim(),
        prayer: itemPrayer.trim(),
      });
      setEditingItem(null);
      await refreshDetail();
    } catch (err) {
      console.error('Failed to save item:', err);
    } finally {
      setSavingItem(false);
    }
  };

  const markComplete = async () => {
    if (!detailPlan || !progressMemberId || !progressItemId) return;
    try {
      setMarkingSaving(true);
      await api.markReadingComplete({
        memberId: progressMemberId,
        planId: detailPlan.id,
        itemId: progressItemId,
      });
      setProgressItemId('');
      await refreshDetail();
    } finally {
      setMarkingSaving(false);
    }
  };

  const filtered = plans.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns: DataTableColumn<PlanRow>[] = [
    {
      key: 'name',
      header: 'Plan / Resource',
      sortable: true,
      render: (p) => (
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{p.name}</p>
            {p.is_featured && (
              <span className="rounded-full bg-[#C59B46]/10 px-2 py-0.2 text-[10px] font-semibold text-[#C59B46]">
                Featured
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
        </div>
      ),
    },
    { key: 'days', header: 'Total Days', sortable: true, render: (p) => p.total_days },
    { key: 'items', header: 'Items', render: (p) => p.item_count ?? '—' },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
            p.active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
          }`}
        >
          {p.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openPreview(p)}
            className="text-[#C59B46] hover:bg-[#C59B46]/10"
            title="Preview Brand Journal / PDF"
          >
            <Eye className="h-4 w-4 mr-1" /> Preview
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openDetail(p)}>
            Progress & Items
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setDeleteTarget(p)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Reading Plans & Resources"
        description="Manage 30-day prayer guides, scripture journals, daily devotionals, and member progress."
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> New Resource Plan
          </Button>
        }
      />

      {error ? (
        <AdminErrorState label="reading plans" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyLabel="reading plans"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search plans or resources…"
          onRowClick={openEdit}
        />
      )}

      {/* ─── Create / Edit drawer ───────────────────────────────────────────── */}
      <DetailDrawer
        open={drawerOpen}
        title={selected ? 'Edit Resource / Reading Plan' : 'New Resource / Reading Plan'}
        onClose={() => setDrawerOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : selected ? 'Save Changes' : 'Create Plan'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {saveError && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {saveError}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Resource / Plan Name *
            </label>
            <Input
              placeholder="e.g. 30-Day Prayer Guide & Scripture Journal"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Badge Text (Shown on Home card)
            </label>
            <Input
              placeholder="e.g. New Resource, Prayer Guide, Daily Devotional"
              value={form.badgeText}
              onChange={(e) => setForm((f) => ({ ...f, badgeText: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              PDF Document URL (Optional)
            </label>
            <Input
              placeholder="e.g. https://domain.com/files/prayer-guide.pdf"
              value={form.pdfUrl}
              onChange={(e) => setForm((f) => ({ ...f, pdfUrl: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Total Days *
            </label>
            <Input
              type="number"
              min={1}
              value={form.totalDays}
              onChange={(e) => setForm((f) => ({ ...f, totalDays: e.target.value }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Description
            </label>
            <Textarea
              placeholder="Spiritual focus and overview of this journal…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="planFeatured"
                checked={form.isFeatured}
                onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
                className="h-4 w-4 rounded accent-[#C59B46]"
              />
              <label htmlFor="planFeatured" className="text-sm font-medium">
                Feature on Member Home Screen ("New Resource" card)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="planActive"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="h-4 w-4 rounded accent-[#C59B46]"
              />
              <label htmlFor="planActive" className="text-sm">
                Active (available to members)
              </label>
            </div>
          </div>
        </div>
      </DetailDrawer>

      {/* ─── Items & Progress drawer ─────────────────────────────────────────── */}
      <DetailDrawer
        open={detailOpen}
        title={detailPlan ? `Day Items & Progress — ${detailPlan.name}` : 'Day Items & Progress'}
        onClose={() => setDetailOpen(false)}
        wide
        footer={
          <div className="flex items-center justify-between w-full">
            {detailPlan && (
              <Button
                variant="outline"
                onClick={() => openPreview(detailPlan)}
                className="text-[#C59B46]"
              >
                <Eye className="h-4 w-4 mr-1.5" /> Preview Brand Journal
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Day Items List & Editor */}
          <div>
            <h3 className="mb-2 text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#C59B46]" />
              Day-by-Day Scripture & Devotional Journal Items ({items.length})
            </h3>

            {editingItem ? (
              <div className="rounded-2xl border border-[#C59B46]/40 bg-[#FAF5EB]/50 p-4 space-y-3 dark:bg-card">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#C59B46]">
                    Editing Day {editingItem.day_number} Content
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setEditingItem(null)}>
                    Cancel
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Day Title
                    </label>
                    <Input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Scripture Reference
                    </label>
                    <Input value={itemRef} onChange={(e) => setItemRef(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Key Verse Quotation
                  </label>
                  <Input value={itemKeyVerse} onChange={(e) => setItemKeyVerse(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Devotional Meditation Text
                  </label>
                  <Textarea
                    rows={3}
                    value={itemDevotional}
                    onChange={(e) => setItemDevotional(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Guided Prayer Declaration
                  </label>
                  <Textarea
                    rows={2}
                    value={itemPrayer}
                    onChange={(e) => setItemPrayer(e.target.value)}
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <Button onClick={handleSaveItem} disabled={savingItem}>
                    {savingItem ? 'Saving…' : 'Save Day Content'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center justify-between rounded-xl border border-border/80 p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#C59B46]/10 text-xs font-bold text-[#C59B46]">
                        {it.day_number}
                      </span>
                      <div>
                        <span className="font-medium text-xs sm:text-sm text-foreground">
                          {it.title}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">({it.reference})</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEditItem(it)}
                      className="text-xs text-primary"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mark reading complete */}
          <div className="border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-semibold">Mark Member Progress Manually</h3>
            <div className="flex flex-col gap-2">
              <select
                value={progressMemberId}
                onChange={(e) => setProgressMemberId(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select member…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.first_name} {m.last_name}
                  </option>
                ))}
              </select>
              <select
                value={progressItemId}
                onChange={(e) => setProgressItemId(e.target.value)}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select day…</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    Day {item.day_number} — {item.title} ({item.reference})
                  </option>
                ))}
              </select>
              <Button
                onClick={markComplete}
                disabled={markingSaving || !progressMemberId || !progressItemId}
                className="self-start"
              >
                {markingSaving ? 'Saving…' : 'Mark Complete'}
              </Button>
            </div>
          </div>

          {/* Member progress list */}
          <div className="border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-semibold">Member Completion Overview</h3>
            {detailLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : progress.length === 0 ? (
              <p className="text-sm text-muted-foreground">No member progress recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {progress.map((pr) => (
                  <div
                    key={pr.member_id}
                    className="flex items-center justify-between rounded-xl border border-border/80 p-3"
                  >
                    <span className="text-sm font-medium">
                      {pr.first_name} {pr.last_name}
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">
                      {pr.completed_days} / {pr.total_days} days completed (
                      {Math.round((pr.completed_days / pr.total_days) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DetailDrawer>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Reading Plan"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? All day items and member progress will be removed.`}
        confirmLabel="Delete Plan"
        onConfirm={deletePlan}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Brand PDF Reader Preview Modal */}
      {previewPlan && (
        <BrandPdfReaderModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          planData={previewPlan}
        />
      )}
    </AdminLayout>
  );
}

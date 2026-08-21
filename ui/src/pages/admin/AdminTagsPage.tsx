import { useEffect, useState } from 'react';
import { Plus, Pencil, X } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, asList } from '@/lib/api';
import { cn } from '@/lib/utils';

type Tag = { id: string; name: string; color: string; text_color: string };

const COLOR_OPTIONS = [
  { value: 'gold',   label: 'Gold',   cls: 'bg-primary/10 text-primary border-primary/20' },
  { value: 'blue',   label: 'Blue',   cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'green',  label: 'Green',  cls: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'orange', label: 'Orange', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'purple', label: 'Purple', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
];

const TEXT_COLOR_MAP: Record<string, string> = {
  gold:   '#9A3412',
  blue:   '#1D4ED8',
  green:  '#166534',
  orange: '#9A3412',
  purple: '#6B21A8',
};

const tagColorClass = (color: string) =>
  COLOR_OPTIONS.find((c) => c.value === color)?.cls ?? COLOR_OPTIONS[0].cls;

function blankForm(t?: Tag) {
  return { name: t?.name ?? '', color: t?.color ?? 'gold' };
}

export function AdminTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // create / edit drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Tag | null>(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(false);
      setTags(asList<Tag>(await api.getAdminTags()));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm());
    setSaveError('');
    setDrawerOpen(true);
  };

  const openEdit = (t: Tag) => {
    setEditing(t);
    setForm(blankForm(t));
    setSaveError('');
    setDrawerOpen(true);
  };

  const save = async () => {
    setSaveError('');
    if (!form.name.trim()) { setSaveError('Tag name is required.'); return; }
    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        color: form.color,
        textColor: TEXT_COLOR_MAP[form.color] ?? '#9A3412',
      };
      if (editing) {
        await api.updateTag(editing.id, payload);
      } else {
        await api.createTag(payload);
      }
      setDrawerOpen(false);
      refresh();
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save tag.');
    } finally {
      setSaving(false);
    }
  };

  const deleteTag = async () => {
    if (!deleteId) return;
    await api.deleteTag(deleteId);
    setDeleteId(null);
    refresh();
  };

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Tags"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Tag
          </Button>
        }
      />

      {error ? (
        <AdminErrorState label="tags" />
      ) : loading ? (
        <AdminLoadingState label="tags" />
      ) : tags.length === 0 ? (
        <AdminEmptyState label="tags" />
      ) : (
        <div className="flex flex-wrap gap-3">
          {tags.map((t) => (
            <div
              key={t.id}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold',
                tagColorClass(t.color),
              )}
            >
              {t.name}
              <button
                type="button"
                onClick={() => openEdit(t)}
                className="text-current opacity-60 hover:opacity-100"
                aria-label={`Edit ${t.name}`}
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(t.id)}
                className="text-current opacity-60 hover:text-destructive hover:opacity-100"
                aria-label={`Delete ${t.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit drawer */}
      <DetailDrawer
        open={drawerOpen}
        title={editing ? `Edit Tag — ${editing.name}` : 'New Tag'}
        onClose={() => setDrawerOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Tag'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          {saveError && (
            <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {saveError}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tag name *</label>
            <Input
              placeholder="e.g. Prayer Warrior"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Color</label>
            <Select value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}>
              {COLOR_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
          {/* Preview */}
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Preview</p>
            <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-semibold', tagColorClass(form.color))}>
              {form.name || 'Tag Name'}
            </span>
          </div>
        </div>
      </DetailDrawer>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete tag?"
        message="This will remove the tag from all members. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={deleteTag}
        onCancel={() => setDeleteId(null)}
      />
    </AdminLayout>
  );
}

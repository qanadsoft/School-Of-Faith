import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminErrorState } from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, asList } from '@/lib/api';

type DownloadRow = {
  id: string;
  member_id: string;
  resource_name: string;
  resource_type: string;
  file_url: string;
  downloaded_at: string;
  member?: { id: string; first_name: string; last_name: string };
};

type Member = { id: string; first_name: string; last_name: string };

const RESOURCE_TYPES = ['PDF', 'Audio', 'Video', 'Workbook', 'Slides', 'Other'];

function blankForm() {
  return { memberId: '', resourceName: '', resourceType: 'PDF', fileUrl: '' };
}

export function AdminDownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState('');

  // create drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(false);
      const [dlData, mData] = await Promise.all([
        api.getAdminDownloads(),
        api.getAdminMembers(),
      ]);
      setDownloads(asList<DownloadRow>(dlData));
      setMembers(asList<Member>(mData));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const save = async () => {
    setSaveError('');
    if (!form.memberId) { setSaveError('Please select a member.'); return; }
    if (!form.resourceName.trim()) { setSaveError('Resource name is required.'); return; }
    try {
      setSaving(true);
      await api.createDownload({
        memberId: form.memberId,
        resourceName: form.resourceName.trim(),
        resourceType: form.resourceType,
        fileUrl: form.fileUrl.trim() || '#',
      });
      setForm(blankForm());
      setDrawerOpen(false);
      refresh();
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to create download record.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await api.deleteAdminDownload(deleteId);
    setDeleteId(null);
    refresh();
  };

  const getMemberName = (row: DownloadRow) => {
    if (row.member) return `${row.member.first_name} ${row.member.last_name}`;
    const m = members.find((m) => m.id === row.member_id);
    return m ? `${m.first_name} ${m.last_name}` : '—';
  };

  const filtered = downloads.filter((d) => {
    const q = search.toLowerCase();
    const memberMatch = !memberFilter || d.member_id === memberFilter;
    return memberMatch && (
      d.resource_name.toLowerCase().includes(q) ||
      getMemberName(d).toLowerCase().includes(q)
    );
  });

  const columns: DataTableColumn<DownloadRow>[] = [
    {
      key: 'resource',
      header: 'Resource',
      sortable: true,
      render: (d) => (
        <div>
          <p className="font-medium">{d.resource_name}</p>
          <p className="text-xs text-muted-foreground">{d.resource_type}</p>
        </div>
      ),
    },
    { key: 'member', header: 'Member', sortable: true, render: (d) => getMemberName(d) },
    {
      key: 'date',
      header: 'Downloaded',
      sortable: true,
      render: (d) => new Date(d.downloaded_at).toLocaleDateString(),
    },
    {
      key: 'url',
      header: 'File',
      render: (d) =>
        d.file_url && d.file_url !== '#' ? (
          <a
            href={d.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-2 hover:underline text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            Open
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (d) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={(e) => { e.stopPropagation(); setDeleteId(d.id); }}
          aria-label="Delete download record"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Downloads"
        action={
          <Button onClick={() => { setForm(blankForm()); setSaveError(''); setDrawerOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Download
          </Button>
        }
      />
      {error ? (
        <AdminErrorState label="downloads" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyLabel="download records"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by resource or member…"
          filters={
            <Select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
              className="max-w-[200px]"
            >
              <option value="">All members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
              ))}
            </Select>
          }
        />
      )}

      {/* Create drawer */}
      <DetailDrawer
        open={drawerOpen}
        title="Add Download Record"
        onClose={() => setDrawerOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Add Record'}</Button>
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
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Member *</label>
            <Select
              value={form.memberId}
              onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
            >
              <option value="">Select member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Resource name *</label>
            <Input
              placeholder="e.g. 30-Day Prayer Guide"
              value={form.resourceName}
              onChange={(e) => setForm((f) => ({ ...f, resourceName: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Resource type</label>
            <Select
              value={form.resourceType}
              onChange={(e) => setForm((f) => ({ ...f, resourceType: e.target.value }))}
            >
              {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">File URL</label>
            <Input
              placeholder="https://…"
              value={form.fileUrl}
              onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))}
            />
          </div>
        </div>
      </DetailDrawer>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete download record?"
        message="This will remove the download record. The file itself is not affected."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </AdminLayout>
  );
}

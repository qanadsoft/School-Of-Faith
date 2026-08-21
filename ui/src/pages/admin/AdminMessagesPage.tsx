import { useEffect, useState } from 'react';
import { Plus, Archive, ArchiveRestore, Play, Trash2, Video, X } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminErrorState } from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, asList } from '@/lib/api';
import type { Topic } from '@/lib/supabase';

type MessageRow = {
  id: string;
  title: string;
  speaker: string;
  category: string;
  description?: string;
  original_url?: string;
  thumbnail_url?: string | null;
  video_url?: string | null;
  duration_minutes?: number;
  published_at: string;
  archived: boolean;
  saved_count?: number;
  topics?: Topic[];
};

const CATEGORIES = ['General', 'Teaching', 'Hope Restored', 'Worship', 'Prayer', 'Mission', 'Youth', 'Family', 'Leadership', 'Holy Spirit', 'Grace', 'Faith', 'Healing', 'Purpose'];

function blankForm(m?: MessageRow) {
  return {
    title: m?.title ?? '',
    speaker: m?.speaker ?? '',
    category: m?.category ?? 'General',
    description: m?.description ?? '',
    thumbnailUrl: m?.thumbnail_url ?? '',
    videoUrl: m?.video_url ?? '',
    durationMinutes: m?.duration_minutes ? String(m.duration_minutes) : '45',
    originalUrl: m?.original_url ?? '#',
    publishedAt: m?.published_at ? m.published_at.split('T')[0] : new Date().toISOString().split('T')[0],
    topicIds: m?.topics ? m.topics.map((t) => t.id) : [] as string[],
  };
}

export function AdminMessagesPage() {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  // drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<MessageRow | null>(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // archive & delete confirms
  const [archiveTarget, setArchiveTarget] = useState<MessageRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MessageRow | null>(null);

  // video preview modal
  const [previewVideo, setPreviewVideo] = useState<MessageRow | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(false);
      const [msgData, topicsData] = await Promise.all([
        api.getAdminMessages(),
        api.getVideoTopics(),
      ]);
      setMessages(asList<MessageRow>(msgData));
      setAvailableTopics(asList<Topic>(topicsData));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const openCreate = () => {
    setSelected(null);
    setForm(blankForm());
    setSaveError('');
    setDrawerOpen(true);
  };

  const openEdit = (m: MessageRow) => {
    setSelected(m);
    setForm(blankForm(m));
    setSaveError('');
    setDrawerOpen(true);
  };

  const toggleTopicSelection = (topicId: string) => {
    setForm((prev) => {
      const exists = prev.topicIds.includes(topicId);
      return {
        ...prev,
        topicIds: exists
          ? prev.topicIds.filter((id) => id !== topicId)
          : [...prev.topicIds, topicId],
      };
    });
  };

  const save = async () => {
    setSaveError('');
    if (!form.title.trim() || !form.speaker.trim()) {
      setSaveError('Title and speaker are required.');
      return;
    }
    const duration = parseInt(form.durationMinutes, 10);
    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        speaker: form.speaker.trim(),
        category: form.category || 'General',
        description: form.description.trim(),
        thumbnailUrl: form.thumbnailUrl.trim() || null,
        videoUrl: form.videoUrl.trim() || null,
        durationMinutes: isNaN(duration) ? 0 : Math.max(0, duration),
        originalUrl: form.originalUrl.trim() || '#',
        publishedAt: form.publishedAt,
        topicIds: form.topicIds,
      };

      if (selected) {
        await api.updateMessage(selected.id, payload);
      } else {
        await api.createMessage(payload);
      }
      setDrawerOpen(false);
      refresh();
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save message.');
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async () => {
    if (!archiveTarget) return;
    await api.archiveMessage(archiveTarget.id);
    setArchiveTarget(null);
    refresh();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteMessage(deleteTarget.id);
    setDeleteTarget(null);
    refresh();
  };

  const filtered = messages.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.speaker.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      (m.topics && m.topics.some((t) => t.name.toLowerCase().includes(q)))
    );
  });

  const columns: DataTableColumn<MessageRow>[] = [
    {
      key: 'thumbnail',
      header: 'Video',
      render: (m) => (
        <div
          className="group relative h-12 w-20 shrink-0 cursor-pointer overflow-hidden rounded-md bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            if (m.video_url) setPreviewVideo(m);
            else openEdit(m);
          }}
          title={m.video_url ? 'Click to preview video' : 'Edit video'}
        >
          {m.thumbnail_url ? (
            <img src={m.thumbnail_url} alt={m.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Video className="h-5 w-5" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <Play className="h-5 w-5 text-white" />
          </div>
        </div>
      ),
    },
    {
      key: 'title',
      header: 'Title & Speaker',
      sortable: true,
      render: (m) => (
        <div className="max-w-xs">
          <p className="font-medium line-clamp-1">{m.title}</p>
          <p className="text-xs text-muted-foreground">{m.speaker}</p>
          {m.description && <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-0.5">{m.description}</p>}
        </div>
      ),
    },
    {
      key: 'topics',
      header: 'Topics',
      render: (m) => (
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {m.topics && m.topics.length > 0 ? (
            m.topics.map((t) => (
              <span key={t.id} className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {t.name}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">{m.category}</span>
          )}
        </div>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (m) => `${m.duration_minutes || 0} min`,
    },
    {
      key: 'published',
      header: 'Published',
      sortable: true,
      render: (m) => new Date(m.published_at).toLocaleDateString(),
    },
    {
      key: 'saved',
      header: 'Saves',
      render: (m) => m.saved_count ?? 0,
    },
    {
      key: 'status',
      header: 'Status',
      render: (m) => <StatusBadge status={m.archived ? 'archived' : 'active'} />,
    },
    {
      key: 'actions',
      header: '',
      render: (m) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {m.video_url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewVideo(m)}
              title="Preview Video"
            >
              <Play className="h-4 w-4 text-primary" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setArchiveTarget(m)}
            title={m.archived ? 'Restore' : 'Archive'}
          >
            {m.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTarget(m)}
            title="Delete Video"
            className="text-destructive hover:text-destructive"
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
        title="Videos & Messages"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Video
          </Button>
        }
      />
      {error ? (
        <AdminErrorState label="videos" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyLabel="videos"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by title, speaker, category, or topic…"
          onRowClick={openEdit}
        />
      )}

      {/* Create / Edit drawer */}
      <DetailDrawer
        open={drawerOpen}
        title={selected ? 'Edit Video' : 'New Video'}
        onClose={() => setDrawerOpen(false)}
        wide
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : selected ? 'Save Changes' : 'Create Video'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {saveError && (
            <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{saveError}</p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Title *</label>
            <Input placeholder="e.g. Finding Peace in Chaos" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Speaker / Instructor *</label>
            <Input placeholder="e.g. Pastor Michael" value={form.speaker} onChange={(e) => setForm((f) => ({ ...f, speaker: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              rows={3}
              placeholder="Brief summary of the video message…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Topics Assignment */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Topics / Categories (Select all that apply)
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {availableTopics.map((topic) => {
                const isSelected = form.topicIds.includes(topic.id);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleTopicSelection(topic.id)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors text-left ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded border-input text-primary pointer-events-none"
                    />
                    <span>{topic.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Primary Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Duration (Minutes)</label>
              <Input
                type="number"
                min="1"
                placeholder="45"
                value={form.durationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Thumbnail Image URL</label>
              <Input
                placeholder="https://images.unsplash.com/…"
                value={form.thumbnailUrl}
                onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Video Stream / File URL</label>
              <Input
                placeholder="https://storage.googleapis.com/…/video.mp4"
                value={form.videoUrl}
                onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Published Date</label>
            <Input type="date" value={form.publishedAt} onChange={(e) => setForm((f) => ({ ...f, publishedAt: e.target.value }))} />
          </div>

          {/* Video Preview in Drawer */}
          {form.videoUrl && (
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Video Preview:</p>
              <video
                src={form.videoUrl}
                poster={form.thumbnailUrl || undefined}
                controls
                className="aspect-video w-full rounded-lg bg-black object-contain"
              />
            </div>
          )}
        </div>
      </DetailDrawer>

      {/* Video Preview Dialog / Player */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h3 className="font-serif text-lg font-semibold">{previewVideo.title}</h3>
                <p className="text-xs text-muted-foreground">{previewVideo.speaker} · {previewVideo.duration_minutes} min</p>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-black">
              <video
                src={previewVideo.video_url || undefined}
                poster={previewVideo.thumbnail_url || undefined}
                controls
                autoPlay
                className="aspect-video w-full object-contain"
              />
            </div>
            {previewVideo.description && (
              <div className="p-4 text-sm text-muted-foreground">
                {previewVideo.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Archive confirm */}
      <ConfirmDialog
        open={!!archiveTarget}
        title={archiveTarget?.archived ? 'Publish/Restore video?' : 'Unpublish/Archive video?'}
        message={
          archiveTarget?.archived
            ? 'This video will be published and visible to members again.'
            : 'The video will be archived and hidden from members.'
        }
        confirmLabel={archiveTarget?.archived ? 'Publish' : 'Archive'}
        onConfirm={toggleArchive}
        onCancel={() => setArchiveTarget(null)}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete video permanently?"
        message="This action cannot be undone. All member watch progress associated with this video will also be removed."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminLayout>
  );
}

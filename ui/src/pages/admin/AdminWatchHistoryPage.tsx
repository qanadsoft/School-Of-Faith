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

type WatchRow = {
  id: string;
  member_id: string;
  course_id: string;
  watch_duration_minutes: number;
  completion_percentage: number;
  watched_at: string;
  member?: { id: string; first_name: string; last_name: string };
  course?: { id: string; title: string };
};

type Member = { id: string; first_name: string; last_name: string };
type Course = { id: string; title: string; archived: boolean };

export function AdminWatchHistoryPage() {
  const [records, setRecords] = useState<WatchRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState('');

  // add drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [minutes, setMinutes] = useState('');
  const [completion, setCompletion] = useState('0');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(false);
      const [wData, mData, cData] = await Promise.all([
        api.getAdminWatchActivity(),
        api.getAdminMembers(),
        api.getAdminCourses(),
      ]);
      setRecords(asList<WatchRow>(wData));
      setMembers(asList<Member>(mData));
      setCourses(asList<Course>(cData));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const addRecord = async () => {
    setSaveError('');
    if (!memberId || !courseId) { setSaveError('Please select a member and course.'); return; }
    const mins = parseInt(minutes);
    if (isNaN(mins) || mins <= 0) { setSaveError('Duration must be a positive number.'); return; }
    const comp = parseFloat(completion);
    try {
      setSaving(true);
      await api.createWatchActivity({
        userId: memberId,
        courseId,
        watchDurationMinutes: mins,
        completionPercentage: isNaN(comp) ? 0 : Math.min(100, Math.max(0, comp)),
      });
      setMemberId(''); setCourseId(''); setMinutes(''); setCompletion('0');
      setDrawerOpen(false);
      refresh();
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to add watch record.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await api.deleteWatchActivity(deleteId);
    setDeleteId(null);
    refresh();
  };

  const getMemberName = (r: WatchRow) => {
    if (r.member) return `${r.member.first_name} ${r.member.last_name}`;
    const m = members.find((m) => m.id === r.member_id);
    return m ? `${m.first_name} ${m.last_name}` : r.member_id.slice(0, 8);
  };

  const getCourseName = (r: WatchRow) => {
    if (r.course) return r.course.title;
    const c = courses.find((c) => c.id === r.course_id);
    return c?.title ?? r.course_id.slice(0, 8);
  };

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    const memberMatch = !memberFilter || r.member_id === memberFilter;
    return memberMatch && (
      getMemberName(r).toLowerCase().includes(q) ||
      getCourseName(r).toLowerCase().includes(q)
    );
  });

  const columns: DataTableColumn<WatchRow>[] = [
    { key: 'member', header: 'Member', sortable: true, render: (r) => getMemberName(r) },
    { key: 'course', header: 'Course', sortable: true, render: (r) => getCourseName(r) },
    {
      key: 'duration',
      header: 'Duration',
      sortable: true,
      render: (r) => `${r.watch_duration_minutes} min`,
    },
    {
      key: 'completion',
      header: 'Completion',
      render: (r) => `${Math.round(Number(r.completion_percentage))}%`,
    },
    {
      key: 'date',
      header: 'Watched',
      sortable: true,
      render: (r) => new Date(r.watched_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}
          aria-label="Delete record"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Watch Activity"
        action={
          <Button onClick={() => { setMemberId(''); setCourseId(''); setMinutes(''); setCompletion('0'); setSaveError(''); setDrawerOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Record
          </Button>
        }
      />
      {error ? (
        <AdminErrorState label="watch activity" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyLabel="watch activity records"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by member or course…"
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

      {/* Add record drawer */}
      <DetailDrawer
        open={drawerOpen}
        title="Add Watch Record"
        onClose={() => setDrawerOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={addRecord} disabled={saving}>{saving ? 'Saving…' : 'Add Record'}</Button>
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
            <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Select member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Course *</label>
            <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Select course…</option>
              {courses
                .filter((c) => !c.archived)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Duration (minutes) *</label>
            <Input
              type="number"
              min={1}
              placeholder="e.g. 60"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Completion %</label>
            <Input
              type="number"
              min={0}
              max={100}
              placeholder="0–100"
              value={completion}
              onChange={(e) => setCompletion(e.target.value)}
            />
          </div>
        </div>
      </DetailDrawer>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete watch record?"
        message="This will remove the record and may reduce the member's total hours watched."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </AdminLayout>
  );
}

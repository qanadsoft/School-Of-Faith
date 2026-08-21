import { useEffect, useState } from 'react';
import { Plus, Archive, ArchiveRestore, BookOpen, Trash2, Edit2, Play, Users } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminErrorState } from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { api, asList } from '@/lib/api';

type Course = {
  id: string;
  title: string;
  instructor: string;
  category: string;
  description: string;
  difficulty: string;
  duration_minutes: number;
  image_url?: string | null;
  archived: boolean;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  duration_minutes: number;
  sort_order: number;
  video_url?: string | null;
};

type Member = { id: string; first_name: string; last_name: string; email?: string };

type Enrollment = {
  id: string;
  member_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
  completed_at?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
  progress?: number;
  completed_lessons?: number;
  total_lessons?: number;
};

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced', 'all-levels'];
const CATEGORIES = ['Theology', 'Leadership', 'Prayer', 'Service', 'Finances', 'Marriage', 'Bible Study', 'Discipleship', 'General'];

function blankForm(c?: Course) {
  return {
    title: c?.title ?? '',
    instructor: c?.instructor ?? '',
    category: c?.category ?? 'General',
    description: c?.description ?? '',
    difficulty: c?.difficulty ?? 'all-levels',
    durationMinutes: c ? String(c.duration_minutes) : '0',
    imageUrl: c?.image_url ?? '',
  };
}

function blankLessonForm(l?: Lesson, nextOrder = 1) {
  return {
    title: l?.title ?? '',
    durationMinutes: l ? String(l.duration_minutes) : '30',
    sortOrder: l ? String(l.sort_order) : String(nextOrder),
    videoUrl: l?.video_url ?? 'https://vjs.zencdn.net/v/oceans.mp4',
  };
}

export function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  // course drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Course | null>(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // archive confirm
  const [archiveTarget, setArchiveTarget] = useState<Course | null>(null);

  // lessons panel
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [lessonCourse, setLessonCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessonDrawerOpen, setLessonDrawerOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState(blankLessonForm());
  const [lessonSaving, setLessonSaving] = useState(false);
  const [lessonError, setLessonError] = useState('');
  const [deleteLessonTarget, setDeleteLessonTarget] = useState<Lesson | null>(null);
  const [detectingDuration, setDetectingDuration] = useState(false);
  const [detectedDurationNotice, setDetectedDurationNotice] = useState<string | null>(null);

  const detectVideoDuration = (url: string) => {
    if (!url || !url.trim().startsWith('http')) {
      setDetectedDurationNotice(null);
      return;
    }
    const cleanUrl = url.trim();
    try {
      setDetectingDuration(true);
      setDetectedDurationNotice('Detecting video duration...');
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = cleanUrl;
      video.onloadedmetadata = () => {
        const durationSeconds = video.duration;
        if (durationSeconds && !isNaN(durationSeconds) && durationSeconds > 0) {
          const mins = Math.max(1, Math.round(durationSeconds / 60));
          setLessonForm((prev) => ({ ...prev, durationMinutes: String(mins) }));
          const formatted = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`;
          setDetectedDurationNotice(`✓ Auto-detected duration: ${formatted} (${Math.round(durationSeconds)}s)`);
        } else {
          setDetectedDurationNotice('Could not auto-detect duration. You may enter it manually.');
        }
        setDetectingDuration(false);
      };
      video.onerror = () => {
        setDetectedDurationNotice('Could not auto-load video metadata. You may enter duration manually.');
        setDetectingDuration(false);
      };
    } catch {
      setDetectingDuration(false);
      setDetectedDurationNotice(null);
    }
  };

  // enrollments panel
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollCourse, setEnrollCourse] = useState<Course | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollMemberId, setEnrollMemberId] = useState('');
  const [enrollSaving, setEnrollSaving] = useState(false);
  const [removeEnrollId, setRemoveEnrollId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(false);
      const [courseData, memberData] = await Promise.all([
        api.getAdminCourses(),
        api.getAdminMembers(),
      ]);
      setCourses(asList<Course>(courseData));
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

  // ── Course CRUD ──────────────────────────────────────────────────────────────
  const openCreate = () => {
    setSelected(null);
    setForm(blankForm());
    setSaveError('');
    setDrawerOpen(true);
  };

  const openEdit = (c: Course) => {
    setSelected(c);
    setForm(blankForm(c));
    setSaveError('');
    setDrawerOpen(true);
  };

  const save = async () => {
    setSaveError('');
    if (!form.title.trim() || !form.instructor.trim()) {
      setSaveError('Title and instructor are required.');
      return;
    }
    const mins = parseInt(form.durationMinutes);
    if (isNaN(mins) || mins < 0) {
      setSaveError('Duration must be a non-negative number.');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || ' ',
        instructor: form.instructor.trim(),
        category: form.category || 'General',
        difficulty: form.difficulty || 'all-levels',
        durationMinutes: mins,
        imageUrl: form.imageUrl.trim() || null,
      };
      if (selected) {
        await api.updateCourse(selected.id, payload);
      } else {
        await api.createCourse(payload);
      }
      setDrawerOpen(false);
      refresh();
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save course.');
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async () => {
    if (!archiveTarget) return;
    await api.archiveCourse(archiveTarget.id);
    setArchiveTarget(null);
    refresh();
  };

  // ── Lessons ──────────────────────────────────────────────────────────────────
  const openLessons = async (c: Course) => {
    setLessonCourse(c);
    setLessonsOpen(true);
    setLessonsLoading(true);
    try {
      const data = await api.getAdminCourseLessons(c.id);
      setLessons(asList<Lesson>(data));
    } catch (err) {
      console.error('Failed to load lessons:', err);
    } finally {
      setLessonsLoading(false);
    }
  };

  const openAddLesson = () => {
    setSelectedLesson(null);
    setLessonForm(blankLessonForm(undefined, lessons.length + 1));
    setLessonError('');
    setDetectedDurationNotice(null);
    setLessonDrawerOpen(true);
  };

  const openEditLesson = (l: Lesson) => {
    setSelectedLesson(l);
    setLessonForm(blankLessonForm(l));
    setLessonError('');
    setDetectedDurationNotice(null);
    setLessonDrawerOpen(true);
  };

  const saveLesson = async () => {
    if (!lessonCourse) return;
    setLessonError('');
    if (!lessonForm.title.trim()) {
      setLessonError('Lesson title is required.');
      return;
    }
    const mins = parseInt(lessonForm.durationMinutes);
    const order = parseInt(lessonForm.sortOrder);
    if (isNaN(mins) || mins < 0) {
      setLessonError('Duration must be a non-negative number.');
      return;
    }
    try {
      setLessonSaving(true);
      const payload = {
        title: lessonForm.title.trim(),
        durationMinutes: mins,
        sortOrder: isNaN(order) ? lessons.length + 1 : order,
        videoUrl: lessonForm.videoUrl.trim() || null,
      };
      if (selectedLesson) {
        await api.updateAdminLesson(lessonCourse.id, selectedLesson.id, payload);
      } else {
        await api.createAdminLesson(lessonCourse.id, payload);
      }
      setLessonDrawerOpen(false);
      // Reload lessons
      const updated = await api.getAdminCourseLessons(lessonCourse.id);
      setLessons(asList<Lesson>(updated));
      refresh();
    } catch (err: any) {
      setLessonError(err?.message ?? 'Failed to save lesson.');
    } finally {
      setLessonSaving(false);
    }
  };

  const confirmDeleteLesson = async () => {
    if (!deleteLessonTarget || !lessonCourse) return;
    try {
      await api.deleteAdminLesson(lessonCourse.id, deleteLessonTarget.id);
      setDeleteLessonTarget(null);
      const updated = await api.getAdminCourseLessons(lessonCourse.id);
      setLessons(asList<Lesson>(updated));
      refresh();
    } catch (err) {
      console.error('Failed to delete lesson:', err);
    }
  };

  // ── Enrollments ──────────────────────────────────────────────────────────────
  const openEnrollments = async (c: Course) => {
    setEnrollCourse(c);
    setEnrollMemberId('');
    setEnrollOpen(true);
    setEnrollLoading(true);
    try {
      const data = await api.getAdminCourseEnrollmentStats(c.id);
      setEnrollments(asList<Enrollment>(data));
    } catch (err) {
      console.error('Failed to load course enrollments:', err);
    } finally {
      setEnrollLoading(false);
    }
  };

  const addEnrollment = async () => {
    if (!enrollCourse || !enrollMemberId) return;
    try {
      setEnrollSaving(true);
      await api.createEnrollment({ memberId: enrollMemberId, courseId: enrollCourse.id });
      setEnrollMemberId('');
      const data = await api.getAdminCourseEnrollmentStats(enrollCourse.id);
      setEnrollments(asList<Enrollment>(data));
    } finally {
      setEnrollSaving(false);
    }
  };

  const confirmRemoveEnroll = async () => {
    if (!removeEnrollId || !enrollCourse) return;
    await api.deleteEnrollment(removeEnrollId);
    setRemoveEnrollId(null);
    const data = await api.getAdminCourseEnrollmentStats(enrollCourse.id);
    setEnrollments(asList<Enrollment>(data));
  };

  const filtered = courses.filter((c) => {
    const q = search.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.instructor.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  const enrolledMemberIds = new Set(enrollments.map((e) => e.member_id));

  const columns: DataTableColumn<Course>[] = [
    {
      key: 'title',
      header: 'Course',
      sortable: true,
      render: (c) => (
        <div>
          <p className="font-medium">{c.title}</p>
          <p className="text-xs text-muted-foreground">{c.instructor} · {c.category}</p>
        </div>
      ),
    },
    { key: 'difficulty', header: 'Difficulty', render: (c) => <span className="capitalize text-xs">{c.difficulty}</span> },
    { key: 'duration', header: 'Duration', render: (c) => `${c.duration_minutes} min` },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <StatusBadge status={c.archived ? 'archived' : 'active'} />,
    },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => openLessons(c)} title="Manage Lessons" className="gap-1 text-xs">
            <BookOpen className="h-3.5 w-3.5" /> Lessons
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEnrollments(c)} title="View Enrollments" className="gap-1 text-xs">
            <Users className="h-3.5 w-3.5" /> Members
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setArchiveTarget(c)}
            title={c.archived ? 'Restore' : 'Archive'}
          >
            {c.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Courses & Discipleship"
        action={
          <Button onClick={openCreate} className="gap-1.5">
            <Plus className="h-4 w-4" /> New Course
          </Button>
        }
      />
      {error ? (
        <AdminErrorState label="courses" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyLabel="courses"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search courses…"
          onRowClick={openEdit}
        />
      )}

      {/* Course create / edit drawer */}
      <DetailDrawer
        open={drawerOpen}
        title={selected ? 'Edit Course' : 'New Course'}
        onClose={() => setDrawerOpen(false)}
        wide
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : selected ? 'Save Changes' : 'Create Course'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          {saveError && (
            <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{saveError}</p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Title *</label>
            <Input placeholder="Course title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Instructor *</label>
            <Input placeholder="Instructor name" value={form.instructor} onChange={(e) => setForm((f) => ({ ...f, instructor: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Category</label>
              <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Difficulty</label>
              <Select value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Duration (minutes)</label>
            <Input type="number" min={0} placeholder="0" value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Image URL</label>
            <Input placeholder="https://…" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
            <Textarea placeholder="Course description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
      </DetailDrawer>

      {/* Course Lessons Drawer */}
      <DetailDrawer
        open={lessonsOpen}
        title={lessonCourse ? `Lessons — ${lessonCourse.title}` : 'Lessons'}
        onClose={() => setLessonsOpen(false)}
        wide
        footer={
          <div className="flex items-center justify-between w-full">
            <Button onClick={openAddLesson} className="gap-1.5" size="sm">
              <Plus className="h-4 w-4" /> Add Lesson
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLessonsOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {lessonsLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Loading lessons…</p>
          ) : lessons.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center space-y-3">
              <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No lessons created yet for this course.</p>
              <Button onClick={openAddLesson} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Add First Lesson
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border/60 overflow-hidden bg-card">
              {lessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center justify-between p-3 text-sm hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                      {lesson.sort_order}
                    </span>
                    <div>
                      <p className="font-medium">{lesson.title}</p>
                      <p className="text-xs text-muted-foreground">{lesson.duration_minutes} min {lesson.video_url && '· Video linked'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditLesson(lesson)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteLessonTarget(lesson)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DetailDrawer>

      {/* Add / Edit Single Lesson Modal / Drawer */}
      <DetailDrawer
        open={lessonDrawerOpen}
        title={selectedLesson ? 'Edit Lesson' : 'Add New Lesson'}
        onClose={() => setLessonDrawerOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setLessonDrawerOpen(false)}>Cancel</Button>
            <Button onClick={saveLesson} disabled={lessonSaving}>
              {lessonSaving ? 'Saving…' : selectedLesson ? 'Save Lesson' : 'Add Lesson'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {lessonError && (
            <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{lessonError}</p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Lesson Title *</label>
            <Input
              placeholder="e.g. Grace and Salvation"
              value={lessonForm.title}
              onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Sort Order (Sequence)</label>
              <Input
                type="number"
                min={1}
                value={lessonForm.sortOrder}
                onChange={(e) => setLessonForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Duration (minutes)</label>
              <Input
                type="number"
                min={1}
                value={lessonForm.durationMinutes}
                onChange={(e) => setLessonForm((f) => ({ ...f, durationMinutes: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-muted-foreground">Video Stream URL</label>
              {detectingDuration && <span className="text-[11px] text-primary animate-pulse">Detecting duration…</span>}
            </div>
            <Input
              placeholder="https://...mp4"
              value={lessonForm.videoUrl}
              onChange={(e) => {
                const val = e.target.value;
                setLessonForm((f) => ({ ...f, videoUrl: val }));
                detectVideoDuration(val);
              }}
              onBlur={() => {
                if (lessonForm.videoUrl && !detectingDuration) {
                  detectVideoDuration(lessonForm.videoUrl);
                }
              }}
            />
            {detectedDurationNotice && (
              <p className={`mt-1.5 text-xs ${detectedDurationNotice.startsWith('✓') ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}`}>
                {detectedDurationNotice}
              </p>
            )}
          </div>
        </div>
      </DetailDrawer>

      {/* Enrollments & Member Progress Drawer */}
      <DetailDrawer
        open={enrollOpen}
        title={enrollCourse ? `Enrollments — ${enrollCourse.title}` : 'Enrollments'}
        onClose={() => setEnrollOpen(false)}
        wide
        footer={<Button variant="outline" onClick={() => setEnrollOpen(false)}>Close</Button>}
      >
        <div className="space-y-4">
          {/* Add enrollment */}
          <div className="flex gap-2">
            <Select
              value={enrollMemberId}
              onChange={(e) => setEnrollMemberId(e.target.value)}
              className="flex-1"
            >
              <option value="">Select member to enroll…</option>
              {members
                .filter((m) => !enrolledMemberIds.has(m.id))
                .map((m) => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.email || 'Member'})</option>
                ))}
            </Select>
            <Button onClick={addEnrollment} disabled={enrollSaving || !enrollMemberId}>
              {enrollSaving ? 'Adding…' : 'Enroll'}
            </Button>
          </div>

          {/* Enrollment list */}
          {enrollLoading ? (
            <p className="text-sm text-muted-foreground">Loading enrollments…</p>
          ) : enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enrollments for this course.</p>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border/60 overflow-hidden bg-card">
              {enrollments.map((e) => (
                <div key={e.id} className="p-3 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{e.first_name} {e.last_name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{e.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={e.status} />
                      <button
                        type="button"
                        onClick={() => setRemoveEnrollId(e.id)}
                        className="text-muted-foreground hover:text-destructive text-lg font-bold px-1"
                        aria-label="Remove enrollment"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Progress: {e.completed_lessons || 0} / {e.total_lessons || 0} lessons ({e.progress || 0}%)</span>
                    <span>Enrolled: {new Date(e.enrolled_at).toLocaleDateString()}</span>
                  </div>
                  <Progress value={e.progress || 0} className="h-1 bg-muted" />
                </div>
              ))}
            </div>
          )}
        </div>
      </DetailDrawer>

      {/* Archive confirm */}
      <ConfirmDialog
        open={!!archiveTarget}
        title={archiveTarget?.archived ? 'Restore course?' : 'Archive course?'}
        message={
          archiveTarget?.archived
            ? 'This course will become active and visible again.'
            : 'The course will be hidden from members but data is preserved.'
        }
        confirmLabel={archiveTarget?.archived ? 'Restore' : 'Archive'}
        onConfirm={toggleArchive}
        onCancel={() => setArchiveTarget(null)}
      />

      {/* Delete lesson confirm */}
      <ConfirmDialog
        open={!!deleteLessonTarget}
        title="Delete Lesson?"
        message={`Are you sure you want to delete "${deleteLessonTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteLesson}
        onCancel={() => setDeleteLessonTarget(null)}
      />

      {/* Remove enrollment confirm */}
      <ConfirmDialog
        open={!!removeEnrollId}
        title="Remove enrollment?"
        message="The member will be unenrolled from this course."
        confirmLabel="Remove"
        onConfirm={confirmRemoveEnroll}
        onCancel={() => setRemoveEnrollId(null)}
      />
    </AdminLayout>
  );
}

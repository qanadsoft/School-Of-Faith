import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, Pencil } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { DetailDrawer, DetailSection } from '@/components/admin/DetailDrawer';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { AdminLoadingState, AdminErrorState } from '@/components/admin/AdminStates';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, asList } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MemberDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image?: string;
  bio?: string;
  join_date: string;
  membership_type: string;
  membership_status: string;
  is_active: boolean;
  roles: string[];
  tags: Array<{ id: string; name: string; color: string; textColor: string }>;
}

interface Stats { courses: number; hours_watched: number; events: number; certificates: number }
interface Enrollment { id: string; status: string; enrolled_at: string; course: { id: string; title: string } }
interface WatchRec { id: string; watch_duration_minutes: number; completion_percentage: number; watched_at: string; course: { id: string; title: string } }
interface Cert { id: string; certificate_number: string; title: string; issue_date: string; status: string; course: { id: string; title: string } }
interface EventReg { id: string; registration_status: string; attendance_status: string; registered_at: string; event: { id: string; title: string; starts_at: string } }
interface Ticket { id: string; ticket_number: string; ticket_status: string; attendance_status: string; issued_at: string; event: { id: string; title: string; starts_at: string } }
interface Donation { id: string; amount: number; fund: string; payment_status: string; donated_at: string }
interface PrayerReq { id: string; title: string; status: string; created_at: string }
interface Download { id: string; resource_name: string; resource_type: string; downloaded_at: string }
interface Tag { id: string; name: string; color: string }
interface Course { id: string; title: string }
interface Event { id: string; title: string }

const tagColorClass: Record<string, string> = {
  gold: 'bg-primary/10 text-primary border-primary/20',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
};

const MEMBERSHIP_TYPES = ['Member', 'Faithful Member', 'Student', 'Volunteer', 'Administrator'];
const MEMBERSHIP_STATUSES = ['active', 'inactive', 'suspended'];

// ─── Stat mini-card ───────────────────────────────────────────────────────────
function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-2xl font-sans font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function AdminMemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [member, setMember] = useState<MemberDetail | null>(null);
  const [stats, setStats] = useState<Stats>({ courses: 0, hours_watched: 0, events: 0, certificates: 0 });
  const [notFound, setNotFound] = useState(false);

  // lists
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [watchRecords, setWatchRecords] = useState<WatchRec[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [registrations, setRegistrations] = useState<EventReg[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [prayers, setPrayers] = useState<PrayerReq[]>([]);
  const [downloads, setDownloads] = useState<Download[]>([]);

  // UI state — edit profile drawer
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', membershipType: '', membershipStatus: '', isActive: true, bio: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // UI state — tag management
  const [selectedTag, setSelectedTag] = useState('');

  // UI state — enroll
  const [enrollDrawerOpen, setEnrollDrawerOpen] = useState(false);
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [enrollSaving, setEnrollSaving] = useState(false);
  const [removeEnrollId, setRemoveEnrollId] = useState<string | null>(null);

  // UI state — watch record
  const [watchDrawerOpen, setWatchDrawerOpen] = useState(false);
  const [watchCourseId, setWatchCourseId] = useState('');
  const [watchMinutes, setWatchMinutes] = useState('');
  const [watchSaving, setWatchSaving] = useState(false);

  // UI state — certificate
  const [certDrawerOpen, setCertDrawerOpen] = useState(false);
  const [certCourseId, setCertCourseId] = useState('');
  const [certSaving, setCertSaving] = useState(false);
  const [revokeCertId, setRevokeCertId] = useState<string | null>(null);

  // UI state — event attendance
  const [attendDrawerOpen, setAttendDrawerOpen] = useState(false);
  const [attendEventId, setAttendEventId] = useState('');
  const [attendStatus, setAttendStatus] = useState('attended');
  const [attendSaving, setAttendSaving] = useState(false);

  // UI state — ticket
  const [ticketDrawerOpen, setTicketDrawerOpen] = useState(false);
  const [ticketEventId, setTicketEventId] = useState('');
  const [ticketSaving, setTicketSaving] = useState(false);
  const [cancelTicketId, setCancelTicketId] = useState<string | null>(null);

  // UI state — donation
  const [donationDrawerOpen, setDonationDrawerOpen] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [donationFund, setDonationFund] = useState('');
  const [donationSaving, setDonationSaving] = useState(false);

  // ─── Loaders ────────────────────────────────────────────────────────────────
  const loadMember = useCallback(async () => {
    if (!id) return;
    try {
      const [m, s] = await Promise.all([
        api.getAdminMember(id) as Promise<MemberDetail>,
        api.getAdminMemberStats(id) as Promise<Stats>,
      ]);
      if (!m) { setNotFound(true); return; }
      setMember(m);
      setStats(s);
    } catch {
      setNotFound(true);
    }
  }, [id]);

  const loadLists = useCallback(async () => {
    if (!id) return;
    const [tags, courses, events, enr, watch, certData, regs, tix, don, pray, dl] =
      await Promise.allSettled([
        api.getAdminTags(),
        api.getAdminCourses(),
        api.getAdminEvents(),
        api.getMemberEnrollments(id),
        api.getAdminWatchActivity(), // filtered below
        api.getAdminCertificates(),  // filtered below
        api.getAdminEvents(),        // reuse for registration lookup
        api.getAdminEventTickets(),  // filtered below
        api.getAdminDonations(),     // filtered below
        api.getAdminPrayerRequests(),// filtered below
        api.getAdminDownloads(),     // filtered below
      ]);

    if (tags.status === 'fulfilled') setAllTags(asList<Tag>(tags.value));
    if (courses.status === 'fulfilled') setAllCourses(asList<Course>(courses.value).filter((c: any) => !c.archived));
    if (events.status === 'fulfilled') setAllEvents(asList<Event>(events.value).filter((e: any) => !e.archived));
    if (enr.status === 'fulfilled') setEnrollments(asList<Enrollment>(enr.value));
    if (watch.status === 'fulfilled') setWatchRecords(asList<WatchRec>(watch.value).filter((w: any) => w.member_id === id));
    if (certData.status === 'fulfilled') setCerts(asList<Cert>(certData.value).filter((c: any) => c.member_id === id));
    if (tix.status === 'fulfilled') setTickets(asList<Ticket>(tix.value).filter((t: any) => t.member_id === id));
    if (don.status === 'fulfilled') setDonations(asList<Donation>(don.value).filter((d: any) => d.member_id === id));
    if (pray.status === 'fulfilled') setPrayers(asList<PrayerReq>(pray.value).filter((p: any) => p.member_id === id));
    if (dl.status === 'fulfilled') setDownloads(asList<Download>(dl.value).filter((d: any) => d.member_id === id));

    // Load registrations via enrollments list
    if (enr.status === 'fulfilled') {
      // registrations come embedded in getMemberEnrollments – use events data for attendance display
    }
  }, [id]);

  useEffect(() => {
    loadMember();
    loadLists();
  }, [loadMember, loadLists]);

  const reload = () => { loadMember(); loadLists(); };

  // ─── Edit profile ────────────────────────────────────────────────────────────
  const openEdit = () => {
    if (!member) return;
    setEditForm({
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email,
      membershipType: member.membership_type,
      membershipStatus: member.membership_status,
      isActive: member.is_active,
      bio: member.bio ?? '',
    });
    setEditError('');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!id) return;
    setEditError('');
    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim()) {
      setEditError('First name, last name and email are required.');
      return;
    }
    try {
      setEditSaving(true);
      await api.updateMember(id, editForm);
      setEditOpen(false);
      loadMember();
    } catch (err: any) {
      setEditError(err?.message ?? 'Failed to save.');
    } finally {
      setEditSaving(false);
    }
  };

  // ─── Tags ────────────────────────────────────────────────────────────────────
  const assignTag = async () => {
    if (!id || !selectedTag) return;
    await api.assignTagToMember(id, selectedTag);
    setSelectedTag('');
    reload();
  };

  const removeTag = async (tagId: string) => {
    if (!id) return;
    await api.removeTagFromMember(id, tagId);
    reload();
  };

  // ─── Enrollment ──────────────────────────────────────────────────────────────
  const addEnrollment = async () => {
    if (!id || !enrollCourseId) return;
    try {
      setEnrollSaving(true);
      await api.createEnrollment({ memberId: id, courseId: enrollCourseId });
      setEnrollDrawerOpen(false);
      setEnrollCourseId('');
      reload();
    } finally {
      setEnrollSaving(false);
    }
  };

  const removeEnrollment = async () => {
    if (!removeEnrollId) return;
    await api.deleteEnrollment(removeEnrollId);
    setRemoveEnrollId(null);
    reload();
  };

  // ─── Watch record ────────────────────────────────────────────────────────────
  const addWatch = async () => {
    if (!id || !watchCourseId || !watchMinutes) return;
    const mins = parseInt(watchMinutes);
    if (isNaN(mins) || mins <= 0) return;
    try {
      setWatchSaving(true);
      await api.createWatchActivity({ userId: id, courseId: watchCourseId, watchDurationMinutes: mins });
      setWatchDrawerOpen(false);
      setWatchCourseId('');
      setWatchMinutes('');
      reload();
    } finally {
      setWatchSaving(false);
    }
  };

  // ─── Certificate ─────────────────────────────────────────────────────────────
  const issueCert = async () => {
    if (!id || !certCourseId) return;
    const course = allCourses.find((c) => c.id === certCourseId);
    const certNum = `SOF-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    try {
      setCertSaving(true);
      await api.createCertificate({
        memberId: id,
        courseId: certCourseId,
        certificateNumber: certNum,
        title: course ? `${course.title} Completion` : 'Certificate',
      });
      setCertDrawerOpen(false);
      setCertCourseId('');
      reload();
    } finally {
      setCertSaving(false);
    }
  };

  const revokeCert = async () => {
    if (!revokeCertId) return;
    await api.revokeCertificate(revokeCertId);
    setRevokeCertId(null);
    reload();
  };

  // ─── Event attendance ─────────────────────────────────────────────────────────
  const saveAttendance = async () => {
    if (!id || !attendEventId) return;
    try {
      setAttendSaving(true);
      await api.setEventAttendance({ userId: id, eventId: attendEventId, status: attendStatus });
      setAttendDrawerOpen(false);
      setAttendEventId('');
      setAttendStatus('attended');
      reload();
    } finally {
      setAttendSaving(false);
    }
  };

  // ─── Ticket ───────────────────────────────────────────────────────────────────
  const createTicket = async () => {
    if (!id || !ticketEventId) return;
    try {
      setTicketSaving(true);
      await api.createEventTicket({ memberId: id, eventId: ticketEventId });
      setTicketDrawerOpen(false);
      setTicketEventId('');
      reload();
    } finally {
      setTicketSaving(false);
    }
  };

  const cancelTicket = async () => {
    if (!cancelTicketId) return;
    await api.updateEventTicket(cancelTicketId, { ticketStatus: 'cancelled' });
    setCancelTicketId(null);
    reload();
  };

  // ─── Donation ─────────────────────────────────────────────────────────────────
  const addDonation = async () => {
    if (!id) return;
    const amt = parseFloat(donationAmount);
    if (isNaN(amt) || amt <= 0 || !donationFund.trim()) return;
    try {
      setDonationSaving(true);
      const txnId = `TXN-ADMIN-${Date.now().toString(36).toUpperCase()}`;
      await api.createDonation({
        memberId: id,
        amount: amt,
        currency: 'USD',
        method: 'admin',
        transactionId: txnId,
        donationType: 'one-time',
        fund: donationFund.trim(),
        paymentStatus: 'completed',
      });
      setDonationDrawerOpen(false);
      setDonationAmount('');
      setDonationFund('');
      reload();
    } finally {
      setDonationSaving(false);
    }
  };

  // ─── Render guards ────────────────────────────────────────────────────────────
  if (notFound) return <AdminLayout><AdminErrorState label="member" /></AdminLayout>;
  if (!member) return <AdminLayout><AdminLoadingState label="member" /></AdminLayout>;

  const availableTags = allTags.filter((t) => !member.tags.some((mt) => mt.id === t.id));
  const role = member.roles.includes('admin') ? 'admin' : 'member';

  return (
    <AdminLayout>
      <AdminPageHeader
        title={`${member.first_name} ${member.last_name}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/members')}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={openEdit}>
              <Pencil className="h-4 w-4" /> Edit Profile
            </Button>
          </div>
        }
      />

      {/* Profile summary */}
      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <div><span className="text-xs text-muted-foreground">Email</span><p className="font-medium">{member.email}</p></div>
          <div><span className="text-xs text-muted-foreground">Membership Type</span><p className="font-medium">{member.membership_type}</p></div>
          <div><span className="text-xs text-muted-foreground">Status</span><p><StatusBadge status={member.membership_status} /></p></div>
          <div><span className="text-xs text-muted-foreground">Role</span><p className="font-medium capitalize">{role}</p></div>
          <div><span className="text-xs text-muted-foreground">Account Active</span><p><StatusBadge status={member.is_active ? 'active' : 'inactive'} /></p></div>
          <div><span className="text-xs text-muted-foreground">Joined</span><p className="font-medium">{new Date(member.join_date).toLocaleDateString()}</p></div>
          {member.bio && <div className="md:col-span-3"><span className="text-xs text-muted-foreground">Bio</span><p className="text-sm">{member.bio}</p></div>}
        </CardContent>
      </Card>

      {/* Stats bar */}
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <MiniStat label="Courses" value={stats.courses} />
        <MiniStat label="Hours Watched" value={stats.hours_watched} />
        <MiniStat label="Events Attended" value={stats.events} />
        <MiniStat label="Certificates" value={stats.certificates} />
      </div>

      {/* Tags */}
      <DetailSection title="Tags">
        <div className="mb-3 flex flex-wrap gap-2">
          {member.tags.map((t) => (
            <span key={t.id} className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold', tagColorClass[t.color] ?? tagColorClass.gold)}>
              {t.name}
              <button type="button" onClick={() => removeTag(t.id)} className="hover:text-destructive" aria-label={`Remove ${t.name}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {member.tags.length === 0 && <span className="text-sm text-muted-foreground">No tags assigned.</span>}
        </div>
        {availableTags.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} className="max-w-xs">
              <option value="">Select a tag…</option>
              {availableTags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Button size="sm" onClick={assignTag} disabled={!selectedTag}>
              <Plus className="h-4 w-4" /> Assign
            </Button>
          </div>
        )}
      </DetailSection>

      {/* Enrollments */}
      <DetailSection title="Course Enrollments">
        <div className="mb-2 flex justify-end">
          <Button size="sm" onClick={() => setEnrollDrawerOpen(true)}>
            <Plus className="h-4 w-4" /> Add Enrollment
          </Button>
        </div>
        {enrollments.length === 0 ? <p className="text-sm text-muted-foreground">No enrollments.</p> : (
          <div className="divide-y divide-border">
            {enrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium">{e.course?.title}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={e.status} />
                  <button type="button" onClick={() => setRemoveEnrollId(e.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remove enrollment">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      {/* Watch History */}
      <DetailSection title="Watch History">
        <div className="mb-2 flex justify-end">
          <Button size="sm" onClick={() => setWatchDrawerOpen(true)}>
            <Plus className="h-4 w-4" /> Add Record
          </Button>
        </div>
        {watchRecords.length === 0 ? <p className="text-sm text-muted-foreground">No watch records.</p> : (
          <div className="divide-y divide-border">
            {watchRecords.map((w) => (
              <div key={w.id} className="flex items-center justify-between py-2 text-sm">
                <span>{w.course?.title ?? '—'}</span>
                <span className="text-muted-foreground">{w.watch_duration_minutes} min · {Math.round(Number(w.completion_percentage))}%</span>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      {/* Certificates */}
      <DetailSection title="Certificates">
        <div className="mb-2 flex justify-end">
          <Button size="sm" onClick={() => setCertDrawerOpen(true)}>
            <Plus className="h-4 w-4" /> Issue Certificate
          </Button>
        </div>
        {certs.length === 0 ? <p className="text-sm text-muted-foreground">No certificates.</p> : (
          <div className="divide-y divide-border">
            {certs.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.certificate_number} · {new Date(c.issue_date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={c.status} />
                  {c.status === 'valid' && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRevokeCertId(c.id)}>Revoke</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      {/* Event Attendance */}
      <DetailSection title="Events">
        <div className="mb-2 flex justify-end">
          <Button size="sm" onClick={() => setAttendDrawerOpen(true)}>
            <Plus className="h-4 w-4" /> Set Attendance
          </Button>
        </div>
        {registrations.length === 0 && enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No event registrations.</p>
        ) : (
          <p className="text-sm text-muted-foreground">Use "Set Attendance" to mark a member's attendance status for any event.</p>
        )}
      </DetailSection>

      {/* Tickets */}
      <DetailSection title="Event Tickets">
        <div className="mb-2 flex justify-end">
          <Button size="sm" onClick={() => setTicketDrawerOpen(true)}>
            <Plus className="h-4 w-4" /> Issue Ticket
          </Button>
        </div>
        {tickets.length === 0 ? <p className="text-sm text-muted-foreground">No tickets.</p> : (
          <div className="divide-y divide-border">
            {tickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">{t.event?.title}</p>
                  <p className="text-xs text-muted-foreground">{t.ticket_number}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={t.ticket_status} />
                  {t.ticket_status === 'valid' && (
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setCancelTicketId(t.id)}>Cancel</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      {/* Donations */}
      <DetailSection title="Donations">
        <div className="mb-2 flex justify-end">
          <Button size="sm" onClick={() => setDonationDrawerOpen(true)}>
            <Plus className="h-4 w-4" /> Add Donation
          </Button>
        </div>
        {donations.length === 0 ? <p className="text-sm text-muted-foreground">No donations.</p> : (
          <div className="divide-y divide-border">
            {donations.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 text-sm">
                <span>${Number(d.amount).toFixed(2)} · {d.fund}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={d.payment_status} />
                  <span className="text-xs text-muted-foreground">{new Date(d.donated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      {/* Prayer Requests */}
      <DetailSection title="Prayer Requests">
        {prayers.length === 0 ? <p className="text-sm text-muted-foreground">No prayer requests.</p> : (
          <div className="divide-y divide-border">
            {prayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span>{p.title}</span>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      {/* Downloads */}
      <DetailSection title="Downloads">
        {downloads.length === 0 ? <p className="text-sm text-muted-foreground">No downloads.</p> : (
          <div className="divide-y divide-border">
            {downloads.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 text-sm">
                <span>{d.resource_name}</span>
                <span className="text-xs text-muted-foreground">{d.resource_type} · {new Date(d.downloaded_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      {/* ── Drawers ── */}

      {/* Edit profile */}
      <DetailDrawer open={editOpen} title="Edit Profile" onClose={() => setEditOpen(false)} wide
        footer={<><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={saveEdit} disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Changes'}</Button></>}>
        <div className="space-y-3">
          {editError && <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{editError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">First name *</label>
              <Input value={editForm.firstName} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Last name *</label>
              <Input value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} /></div>
          </div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Email *</label>
            <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} /></div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Bio</label>
            <Input value={editForm.bio} onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Membership type</label>
              <Select value={editForm.membershipType} onChange={(e) => setEditForm((f) => ({ ...f, membershipType: e.target.value }))}>
                {MEMBERSHIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
              <Select value={editForm.membershipStatus} onChange={(e) => setEditForm((f) => ({ ...f, membershipStatus: e.target.value }))}>
                {MEMBERSHIP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select></div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="editActive" checked={editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} className="h-4 w-4 rounded border-border" />
            <label htmlFor="editActive" className="text-sm">Account active</label>
          </div>
        </div>
      </DetailDrawer>

      {/* Add enrollment */}
      <DetailDrawer open={enrollDrawerOpen} title="Add Course Enrollment" onClose={() => setEnrollDrawerOpen(false)}
        footer={<><Button variant="outline" onClick={() => setEnrollDrawerOpen(false)}>Cancel</Button><Button onClick={addEnrollment} disabled={enrollSaving || !enrollCourseId}>{enrollSaving ? 'Saving…' : 'Enroll'}</Button></>}>
        <div className="space-y-3">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Select course</label>
          <Select value={enrollCourseId} onChange={(e) => setEnrollCourseId(e.target.value)}>
            <option value="">Choose a course…</option>
            {allCourses.filter((c) => !enrollments.some((e) => e.course?.id === c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
        </div>
      </DetailDrawer>

      {/* Add watch record */}
      <DetailDrawer open={watchDrawerOpen} title="Add Watch Record" onClose={() => setWatchDrawerOpen(false)}
        footer={<><Button variant="outline" onClick={() => setWatchDrawerOpen(false)}>Cancel</Button><Button onClick={addWatch} disabled={watchSaving || !watchCourseId || !watchMinutes}>{watchSaving ? 'Saving…' : 'Add'}</Button></>}>
        <div className="space-y-3">
          <Select value={watchCourseId} onChange={(e) => setWatchCourseId(e.target.value)}>
            <option value="">Select course…</option>
            {allCourses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
          <Input type="number" placeholder="Duration in minutes" value={watchMinutes} onChange={(e) => setWatchMinutes(e.target.value)} min={1} />
        </div>
      </DetailDrawer>

      {/* Issue certificate */}
      <DetailDrawer open={certDrawerOpen} title="Issue Certificate" onClose={() => setCertDrawerOpen(false)}
        footer={<><Button variant="outline" onClick={() => setCertDrawerOpen(false)}>Cancel</Button><Button onClick={issueCert} disabled={certSaving || !certCourseId}>{certSaving ? 'Issuing…' : 'Issue'}</Button></>}>
        <div className="space-y-3">
          <Select value={certCourseId} onChange={(e) => setCertCourseId(e.target.value)}>
            <option value="">Select course…</option>
            {allCourses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
        </div>
      </DetailDrawer>

      {/* Set event attendance */}
      <DetailDrawer open={attendDrawerOpen} title="Set Event Attendance" onClose={() => setAttendDrawerOpen(false)}
        footer={<><Button variant="outline" onClick={() => setAttendDrawerOpen(false)}>Cancel</Button><Button onClick={saveAttendance} disabled={attendSaving || !attendEventId}>{attendSaving ? 'Saving…' : 'Save'}</Button></>}>
        <div className="space-y-3">
          <Select value={attendEventId} onChange={(e) => setAttendEventId(e.target.value)}>
            <option value="">Select event…</option>
            {allEvents.map((e) => <option key={e.id} value={e.id}>{(e as any).title}</option>)}
          </Select>
          <Select value={attendStatus} onChange={(e) => setAttendStatus(e.target.value)}>
            <option value="registered">Registered</option>
            <option value="attended">Attended</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </Select>
        </div>
      </DetailDrawer>

      {/* Issue ticket */}
      <DetailDrawer open={ticketDrawerOpen} title="Issue Event Ticket" onClose={() => setTicketDrawerOpen(false)}
        footer={<><Button variant="outline" onClick={() => setTicketDrawerOpen(false)}>Cancel</Button><Button onClick={createTicket} disabled={ticketSaving || !ticketEventId}>{ticketSaving ? 'Saving…' : 'Issue Ticket'}</Button></>}>
        <div className="space-y-3">
          <Select value={ticketEventId} onChange={(e) => setTicketEventId(e.target.value)}>
            <option value="">Select event…</option>
            {allEvents.map((e) => <option key={e.id} value={e.id}>{(e as any).title}</option>)}
          </Select>
        </div>
      </DetailDrawer>

      {/* Add donation */}
      <DetailDrawer open={donationDrawerOpen} title="Add Donation" onClose={() => setDonationDrawerOpen(false)}
        footer={<><Button variant="outline" onClick={() => setDonationDrawerOpen(false)}>Cancel</Button><Button onClick={addDonation} disabled={donationSaving || !donationAmount || !donationFund}>{donationSaving ? 'Saving…' : 'Add'}</Button></>}>
        <div className="space-y-3">
          <Input type="number" placeholder="Amount (USD)" value={donationAmount} onChange={(e) => setDonationAmount(e.target.value)} min={0.01} step={0.01} />
          <Input placeholder="Fund / campaign" value={donationFund} onChange={(e) => setDonationFund(e.target.value)} />
        </div>
      </DetailDrawer>

      {/* Confirm dialogs */}
      <ConfirmDialog open={!!removeEnrollId} title="Remove enrollment?" message="The member will be unenrolled from this course." confirmLabel="Remove" onConfirm={removeEnrollment} onCancel={() => setRemoveEnrollId(null)} />
      <ConfirmDialog open={!!revokeCertId} title="Revoke certificate?" message="This action cannot be undone." confirmLabel="Revoke" onConfirm={revokeCert} onCancel={() => setRevokeCertId(null)} />
      <ConfirmDialog open={!!cancelTicketId} title="Cancel ticket?" message="The ticket will be marked as cancelled." confirmLabel="Cancel Ticket" onConfirm={cancelTicket} onCancel={() => setCancelTicketId(null)} />
    </AdminLayout>
  );
}

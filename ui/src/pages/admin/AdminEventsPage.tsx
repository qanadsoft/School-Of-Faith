import { useEffect, useState } from 'react';
import { Plus, Archive, ArchiveRestore } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminErrorState } from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { api, asList } from '@/lib/api';

type EventRow = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at?: string | null;
  location: string;
  capacity: number;
  archived: boolean;
  registration_count?: number;
  attendance_count?: number;
};

type Registration = {
  id: string;
  member_id: string;
  registration_status: string;
  attendance_status: string;
  registered_at: string;
  member: { id: string; first_name: string; last_name: string; email: string };
};

type Member = { id: string; first_name: string; last_name: string };

const ATTENDANCE_STATUSES = ['registered', 'attended', 'cancelled', 'no_show'];

function toLocalDateTimeInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function blankForm(e?: EventRow) {
  return {
    title: e?.title ?? '',
    description: e?.description ?? '',
    startsAt: e ? toLocalDateTimeInput(e.starts_at) : '',
    endsAt: e ? toLocalDateTimeInput(e.ends_at) : '',
    location: e?.location ?? '',
    capacity: e ? String(e.capacity) : '0',
  };
}

export function AdminEventsPage() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  // event drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // archive confirm
  const [archiveTarget, setArchiveTarget] = useState<EventRow | null>(null);

  // registrations panel
  const [regOpen, setRegOpen] = useState(false);
  const [regEvent, setRegEvent] = useState<EventRow | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [regLoading, setRegLoading] = useState(false);
  const [regMemberId, setRegMemberId] = useState('');
  const [regSaving, setRegSaving] = useState(false);

  // attendance update
  const [attendTarget, setAttendTarget] = useState<{ regId: string; memberId: string; eventId: string } | null>(null);
  const [attendStatus, setAttendStatus] = useState('attended');

  const refresh = async () => {
    try {
      setLoading(true);
      setError(false);
      const [evData, mData] = await Promise.all([api.getAdminEvents(), api.getAdminMembers()]);
      setEvents(asList<EventRow>(evData));
      setMembers(asList<Member>(mData));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  // ── Event CRUD ────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setSelected(null);
    setForm(blankForm());
    setSaveError('');
    setDrawerOpen(true);
  };

  const openEdit = (e: EventRow) => {
    setSelected(e);
    setForm(blankForm(e));
    setSaveError('');
    setDrawerOpen(true);
  };

  const save = async () => {
    setSaveError('');
    if (!form.title.trim()) { setSaveError('Title is required.'); return; }
    if (!form.startsAt) { setSaveError('Start date/time is required.'); return; }
    try {
      setSaving(true);
      const cap = parseInt(form.capacity);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        location: form.location.trim(),
        capacity: isNaN(cap) ? 0 : cap,
      };
      if (selected) {
        await api.updateEvent(selected.id, payload);
      } else {
        await api.createEvent(payload);
      }
      setDrawerOpen(false);
      refresh();
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async () => {
    if (!archiveTarget) return;
    await api.archiveEvent(archiveTarget.id);
    setArchiveTarget(null);
    refresh();
  };

  // ── Registrations panel ───────────────────────────────────────────────────────
  const openRegistrations = async (e: EventRow) => {
    setRegEvent(e);
    setRegMemberId('');
    setRegOpen(true);
    setRegLoading(true);
    try {
      const data = await api.getEventRegistrations(e.id);
      setRegistrations(asList<Registration>(data));
    } finally {
      setRegLoading(false);
    }
  };

  const refreshRegistrations = async () => {
    if (!regEvent) return;
    const data = await api.getEventRegistrations(regEvent.id);
    setRegistrations(asList<Registration>(data));
  };

  const addRegistration = async () => {
    if (!regEvent || !regMemberId) return;
    try {
      setRegSaving(true);
      await api.createEventRegistration({ memberId: regMemberId, eventId: regEvent.id });
      setRegMemberId('');
      await refreshRegistrations();
    } finally {
      setRegSaving(false);
    }
  };

  const cancelRegistration = async (regId: string) => {
    await api.deleteEventRegistration(regId);
    await refreshRegistrations();
  };

  const saveAttendance = async () => {
    if (!attendTarget) return;
    await api.setEventAttendance({
      userId: attendTarget.memberId,
      eventId: attendTarget.eventId,
      status: attendStatus,
    });
    setAttendTarget(null);
    await refreshRegistrations();
    refresh();
  };

  const registeredMemberIds = new Set(registrations.map((r) => r.member_id));

  const filtered = events.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()),
  );

  const columns: DataTableColumn<EventRow>[] = [
    {
      key: 'title',
      header: 'Event',
      sortable: true,
      render: (e) => (
        <div>
          <p className="font-medium">{e.title}</p>
          <p className="text-xs text-muted-foreground">{e.location}</p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (e) => e.starts_at ? new Date(e.starts_at).toLocaleString() : '—',
    },
    {
      key: 'registrations',
      header: 'Registered',
      render: (e) => e.registration_count ?? 0,
    },
    {
      key: 'attendance',
      header: 'Attended',
      render: (e) => e.attendance_count ?? 0,
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => <StatusBadge status={e.archived ? 'archived' : 'active'} />,
    },
    {
      key: 'actions',
      header: '',
      render: (e) => (
        <div className="flex gap-1" onClick={(ev) => ev.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => openRegistrations(e)}>
            Registrations
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setArchiveTarget(e)}
            title={e.archived ? 'Restore' : 'Archive'}
          >
            {e.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Events"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Event
          </Button>
        }
      />
      {error ? (
        <AdminErrorState label="events" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyLabel="events"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search events…"
          onRowClick={openEdit}
        />
      )}

      {/* Create / Edit drawer */}
      <DetailDrawer
        open={drawerOpen}
        title={selected ? 'Edit Event' : 'New Event'}
        onClose={() => setDrawerOpen(false)}
        wide
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : selected ? 'Save Changes' : 'Create Event'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          {saveError && (
            <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{saveError}</p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Title *</label>
            <Input placeholder="Event title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Location</label>
            <Input placeholder="Location or Online" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Starts at *</label>
              <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Ends at</label>
              <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Capacity (0 = unlimited)</label>
            <Input type="number" min={0} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
            <Textarea placeholder="Event description…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
      </DetailDrawer>

      {/* Registrations drawer */}
      <DetailDrawer
        open={regOpen}
        title={regEvent ? `Registrations — ${regEvent.title}` : 'Registrations'}
        onClose={() => setRegOpen(false)}
        wide
        footer={<Button variant="outline" onClick={() => setRegOpen(false)}>Close</Button>}
      >
        <div className="space-y-4">
          {/* Register a member */}
          <div className="flex gap-2">
            <select
              value={regMemberId}
              onChange={(e) => setRegMemberId(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Register a member…</option>
              {members
                .filter((m) => !registeredMemberIds.has(m.id))
                .map((m) => (
                  <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                ))}
            </select>
            <Button onClick={addRegistration} disabled={regSaving || !regMemberId}>
              {regSaving ? 'Adding…' : 'Register'}
            </Button>
          </div>

          {/* Registration list */}
          {regLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : registrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No registrations for this event.</p>
          ) : (
            <div className="divide-y divide-border">
              {registrations.map((r) => (
                <div key={r.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{r.member.first_name} {r.member.last_name}</p>
                      <p className="text-xs text-muted-foreground">{r.member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.attendance_status} />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAttendTarget({ regId: r.id, memberId: r.member_id, eventId: regEvent!.id });
                          setAttendStatus(r.attendance_status);
                        }}
                      >
                        Update
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => cancelRegistration(r.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DetailDrawer>

      {/* Update attendance dialog */}
      <ConfirmDialog
        open={!!attendTarget}
        title="Update attendance status"
        message={
          <div className="mt-2">
            <select
              value={attendStatus}
              onChange={(e) => setAttendStatus(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ATTENDANCE_STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        }
        confirmLabel="Save"
        onConfirm={saveAttendance}
        onCancel={() => setAttendTarget(null)}
      />

      {/* Archive confirm */}
      <ConfirmDialog
        open={!!archiveTarget}
        title={archiveTarget?.archived ? 'Restore event?' : 'Archive event?'}
        message={
          archiveTarget?.archived
            ? 'This event will become active again.'
            : 'The event will be archived. Registrations are preserved.'
        }
        confirmLabel={archiveTarget?.archived ? 'Restore' : 'Archive'}
        onConfirm={toggleArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </AdminLayout>
  );
}

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminErrorState } from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { api, asList } from '@/lib/api';

type TicketRow = {
  id: string;
  ticket_number: string;
  ticket_status: string;
  attendance_status: string;
  issued_at: string;
  member_id: string;
  event_id: string;
  member?: { id: string; first_name: string; last_name: string; email: string };
  event?: { id: string; title: string; starts_at: string; location: string };
};

type Member = { id: string; first_name: string; last_name: string };
type EventRow = { id: string; title: string; archived: boolean };

const ATTENDANCE_STATUSES = ['registered', 'attended', 'cancelled', 'no_show'];
const TICKET_STATUSES = ['valid', 'used', 'cancelled'];

export function AdminTicketsPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('');

  // detail drawer (view + update)
  const [selected, setSelected] = useState<TicketRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updatingAttend, setUpdatingAttend] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState('');
  const [updateSaving, setUpdateSaving] = useState(false);

  // create drawer
  const [createOpen, setCreateOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [newEventId, setNewEventId] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState('');

  // cancel confirm
  const [cancelId, setCancelId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(false);
      const [tData, mData, eData] = await Promise.all([
        api.getAdminEventTickets(),
        api.getAdminMembers(),
        api.getAdminEvents(),
      ]);
      setTickets(asList<TicketRow>(tData));
      setMembers(asList<Member>(mData));
      setEvents(asList<EventRow>(eData));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  // ── Create ticket ─────────────────────────────────────────────────────────────
  const createTicket = async () => {
    setCreateError('');
    if (!newMemberId || !newEventId) {
      setCreateError('Please select both a member and an event.');
      return;
    }
    try {
      setCreateSaving(true);
      await api.createEventTicket({ memberId: newMemberId, eventId: newEventId });
      setNewMemberId('');
      setNewEventId('');
      setCreateOpen(false);
      refresh();
    } catch (err: any) {
      setCreateError(err?.message ?? 'Failed to create ticket.');
    } finally {
      setCreateSaving(false);
    }
  };

  // ── Update ticket ─────────────────────────────────────────────────────────────
  const openDetail = (t: TicketRow) => {
    setSelected(t);
    setUpdatingAttend(t.attendance_status);
    setUpdatingTicket(t.ticket_status);
    setDetailOpen(true);
  };

  const saveUpdate = async () => {
    if (!selected) return;
    try {
      setUpdateSaving(true);
      await api.updateEventTicket(selected.id, {
        ticketStatus: updatingTicket,
        attendanceStatus: updatingAttend,
      });
      setDetailOpen(false);
      refresh();
    } finally {
      setUpdateSaving(false);
    }
  };

  // ── Cancel ticket ─────────────────────────────────────────────────────────────
  const cancelTicket = async () => {
    if (!cancelId) return;
    await api.updateEventTicket(cancelId, { ticketStatus: 'cancelled', attendanceStatus: 'cancelled' });
    setCancelId(null);
    if (detailOpen) setDetailOpen(false);
    refresh();
  };

  const getMemberName = (t: TicketRow) => {
    if (t.member) return `${t.member.first_name} ${t.member.last_name}`;
    const m = members.find((m) => m.id === t.member_id);
    return m ? `${m.first_name} ${m.last_name}` : '—';
  };

  const getEventTitle = (t: TicketRow) => {
    if (t.event) return t.event.title;
    const e = events.find((e) => e.id === t.event_id);
    return e?.title ?? '—';
  };

  const filtered = tickets.filter((t) => {
    const q = search.toLowerCase();
    const eventMatch = !eventFilter || t.event_id === eventFilter;
    return (
      eventMatch &&
      (t.ticket_number.toLowerCase().includes(q) ||
        getMemberName(t).toLowerCase().includes(q) ||
        getEventTitle(t).toLowerCase().includes(q))
    );
  });

  const columns: DataTableColumn<TicketRow>[] = [
    {
      key: 'ticket',
      header: 'Ticket #',
      sortable: true,
      render: (t) => <span className="font-mono text-xs font-medium">{t.ticket_number}</span>,
    },
    { key: 'member', header: 'Member', sortable: true, render: (t) => getMemberName(t) },
    { key: 'event', header: 'Event', render: (t) => getEventTitle(t) },
    {
      key: 'attendance',
      header: 'Attendance',
      render: (t) => <StatusBadge status={t.attendance_status} />,
    },
    {
      key: 'status',
      header: 'Ticket Status',
      render: (t) => <StatusBadge status={t.ticket_status} />,
    },
    {
      key: 'date',
      header: 'Issued',
      sortable: true,
      render: (t) => new Date(t.issued_at).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      render: (t) =>
        t.ticket_status === 'valid' ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={(e) => { e.stopPropagation(); setCancelId(t.id); }}
          >
            Cancel
          </Button>
        ) : null,
    },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Event Tickets"
        action={
          <Button onClick={() => { setNewMemberId(''); setNewEventId(''); setCreateError(''); setCreateOpen(true); }}>
            <Plus className="h-4 w-4" /> Issue Ticket
          </Button>
        }
      />
      {error ? (
        <AdminErrorState label="tickets" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyLabel="tickets"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by ticket #, member, or event…"
          filters={
            <Select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="max-w-[220px]"
            >
              <option value="">All events</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </Select>
          }
          onRowClick={openDetail}
        />
      )}

      {/* Ticket detail / update drawer */}
      <DetailDrawer
        open={detailOpen}
        title={selected?.ticket_number ?? 'Ticket'}
        onClose={() => setDetailOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
            {selected?.ticket_status !== 'cancelled' && (
              <>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30"
                  onClick={() => setCancelId(selected!.id)}
                >
                  Cancel Ticket
                </Button>
                <Button onClick={saveUpdate} disabled={updateSaving}>
                  {updateSaving ? 'Saving…' : 'Save Changes'}
                </Button>
              </>
            )}
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Member</dt>
                <dd className="font-medium">{getMemberName(selected)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Event</dt>
                <dd className="font-medium">{getEventTitle(selected)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Issued</dt>
                <dd>{new Date(selected.issued_at).toLocaleDateString()}</dd>
              </div>
              {selected.event?.starts_at && (
                <div>
                  <dt className="text-xs text-muted-foreground">Event Date</dt>
                  <dd>{new Date(selected.event.starts_at).toLocaleString()}</dd>
                </div>
              )}
            </dl>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Attendance Status
              </label>
              <Select
                value={updatingAttend}
                onChange={(e) => setUpdatingAttend(e.target.value)}
              >
                {ATTENDANCE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Ticket Status
              </label>
              <Select
                value={updatingTicket}
                onChange={(e) => setUpdatingTicket(e.target.value)}
              >
                {TICKET_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </DetailDrawer>

      {/* Create ticket drawer */}
      <DetailDrawer
        open={createOpen}
        title="Issue Event Ticket"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createTicket} disabled={createSaving || !newMemberId || !newEventId}>
              {createSaving ? 'Issuing…' : 'Issue Ticket'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {createError && (
            <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {createError}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Member *</label>
            <Select value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)}>
              <option value="">Select member…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Event *</label>
            <Select value={newEventId} onChange={(e) => setNewEventId(e.target.value)}>
              <option value="">Select event…</option>
              {events
                .filter((e) => !e.archived)
                .map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
            </Select>
          </div>
        </div>
      </DetailDrawer>

      {/* Cancel confirm */}
      <ConfirmDialog
        open={!!cancelId}
        title="Cancel ticket?"
        message="The ticket will be marked as cancelled and the member's attendance set to cancelled."
        confirmLabel="Cancel Ticket"
        onConfirm={cancelTicket}
        onCancel={() => setCancelId(null)}
      />
    </AdminLayout>
  );
}

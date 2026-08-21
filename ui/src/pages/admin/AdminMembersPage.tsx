import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { DataTable, type DataTableColumn } from '@/components/admin/DataTable';
import { DetailDrawer } from '@/components/admin/DetailDrawer';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { AdminErrorState } from '@/components/admin/AdminStates';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, asList } from '@/lib/api';
import type { Profile } from '@/lib/supabase';

type MemberRow = Profile & { roles?: string[] };

const MEMBERSHIP_TYPES = ['Member', 'Faithful Member', 'Student', 'Volunteer', 'Administrator'];
const MEMBERSHIP_STATUSES = ['active', 'inactive', 'suspended'] as const;

function blankForm() {
  return {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    membershipType: 'Member',
    membershipStatus: 'active' as string,
    isActive: true,
    bio: '',
  };
}

export function AdminMembersPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState<MemberRow | null>(null);
  const [form, setForm] = useState(blankForm());

  const refresh = async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await api.getAdminMembers();
      setMembers(
        asList<MemberRow>(data).map((m) => ({
          ...m,
          role: m.roles?.includes('admin') ? 'admin' : 'member',
        })),
      );
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

  const openEdit = (m: MemberRow) => {
    setEditing(m);
    setForm({
      firstName: m.first_name,
      lastName: m.last_name,
      email: m.email,
      password: '',
      membershipType: m.membership_type,
      membershipStatus: m.membership_status,
      isActive: m.is_active ?? true,
      bio: m.bio ?? '',
    });
    setSaveError('');
    setDrawerOpen(true);
  };

  const save = async () => {
    setSaveError('');
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setSaveError('First name, last name and email are required.');
      return;
    }
    if (!editing && form.password.length < 8) {
      setSaveError('Password must be at least 8 characters.');
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(form.email)) {
      setSaveError('Please enter a valid email address.');
      return;
    }
    try {
      setSaving(true);
      if (editing) {
        await api.updateMember(editing.id, {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          membershipType: form.membershipType,
          membershipStatus: form.membershipStatus,
          isActive: form.isActive,
          bio: form.bio,
        });
      } else {
        await api.createMember({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
          membershipType: form.membershipType,
          membershipStatus: form.membershipStatus,
          isActive: form.isActive,
        });
      }
      setDrawerOpen(false);
      refresh();
    } catch (err: any) {
      setSaveError(err?.message ?? 'Failed to save member.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await api.updateMember(deactivateTarget.id, {
        firstName: deactivateTarget.first_name,
        lastName: deactivateTarget.last_name,
        email: deactivateTarget.email,
        membershipType: deactivateTarget.membership_type,
        membershipStatus: deactivateTarget.membership_status,
        isActive: !deactivateTarget.is_active,
        bio: deactivateTarget.bio ?? '',
      });
      setDeactivateTarget(null);
      refresh();
    } catch (err: any) {
      console.error('Failed to toggle member status:', err);
    }
  };

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  });

  const columns: DataTableColumn<MemberRow>[] = [
    {
      key: 'name',
      header: 'Member',
      sortable: true,
      render: (m) => (
        <div>
          <p className="font-medium">{m.first_name} {m.last_name}</p>
          <p className="text-xs text-muted-foreground">{m.email}</p>
        </div>
      ),
    },
    {
      key: 'membership_type',
      header: 'Type',
      sortable: true,
      render: (m) => m.membership_type,
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (m) => (
        <StatusBadge status={m.role} tone={m.role === 'admin' ? 'positive' : 'neutral'} />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (m) => <StatusBadge status={m.membership_status} />,
    },
    {
      key: 'active',
      header: 'Active',
      render: (m) => (
        <StatusBadge status={m.is_active ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      sortable: true,
      render: (m) => new Date(m.join_date).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: '',
      render: (m) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={m.is_active ? 'text-destructive' : 'text-green-600'}
            onClick={() => setDeactivateTarget(m)}
          >
            {m.is_active ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Members"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Member
          </Button>
        }
      />
      {error ? (
        <AdminErrorState label="members" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyLabel="members"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search members..."
          onRowClick={(m) => navigate(`/admin/members/${m.id}`)}
        />
      )}

      {/* Create / Edit drawer */}
      <DetailDrawer
        open={drawerOpen}
        title={editing ? `Edit — ${editing.first_name} ${editing.last_name}` : 'New Member'}
        onClose={() => setDrawerOpen(false)}
        wide
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Member'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {saveError && (
            <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {saveError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                First name *
              </label>
              <Input
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Last name *
              </label>
              <Input
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Email *
            </label>
            <Input
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>
          {!editing && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Password * (min 8 characters)
              </label>
              <Input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Membership type
              </label>
              <Select
                value={form.membershipType}
                onChange={(e) => setForm((f) => ({ ...f, membershipType: e.target.value }))}
              >
                {MEMBERSHIP_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Membership status
              </label>
              <Select
                value={form.membershipStatus}
                onChange={(e) => setForm((f) => ({ ...f, membershipStatus: e.target.value }))}
              >
                {MEMBERSHIP_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
          </div>
          {editing && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Bio</label>
              <Input
                placeholder="Short bio"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="isActive" className="text-sm">
              Account active
            </label>
          </div>
        </div>
      </DetailDrawer>

      {/* Deactivate / Activate confirm dialog */}
      <ConfirmDialog
        open={!!deactivateTarget}
        title={deactivateTarget?.is_active ? 'Deactivate member?' : 'Activate member?'}
        message={
          deactivateTarget?.is_active
            ? `${deactivateTarget.first_name} ${deactivateTarget.last_name} will no longer be able to log in.`
            : `${deactivateTarget?.first_name} ${deactivateTarget?.last_name} will regain access.`
        }
        confirmLabel={deactivateTarget?.is_active ? 'Deactivate' : 'Activate'}
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </AdminLayout>
  );
}

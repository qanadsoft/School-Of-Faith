import { useEffect, useState } from 'react';
import { Plus, Edit3, Award, Sparkles } from 'lucide-react';
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

type CertRow = {
  id: string;
  certificate_number: string;
  title: string;
  issue_date: string;
  status: string;
  member_id: string;
  course_id: string;
  member?: { id: string; first_name: string; last_name: string };
  course?: { id: string; title: string };
};

type Member = { id: string; first_name: string; last_name: string };
type Course = { id: string; title: string; archived: boolean };

type CertSettings = {
  branding_name: string;
  title: string;
  subtitle: string;
  description: string;
  signature_name: string;
  signature_title: string;
  footer_text: string;
};

export function AdminCertificatesPage() {
  const [certs, setCerts] = useState<CertRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');

  // issue drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState('');

  // template edit drawer
  const [templateDrawerOpen, setTemplateDrawerOpen] = useState(false);
  const [settings, setSettings] = useState<CertSettings>({
    branding_name: 'The School of Faith',
    title: 'Certificate of Completion',
    subtitle: 'This is proudly presented to',
    description: 'For successfully completing all requirements and modules of the discipleship course:',
    signature_name: 'Pastor Sarah Jenkins',
    signature_title: 'Senior Pastor & Founder',
    footer_text: 'Accredited by The School of Faith Global Leadership Network',
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // revoke confirm
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setLoading(true);
      setError(false);
      const [certData, mData, cData, setRes] = await Promise.all([
        api.getAdminCertificates(),
        api.getAdminMembers(),
        api.getAdminCourses(),
        api.getCertificateSettings().catch(() => null),
      ]);
      setCerts(asList<CertRow>(certData));
      setMembers(asList<Member>(mData));
      setCourses(asList<Course>(cData).filter((c) => !c.archived));
      if (setRes) {
        setSettings({
          branding_name: setRes.branding_name || 'The School of Faith',
          title: setRes.title || 'Certificate of Completion',
          subtitle: setRes.subtitle || 'This is proudly presented to',
          description: setRes.description || 'For successfully completing all requirements and modules of the discipleship course:',
          signature_name: setRes.signature_name || 'Pastor Sarah Jenkins',
          signature_title: setRes.signature_title || 'Senior Pastor & Founder',
          footer_text: setRes.footer_text || 'Accredited by The School of Faith Global Leadership Network',
        });
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const issueCert = async () => {
    setIssueError('');
    if (!memberId || !courseId) {
      setIssueError('Please select both a member and a course.');
      return;
    }
    const course = courses.find((c) => c.id === courseId);
    const certNum = `SOF-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    try {
      setIssuing(true);
      await api.createCertificate({
        memberId,
        courseId,
        certificateNumber: certNum,
        title: course ? `${course.title} Completion` : 'Certificate of Completion',
        status: 'valid',
      });
      setMemberId('');
      setCourseId('');
      setDrawerOpen(false);
      refresh();
    } catch (err: any) {
      setIssueError(err?.message ?? 'Failed to issue certificate.');
    } finally {
      setIssuing(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await api.updateAdminCertificateSettings(settings);
      setTemplateDrawerOpen(false);
      refresh();
    } catch (err) {
      console.error('Failed to save certificate template settings:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const revokeCert = async () => {
    if (!revokeId) return;
    await api.revokeCertificate(revokeId);
    setRevokeId(null);
    refresh();
  };

  const getMemberName = (c: CertRow) => {
    if (c.member) return `${c.member.first_name} ${c.member.last_name}`;
    const m = members.find((m) => m.id === c.member_id);
    return m ? `${m.first_name} ${m.last_name}` : '—';
  };

  const getCourseName = (c: CertRow) => {
    if (c.course) return c.course.title;
    const course = courses.find((co) => co.id === c.course_id);
    return course?.title ?? '—';
  };

  const filtered = certs.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.certificate_number.toLowerCase().includes(q) ||
      getMemberName(c).toLowerCase().includes(q) ||
      getCourseName(c).toLowerCase().includes(q)
    );
  });

  const columns: DataTableColumn<CertRow>[] = [
    {
      key: 'number',
      header: 'Certificate #',
      sortable: true,
      render: (c) => (
        <div>
          <p className="font-medium font-mono text-xs">{c.certificate_number}</p>
          <p className="text-xs text-muted-foreground">{c.title}</p>
        </div>
      ),
    },
    { key: 'member', header: 'Member', sortable: true, render: (c) => getMemberName(c) },
    { key: 'course', header: 'Course', render: (c) => getCourseName(c) },
    {
      key: 'date',
      header: 'Issued',
      sortable: true,
      render: (c) => new Date(c.issue_date).toLocaleDateString(),
    },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    {
      key: 'actions',
      header: '',
      render: (c) =>
        c.status === 'valid' ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={(e) => { e.stopPropagation(); setRevokeId(c.id); }}
          >
            Revoke
          </Button>
        ) : null,
    },
  ];

  return (
    <AdminLayout>
      <AdminPageHeader
        title="Certificates"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setTemplateDrawerOpen(true)}>
              <Edit3 className="h-4 w-4 mr-1.5" /> Edit Template Content
            </Button>
            <Button onClick={() => { setMemberId(''); setCourseId(''); setIssueError(''); setDrawerOpen(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Issue Certificate
            </Button>
          </div>
        }
      />
      {error ? (
        <AdminErrorState label="certificates" />
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyLabel="certificates"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by certificate #, member, or course…"
        />
      )}

      {/* Issue drawer */}
      <DetailDrawer
        open={drawerOpen}
        title="Issue Certificate"
        onClose={() => setDrawerOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={issueCert} disabled={issuing}>{issuing ? 'Issuing…' : 'Issue'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          {issueError && (
            <p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{issueError}</p>
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
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </Select>
          </div>
        </div>
      </DetailDrawer>

      {/* Template Edit Drawer */}
      <DetailDrawer
        open={templateDrawerOpen}
        title="Certificate Template & Branding Settings"
        onClose={() => setTemplateDrawerOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setTemplateDrawerOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={savingSettings} className="bg-[#C59B46] text-white hover:bg-[#b0843d]">
              {savingSettings ? 'Saving…' : 'Save Template Settings'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="mb-1 block font-medium text-muted-foreground">Branding Name</label>
            <Input
              value={settings.branding_name}
              onChange={(e) => setSettings({ ...settings, branding_name: e.target.value })}
              placeholder="e.g. The School of Faith"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-muted-foreground">Certificate Title</label>
            <Input
              value={settings.title}
              onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              placeholder="e.g. Certificate of Completion"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-muted-foreground">Subtitle Text</label>
            <Input
              value={settings.subtitle}
              onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
              placeholder="e.g. This is proudly presented to"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-muted-foreground">Description Body Text</label>
            <textarea
              rows={3}
              value={settings.description}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. For successfully completing all requirements and modules of the discipleship course:"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block font-medium text-muted-foreground">Signature Name</label>
              <Input
                value={settings.signature_name}
                onChange={(e) => setSettings({ ...settings, signature_name: e.target.value })}
                placeholder="e.g. Pastor Sarah Jenkins"
              />
            </div>
            <div>
              <label className="mb-1 block font-medium text-muted-foreground">Signature Title</label>
              <Input
                value={settings.signature_title}
                onChange={(e) => setSettings({ ...settings, signature_title: e.target.value })}
                placeholder="e.g. Senior Pastor & Founder"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block font-medium text-muted-foreground">Footer Accreditation Text</label>
            <Input
              value={settings.footer_text}
              onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
              placeholder="e.g. Accredited by The School of Faith Global Leadership Network"
            />
          </div>

          {/* Live Preview Box */}
          <div className="pt-3 border-t border-border">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#C59B46]" /> Live Certificate Preview
            </h4>
            <div className="p-4 rounded-xl border-4 border-double border-[#C59B46]/40 bg-[#FAF6EE] text-center space-y-2 dark:bg-card">
              <p className="text-[10px] font-serif font-bold uppercase tracking-widest text-[#C59B46]">{settings.branding_name}</p>
              <h5 className="text-lg font-serif font-semibold text-foreground">{settings.title}</h5>
              <p className="text-[11px] italic text-muted-foreground">{settings.subtitle}</p>
              <p className="text-sm font-serif font-bold underline text-[#C59B46]">John Doe</p>
              <p className="text-[11px] text-muted-foreground">{settings.description}</p>
              <p className="text-xs font-serif font-semibold text-foreground">Sample Discipleship Course</p>
              <div className="pt-2 border-t border-border/40 text-[10px] flex justify-between text-muted-foreground">
                <div>
                  <p className="font-bold text-foreground">{settings.signature_name}</p>
                  <p>{settings.signature_title}</p>
                </div>
                <div className="text-right max-w-[150px]">
                  <p className="truncate">{settings.footer_text}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DetailDrawer>

      {/* Revoke confirm */}
      <ConfirmDialog
        open={!!revokeId}
        title="Revoke certificate?"
        message="The certificate will be marked as revoked. This cannot be undone."
        confirmLabel="Revoke"
        onConfirm={revokeCert}
        onCancel={() => setRevokeId(null)}
      />
    </AdminLayout>
  );
}

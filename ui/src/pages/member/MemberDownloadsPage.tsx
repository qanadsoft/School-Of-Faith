import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MemberDetailLayout } from '@/components/MemberDetailLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Download as DownloadIcon, Video, FileText, Headphones, ExternalLink, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useDownloads } from '@/lib/hooks';
import { api } from '@/lib/api';

export function MemberDownloadsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { downloads, loading, refresh } = useDownloads(profile?.id);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await api.deleteDownload(id);
      refresh();
    } catch (err) {
      console.error('Failed to remove download:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const getIcon = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('audio') || t.includes('podcast')) return <Headphones className="h-5 w-5 text-primary" />;
    if (t.includes('pdf') || t.includes('guide') || t.includes('note')) return <FileText className="h-5 w-5 text-primary" />;
    return <Video className="h-5 w-5 text-primary" />;
  };

  if (loading) {
    return (
      <MemberDetailLayout title="My Downloads">
        <div className="space-y-3">
          <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />
          <div className="h-20 rounded-xl bg-muted/40 animate-pulse" />
        </div>
      </MemberDetailLayout>
    );
  }

  return (
    <MemberDetailLayout title="My Downloads">
      {downloads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground space-y-3">
          <DownloadIcon className="h-10 w-10 mx-auto opacity-40 text-muted-foreground" />
          <p className="font-medium text-foreground">You have no downloaded videos or resources yet.</p>
          <p className="text-sm">When you watch videos or explore teachings, click "Download" to save them to your library.</p>
          <Button variant="outline" size="sm" onClick={() => navigate('/watch')}>
            Browse Teachings
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {downloads.map((d) => (
            <Card key={d.id} className="transition-all hover:shadow-sm">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    {getIcon(d.resource_type)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-foreground truncate">{d.resource_name || d.title}</h3>
                    <p className="text-xs text-muted-foreground capitalize">
                      {d.resource_type || 'Video'} · Downloaded {new Date(d.downloaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {d.file_url && (
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open File
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(d.id)}
                    disabled={deletingId === d.id}
                    className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                    title="Remove from Downloads"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </MemberDetailLayout>
  );
}

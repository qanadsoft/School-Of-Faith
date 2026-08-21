import { useState } from 'react';
import { Play, Clock, Calendar, X, Video as VideoIcon } from 'lucide-react';
import { MemberDetailLayout } from '@/components/MemberDetailLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth';
import { useSavedMessages } from '@/lib/hooks';
import { api } from '@/lib/api';
import type { Message } from '@/lib/supabase';

function formatDuration(durationMinutes?: number) {
  if (!durationMinutes || durationMinutes <= 0) return '45m';
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  return hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;
}

export function MemberSavedMessagesPage() {
  const { profile } = useAuth();
  const { saved, loading, refresh } = useSavedMessages(profile?.id);
  const [activeVideo, setActiveVideo] = useState<Message | null>(null);

  const removeSaved = async (id: string) => {
    await api.deleteSavedMessage(id);
    refresh();
  };

  if (loading) return <MemberDetailLayout title="Saved Videos"><p className="text-muted-foreground">Loading...</p></MemberDetailLayout>;

  return (
    <MemberDetailLayout title="Saved Videos">
      {saved.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <p>You have no saved videos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {saved.map((s) => (
            <Card key={s.id} className="overflow-hidden group hover:border-primary/50 transition-colors">
              <div
                className="relative aspect-video bg-muted cursor-pointer overflow-hidden"
                onClick={() => s.message && setActiveVideo(s.message)}
              >
                {s.message?.thumbnail_url ? (
                  <img
                    src={s.message.thumbnail_url}
                    alt={s.message.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <VideoIcon className="h-8 w-8 opacity-40" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                  <Play className="h-10 w-10 text-white" />
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {s.message?.category && (
                      <Badge variant="secondary" className="mb-1 text-[10px]">
                        {s.message.category}
                      </Badge>
                    )}
                    <h3
                      className="font-serif text-base font-medium cursor-pointer line-clamp-1 hover:text-primary transition-colors"
                      onClick={() => s.message && setActiveVideo(s.message)}
                    >
                      {s.message?.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">{s.message?.speaker}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDuration(s.message?.duration_minutes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Saved {new Date(s.saved_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeSaved(s.id)} className="text-destructive hover:text-destructive">
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Video Player Modal */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h3 className="font-serif text-xl font-semibold">{activeVideo.title}</h3>
                <p className="text-xs text-muted-foreground">{activeVideo.speaker} · {formatDuration(activeVideo.duration_minutes)}</p>
              </div>
              <button
                onClick={() => setActiveVideo(null)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-black">
              <video
                src={activeVideo.video_url || 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
                poster={activeVideo.thumbnail_url || undefined}
                controls
                autoPlay
                className="aspect-video w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </MemberDetailLayout>
  );
}

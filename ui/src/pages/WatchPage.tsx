import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Clock, Calendar, Bookmark, BookmarkCheck, Download, Check, X, ArrowLeft, Video as VideoIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api, asList } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Message, Topic } from '@/lib/supabase';

function formatDuration(durationMinutes?: number) {
  if (!durationMinutes || durationMinutes <= 0) return '45m';
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  return hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Local storage helper for guest watch progress fallback
const LOCAL_PROGRESS_KEY = 'sof_watch_progress';

function getLocalProgress(): Record<string, { last_position_seconds: number; progress_percentage: number; is_completed: boolean }> {
  try {
    const raw = localStorage.getItem(LOCAL_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setLocalProgress(videoId: string, data: { last_position_seconds: number; progress_percentage: number; is_completed: boolean }) {
  try {
    const map = getLocalProgress();
    map[videoId] = data;
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(map));
  } catch {}
}

export function WatchPage() {
  const { profile } = useAuth();
  const [recentVideos, setRecentVideos] = useState<Message[]>([]);
  const [continueWatching, setContinueWatching] = useState<Message[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [topicVideos, setTopicVideos] = useState<Message[]>([]);
  const [topicCount, setTopicCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadingTopic, setLoadingTopic] = useState(false);

  // Active Video Player Modal
  const [activeVideo, setActiveVideo] = useState<Message | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTimeRef = useRef<number>(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [recentData, topicsData, cwData] = await Promise.all([
        api.getRecentVideos(12),
        api.getVideoTopics(),
        profile ? api.getContinueWatching().catch(() => []) : Promise.resolve([]),
      ]);
      const videos = asList<Message>(recentData);
      setRecentVideos(videos);
      setTopics(asList<Topic>(topicsData));

      if (profile && cwData && cwData.length > 0) {
        setContinueWatching(asList<Message>(cwData));
      } else {
        // Fallback for guest or local progress
        const local = getLocalProgress();
        const guestCw = videos
          .filter((v) => local[v.id] && !local[v.id].is_completed && local[v.id].progress_percentage > 0)
          .map((v) => ({
            ...v,
            progress_percentage: local[v.id].progress_percentage,
            last_position_seconds: local[v.id].last_position_seconds,
            is_completed: local[v.id].is_completed,
          }));
        setContinueWatching(guestCw);
      }
    } catch (err) {
      console.error('Failed to load watch page data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle clicking a topic category
  const selectTopic = async (topic: Topic) => {
    if (selectedTopic?.slug === topic.slug) {
      setSelectedTopic(null);
      setTopicVideos([]);
      return;
    }
    setSelectedTopic(topic);
    try {
      setLoadingTopic(true);
      const res = await api.getVideosByTopic(topic.slug);
      if (res) {
        setTopicVideos(res.videos || []);
        setTopicCount(res.count || (res.videos ? res.videos.length : 0));
      }
    } catch (err) {
      console.error('Failed to fetch videos for topic:', err);
      setTopicVideos([]);
      setTopicCount(0);
    } finally {
      setLoadingTopic(false);
    }
  };

  // Open video player
  const playVideo = (video: Message) => {
    const local = getLocalProgress();
    const savedPos =
      video.progress?.last_position_seconds ??
      video.last_position_seconds ??
      local[video.id]?.last_position_seconds ??
      0;

    lastTimeRef.current = savedPos;
    setActiveVideo(video);
    setIsSaved(false);
  };

  // Save watch progress to backend and localStorage
  const saveProgress = useCallback(async (completed = false) => {
    if (!activeVideo) return;
    const el = videoRef.current;
    const currentTime = el && !isNaN(el.currentTime) ? el.currentTime : lastTimeRef.current;
    const duration = el && !isNaN(el.duration) && el.duration > 0 ? el.duration : (activeVideo.duration_minutes ? activeVideo.duration_minutes * 60 : 120);

    if (currentTime <= 0 && !completed) return;

    const pct = Math.min(100, Math.round((currentTime / duration) * 10000) / 100);
    const isCompleted = completed || pct >= 95;

    // 1. Save locally
    setLocalProgress(activeVideo.id, {
      last_position_seconds: Math.floor(currentTime),
      progress_percentage: isCompleted ? 100 : pct,
      is_completed: isCompleted,
    });

    // 2. Update React continueWatching state immediately
    setContinueWatching((prev) => {
      if (isCompleted) {
        return prev.filter((v) => v.id !== activeVideo.id);
      }
      const existing = prev.find((v) => v.id === activeVideo.id);
      if (existing) {
        return prev.map((v) =>
          v.id === activeVideo.id
            ? { ...v, progress_percentage: pct, last_position_seconds: Math.floor(currentTime) }
            : v
        );
      }
      return [
        {
          ...activeVideo,
          progress_percentage: pct,
          last_position_seconds: Math.floor(currentTime),
        },
        ...prev,
      ];
    });

    // 3. Save to backend if logged in
    if (profile) {
      try {
        await api.saveVideoProgress({
          messageId: activeVideo.id,
          lastPositionSeconds: Math.floor(currentTime),
          watchDurationSeconds: Math.floor(currentTime),
          progressPercentage: pct,
          isCompleted,
        });
      } catch (err) {
        // best effort
      }
    }
  }, [profile, activeVideo]);

  // Telemetry event listeners on video player
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !activeVideo) return;

    let throttleTimer: NodeJS.Timeout | null = null;

    const handleLoadedMetadata = () => {
      const local = getLocalProgress();
      const startPos =
        activeVideo.progress?.last_position_seconds ??
        activeVideo.last_position_seconds ??
        local[activeVideo.id]?.last_position_seconds ??
        0;

      if (startPos > 0 && startPos < el.duration) {
        el.currentTime = startPos;
      }
    };

    const handleTimeUpdate = () => {
      if (el.currentTime > 0) {
        lastTimeRef.current = el.currentTime;
      }
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          saveProgress();
          throttleTimer = null;
        }, 3000);
      }
    };

    const handlePause = () => {
      if (el.currentTime > 0) lastTimeRef.current = el.currentTime;
      saveProgress();
    };

    const handleEnded = () => {
      saveProgress(true);
    };

    el.addEventListener('loadedmetadata', handleLoadedMetadata);
    el.addEventListener('timeupdate', handleTimeUpdate);
    el.addEventListener('pause', handlePause);
    el.addEventListener('ended', handleEnded);

    return () => {
      saveProgress();
      el.removeEventListener('loadedmetadata', handleLoadedMetadata);
      el.removeEventListener('timeupdate', handleTimeUpdate);
      el.removeEventListener('pause', handlePause);
      el.removeEventListener('ended', handleEnded);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [activeVideo, saveProgress]);

  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!activeVideo) return;
    try {
      setDownloading(true);
      const videoUrl = activeVideo.video_url || 'https://vjs.zencdn.net/v/oceans.mp4';
      if (profile) {
        await api.recordDownload({
          resourceName: activeVideo.title,
          title: activeVideo.title,
          resourceType: 'video',
          fileUrl: videoUrl,
          resourceUrl: videoUrl,
        });
      }
      setIsDownloaded(true);

      // Trigger browser download or open in new window
      const a = document.createElement('a');
      a.href = videoUrl;
      a.download = `${activeVideo.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to record video download:', err);
    } finally {
      setDownloading(false);
    }
  };

  const toggleSave = async () => {
    if (!activeVideo) return;
    try {
      await api.saveMessage(activeVideo.id);
      setIsSaved(true);
    } catch (err) {
      console.error('Failed to save video:', err);
    }
  };

  const featuredVideo = recentVideos[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      {/* Category View (when a topic is selected) */}
      {selectedTopic ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => setSelectedTopic(null)}
                className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to All Topics
              </button>
              <h1 className="text-3xl font-serif font-medium">{selectedTopic.name}</h1>
              <p className="text-sm text-muted-foreground">
                {topicCount} published {topicCount === 1 ? 'video' : 'videos'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedTopic(null)}>
              Clear Filter
            </Button>
          </div>

          {loadingTopic ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-video animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : topicVideos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
              <p>No published videos in this topic yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {topicVideos.map((msg) => {
                const progressItem = continueWatching.find((cw) => cw.id === msg.id);
                const progressPct = progressItem?.progress?.progress_percentage ?? progressItem?.progress_percentage;

                return (
                  <div key={msg.id} onClick={() => playVideo(msg)} className="group cursor-pointer">
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                      {msg.thumbnail_url ? (
                        <img
                          src={msg.thumbnail_url}
                          alt={msg.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                          <VideoIcon className="h-8 w-8 opacity-40" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                        <Play className="h-10 w-10 text-white" />
                      </div>
                      {progressPct && progressPct > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50">
                          <div className="h-full bg-primary" style={{ width: `${progressPct}%` }} />
                        </div>
                      )}
                    </div>
                    <h3 className="mt-2 line-clamp-1 font-medium">{msg.title}</h3>
                    <p className="text-sm text-muted-foreground">{msg.speaker}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {formatDuration(msg.duration_minutes)}
                      <span>·</span>
                      <Calendar className="h-3 w-3" /> {formatDate(msg.published_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Hero / New Series */}
          {featuredVideo && (
            <section className="relative overflow-hidden rounded-2xl">
              {featuredVideo.thumbnail_url ? (
                <img
                  src={featuredVideo.thumbnail_url}
                  alt={featuredVideo.title}
                  className="h-[300px] w-full object-cover md:h-[400px]"
                />
              ) : (
                <div className="h-[300px] w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 md:h-[400px]" />
              )}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 md:p-8">
                <Button className="mb-3 w-fit bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  {featuredVideo.topics?.[0]?.name ?? 'Latest Video'}
                </Button>
                <h1 className="mb-2 text-3xl font-serif font-medium text-white md:text-5xl">
                  {featuredVideo.title}
                </h1>
                <div className="mb-6 flex items-center gap-4 text-sm text-white/80 md:text-base">
                  <span>{featuredVideo.speaker}</span>
                  <span>·</span>
                  <span>{formatDate(featuredVideo.published_at)}</span>
                  <span>·</span>
                  <span>{formatDuration(featuredVideo.duration_minutes)}</span>
                </div>
                <Button
                  onClick={() => playVideo(featuredVideo)}
                  className="w-fit gap-2 bg-white text-slate-950 font-semibold hover:bg-white/90 shadow-lg"
                >
                  <Play className="h-4 w-4 fill-slate-950 text-slate-950" /> Watch Now
                </Button>
              </div>
            </section>
          )}

          {/* Continue Watching (dynamic from user's watch progress) */}
          {continueWatching.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-semibold">Continue Watching</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {continueWatching.map((msg) => {
                  const progressPct =
                    msg.progress?.progress_percentage ?? msg.progress_percentage ?? 0;

                  return (
                    <div
                      key={msg.id}
                      onClick={() => playVideo(msg)}
                      className="group cursor-pointer"
                    >
                      <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                        {msg.thumbnail_url ? (
                          <img
                            src={msg.thumbnail_url}
                            alt={msg.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                            <VideoIcon className="h-8 w-8 opacity-40" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                          <Play className="h-10 w-10 text-white" />
                        </div>
                        {progressPct > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
                            <div className="h-full bg-primary" style={{ width: `${progressPct}%` }} />
                          </div>
                        )}
                      </div>
                      <h3 className="mt-2 line-clamp-1 font-medium">{msg.title}</h3>
                      <p className="text-sm text-muted-foreground">{msg.speaker}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {formatDuration(msg.duration_minutes)}
                        <span>·</span>
                        <span>{Math.round(progressPct)}% watched</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Recent Videos - horizontal scroll */}
          {recentVideos.length > 0 && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">Recent Videos</h2>
                <Button variant="ghost" size="sm" className="text-primary" onClick={() => setSelectedTopic(topics[0] || null)}>
                  View All
                </Button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {recentVideos.map((msg) => (
                  <Card
                    key={msg.id}
                    onClick={() => playVideo(msg)}
                    className="w-[250px] flex-shrink-0 cursor-pointer overflow-hidden border-border/50 hover:border-primary/50 transition-all hover:shadow-md"
                  >
                    <div className="relative h-32 bg-muted">
                      {msg.thumbnail_url ? (
                        <img src={msg.thumbnail_url} alt={msg.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                          <VideoIcon className="h-6 w-6 opacity-40" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100">
                        <Play className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      {msg.topics && msg.topics.length > 0 && (
                        <Badge variant="secondary" className="mb-1 text-[10px]">
                          {msg.topics[0].name}
                        </Badge>
                      )}
                      <h3 className="line-clamp-1 text-sm font-semibold">{msg.title}</h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {formatDuration(msg.duration_minutes)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Browse by Topic */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">Browse by Topic</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {topics.map((topic) => (
                <Button
                  key={topic.id}
                  variant="outline"
                  onClick={() => selectTopic(topic)}
                  className="h-14 text-base font-medium transition-colors hover:border-primary hover:text-primary hover:bg-primary/5"
                >
                  {topic.name}
                </Button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Video Player Modal Overlay */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
            {/* Player Header */}
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-xl font-semibold">{activeVideo.title}</h3>
                  {activeVideo.topics && activeVideo.topics.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {activeVideo.topics[0].name}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeVideo.speaker} · {formatDate(activeVideo.published_at)} · {formatDuration(activeVideo.duration_minutes)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {profile && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      disabled={downloading}
                      className={isDownloaded ? 'text-emerald-600 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40' : ''}
                    >
                      {isDownloaded ? <Check className="h-4 w-4 mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
                      {downloading ? 'Saving...' : isDownloaded ? 'Downloaded' : 'Download'}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSave}
                      className={isSaved ? 'text-primary border-primary' : ''}
                    >
                      {isSaved ? <BookmarkCheck className="h-4 w-4 mr-1.5" /> : <Bookmark className="h-4 w-4 mr-1.5" />}
                      {isSaved ? 'Saved' : 'Save'}
                    </Button>
                  </>
                )}
                <button
                  onClick={() => {
                    saveProgress();
                    setActiveVideo(null);
                  }}
                  className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Video Element */}
            <div className="bg-black">
              <video
                key={activeVideo.id}
                ref={videoRef}
                poster={activeVideo.thumbnail_url || undefined}
                controls
                autoPlay
                playsInline
                preload="auto"
                className="aspect-video w-full object-contain"
              >
                <source
                  src={activeVideo.video_url || 'https://vjs.zencdn.net/v/oceans.mp4'}
                  type="video/mp4"
                />
                Your browser does not support HTML5 video streaming.
              </video>
            </div>

            {/* Video Footer info */}
            {activeVideo.description && (
              <div className="p-4 text-sm text-muted-foreground border-t border-border">
                <p>{activeVideo.description}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

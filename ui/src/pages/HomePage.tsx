import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CirclePlay, Heart, BookOpen, Calendar, Download, Clock, X, Video as VideoIcon, Headphones, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { events } from '@/data/seed';
import { api, asList } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Message } from '@/lib/types';
import type { Course, CourseDetail, CourseLesson } from '@/types';
import { BrandPdfReaderModal, type ReadingPlanData } from '@/components/BrandPdfReaderModal';

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

export function HomePage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [recentVideos, setRecentVideos] = useState<Message[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [activeVideo, setActiveVideo] = useState<Message | null>(null);

  // Dynamic Course Progress
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLessonInfo, setActiveLessonInfo] = useState<string>('');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(true);

  // Dynamic Live Prayer Focus
  const [todayFocus, setTodayFocus] = useState<any | null>(null);
  const [prayerCount, setPrayerCount] = useState<number>(0);
  const [hasPrayedFocus, setHasPrayedFocus] = useState<boolean>(false);

  // Featured PDF / Journal Resource Modal
  const [featuredResource, setFeaturedResource] = useState<ReadingPlanData | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  useEffect(() => {
    async function loadRecentVideos() {
      try {
        setLoadingVideos(true);
        const data = await api.getRecentVideos(4);
        setRecentVideos(asList<Message>(data));
      } catch (err) {
        console.error('Failed to load recent videos on home:', err);
      } finally {
        setLoadingVideos(false);
      }
    }

    async function loadActiveCourse() {
      // If member is not logged in, do not display Continue Learning
      if (!profile) {
        setActiveCourse(null);
        setLoadingCourse(false);
        return;
      }

      try {
        setLoadingCourse(true);
        const allCourses = asList<Course>(await api.getCourses());

        // Strictly find only enrolled courses that are currently IN PROGRESS (< 100% progress)
        const inProgressCourses = allCourses.filter(
          (c) => !!c.is_enrolled && Number(c.progress || 0) < 100
        );

        // If no in-progress enrolled course exists, do not display section (no placeholders/demo fallback)
        if (inProgressCourses.length === 0) {
          setActiveCourse(null);
          return;
        }

        // Select the active in-progress course
        const selected = inProgressCourses[0];
        setActiveCourse(selected);

        try {
          const detail = (await api.getCourse(String(selected.id))) as CourseDetail;
          const lessons: CourseLesson[] = detail.lessons || [];
          // Find the current active lesson (unlocked and not yet completed, or fallback to first)
          const currentLesson = lessons.find((l) => l.is_unlocked && !l.is_completed) || lessons[0];
          if (currentLesson) {
            setActiveLessonId(currentLesson.id);
            const orderNum = currentLesson.order || currentLesson.sort_order || 1;
            setActiveLessonInfo(`Module ${orderNum}: ${currentLesson.title}`);
          } else {
            setActiveLessonId(null);
            setActiveLessonInfo(selected.title || 'In Progress');
          }
        } catch {
          setActiveLessonId(null);
          setActiveLessonInfo(selected.title || 'In Progress');
        }
      } catch (err) {
        console.error('Failed to load active course on home:', err);
        setActiveCourse(null);
      } finally {
        setLoadingCourse(false);
      }
    }

    async function loadPrayerFocus() {
      try {
        const focus = await api.getTodayPrayerFocus();
        if (focus && typeof focus === 'object' && ('title' in focus || 'topic' in focus)) {
          setTodayFocus(focus);
          setPrayerCount(Number(focus.prayer_count ?? focus.prays ?? 0));
          setHasPrayedFocus(!!(focus as any).has_prayed);
        }
      } catch (err) {
        console.error('Failed to load prayer focus on home:', err);
      }
    }

    async function loadFeaturedResource() {
      try {
        const res = await api.getFeaturedReadingPlan();
        if (res) setFeaturedResource(res);
      } catch (err) {
        console.error('Failed to load featured resource:', err);
      }
    }

    loadRecentVideos();
    loadActiveCourse();
    loadPrayerFocus();
    loadFeaturedResource();
  }, [profile]);

  const featuredVideo = recentVideos[0];
  const firstName = profile?.first_name || 'Sarah';

  const handleResumeCourse = () => {
    if (!activeCourse) return;
    const lessonParam = activeLessonId ? `&lessonId=${activeLessonId}` : '';
    navigate(`/learn?courseId=${activeCourse.id}${lessonParam}`);
  };

  const handleJoinPrayer = async () => {
    if (profile && todayFocus?.id && !hasPrayedFocus) {
      setHasPrayedFocus(true);
      setPrayerCount((prev) => prev + 1);
      try {
        const res = await api.prayForFocus(todayFocus.id);
        if (res && typeof res.prayer_count === 'number') {
          setPrayerCount(res.prayer_count);
        }
      } catch (err) {
        console.error('Failed to record prayer action on focus:', err);
      }
    }
    navigate('/prayer');
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col space-y-8 p-4 pb-24 md:p-8 md:pb-8">
      {/* Greeting */}
      <section className="pt-4">
        <h1 className="text-4xl font-serif font-medium tracking-tight">
          Good morning, <span className="italic font-light text-primary">{firstName}</span>
        </h1>
        <p className="mt-2 font-light text-muted-foreground">
          "Let your roots grow down into him, and let your lives be built on him." — Colossians 2:7
        </p>
      </section>

      {/* Continue Learning - Only visible if member has an enrolled in-progress course */}
      {!loadingCourse && activeCourse && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-serif font-normal tracking-tight text-foreground">Continue Learning</h2>
            <button
              type="button"
              onClick={() => navigate('/learn')}
              className="text-xs text-[#C69A50] hover:text-[#b0843d] font-medium tracking-wide transition-colors"
            >
              View All
            </button>
          </div>

          <div className="relative overflow-hidden rounded-[24px] bg-[#C59B46] text-white p-7 md:p-8 shadow-sm">
            {/* Watermark Open Book Icon */}
            <BookOpen className="absolute -right-4 -bottom-4 h-48 w-48 text-white/10 pointer-events-none stroke-[1.2]" />

            <div className="relative z-10 space-y-1">
              <h3 className="font-serif text-2xl md:text-3xl font-normal text-white">
                {activeCourse.title}
              </h3>
              {activeLessonInfo && (
                <p className="text-sm font-light text-white/90">
                  {activeLessonInfo}
                </p>
              )}

              {/* Full-Width Progress Bar */}
              <div className="pt-4 pb-2">
                <div className="h-1.5 w-full rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-black rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, activeCourse.progress || 0))}%` }}
                  />
                </div>
              </div>

              {/* Bottom Row: Percentage & Resume Button */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-normal text-white">
                  {Math.round(activeCourse.progress || 0)}% Complete
                </span>

                <button
                  type="button"
                  onClick={handleResumeCourse}
                  className="rounded-full bg-black text-white px-7 py-2.5 text-sm font-medium hover:bg-neutral-900 transition-colors shadow-sm"
                >
                  Resume
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Teaching (Dynamic from Video API) */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-serif font-medium">
            Featured <span className="italic font-light text-primary">Teaching</span>
          </h2>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate('/watch')}>
            View All
          </Button>
        </div>

        {loadingVideos ? (
          <div className="aspect-video w-full animate-pulse rounded-2xl bg-muted" />
        ) : featuredVideo ? (
          <div
            onClick={() => setActiveVideo(featuredVideo)}
            className="group relative aspect-video cursor-pointer overflow-hidden rounded-2xl bg-muted shadow-md"
          >
            {featuredVideo.thumbnail_url ? (
              <img
                src={featuredVideo.thumbnail_url}
                alt={featuredVideo.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-900 text-muted-foreground">
                <VideoIcon className="h-12 w-12 opacity-40" />
              </div>
            )}
            <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/30 to-transparent p-6 md:p-8">
              <div className="mb-2 flex items-center gap-2 text-sm text-white/80">
                <Badge className="bg-white/20 text-white backdrop-blur-md">
                  {featuredVideo.topics?.[0]?.name || featuredVideo.category}
                </Badge>
                <span>{formatDate(featuredVideo.published_at)}</span>
                <span>·</span>
                <span>{formatDuration(featuredVideo.duration_minutes)}</span>
                <span>·</span>
                <span>{featuredVideo.speaker}</span>
              </div>
              <h3 className="mb-1 text-2xl font-serif font-medium text-white md:text-3xl">{featuredVideo.title}</h3>
              {featuredVideo.description && (
                <p className="line-clamp-1 text-sm text-white/70">{featuredVideo.description}</p>
              )}
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="rounded-full bg-white/30 p-4 backdrop-blur-md hover:scale-110 transition-transform">
                <CirclePlay className="h-10 w-10 text-white fill-white/20" />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            <p>No featured video available.</p>
          </div>
        )}
      </section>

      {/* Daily Encouragement + Prayer Focus */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="rounded-2xl border border-border/60 bg-card p-6 space-y-3 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-accent-foreground">
              <Heart className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily Encouragement</span>
            </div>
            <h3 className="font-serif text-xl font-medium">Trusting the Process</h3>
            <p className="font-light text-sm text-muted-foreground leading-relaxed">
              Sometimes the season of waiting is exactly where God is doing His deepest work in your heart.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate('/prayer')}
              className="w-full rounded-full border border-border/80 text-foreground text-sm font-medium py-2.5 hover:bg-muted/40 transition-colors"
            >
              Read More
            </button>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card p-6 space-y-3 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-accent-foreground">
                <Heart className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prayer Focus</span>
              </div>
              {prayerCount > 0 && (
                <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {prayerCount} {prayerCount === 1 ? 'person is' : 'people are'} praying
                </span>
              )}
            </div>
            <h3 className="font-serif text-xl font-medium text-foreground">
              {todayFocus?.topic || todayFocus?.title || 'Global Missions'}
            </h3>
            {todayFocus?.scripture && (
              <p className="text-xs italic text-primary/90 font-serif">
                "{todayFocus.scripture}"
              </p>
            )}
            <p className="font-light text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {todayFocus?.description || 'Today we are praying for our teams and leaders around the world.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleJoinPrayer}
              className={`w-full rounded-full text-sm font-medium py-2.5 transition-colors shadow-sm ${
                hasPrayedFocus
                  ? 'bg-[#C59B46] text-white border border-[#C59B46] hover:bg-[#b0843d]'
                  : 'border border-[#C59B46]/70 text-[#C59B46] hover:bg-[#C59B46] hover:text-white dark:border-[#C59B46]'
              }`}
            >
              {hasPrayedFocus ? 'Joined' : 'Join in Prayer'}
            </button>
          </div>
        </Card>
      </section>

      {/* Upcoming Events */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-serif font-medium">
            Upcoming <span className="italic font-light text-primary">Events</span>
          </h2>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate('/give')}>
            Calendar
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div
            onClick={() => navigate('/give')}
            className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">
                In-Person
              </span>
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-card-foreground leading-snug">Worship Night</h3>
              <p className="text-xs text-muted-foreground mt-1">Friday, 7:00 PM</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/give')}
            className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-medium px-3 py-1">
                Online
              </span>
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-card-foreground leading-snug">Leadership Masterclass</h3>
              <p className="text-xs text-muted-foreground mt-1">Saturday, 10:00 AM</p>
            </div>
          </div>

          <div
            onClick={() => navigate('/give')}
            className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary text-xs font-medium px-3 py-1">
                In-Person
              </span>
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-card-foreground leading-snug">Community Picnic</h3>
              <p className="text-xs text-muted-foreground mt-1">Sunday, 1:00 PM</p>
            </div>
          </div>
        </div>
      </section>

      {/* Latest Podcast + New Resource */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div
          onClick={() => navigate('/watch')}
          className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-muted/60 p-4 transition-colors hover:bg-muted"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#C59B46] text-white shadow-sm flex-shrink-0">
              <Headphones className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-primary">Latest Podcast</h4>
              <p className="font-medium text-foreground text-sm mt-0.5">Ep 42: The Power of Forgiveness</p>
            </div>
          </div>
          <CirclePlay className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" />
        </div>

        <div
          onClick={() => setPdfModalOpen(true)}
          className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-muted/60 p-4 transition-colors hover:bg-muted"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black text-white shadow-sm flex-shrink-0">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-primary">
                {featuredResource?.badge_text || 'New Resource'}
              </h4>
              <p className="font-medium text-foreground text-sm mt-0.5">
                {featuredResource?.name || '30-Day Prayer Guide PDF'}
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0" />
        </div>
      </section>

      {/* Brand PDF & Journal Reader Modal */}
      {featuredResource && (
        <BrandPdfReaderModal
          isOpen={pdfModalOpen}
          onClose={() => setPdfModalOpen(false)}
          planData={featuredResource}
        />
      )}

      {/* Video Player Modal on Home Page */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
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
              <button
                onClick={() => setActiveVideo(null)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="bg-black">
              <video
                key={activeVideo.id}
                src={activeVideo.video_url || 'https://vjs.zencdn.net/v/oceans.mp4'}
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

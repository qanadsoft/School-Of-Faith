import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, BookOpen, Clock, Award, Play, CheckCircle2, Lock, X, Download, ShieldCheck, ChevronRight } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { api, asList } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Course, CourseDetail, CourseLesson, CertificateItem } from '@/types';

export function LearnPage() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'courses' | 'catalog'>('courses');

  // Dynamic categories derived from database courses
  const categories = ['All', ...Array.from(new Set(courses.map((c) => c.category).filter(Boolean)))];

  // Course Player Modal
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [completingLesson, setCompletingLesson] = useState(false);

  // Certificate Modal
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateItem | null>(null);
  const [loadingCert, setLoadingCert] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await api.getCourses({
        search: search.trim() || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
      });
      setCourses(asList<Course>(data));
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [search, selectedCategory]);

  // Check URL query param to automatically open course
  useEffect(() => {
    const courseId = searchParams.get('courseId');
    if (courseId) {
      openCoursePlayer(courseId);
    }
  }, [searchParams]);

  const openCoursePlayer = async (courseId: string | number) => {
    const id = String(courseId);
    setSelectedCourseId(id);
    setLoadingDetail(true);
    try {
      const data = (await api.getCourse(id)) as CourseDetail;
      setCourseDetail(data);
      // Pick first unlocked incomplete lesson, or first unlocked lesson
      const lessons: CourseLesson[] = data.lessons || [];
      const firstIncomplete = lessons.find((l) => l.is_unlocked && !l.is_completed);
      const firstUnlocked = lessons.find((l) => l.is_unlocked);
      setActiveLesson(firstIncomplete || firstUnlocked || lessons[0] || null);
    } catch (err) {
      console.error('Failed to load course details:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedCourseId) return;
    try {
      setEnrolling(true);
      await api.enrollCourse(selectedCourseId);
      // Reload course details and full list
      const updated = (await api.getCourse(selectedCourseId)) as CourseDetail;
      setCourseDetail(updated);
      const lessons: CourseLesson[] = updated.lessons || [];
      setActiveLesson(lessons.find((l) => l.is_unlocked) || lessons[0] || null);
      fetchCourses();
    } catch (err) {
      console.error('Failed to enroll:', err);
    } finally {
      setEnrolling(false);
    }
  };

  const handleCompleteLesson = async (lesson: CourseLesson) => {
    if (!selectedCourseId || !lesson) return;
    try {
      setCompletingLesson(true);
      await api.saveLessonProgress(selectedCourseId, lesson.id, {
        lastPositionSeconds: lesson.duration_minutes * 60,
        watchDurationSeconds: lesson.duration_minutes * 60,
        progressPercentage: 100,
        isCompleted: true,
      });

      // Reload course details to refresh unlock statuses and progress
      const updated = (await api.getCourse(selectedCourseId)) as CourseDetail;
      setCourseDetail(updated);

      // Find next unlocked lesson
      const lessons: CourseLesson[] = updated.lessons || [];
      const currentIndex = lessons.findIndex((l) => l.id === lesson.id);
      const nextLesson = lessons[currentIndex + 1];

      if (nextLesson && nextLesson.is_unlocked) {
        setActiveLesson(nextLesson);
      } else {
        const firstIncomplete = lessons.find((l) => l.is_unlocked && !l.is_completed);
        setActiveLesson(firstIncomplete || lessons[currentIndex] || null);
      }

      fetchCourses();
    } catch (err) {
      console.error('Failed to complete lesson:', err);
    } finally {
      setCompletingLesson(false);
    }
  };

  const openCertificate = async (courseId: string | number) => {
    try {
      setLoadingCert(true);
      setCertModalOpen(true);
      const cert = (await api.getCourseCertificate(String(courseId))) as CertificateItem;
      setCertificateData(cert);
    } catch (err) {
      console.error('Failed to load certificate:', err);
    } finally {
      setLoadingCert(false);
    }
  };

  // Filter in progress and completed for "My Courses" tab
  const inProgress = courses.filter((c) => c.is_enrolled && c.progress < 100);
  const completed = courses.filter((c) => c.is_enrolled && (c.progress === 100 || c.enrollment_status === 'completed'));
  const catalogCourses = courses;

  return (
    <div className="mx-auto flex max-w-6xl flex-col space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 pt-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-serif font-medium tracking-tight">Learn</h1>
          <p className="mt-1 font-light text-muted-foreground">Deepen your understanding of the Word.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            className="pl-9 rounded-full bg-white dark:bg-card border-border/80 text-sm shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="inline-flex rounded-full bg-[#EFECE6] dark:bg-muted p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('courses')}
          className={`rounded-full px-5 py-1.5 text-sm font-medium transition-all ${
            activeTab === 'courses'
              ? 'bg-white dark:bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          My Courses{inProgress.length + completed.length > 0 ? ` (${inProgress.length + completed.length})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`rounded-full px-5 py-1.5 text-sm font-medium transition-all ${
            activeTab === 'catalog'
              ? 'bg-white dark:bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Catalog
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'courses' ? (
        <div className="mt-2 space-y-8">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading your courses...</div>
          ) : inProgress.length === 0 && completed.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-card/50">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 font-serif text-xl font-medium">No courses in progress</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse our catalog of faith-building courses and start learning today.
              </p>
              <Button onClick={() => setActiveTab('catalog')} className="mt-6 rounded-full px-6">
                Explore Catalog
              </Button>
            </div>
          ) : (
            <>
              {/* In Progress Section */}
              {inProgress.length > 0 && (
                <section>
                  <h2 className="mb-4 text-xl font-medium tracking-tight">In Progress</h2>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {inProgress.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        onClick={() => openCoursePlayer(course.id)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Completed Section */}
              {completed.length > 0 && (
                <section>
                  <h2 className="mb-4 text-xl font-medium tracking-tight">Completed</h2>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {completed.map((course) => (
                      <CourseCard
                        key={course.id}
                        course={course}
                        completed
                        onClick={() => openCoursePlayer(course.id)}
                        onViewCertificate={(e) => {
                          e.stopPropagation();
                          openCertificate(course.id);
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      ) : (
        /* Catalog Tab */
        <div className="mt-2 space-y-6">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <section>
            <h2 className="mb-4 text-xl font-medium tracking-tight">
              {selectedCategory === 'All' ? 'All Courses' : `${selectedCategory} Courses`}
            </h2>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Loading catalog...</div>
            ) : catalogCourses.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No courses found matching your criteria.</div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {catalogCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    completed={course.is_enrolled && (course.progress === 100 || course.enrollment_status === 'completed')}
                    onClick={() => openCoursePlayer(course.id)}
                    onViewCertificate={(e) => {
                      e.stopPropagation();
                      openCertificate(course.id);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Course Player & Lessons Modal */}
      {selectedCourseId && (
        <CoursePlayerModal
          courseDetail={courseDetail}
          activeLesson={activeLesson}
          loading={loadingDetail}
          enrolling={enrolling}
          completingLesson={completingLesson}
          onClose={() => {
            setSelectedCourseId(null);
            setCourseDetail(null);
            setActiveLesson(null);
          }}
          onSelectLesson={(lesson) => {
            if (lesson.is_unlocked) {
              setActiveLesson(lesson);
            }
          }}
          onEnroll={handleEnroll}
          onCompleteLesson={handleCompleteLesson}
          onViewCertificate={() => openCertificate(selectedCourseId)}
        />
      )}

      {/* Certificate Modal */}
      {certModalOpen && (
        <CertificateModal
          certificate={certificateData}
          loading={loadingCert}
          fallbackMemberName={profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Member'}
          onClose={() => {
            setCertModalOpen(false);
            setCertificateData(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Course Card Component ───────────────────────────────────────────────────
function CourseCard({
  course,
  completed,
  onClick,
  onViewCertificate,
}: {
  course: Course;
  completed?: boolean;
  onClick: () => void;
  onViewCertificate?: (e: React.MouseEvent) => void;
}) {
  const imageUrl = course.image_url || course.image || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=900&q=80';
  const isCompleted = completed || course.progress === 100 || course.enrollment_status === 'completed';

  return (
    <Card
      onClick={onClick}
      className="group cursor-pointer overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
    >
      {/* Card Image */}
      <div className="relative h-48 md:h-52 w-full bg-muted overflow-hidden">
        <img
          src={imageUrl}
          alt={course.title}
          className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${
            isCompleted ? 'grayscale contrast-95 group-hover:grayscale-0 group-hover:contrast-100' : ''
          }`}
        />

        {/* Hover Play Overlay for In-Progress / Uncompleted Courses */}
        {!isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
              <Play className="h-5 w-5 fill-current ml-0.5" />
            </div>
          </div>
        )}

        {/* Completed Badge overlay */}
        {isCompleted && (
          <>
            <Badge className="absolute left-3 top-3 bg-[#C69A50] hover:bg-[#C69A50] text-white text-xs font-medium px-3 py-0.5 shadow-sm border-0">
              {course.category}
            </Badge>
            <div className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#C69A50] text-white shadow-md">
              <Award className="h-4 w-4" />
            </div>
          </>
        )}
      </div>

      {/* Card Body */}
      <CardContent className="p-4 space-y-3">
        {/* If In-Progress, render Category pill + Duration row on top of title */}
        {!isCompleted && (
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-full bg-black text-white text-[11px] font-semibold px-2.5 py-0.5 tracking-tight dark:bg-white dark:text-black">
              {course.category}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
              <Clock className="h-3 w-3" /> {course.duration}
            </span>
          </div>
        )}

        <div>
          <h3 className="font-serif text-lg font-medium leading-snug group-hover:text-primary transition-colors text-foreground">
            {course.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">{course.instructor}</p>
        </div>

        {/* Completed course metadata row */}
        {isCompleted && (
          <div className="flex items-center gap-3 pt-0.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground/70" /> {course.lessons} lessons
            </span>
            <span className="flex items-center gap-1 font-medium">
              <Clock className="h-3.5 w-3.5 text-muted-foreground/70" /> {course.duration}
            </span>
          </div>
        )}

        {/* Progress Display */}
        {course.is_enrolled && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              {isCompleted ? (
                <>
                  <span className="text-muted-foreground font-normal">Course Completed</span>
                  <span className="font-bold text-foreground">100%</span>
                </>
              ) : (
                <>
                  <span className="font-bold text-foreground">{course.progress}% Complete</span>
                  <span className="text-muted-foreground">
                    Lesson {Math.min(course.lessons, (course.completed_lessons || 0) + 1)} of {course.lessons}
                  </span>
                </>
              )}
            </div>

            {/* Gold Progress Bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-[#C69A50] rounded-full transition-all duration-300"
                style={{ width: `${Math.max(3, course.progress)}%` }}
              />
            </div>
          </div>
        )}

        {/* View Certificate Button for Completed Courses */}
        {isCompleted && onViewCertificate && (
          <div className="pt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onViewCertificate}
              className="w-full rounded-xl border border-[#C69A50]/40 text-[#C69A50] bg-white dark:bg-card hover:bg-[#C69A50]/10 hover:text-[#C69A50] text-xs font-semibold py-2 gap-1.5 shadow-none"
            >
              <Award className="h-4 w-4 text-[#C69A50]" /> View Certificate
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Course Player Modal ─────────────────────────────────────────────────────
function CoursePlayerModal({
  courseDetail,
  activeLesson,
  loading,
  enrolling,
  completingLesson,
  onClose,
  onSelectLesson,
  onEnroll,
  onCompleteLesson,
  onViewCertificate,
}: {
  courseDetail: CourseDetail | null;
  activeLesson: CourseLesson | null;
  loading: boolean;
  enrolling: boolean;
  completingLesson: boolean;
  onClose: () => void;
  onSelectLesson: (lesson: CourseLesson) => void;
  onEnroll: () => void;
  onCompleteLesson: (lesson: CourseLesson) => void;
  onViewCertificate: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  if (loading || !courseDetail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="rounded-2xl bg-card p-8 text-center shadow-xl">
          <p className="text-muted-foreground animate-pulse">Loading course lessons...</p>
        </div>
      </div>
    );
  }

  const isEnrolled = courseDetail.is_enrolled;
  const isCompleted = courseDetail.progress === 100 || courseDetail.enrollment_status === 'completed';
  const lessons = courseDetail.lessons || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 md:p-6 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-5xl rounded-2xl bg-card border border-border/60 shadow-2xl overflow-hidden my-auto max-h-[92dvh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4 bg-muted/30">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground text-xs">{courseDetail.category}</Badge>
              <span className="text-xs text-muted-foreground">{courseDetail.duration} Total</span>
            </div>
            <h2 className="font-serif text-xl font-medium tracking-tight mt-1">{courseDetail.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body: Split view (Video Player + Lesson List) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-y-auto flex-1">
          {/* Left Column: Player / Enrollment Screen */}
          <div className="lg:col-span-7 p-4 md:p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-border/60 bg-black/10">
            {!isEnrolled ? (
              <div className="my-auto text-center py-12 px-4 space-y-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <BookOpen className="h-8 w-8" />
                </div>
                <h3 className="font-serif text-2xl font-medium">Ready to Begin?</h3>
                <p className="max-w-md mx-auto text-sm text-muted-foreground leading-relaxed">
                  {courseDetail.description || 'Enroll in this course to unlock all lessons sequentially and earn your Certificate of Completion.'}
                </p>
                <div className="pt-2">
                  <Button size="lg" onClick={onEnroll} disabled={enrolling} className="gap-2 px-8">
                    <Play className="h-4 w-4" /> {enrolling ? 'Enrolling...' : 'Start Course'}
                  </Button>
                </div>
              </div>
            ) : activeLesson ? (
              <div className="space-y-4">
                {/* Dynamic HTML5 & Embed Video Player */}
                <div className="relative aspect-video rounded-xl bg-black overflow-hidden shadow-lg border border-border/40 flex items-center justify-center">
                  {!activeLesson.video_url ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-2">
                      <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                      <p className="font-serif text-base font-medium">No Video URL Configured</p>
                      <p className="text-xs max-w-xs">This lesson does not have a video stream attached in the database.</p>
                    </div>
                  ) : activeLesson.video_url.includes('youtube.com') || activeLesson.video_url.includes('youtu.be') ? (
                    <iframe
                      key={activeLesson.id}
                      src={
                        activeLesson.video_url.includes('embed')
                          ? activeLesson.video_url
                          : `https://www.youtube.com/embed/${
                              activeLesson.video_url.includes('v=')
                                ? activeLesson.video_url.split('v=')[1]?.split('&')[0]
                                : activeLesson.video_url.split('/').pop()
                            }`
                      }
                      title={activeLesson.title}
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      key={activeLesson.id}
                      src={activeLesson.video_url}
                      controls
                      playsInline
                      poster={courseDetail.image_url || courseDetail.image || undefined}
                      className="h-full w-full object-contain"
                    >
                      <source src={activeLesson.video_url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>

                {/* Active Lesson Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Lesson {activeLesson.order} of {lessons.length}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {activeLesson.duration}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl font-medium">{activeLesson.title}</h3>
                  <p className="text-xs text-muted-foreground">Instructor: {courseDetail.instructor}</p>
                </div>

                {/* Lesson Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {!activeLesson.is_completed ? (
                    <Button
                      onClick={() => onCompleteLesson(activeLesson)}
                      disabled={completingLesson}
                      className="gap-2 font-medium"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {completingLesson ? 'Saving...' : 'Complete & Continue'}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm">
                      <CheckCircle2 className="h-5 w-5" /> Completed
                    </div>
                  )}

                  {isCompleted && (
                    <Button
                      variant="outline"
                      onClick={onViewCertificate}
                      className="border-[#C69A50]/50 text-[#C69A50] hover:bg-[#C69A50]/10 gap-2 text-xs font-semibold ml-auto"
                    >
                      <Award className="h-4 w-4" /> View Certificate
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">Select a lesson to begin.</div>
            )}
          </div>

          {/* Right Column: Sequential Lesson List */}
          <div className="lg:col-span-5 p-4 md:p-6 flex flex-col justify-between bg-card overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <h4 className="font-semibold text-sm tracking-tight">Course Content</h4>
                <span className="text-xs text-muted-foreground font-medium">
                  {courseDetail.completed_lessons || 0} / {lessons.length} Completed ({courseDetail.progress || 0}%)
                </span>
              </div>

              <Progress value={courseDetail.progress || 0} className="h-1.5 bg-muted" />

              {/* Lesson Items */}
              <div className="space-y-2 pt-2">
                {lessons.map((lesson, idx) => {
                  const isActive = activeLesson?.id === lesson.id;
                  const isUnlocked = isEnrolled ? lesson.is_unlocked : idx === 0;

                  return (
                    <div
                      key={lesson.id}
                      onClick={() => isUnlocked && onSelectLesson(lesson)}
                      className={`group flex items-start gap-3 rounded-xl p-3 text-left transition-all ${
                        isActive
                          ? 'bg-primary/10 border border-primary/30'
                          : isUnlocked
                          ? 'cursor-pointer hover:bg-muted/60 border border-transparent'
                          : 'cursor-not-allowed opacity-50 bg-muted/20 border border-transparent'
                      }`}
                    >
                      {/* Status Icon */}
                      <div className="mt-0.5 shrink-0">
                        {lesson.is_completed ? (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                          </div>
                        ) : isUnlocked ? (
                          <div
                            className={`flex h-6 w-6 items-center justify-center rounded-full ${
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors'
                            }`}
                          >
                            <Play className="h-3 w-3 ml-0.5" />
                          </div>
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                            <Lock className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Title and Duration */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            Lesson {lesson.order}
                          </p>
                          <span className="text-[11px] text-muted-foreground shrink-0">{lesson.duration}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate font-normal mt-0.5">{lesson.title}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Course Completion Banner */}
            {isCompleted && (
              <div className="mt-6 rounded-xl border border-[#C69A50]/30 bg-[#FAF7F2] dark:bg-[#1f1d19] p-4 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#C69A50] text-white">
                  <Award className="h-5 w-5" />
                </div>
                <h4 className="font-serif font-medium text-sm text-[#8c6b2d] dark:text-[#d4aa5c]">
                  Course Complete!
                </h4>
                <p className="text-xs text-muted-foreground">
                  You have completed all lessons. Your official certificate is ready.
                </p>
                <Button
                  size="sm"
                  onClick={onViewCertificate}
                  className="w-full bg-[#C69A50] hover:bg-[#b0843d] text-white font-medium text-xs gap-1.5"
                >
                  <Award className="h-3.5 w-3.5" /> Claim Certificate
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Certificate Modal ───────────────────────────────────────────────────────
function CertificateModal({
  certificate,
  loading,
  fallbackMemberName,
  onClose,
}: {
  certificate: CertificateItem | null;
  loading: boolean;
  fallbackMemberName: string;
  onClose: () => void;
}) {
  const certRef = useRef<HTMLDivElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (loading || !certificate) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
        <div className="rounded-2xl bg-card p-8 text-center shadow-xl">
          <p className="text-muted-foreground animate-pulse">Loading your certificate...</p>
        </div>
      </div>
    );
  }

  const memberName = certificate.member_name || fallbackMemberName;
  const courseTitle = certificate.course_title || 'Course of Discipleship';
  const certNumber = certificate.certificate_number || 'SOF-2024-0001';
  const issueDate = certificate.issue_date
    ? new Date(certificate.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const handleDownloadPdf = async () => {
    if (!certRef.current) return;
    try {
      setDownloadingPdf(true);
      const element = certRef.current;
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#FCFAF6',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Maintain aspect ratio with margins
      const margin = 24;
      const availableWidth = pdfWidth - margin * 2;
      const availableHeight = pdfHeight - margin * 2;

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);

      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight, undefined, 'FAST');
      const safeCertNum = (certNumber || 'certificate').replace(/[^a-zA-Z0-9_-]/g, '-');
      pdf.save(`School-of-Faith-Certificate-${safeCertNum}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-3xl rounded-2xl bg-[#FCFAF6] dark:bg-[#191816] text-[#2C2620] dark:text-[#E8E2D8] border-4 sm:border-8 border double border-[#C69A50]/40 shadow-2xl p-4 sm:p-6 md:p-10 my-auto max-h-[92dvh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Certificate Inner Content to Capture */}
        <div
          ref={certRef}
          className="border border-[#C69A50]/30 p-6 md:p-8 text-center relative overflow-hidden bg-[#FCFAF6] text-[#2C2620] rounded-lg"
          style={{ backgroundColor: '#FCFAF6', color: '#2C2620' }}
        >
          {/* Top Logo / Seal Header */}
          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#C69A50] bg-[#FAF7F2] text-[#C69A50] shadow-sm">
            <BookOpen className="h-7 w-7" />
          </div>

          <p className="font-serif uppercase tracking-[0.25em] text-xs text-[#C69A50] font-semibold">
            The School of Faith
          </p>

          <h2 className="mt-2 font-serif text-3xl md:text-4xl font-medium tracking-tight text-[#1A1612]">
            Certificate of Completion
          </h2>

          <p className="mt-3 text-xs italic text-[#786D62]">This is to proudly certify that</p>

          {/* Member Name */}
          <div className="my-4 border-b border-[#C69A50]/40 pb-2 inline-block min-w-[280px]">
            <h3 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-[#C69A50]">
              {memberName}
            </h3>
          </div>

          <p className="text-xs text-[#786D62]">has successfully completed all required modules and lessons for</p>

          {/* Course Name */}
          <h4 className="mt-2 font-serif text-xl md:text-2xl font-semibold text-[#1A1612]">
            {courseTitle}
          </h4>

          <p className="mt-1 text-xs text-[#786D62]">
            Instructor: <span className="font-medium text-[#1A1612]">{certificate.instructor}</span>
          </p>

          {/* Footer Metadata */}
          <div className="mt-8 pt-6 border-t border-[#C69A50]/30 grid grid-cols-2 gap-4 items-center text-xs">
            <div className="text-left space-y-1">
              <p className="text-[#786D62]">Date Issued</p>
              <p className="font-serif font-medium text-[#1A1612]">{issueDate}</p>
            </div>

            <div className="text-right space-y-1">
              <p className="text-[#786D62]">Certificate Number</p>
              <p className="font-mono font-medium text-[#C69A50]">{certNumber}</p>
            </div>
          </div>

          {/* Official Verification Seal */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#786D62]">
            <ShieldCheck className="h-4 w-4 text-[#C69A50]" /> Verified Official Discipleship Certificate
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="gap-2 bg-[#C69A50] hover:bg-[#b0843d] text-white font-medium"
          >
            <Download className="h-4 w-4" /> {downloadingPdf ? 'Generating PDF...' : 'Download PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
}

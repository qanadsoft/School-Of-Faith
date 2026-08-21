import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, Award } from 'lucide-react';
import { MemberDetailLayout } from '@/components/MemberDetailLayout';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { api, asList } from '@/lib/api';
import type { Course } from '@/types';

export function MemberCoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await api.getCourses();
        const enrolled = asList<Course>(data).filter((c) => c.is_enrolled);
        setCourses(enrolled);
      } catch (err) {
        console.error('Failed to load member courses:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <MemberDetailLayout title="My Courses">
        <p className="text-muted-foreground animate-pulse">Loading courses...</p>
      </MemberDetailLayout>
    );
  }

  return (
    <MemberDetailLayout title="My Courses">
      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-muted-foreground">You are not enrolled in any courses yet.</p>
          <Button onClick={() => navigate('/learn')} className="mt-4" size="sm">
            Browse Courses
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {courses.map((course) => {
            const isCompleted = course.progress === 100 || course.enrollment_status === 'completed';
            return (
              <Card
                key={course.id}
                onClick={() => navigate('/learn')}
                className="cursor-pointer hover:border-primary/40 transition-colors shadow-sm"
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={isCompleted ? 'default' : 'secondary'}>
                      {isCompleted ? 'Completed' : 'In Progress'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{course.category}</span>
                  </div>

                  <h3 className="font-serif text-lg font-medium leading-snug">{course.title}</h3>
                  <p className="text-sm text-muted-foreground">{course.instructor}</p>

                  <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium">
                      <BookOpen className="h-3.5 w-3.5 text-primary" /> {course.lessons} lessons
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="h-3.5 w-3.5 text-primary" /> {course.duration}
                    </span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{isCompleted ? '100% Completed' : `Lesson ${(course.completed_lessons || 0) + 1} of ${course.lessons}`}</span>
                      <span className="font-semibold text-foreground">{course.progress}%</span>
                    </div>
                    <Progress value={course.progress} className="h-1.5 bg-muted" />
                  </div>

                  {isCompleted && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/member/certificates');
                        }}
                        className="w-full border-[#C69A50]/40 text-[#C69A50] hover:bg-[#C69A50]/10 hover:text-[#C69A50] text-xs font-semibold gap-1.5"
                      >
                        <Award className="h-3.5 w-3.5" /> View Certificate
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </MemberDetailLayout>
  );
}

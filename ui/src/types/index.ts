export interface Course {
  id: string | number;
  title: string;
  instructor: string;
  image?: string;
  image_url?: string;
  thumbnail_url?: string;
  progress: number;
  lessons: number;
  completed_lessons?: number;
  duration: string;
  duration_minutes?: number;
  category: string;
  description?: string;
  difficulty?: string;
  is_enrolled?: boolean;
  enrollment_status?: 'active' | 'completed' | 'cancelled' | null;
}

export interface CourseLesson {
  id: string;
  course_id: string;
  title: string;
  duration_minutes: number;
  duration: string;
  sort_order: number;
  order: number;
  video_url?: string | null;
  is_unlocked: boolean;
  is_completed: boolean;
  last_position_seconds: number;
  progress_percentage: number;
  completed_at?: string | null;
}

export interface CourseDetail extends Omit<Course, 'lessons'> {
  lessons: CourseLesson[];
  total_lessons: number;
  completed_lessons: number;
  certificate?: {
    id: string;
    certificate_number: string;
    title: string;
    issue_date: string;
    status: string;
  } | null;
}

export interface CertificateItem {
  id: string;
  certificate_number: string;
  title: string;
  issue_date: string;
  status: string;
  course_id: string;
  course_title: string;
  instructor: string;
  category: string;
  member_id: string;
  member_name: string;
  member_email?: string;
}

export interface Message {
  id: number;
  title: string;
  series: string;
  duration: string;
  date: string;
  image: string;
}

export interface CommunityPost {
  id: number;
  author: string;
  avatar: string;
  role: 'Member' | 'Leader';
  time: string;
  content: string;
  likes: number;
  comments: number;
  group: string;
}

export interface PrayerRequest {
  id: number;
  author: string;
  avatar: string;
  content: string;
  prays: number;
  comments: number;
  time: string;
  type: 'request' | 'praise';
}

export interface EventItem {
  title: string;
  date: string;
  type: string;
  color: string;
}

export interface StatItem {
  label: string;
  value: string;
  icon: 'HeartHandshake' | 'BookOpen' | 'Globe' | 'Users';
}

export interface NavItem {
  name: string;
  path: string;
  icon: 'Home' | 'CirclePlay' | 'BookOpen' | 'HeartHandshake' | 'Gift';
}

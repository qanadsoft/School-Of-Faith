/**
 * Type definitions for API responses
 * These are used throughout the UI to maintain type safety
 */

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image: string | null;
  join_date: string;
  membership_type: string;
  membership_status: string;
  role: 'member' | 'admin';
  created_at: string;
  updated_at: string;
};

export type Tag = {
  id: string;
  name: string;
  color: string;
};

export type Course = {
  id: string;
  title: string;
  instructor: string;
  category: string;
  description: string;
  image_url: string | null;
  archived: boolean;
};

export type Enrollment = {
  id: string;
  member_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
  course?: Course;
};

export type WatchRecord = {
  id: string;
  member_id: string;
  course_id: string;
  lesson_id: string | null;
  watch_duration_minutes: number;
  completion_percentage: number;
  watched_at: string;
  course?: Course;
};

export type Certificate = {
  id: string;
  member_id: string;
  course_id: string;
  certificate_number: string;
  issue_date: string;
  status: string;
  course?: Course;
};

export type EventItem = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  location: string;
  archived: boolean;
};

export type Registration = {
  id: string;
  member_id: string;
  event_id: string;
  registration_status: string;
  attendance_status: string;
  registered_at: string;
  event?: EventItem;
};

export type Ticket = {
  id: string;
  registration_id: string;
  member_id: string;
  event_id: string;
  ticket_number: string;
  ticket_status: string;
  issued_at: string;
  event?: EventItem;
};

export type ReadingPlan = {
  id: string;
  name: string;
  description: string;
  total_days: number;
  active: boolean;
};

export type ReadingProgress = {
  id: string;
  member_id: string;
  plan_id: string;
  item_id: string;
  completed_at: string;
};

export type Topic = {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  sort_order?: number;
  count?: number;
};

export type VideoWatchProgress = {
  id?: string;
  progress_id?: string;
  member_id?: string;
  message_id?: string;
  watch_duration_seconds: number;
  last_position_seconds: number;
  progress_percentage: number;
  is_completed: boolean;
  last_watched_at?: string;
};

export type Message = {
  id: string;
  title: string;
  speaker: string;
  category: string;
  description?: string;
  original_url?: string;
  published_at: string;
  archived: boolean;
  thumbnail_url?: string | null;
  video_url?: string | null;
  duration_minutes?: number;
  topics?: Topic[];
  progress?: VideoWatchProgress;
  progress_percentage?: number;
  last_position_seconds?: number;
  is_completed?: boolean;
};

export type SavedMessage = {
  id: string;
  member_id: string;
  message_id: string;
  saved_at: string;
  message?: Message;
};

export type Download = {
  id: string;
  member_id: string;
  resource_name: string;
  resource_type: string;
  file_url: string;
  downloaded_at: string;
};

export type Donation = {
  id: string;
  member_id: string;
  amount: number;
  currency: string;
  donated_at: string;
  fund: string;
  payment_status: string;
  transaction_id: string;
};

export type PrayerRequest = {
  id: string;
  member_id: string;
  title: string;
  description: string;
  category?: string;
  type?: 'request' | 'praise';
  status: 'pending' | 'approved' | 'rejected' | 'answered' | 'archived';
  author?: string;
  author_name?: string;
  avatar?: string | null;
  is_anonymous?: boolean;
  is_private?: boolean;
  prayer_count?: number;
  prays?: number;
  replies?: number;
  comments?: number;
  has_prayed?: boolean;
  member?: { first_name?: string; last_name?: string; email?: string };
  created_at: string;
  updated_at: string;
};

export type PrayerComment = {
  id: string;
  prayer_request_id: string;
  member_id: string;
  content: string;
  author: string;
  avatar?: string | null;
  created_at: string;
};

export type PrayerFocus = {
  id: string;
  title: string;
  topic: string;
  scripture: string;
  description: string;
  active_date: string;
  is_published: boolean;
  archived?: boolean;
  prayer_count?: number;
  has_prayed?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type PrayerStats = {
  totalRequests: number;
  pending: number;
  approved: number;
  answered: number;
  totalPrayers: number;
};

export type ActivityRecord = {
  id: string;
  member_id: string;
  activity_type: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

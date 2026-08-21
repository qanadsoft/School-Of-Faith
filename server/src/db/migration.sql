CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  profile_image TEXT,
  avatar_url TEXT GENERATED ALWAYS AS (profile_image) STORED,
  bio TEXT NOT NULL DEFAULT '',
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  membership_type TEXT NOT NULL DEFAULT 'Member',
  membership_status TEXT NOT NULL DEFAULT 'active' CHECK (membership_status IN ('active', 'inactive', 'suspended')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'gold',
  text_color TEXT NOT NULL DEFAULT '#9A3412',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tag_id)
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  instructor TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  thumbnail_url TEXT GENERATED ALWAYS AS (image_url) STORED,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  difficulty TEXT NOT NULL DEFAULT 'all-levels',
  duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, course_id)
);

CREATE TABLE IF NOT EXISTS course_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_status TEXT NOT NULL DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE SET NULL,
  watch_duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (watch_duration_minutes >= 0),
  completion_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  last_position_seconds INTEGER NOT NULL DEFAULT 0,
  watch_duration_seconds INTEGER NOT NULL DEFAULT 0,
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
  certificate_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT 'Certificate of Completion',
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS certificates_member_course_idx ON certificates(member_id, course_id);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT NOT NULL DEFAULT '',
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_status TEXT NOT NULL DEFAULT 'registered' CHECK (registration_status IN ('registered', 'cancelled', 'no_show')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, event_id)
);

CREATE TABLE IF NOT EXISTS event_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled', 'no_show')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, event_id)
);

CREATE TABLE IF NOT EXISTS event_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES event_registrations(id) ON DELETE SET NULL,
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL UNIQUE,
  attendance_status TEXT NOT NULL DEFAULT 'registered' CHECK (attendance_status IN ('registered', 'attended', 'cancelled', 'no_show')),
  ticket_status TEXT NOT NULL DEFAULT 'valid' CHECK (ticket_status IN ('valid', 'used', 'cancelled')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reading_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT GENERATED ALWAYS AS (name) STORED,
  description TEXT NOT NULL DEFAULT '',
  total_days INTEGER NOT NULL CHECK (total_days > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  pdf_url TEXT,
  badge_text TEXT NOT NULL DEFAULT 'New Resource',
  is_featured BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE reading_plans ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE reading_plans ADD COLUMN IF NOT EXISTS badge_text TEXT NOT NULL DEFAULT 'New Resource';
ALTER TABLE reading_plans ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS reading_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES reading_plans(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number > 0),
  title TEXT NOT NULL,
  reference TEXT NOT NULL DEFAULT '',
  scripture TEXT GENERATED ALWAYS AS (reference) STORED,
  key_verse TEXT NOT NULL DEFAULT '',
  devotional TEXT NOT NULL DEFAULT '',
  prayer TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, day_number)
);

ALTER TABLE reading_plan_items ADD COLUMN IF NOT EXISTS key_verse TEXT NOT NULL DEFAULT '';
ALTER TABLE reading_plan_items ADD COLUMN IF NOT EXISTS devotional TEXT NOT NULL DEFAULT '';
ALTER TABLE reading_plan_items ADD COLUMN IF NOT EXISTS prayer TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS member_reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES reading_plans(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES reading_plan_items(id) ON DELETE CASCADE,
  notes TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, item_id)
);

ALTER TABLE member_reading_progress ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  speaker TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT,
  video_url TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  original_url TEXT NOT NULL DEFAULT '#',
  published_at DATE NOT NULL DEFAULT CURRENT_DATE,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saved_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, message_id)
);

CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL,
  title TEXT GENERATED ALWAYS AS (resource_name) STORED,
  resource_type TEXT NOT NULL,
  file_url TEXT NOT NULL DEFAULT '#',
  resource_url TEXT GENERATED ALWAYS AS (file_url) STORED,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  goal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (goal_amount >= 0),
  amount_raised NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_raised >= 0),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS donation_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES users(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  donated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fund TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'card',
  donation_type TEXT NOT NULL DEFAULT 'one_time',
  campaign TEXT,
  transaction_id TEXT NOT NULL UNIQUE,
  payment_status TEXT NOT NULL DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE donation_transactions ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
ALTER TABLE donation_transactions ALTER COLUMN member_id DROP NOT NULL;

CREATE TABLE IF NOT EXISTS prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  details TEXT GENERATED ALWAYS AS (description) STORED,
  category TEXT NOT NULL DEFAULT 'General',
  type TEXT NOT NULL DEFAULT 'request',
  status TEXT NOT NULL DEFAULT 'pending',
  author_name TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS member_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_tag_id ON user_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course_id ON course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_member_id ON course_enrollments(member_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON course_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_course_purchases_member_id ON course_purchases(member_id);
CREATE INDEX IF NOT EXISTS idx_course_purchases_course_id ON course_purchases(course_id);
CREATE INDEX IF NOT EXISTS idx_course_purchases_payment_status ON course_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_watch_history_member_id ON watch_history(member_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_course_id ON watch_history(course_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_watched_at ON watch_history(watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_member_id ON certificates(member_id);
CREATE INDEX IF NOT EXISTS idx_certificates_course_id ON certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_registrations_member_id ON event_registrations(member_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_status ON event_registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_event_attendance_member_id ON event_attendance(member_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_event_id ON event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_status ON event_attendance(status);
CREATE INDEX IF NOT EXISTS idx_event_tickets_member_id ON event_tickets(member_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_event_id ON event_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_ticket_status ON event_tickets(ticket_status);
CREATE INDEX IF NOT EXISTS idx_reading_plan_items_plan_id ON reading_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_member_reading_progress_member_id ON member_reading_progress(member_id);
CREATE INDEX IF NOT EXISTS idx_member_reading_progress_plan_id ON member_reading_progress(plan_id);
CREATE INDEX IF NOT EXISTS idx_saved_messages_member_id ON saved_messages(member_id);
CREATE INDEX IF NOT EXISTS idx_saved_messages_message_id ON saved_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_downloads_member_id ON downloads(member_id);
CREATE INDEX IF NOT EXISTS idx_downloads_downloaded_at ON downloads(downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_is_active ON campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_donation_transactions_member_id ON donation_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_donation_transactions_campaign_id ON donation_transactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_donation_transactions_payment_status ON donation_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_donation_transactions_donated_at ON donation_transactions(donated_at DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_member_id ON prayer_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_status ON prayer_requests(status);
CREATE INDEX IF NOT EXISTS idx_member_activity_member_id ON member_activity(member_id);
CREATE INDEX IF NOT EXISTS idx_member_activity_created_at ON member_activity(created_at DESC);

DROP TRIGGER IF EXISTS set_updated_at_campaigns ON campaigns;
CREATE TRIGGER set_updated_at_campaigns BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_users ON users;
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_roles ON roles;
CREATE TRIGGER set_updated_at_roles BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_user_roles ON user_roles;
CREATE TRIGGER set_updated_at_user_roles BEFORE UPDATE ON user_roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_tags ON tags;
CREATE TRIGGER set_updated_at_tags BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_user_tags ON user_tags;
CREATE TRIGGER set_updated_at_user_tags BEFORE UPDATE ON user_tags FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_courses ON courses;
CREATE TRIGGER set_updated_at_courses BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_course_lessons ON course_lessons;
CREATE TRIGGER set_updated_at_course_lessons BEFORE UPDATE ON course_lessons FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_course_enrollments ON course_enrollments;
CREATE TRIGGER set_updated_at_course_enrollments BEFORE UPDATE ON course_enrollments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_course_purchases ON course_purchases;
CREATE TRIGGER set_updated_at_course_purchases BEFORE UPDATE ON course_purchases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_watch_history ON watch_history;
CREATE TRIGGER set_updated_at_watch_history BEFORE UPDATE ON watch_history FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_certificates ON certificates;
CREATE TRIGGER set_updated_at_certificates BEFORE UPDATE ON certificates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_events ON events;
CREATE TRIGGER set_updated_at_events BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_event_registrations ON event_registrations;
CREATE TRIGGER set_updated_at_event_registrations BEFORE UPDATE ON event_registrations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_event_attendance ON event_attendance;
CREATE TRIGGER set_updated_at_event_attendance BEFORE UPDATE ON event_attendance FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_event_tickets ON event_tickets;
CREATE TRIGGER set_updated_at_event_tickets BEFORE UPDATE ON event_tickets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_reading_plans ON reading_plans;
CREATE TRIGGER set_updated_at_reading_plans BEFORE UPDATE ON reading_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_reading_plan_items ON reading_plan_items;
CREATE TRIGGER set_updated_at_reading_plan_items BEFORE UPDATE ON reading_plan_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_member_reading_progress ON member_reading_progress;
CREATE TRIGGER set_updated_at_member_reading_progress BEFORE UPDATE ON member_reading_progress FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_messages ON messages;
CREATE TRIGGER set_updated_at_messages BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_saved_messages ON saved_messages;
CREATE TRIGGER set_updated_at_saved_messages BEFORE UPDATE ON saved_messages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_downloads ON downloads;
CREATE TRIGGER set_updated_at_downloads BEFORE UPDATE ON downloads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_donation_transactions ON donation_transactions;
CREATE TRIGGER set_updated_at_donation_transactions BEFORE UPDATE ON donation_transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_prayer_requests ON prayer_requests;
CREATE TRIGGER set_updated_at_prayer_requests BEFORE UPDATE ON prayer_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_member_activity ON member_activity;
CREATE TRIGGER set_updated_at_member_activity BEFORE UPDATE ON member_activity FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- ========== VIDEO / WATCH PAGE TABLES ==========

ALTER TABLE messages ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, topic_id)
);

CREATE TABLE IF NOT EXISTS video_watch_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  watch_duration_seconds INTEGER NOT NULL DEFAULT 0 CHECK (watch_duration_seconds >= 0),
  last_position_seconds INTEGER NOT NULL DEFAULT 0 CHECK (last_position_seconds >= 0),
  progress_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_watched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (member_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_topics_slug ON topics(slug);
CREATE INDEX IF NOT EXISTS idx_topics_sort_order ON topics(sort_order);
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General';
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'request';
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE prayer_requests DROP CONSTRAINT IF EXISTS prayer_requests_status_check;
ALTER TABLE prayer_requests ADD CONSTRAINT prayer_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'answered', 'archived', 'active'));

CREATE TABLE IF NOT EXISTS prayer_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id UUID NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (prayer_request_id, member_id)
);

CREATE TABLE IF NOT EXISTS prayer_focuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'Global Missions',
  scripture TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  active_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prayer_focus_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_id UUID NOT NULL REFERENCES prayer_focuses(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (focus_id, member_id)
);

CREATE TABLE IF NOT EXISTS prayer_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prayer_request_id UUID NOT NULL REFERENCES prayer_requests(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prayer_comments_request_id ON prayer_comments(prayer_request_id);

CREATE INDEX IF NOT EXISTS idx_prayer_requests_member_id ON prayer_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_status ON prayer_requests(status);
CREATE INDEX IF NOT EXISTS idx_prayer_actions_request_id ON prayer_actions(prayer_request_id);
CREATE INDEX IF NOT EXISTS idx_prayer_actions_member_id ON prayer_actions(member_id);
CREATE INDEX IF NOT EXISTS idx_prayer_focuses_active_date ON prayer_focuses(active_date DESC);
CREATE INDEX IF NOT EXISTS idx_prayer_focus_actions_focus_id ON prayer_focus_actions(focus_id);

DROP TRIGGER IF EXISTS set_updated_at_prayer_requests ON prayer_requests;
CREATE TRIGGER set_updated_at_prayer_requests BEFORE UPDATE ON prayer_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_prayer_focuses ON prayer_focuses;
CREATE TRIGGER set_updated_at_prayer_focuses BEFORE UPDATE ON prayer_focuses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_prayer_comments ON prayer_comments;
CREATE TRIGGER set_updated_at_prayer_comments BEFORE UPDATE ON prayer_comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Community Module ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT 'Globe',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO community_categories (id, name, slug, icon, status, sort_order) VALUES
  ('91000000-0000-0000-0000-000000000001', 'General Discussion', 'general', 'Globe', 'active', 1),
  ('91000000-0000-0000-0000-000000000002', 'Prayer Wall', 'prayer-wall', 'Heart', 'active', 2),
  ('91000000-0000-0000-0000-000000000003', 'Local Groups', 'local-groups', 'Users', 'active', 3)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES community_categories(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, member_id)
);

CREATE TABLE IF NOT EXISTS community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_member_id ON community_posts(member_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_category_id ON community_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_status ON community_posts(status);
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_post_likes_post_id ON community_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_reports_post_id ON community_reports(post_id);

CREATE TABLE IF NOT EXISTS certificate_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  branding_name TEXT NOT NULL DEFAULT 'The School of Faith',
  title TEXT NOT NULL DEFAULT 'Certificate of Completion',
  subtitle TEXT NOT NULL DEFAULT 'This is proudly presented to',
  description TEXT NOT NULL DEFAULT 'For successfully completing all requirements and modules of the discipleship course:',
  signature_name TEXT NOT NULL DEFAULT 'Pastor Sarah Jenkins',
  signature_title TEXT NOT NULL DEFAULT 'Senior Pastor & Founder',
  footer_text TEXT NOT NULL DEFAULT 'Accredited by The School of Faith Global Leadership Network',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO certificate_settings (id, branding_name, title, subtitle, description, signature_name, signature_title, footer_text)
VALUES (1, 'The School of Faith', 'Certificate of Completion', 'This is proudly presented to', 'For successfully completing all requirements and modules of the discipleship course:', 'Pastor Sarah Jenkins', 'Senior Pastor & Founder', 'Accredited by The School of Faith Global Leadership Network')
ON CONFLICT (id) DO NOTHING;



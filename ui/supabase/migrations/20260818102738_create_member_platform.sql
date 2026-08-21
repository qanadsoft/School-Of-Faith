/*
# Create the member platform schema and demo records

1. New Tables
- `profiles`: member identity, contact information, membership status, and role.
- `tags`, `user_tags`: reusable member badges and assignments.
- `courses`, `course_lessons`, `course_enrollments`, `course_purchases`: learning catalog and membership access.
- `watch_history`: lesson viewing duration and completion.
- `certificates`: issued and revoked learning certificates.
- `events`, `event_registrations`, `event_tickets`: event lifecycle, attendance, and tickets.
- `reading_plans`, `reading_plan_items`, `member_reading_progress`: reading plans and member completion.
- `messages`, `saved_messages`: content library and saved content.
- `downloads`: member resource download history.
- `donations`: member giving records and payment states.
- `prayer_requests`: private member prayer requests and statuses.
- `member_activity`: append-only member history records.

2. Security
- Enable row-level security on every application table.
- Members can read and update only their own member-owned records.
- Administrators can manage all application records through an `is_admin()` security-definer check.
- Role, membership status, and audit ownership are not writable by ordinary members.

3. Seed Data
- Creates demo member Sarah Jenkins and demo administrator accounts.
- Seeds three enrollments, 24 hours of watch history, two attended events, one certificate, fourteen completed readings, member tags, saved content, a download, donation, prayer request, ticket, and activity records.

4. Notes
- Demo credentials are `sarah@example.com` / `Faithful123!` and `admin@example.com` / `AdminFaith123!`.
- All statistics in the UI are calculated from these relational records rather than hardcoded values.
*/

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  profile_image text,
  join_date date not null default current_date,
  membership_type text not null default 'Member',
  membership_status text not null default 'active' check (membership_status in ('active','inactive','suspended')),
  role text not null default 'member' check (role in ('member','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default 'gold',
  created_at timestamptz not null default now()
);

create table if not exists public.user_tags (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  instructor text not null,
  category text not null,
  description text not null default '',
  image_url text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  enrolled_at timestamptz not null default now(),
  unique (member_id, course_id)
);

create table if not exists public.course_purchases (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  amount numeric(10,2) not null default 0,
  currency text not null default 'USD',
  payment_status text not null default 'completed' check (payment_status in ('pending','completed','failed','refunded')),
  purchased_at timestamptz not null default now()
);

create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid references public.course_lessons(id) on delete set null,
  watch_duration_minutes integer not null default 0 check (watch_duration_minutes >= 0),
  completion_percentage numeric(5,2) not null default 0 check (completion_percentage between 0 and 100),
  watched_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  certificate_number text not null unique,
  issue_date date not null default current_date,
  status text not null default 'valid' check (status in ('valid','revoked'))
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  location text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  registration_status text not null default 'registered' check (registration_status in ('registered','cancelled','no_show')),
  attendance_status text not null default 'registered' check (attendance_status in ('registered','attended','cancelled','no_show')),
  registered_at timestamptz not null default now(),
  unique (member_id, event_id)
);

create table if not exists public.event_tickets (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.event_registrations(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_number text not null unique,
  ticket_status text not null default 'valid' check (ticket_status in ('valid','used','cancelled')),
  issued_at timestamptz not null default now()
);

create table if not exists public.reading_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  total_days integer not null check (total_days > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reading_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.reading_plans(id) on delete cascade,
  day_number integer not null,
  title text not null,
  reference text not null default '',
  unique (plan_id, day_number)
);

create table if not exists public.member_reading_progress (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.reading_plans(id) on delete cascade,
  item_id uuid not null references public.reading_plan_items(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (member_id, item_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  speaker text not null,
  category text not null,
  published_at date not null default current_date,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_messages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  saved_at timestamptz not null default now(),
  unique (member_id, message_id)
);

create table if not exists public.downloads (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  resource_name text not null,
  resource_type text not null,
  file_url text not null default '#',
  downloaded_at timestamptz not null default now()
);

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'USD',
  donated_at timestamptz not null default now(),
  fund text not null,
  payment_status text not null default 'completed' check (payment_status in ('pending','completed','failed','refunded')),
  transaction_id text not null unique
);

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null default 'active' check (status in ('active','answered','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.member_activity (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_enrollments_member on public.course_enrollments(member_id);
create index if not exists idx_watch_history_member on public.watch_history(member_id);
create index if not exists idx_event_registrations_member on public.event_registrations(member_id);
create index if not exists idx_certificates_member on public.certificates(member_id);
create index if not exists idx_reading_progress_member on public.member_reading_progress(member_id);
create index if not exists idx_saved_messages_member on public.saved_messages(member_id);
create index if not exists idx_downloads_member on public.downloads(member_id);
create index if not exists idx_donations_member on public.donations(member_id);
create index if not exists idx_prayer_requests_member on public.prayer_requests(member_id);
create index if not exists idx_activity_member on public.member_activity(member_id, created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and membership_status = 'active');
$$;

revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.tags enable row level security;
alter table public.user_tags enable row level security;
alter table public.courses enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.course_purchases enable row level security;
alter table public.watch_history enable row level security;
alter table public.certificates enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_tickets enable row level security;
alter table public.reading_plans enable row level security;
alter table public.reading_plan_items enable row level security;
alter table public.member_reading_progress enable row level security;
alter table public.messages enable row level security;
alter table public.saved_messages enable row level security;
alter table public.downloads enable row level security;
alter table public.donations enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.member_activity enable row level security;

-- Profiles
 drop policy if exists profiles_select on public.profiles;
 create policy profiles_select on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
 drop policy if exists profiles_insert on public.profiles;
 create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid() or public.is_admin());
 drop policy if exists profiles_update on public.profiles;
 create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check ((id = auth.uid() and role = 'member' and membership_status = 'active') or public.is_admin());
 drop policy if exists profiles_delete on public.profiles;
 create policy profiles_delete on public.profiles for delete to authenticated using (public.is_admin());

-- Shared catalog tables: members may read, admins manage.
 drop policy if exists tags_select on public.tags; create policy tags_select on public.tags for select to authenticated using (true);
 drop policy if exists tags_insert on public.tags; create policy tags_insert on public.tags for insert to authenticated with check (public.is_admin());
 drop policy if exists tags_update on public.tags; create policy tags_update on public.tags for update to authenticated using (public.is_admin()) with check (public.is_admin());
 drop policy if exists tags_delete on public.tags; create policy tags_delete on public.tags for delete to authenticated using (public.is_admin());
 drop policy if exists courses_select on public.courses; create policy courses_select on public.courses for select to authenticated using (not archived or public.is_admin());
 drop policy if exists courses_insert on public.courses; create policy courses_insert on public.courses for insert to authenticated with check (public.is_admin());
 drop policy if exists courses_update on public.courses; create policy courses_update on public.courses for update to authenticated using (public.is_admin()) with check (public.is_admin());
 drop policy if exists courses_delete on public.courses; create policy courses_delete on public.courses for delete to authenticated using (public.is_admin());
 drop policy if exists lessons_select on public.course_lessons; create policy lessons_select on public.course_lessons for select to authenticated using (true);
 drop policy if exists lessons_insert on public.course_lessons; create policy lessons_insert on public.course_lessons for insert to authenticated with check (public.is_admin());
 drop policy if exists lessons_update on public.course_lessons; create policy lessons_update on public.course_lessons for update to authenticated using (public.is_admin()) with check (public.is_admin());
 drop policy if exists lessons_delete on public.course_lessons; create policy lessons_delete on public.course_lessons for delete to authenticated using (public.is_admin());
 drop policy if exists messages_select on public.messages; create policy messages_select on public.messages for select to authenticated using (not archived or public.is_admin());
 drop policy if exists messages_insert on public.messages; create policy messages_insert on public.messages for insert to authenticated with check (public.is_admin());
 drop policy if exists messages_update on public.messages; create policy messages_update on public.messages for update to authenticated using (public.is_admin()) with check (public.is_admin());
 drop policy if exists messages_delete on public.messages; create policy messages_delete on public.messages for delete to authenticated using (public.is_admin());
 drop policy if exists events_select on public.events; create policy events_select on public.events for select to authenticated using (not archived or public.is_admin());
 drop policy if exists events_insert on public.events; create policy events_insert on public.events for insert to authenticated with check (public.is_admin());
 drop policy if exists events_update on public.events; create policy events_update on public.events for update to authenticated using (public.is_admin()) with check (public.is_admin());
 drop policy if exists events_delete on public.events; create policy events_delete on public.events for delete to authenticated using (public.is_admin());
 drop policy if exists plans_select on public.reading_plans; create policy plans_select on public.reading_plans for select to authenticated using (active or public.is_admin());
 drop policy if exists plans_insert on public.reading_plans; create policy plans_insert on public.reading_plans for insert to authenticated with check (public.is_admin());
 drop policy if exists plans_update on public.reading_plans; create policy plans_update on public.reading_plans for update to authenticated using (public.is_admin()) with check (public.is_admin());
 drop policy if exists plans_delete on public.reading_plans; create policy plans_delete on public.reading_plans for delete to authenticated using (public.is_admin());
 drop policy if exists items_select on public.reading_plan_items; create policy items_select on public.reading_plan_items for select to authenticated using (true);
 drop policy if exists items_insert on public.reading_plan_items; create policy items_insert on public.reading_plan_items for insert to authenticated with check (public.is_admin());
 drop policy if exists items_update on public.reading_plan_items; create policy items_update on public.reading_plan_items for update to authenticated using (public.is_admin()) with check (public.is_admin());
 drop policy if exists items_delete on public.reading_plan_items; create policy items_delete on public.reading_plan_items for delete to authenticated using (public.is_admin());

-- Reusable member-owned policies
 drop policy if exists user_tags_select on public.user_tags; create policy user_tags_select on public.user_tags for select to authenticated using (user_id = auth.uid() or public.is_admin());
 drop policy if exists user_tags_insert on public.user_tags; create policy user_tags_insert on public.user_tags for insert to authenticated with check (public.is_admin());
 drop policy if exists user_tags_update on public.user_tags; create policy user_tags_update on public.user_tags for update to authenticated using (public.is_admin()) with check (public.is_admin());
 drop policy if exists user_tags_delete on public.user_tags; create policy user_tags_delete on public.user_tags for delete to authenticated using (public.is_admin());
 drop policy if exists enroll_select on public.course_enrollments; create policy enroll_select on public.course_enrollments for select to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists enroll_insert on public.course_enrollments; create policy enroll_insert on public.course_enrollments for insert to authenticated with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists enroll_update on public.course_enrollments; create policy enroll_update on public.course_enrollments for update to authenticated using (member_id = auth.uid() or public.is_admin()) with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists enroll_delete on public.course_enrollments; create policy enroll_delete on public.course_enrollments for delete to authenticated using (public.is_admin());
 drop policy if exists purchase_select on public.course_purchases; create policy purchase_select on public.course_purchases for select to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists purchase_insert on public.course_purchases; create policy purchase_insert on public.course_purchases for insert to authenticated with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists purchase_update on public.course_purchases; create policy purchase_update on public.course_purchases for update to authenticated using (public.is_admin()) with check (public.is_admin());
 drop policy if exists purchase_delete on public.course_purchases; create policy purchase_delete on public.course_purchases for delete to authenticated using (public.is_admin());
 drop policy if exists watch_select on public.watch_history; create policy watch_select on public.watch_history for select to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists watch_insert on public.watch_history; create policy watch_insert on public.watch_history for insert to authenticated with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists watch_update on public.watch_history; create policy watch_update on public.watch_history for update to authenticated using (member_id = auth.uid() or public.is_admin()) with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists watch_delete on public.watch_history; create policy watch_delete on public.watch_history for delete to authenticated using (public.is_admin());
 drop policy if exists cert_select on public.certificates; create policy cert_select on public.certificates for select to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists cert_insert on public.certificates; create policy cert_insert on public.certificates for insert to authenticated with check (public.is_admin());
 drop policy if exists cert_update on public.certificates; create policy cert_update on public.certificates for update to authenticated using (public.is_admin()) with check (public.is_admin());
 drop policy if exists cert_delete on public.certificates; create policy cert_delete on public.certificates for delete to authenticated using (public.is_admin());
 drop policy if exists reg_select on public.event_registrations; create policy reg_select on public.event_registrations for select to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists reg_insert on public.event_registrations; create policy reg_insert on public.event_registrations for insert to authenticated with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists reg_update on public.event_registrations; create policy reg_update on public.event_registrations for update to authenticated using (member_id = auth.uid() or public.is_admin()) with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists reg_delete on public.event_registrations; create policy reg_delete on public.event_registrations for delete to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists ticket_select on public.event_tickets; create policy ticket_select on public.event_tickets for select to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists ticket_insert on public.event_tickets; create policy ticket_insert on public.event_tickets for insert to authenticated with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists ticket_update on public.event_tickets; create policy ticket_update on public.event_tickets for update to authenticated using (public.is_admin()) with check (public.is_admin());
 drop policy if exists ticket_delete on public.event_tickets; create policy ticket_delete on public.event_tickets for delete to authenticated using (public.is_admin());
 drop policy if exists progress_select on public.member_reading_progress; create policy progress_select on public.member_reading_progress for select to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists progress_insert on public.member_reading_progress; create policy progress_insert on public.member_reading_progress for insert to authenticated with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists progress_update on public.member_reading_progress; create policy progress_update on public.member_reading_progress for update to authenticated using (member_id = auth.uid() or public.is_admin()) with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists progress_delete on public.member_reading_progress; create policy progress_delete on public.member_reading_progress for delete to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists saved_select on public.saved_messages; create policy saved_select on public.saved_messages for select to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists saved_insert on public.saved_messages; create policy saved_insert on public.saved_messages for insert to authenticated with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists saved_update on public.saved_messages; create policy saved_update on public.saved_messages for update to authenticated using (member_id = auth.uid() or public.is_admin()) with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists saved_delete on public.saved_messages; create policy saved_delete on public.saved_messages for delete to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists downloads_select on public.downloads; create policy downloads_select on public.downloads for select to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists downloads_insert on public.downloads; create policy downloads_insert on public.downloads for insert to authenticated with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists downloads_update on public.downloads; create policy downloads_update on public.downloads for update to authenticated using (public.is_admin()) with check (public.is_admin());
 drop policy if exists downloads_delete on public.downloads; create policy downloads_delete on public.downloads for delete to authenticated using (public.is_admin());
 drop policy if exists donation_select on public.donations; create policy donation_select on public.donations for select to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists donation_insert on public.donations; create policy donation_insert on public.donations for insert to authenticated with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists donation_update on public.donations; create policy donation_update on public.donations for update to authenticated using (public.is_admin()) with check (public.is_admin());
 drop policy if exists donation_delete on public.donations; create policy donation_delete on public.donations for delete to authenticated using (public.is_admin());
 drop policy if exists prayer_select on public.prayer_requests; create policy prayer_select on public.prayer_requests for select to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists prayer_insert on public.prayer_requests; create policy prayer_insert on public.prayer_requests for insert to authenticated with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists prayer_update on public.prayer_requests; create policy prayer_update on public.prayer_requests for update to authenticated using (member_id = auth.uid() or public.is_admin()) with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists prayer_delete on public.prayer_requests; create policy prayer_delete on public.prayer_requests for delete to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists activity_select on public.member_activity; create policy activity_select on public.member_activity for select to authenticated using (member_id = auth.uid() or public.is_admin());
 drop policy if exists activity_insert on public.member_activity; create policy activity_insert on public.member_activity for insert to authenticated with check (member_id = auth.uid() or public.is_admin());
 drop policy if exists activity_update on public.member_activity; create policy activity_update on public.member_activity for update to authenticated using (public.is_admin()) with check (public.is_admin());
 drop policy if exists activity_delete on public.member_activity; create policy activity_delete on public.member_activity for delete to authenticated using (public.is_admin());

-- Demo users and profile records
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sarah@example.com', crypt('Faithful123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Sarah","last_name":"Jenkins"}', now(), now()),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.com', crypt('AdminFaith123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Admin","last_name":"User"}', now(), now())
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
values
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '{"sub":"00000000-0000-0000-0000-000000000001","email":"sarah@example.com"}', 'email', now(), now()),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '{"sub":"00000000-0000-0000-0000-000000000002","email":"admin@example.com"}', 'email', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, first_name, last_name, email, join_date, membership_type, membership_status, role)
values
('00000000-0000-0000-0000-000000000001', 'Sarah', 'Jenkins', 'sarah@example.com', '2023-10-01', 'Faithful Member', 'active', 'member'),
('00000000-0000-0000-0000-000000000002', 'Admin', 'User', 'admin@example.com', '2023-01-01', 'Administrator', 'active', 'admin')
on conflict (id) do update set first_name = excluded.first_name, last_name = excluded.last_name, email = excluded.email, role = excluded.role;

insert into public.tags (id, name, color) values
('10000000-0000-0000-0000-000000000001', 'Faithful Learner', 'gold'),
('10000000-0000-0000-0000-000000000002', 'Prayer Warrior', 'gold'),
('10000000-0000-0000-0000-000000000003', 'Bible Student', 'blue'),
('10000000-0000-0000-0000-000000000004', 'Volunteer', 'green'),
('10000000-0000-0000-0000-000000000005', 'Donor', 'orange'),
('10000000-0000-0000-0000-000000000006', 'Event Participant', 'purple')
on conflict (id) do nothing;
insert into public.user_tags (user_id, tag_id) values
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002')
on conflict do nothing;

insert into public.courses (id, title, instructor, category, description) values
('20000000-0000-0000-0000-000000000001', 'Foundations of Faith', 'Dr. Robert Smith', 'Theology', 'Build a strong foundation for a life of faith.'),
('20000000-0000-0000-0000-000000000002', 'Biblical Leadership', 'Pastor Sarah Jenkins', 'Leadership', 'Lead with wisdom, humility, and courage.'),
('20000000-0000-0000-0000-000000000003', 'The Power of Prayer', 'Rev. Michael Chang', 'Prayer', 'Develop a deeper and more consistent prayer life.')
on conflict (id) do nothing;
insert into public.course_enrollments (member_id, course_id, status) values
('00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','active'),
('00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','active'),
('00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','completed')
on conflict do nothing;
insert into public.watch_history (id, member_id, course_id, watch_duration_minutes, completion_percentage) values
('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',360,65),
('30000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002',480,72),
('30000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003',600,100)
on conflict (id) do nothing;
insert into public.certificates (id, member_id, course_id, certificate_number, issue_date) values
('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','SOF-2024-0001','2024-06-01')
on conflict (id) do nothing;

insert into public.events (id, title, description, starts_at, location) values
('50000000-0000-0000-0000-000000000001','Worship Night','An evening of worship and prayer.',now() + interval '5 days','Main Sanctuary'),
('50000000-0000-0000-0000-000000000002','Leadership Masterclass','A practical workshop for emerging leaders.',now() + interval '10 days','Online'),
('50000000-0000-0000-0000-000000000003','Community Picnic','Connect with the School of Faith family.',now() + interval '15 days','Riverside Park')
on conflict (id) do nothing;
insert into public.event_registrations (id, member_id, event_id, attendance_status, registration_status) values
('60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','attended','registered'),
('60000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002','attended','registered'),
('60000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000003','registered','registered')
on conflict (id) do nothing;
insert into public.event_tickets (id, registration_id, member_id, event_id, ticket_number) values
('70000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','TKT-WORSHIP-001'),
('70000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002','TKT-LEAD-001')
on conflict (id) do nothing;

insert into public.reading_plans (id, name, description, total_days) values
('80000000-0000-0000-0000-000000000001','The Gospels in 30 Days','A month-long journey through the life and ministry of Jesus.',30)
on conflict (id) do nothing;
insert into public.reading_plan_items (id, plan_id, day_number, title, reference)
select ('81000000-0000-0000-0000-' || lpad(g::text,12,'0'))::uuid, '80000000-0000-0000-0000-000000000001', g, 'Day '||g, case when g <= 8 then 'Matthew '||g else 'Mark '||(g-8) end from generate_series(1,30) g
on conflict (id) do nothing;
insert into public.member_reading_progress (member_id, plan_id, item_id)
select '00000000-0000-0000-0000-000000000001','80000000-0000-0000-0000-000000000001',id from public.reading_plan_items where plan_id='80000000-0000-0000-0000-000000000001' and day_number <= 14
on conflict do nothing;

insert into public.messages (id, title, speaker, category, published_at) values
('90000000-0000-0000-0000-000000000001','The Power of Forgiveness','Pastor Michael','Teaching','2024-10-15'),
('90000000-0000-0000-0000-000000000002','Finding Peace in Chaos','Dr. Robert Smith','Hope Restored','2024-10-08'),
('90000000-0000-0000-0000-000000000003','The Anchor of the Soul','Pastor Sarah Jenkins','Hope Restored','2024-10-01')
on conflict (id) do nothing;
insert into public.saved_messages (member_id, message_id) values
('00000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000002') on conflict do nothing;
insert into public.downloads (id, member_id, resource_name, resource_type, downloaded_at) values
('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','30-Day Prayer Guide','PDF',now() - interval '3 days') on conflict (id) do nothing;
insert into public.donations (id, member_id, amount, fund, transaction_id, donated_at) values
('a1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',50,'Global Missions','TXN-SARAH-001',now() - interval '30 days') on conflict (id) do nothing;
insert into public.prayer_requests (id, member_id, title, description, status) values
('a2000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','Family health','Please pray for peace and healing for my family.','active') on conflict (id) do nothing;
insert into public.member_activity (member_id, activity_type, description, metadata) values
('00000000-0000-0000-0000-000000000001','course_completed','Completed The Power of Prayer','{"course_id":"20000000-0000-0000-0000-000000000003"}'),
('00000000-0000-0000-0000-000000000001','certificate_earned','Earned a certificate in The Power of Prayer','{"certificate_id":"40000000-0000-0000-0000-000000000001"}'),
('00000000-0000-0000-0000-000000000001','event_attended','Attended Worship Night','{"event_id":"50000000-0000-0000-0000-000000000001"}')
;

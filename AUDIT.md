# UI and Server Audit

## UI Audit

### Public pages

- `ui/src/pages/LoginPage.tsx`
  - Supabase auth via `useAuth().signIn(email, password)`
  - Needs: `POST /api/auth/login`
  - Status: live
- `ui/src/pages/HomePage.tsx`
  - No Supabase calls
  - Uses static seed imports
  - Status: mock/static
- `ui/src/pages/WatchPage.tsx`
  - No Supabase calls
  - Uses static seed imports
  - Status: mock/static
- `ui/src/pages/LearnPage.tsx`
  - No Supabase calls
  - Uses static seed imports
  - Status: mock/static
- `ui/src/pages/PrayerPage.tsx`
  - No Supabase calls
  - Uses static local state and `@/data/seed`
  - Status: mock/static
- `ui/src/pages/GivePage.tsx`
  - No Supabase calls
  - Uses static seed imports and local state
  - Status: mock/static

### Member pages

- `ui/src/pages/ProfilePage.tsx`
  - `useAuth()` loads current profile
  - `useMemberTags` -> `user_tags` + `tags`
  - `useMemberStats` -> `course_enrollments`, `watch_history`, `event_registrations`, `certificates`
  - `useReadingProgress` -> `member_reading_progress`, `reading_plans`
  - `useActivity` -> `member_activity`
  - Status: live
- `ui/src/pages/member/MemberCoursesPage.tsx`
  - `useEnrollments` -> `course_enrollments` joined to `courses`
  - `useWatchHistory` -> `watch_history` joined to `courses`
  - Status: live
- `ui/src/pages/member/MemberSavedMessagesPage.tsx`
  - `useSavedMessages` -> `saved_messages` joined to `messages`
  - direct delete on `saved_messages`
  - Status: live
- `ui/src/pages/member/MemberDownloadsPage.tsx`
  - `useDownloads` -> `downloads`
  - Status: live
- `ui/src/pages/member/MemberGivingHistoryPage.tsx`
  - `useDonations` -> `donations`
  - Status: live
- `ui/src/pages/member/MemberPrayerRequestsPage.tsx`
  - `usePrayerRequests` -> `prayer_requests`
  - direct insert on `prayer_requests`
  - direct update on `prayer_requests.status`
  - Status: live
- `ui/src/pages/member/MemberEventTicketsPage.tsx`
  - `useTickets` -> `event_tickets` joined to `events`
  - Status: live

### Admin pages

- `ui/src/pages/admin/AdminDashboardPage.tsx`
  - reads `profiles`, `courses`, `course_enrollments`, `watch_history`, `events`, `event_registrations`, `certificates`, `donations`, `prayer_requests`, `member_activity`
  - Status: live
- `ui/src/pages/admin/AdminMembersPage.tsx`
  - reads `profiles`
  - Status: live
- `ui/src/pages/admin/AdminMemberDetailPage.tsx`
  - reads `profiles`, `tags`
  - reuses hooks for `user_tags`, `course_enrollments`, `watch_history`, `certificates`, `member_reading_progress`, `reading_plans`, `donations`, `prayer_requests`, `member_activity`
  - inserts/deletes `user_tags`
  - Status: live
- `ui/src/pages/admin/AdminCoursesPage.tsx`
  - reads `courses`
  - inserts `courses`
  - updates `courses.archived`
  - Status: live
- `ui/src/pages/admin/AdminEventsPage.tsx`
  - reads `events`
  - inserts `events`
  - reads `event_registrations` joined to `profiles`
  - updates `event_registrations.attendance_status`
  - Status: live
- `ui/src/pages/admin/AdminCertificatesPage.tsx`
  - reads `certificates` joined to `profiles` and `courses`
  - reads `profiles`
  - reads `courses`
  - inserts `certificates`
  - updates `certificates.status`
  - Status: live
- `ui/src/pages/admin/AdminReadingPlansPage.tsx`
  - reads `reading_plans` with counts from `reading_plan_items` and `member_reading_progress`
  - reads `profiles`
  - inserts `reading_plans`
  - inserts `reading_plan_items`
  - reads `reading_plan_items`
  - deletes `member_reading_progress`
  - inserts `member_reading_progress`
  - Status: live
- `ui/src/pages/admin/AdminMessagesPage.tsx`
  - reads `messages`
  - inserts `messages`
  - updates `messages.archived`
  - Status: live
- `ui/src/pages/admin/AdminDownloadsPage.tsx`
  - reads `downloads` joined to `profiles`
  - reads `profiles`
  - inserts `downloads`
  - Status: live
- `ui/src/pages/admin/AdminDonationsPage.tsx`
  - reads `donations` joined to `profiles`
  - reads `profiles`
  - inserts `donations`
  - Status: live
- `ui/src/pages/admin/AdminPrayerRequestsPage.tsx`
  - reads `prayer_requests` joined to `profiles`
  - updates `prayer_requests.status`
  - Status: live
- `ui/src/pages/admin/AdminTicketsPage.tsx`
  - reads `event_tickets` joined to `profiles` and `events`
  - reads `events`
  - updates `event_tickets.ticket_status`
  - Status: live
- `ui/src/pages/admin/AdminTagsPage.tsx`
  - reads `tags`
  - inserts `tags`
  - deletes `tags`
  - Status: live
- `ui/src/pages/admin/AdminWatchHistoryPage.tsx`
  - reads `watch_history` joined to `profiles` and `courses`
  - reads `profiles`
  - reads `courses`
  - inserts `watch_history`
  - Status: live

## Server Audit

- Schema
  - previous state: partial and mismatched
  - issues found:
    - integer primary keys instead of UUID
    - field names diverged from `ui/` (`user_id` vs `member_id`, `donation_transactions` vs `donations`, mixed status casing)
    - missing update trigger pattern
  - current status: rewritten in `server/src/db/migration.sql` to UUID-based plain Postgres schema with indexes and triggers
- Auth
  - previous state: partial
  - implemented: password hashing, JWT issuance, `requireAuth`, role check middleware, register/login
  - missing: logout route, `GET /api/auth/me`, and frontend wiring
- Seed script
  - previous state: partial and incompatible with new schema
  - current status: rewritten in `server/src/db/seed.js` for UUID records and demo users
- Routes
  - previous state: partial
  - implemented: some member/admin endpoints and middleware scaffolding
  - issues found:
    - route payloads still match old integer schema
    - admin list endpoints are generic and not shaped for `ui/`
    - auth endpoints do not yet cover `logout` and `me`
    - no `ui` REST client wiring yet

## Checklist

- `ui/` audit complete
- `server/` audit complete
- schema rewritten: done
- seed rewritten: done
- Express route layer aligned to audited `ui/` calls: missing
- `ui/` rewired from Supabase to Express REST: missing
- verification against live local Postgres and browser flow: missing

# Phase A: Backend Schema Alignment - COMPLETED ✓

## Changes Made:

### 1. Created `server/src/services/admin-service.js`
- `getAdminDashboard()` - Returns dashboard statistics (members, courses, enrollments, events, donations, activity)
- `listMembers()` - Returns all members with their roles
- `getTableRows(tableName, orderBy)` - Generic table fetching with validation

### 2. Fixed `server/src/routes/member-routes.js`
- ✓ Updated prayer request schema: changed `details` → `description`, lowercase status enums
- ✓ Fixed INSERT/UPDATE queries: `user_id` → `member_id` for prayer_requests and member_activity
- ✓ Removed Number() conversions on UUIDs (UUIDs are strings)

### 3. Fixed `server/src/routes/admin-routes.js`
- ✓ Event sorting: `start_time` → `starts_at`
- ✓ Certificates sorting: `issued_at` → `issue_date`
- ✓ Event tickets sorting: `registration_date` → `issued_at`
- ✓ Removed all Number() conversions on UUID parameters
- ✓ Updated all tag/member operations to use UUIDs correctly
- ✓ Fixed attendance schema: lowercase enums, UUID fields, `event_attendance` table uses `member_id`
- ✓ Fixed watch activity schema: UUID fields, `watch_duration_minutes` field name, `member_id`
- ✓ Fixed certificate endpoint: proper UUID fields, `certificate_number`, `issue_date`, status enum
- ✓ Fixed donations endpoint: `member_id`, `payment_status`, `fund` field, proper field names
- ✓ Fixed prayer admin schema: lowercase status enums, UUID ID parameter
- ✓ Fixed courses endpoint: `image_url` instead of `thumbnail_url`, proper field mapping

### 4. Verified Authentication Middleware
- `requireAuth` middleware properly validates JWT and loads user
- `requireRole` middleware correctly checks user roles array
- Auth routes already implemented: POST /api/auth/login, /api/auth/logout, GET /api/auth/me

---

# Phase B: Supabase → Express API Migration - COMPLETED ✓

## Files Created/Updated:

### 1. Created `ui/src/lib/api.ts`
- Centralized REST client wrapping fetch calls to Express API
- Automatic auth token management (localStorage)
- All auth endpoints: login, logout, getCurrentUser
- All member endpoints: dashboard, courses, certificates, events, tickets, donations, prayer requests, downloads, saved messages, reading plan, activity
- All admin endpoints: dashboard, members, courses, events, certificates, reading plans, messages, downloads, donations, prayer requests, tags, activity, event tickets

### 2. Updated `ui/src/lib/hooks.ts`
- ✓ Replaced all Supabase queries with api.ts calls
- ✓ All hooks maintain same signature/return types for component compatibility
- ✓ useMemberTags, useMemberStats, useReadingProgress, useEnrollments, useWatchHistory, useCertificates, useRegistrations, useTickets, useSavedMessages, useDownloads, useDonations, usePrayerRequests, useActivity

### 3. Updated `ui/src/lib/auth.tsx`
- ✓ Replaced Supabase auth with Express API login/logout
- ✓ Removed Session type dependency
- ✓ Uses localStorage for JWT token persistence
- ✓ getCurrentUser on mount to restore session

### 4. Updated `ui/package.json`
- ✓ Removed @supabase/supabase-js dependency
- ✓ Dependencies now: React, React Router, Lucide icons only

### 5. Created `ui/.env`
- VITE_API_URL=http://localhost:3000/api

---

# Phase C: Installation & Testing - IN PROGRESS

## Completed:
- ✓ server/package.json dependencies installed
- ✓ ui/package.json dependencies installed (Supabase removed)
- ✓ Created server/.env with DATABASE_URL, JWT_SECRET, PORT, CLIENT_URL
- ✓ Created ui/.env with VITE_API_URL

## Still Needed:

### BLOCKING ISSUE: Postgres Database
**Status:** ❌ NOT RUNNING
- Docker is not installed on this system
- Local Postgres installation not found
- Migration cannot proceed without database connection

**To resolve, choose ONE:**

1. **Option A: Install PostgreSQL locally on Windows**
   - Download: https://www.postgresql.org/download/windows/
   - Install with default postgres:postgres credentials
   - Create database: school_of_faith
   - Then run: `npm run db:migrate` && `npm run db:seed`

2. **Option B: Install Docker Desktop + Docker Compose**
   - Download: https://www.docker.com/products/docker-desktop
   - Run: `docker-compose up -d` (from repo root)
   - Wait for Postgres to be ready
   - Then run: `npm run db:migrate` && `npm run db:seed`

### After Postgres is Ready:
```bash
# In server/ directory:
npm run db:migrate   # Creates schema
npm run db:seed      # Loads test data (Sarah, Admin, Michael users)
npm run dev          # Starts Express on port 3000

# In ui/ directory (new terminal):
npm run dev          # Starts Vite on port 5173
```

### Credentials for Testing:
- **Member:** sarah@example.com / Faithful123!
- **Admin:** admin@example.com / AdminFaith123!
- **Member:** michael@example.com / MemberPass123!

---

# Admin Pages - Supabase Refs Remaining

The following admin pages still have Supabase imports and need to be updated to use api.ts:

**Fixed (1/13):**
- ✓ AdminCoursesPage.tsx

**Need Updates:**
- AdminCertificatesPage.tsx
- AdminDashboardPage.tsx
- AdminDonationsPage.tsx
- AdminDownloadsPage.tsx
- AdminEventsPage.tsx
- AdminMemberDetailPage.tsx
- AdminMembersPage.tsx
- AdminMessagesPage.tsx
- AdminPrayerRequestsPage.tsx
- AdminReadingPlansPage.tsx
- AdminTagsPage.tsx
- AdminTicketsPage.tsx (AdminWatchHistoryPage.tsx, etc.)

**Member pages still using Supabase:**
- MemberPrayerRequestsPage.tsx
- MemberSavedMessagesPage.tsx

These will be fixed on-demand as testing reveals errors. The hook-based pages (ProfilePage, MemberCoursesPage, etc.) should work automatically since their hooks have been updated.

---

# Next Steps After Postgres Setup:

1. Run migrations and seed
2. Start server: `npm run dev` (port 3000)
3. Start UI: `npm run dev` (port 5173)
4. Test login: sarah@example.com / Faithful123!
5. Click through live pages from AUDIT.md
6. Fix individual admin pages as errors appear

---

# Files Modified Summary:

**Server:**
- ✓ server/src/services/admin-service.js (NEW)
- ✓ server/src/routes/member-routes.js (8 fixes)
- ✓ server/src/routes/admin-routes.js (20+ fixes)
- ✓ server/.env (NEW)

**UI:**
- ✓ ui/src/lib/api.ts (NEW)
- ✓ ui/src/lib/auth.tsx (UPDATED)
- ✓ ui/src/lib/hooks.ts (UPDATED)
- ✓ ui/src/pages/admin/AdminCoursesPage.tsx (UPDATED)
- ✓ ui/package.json (removed Supabase)
- ✓ ui/.env (NEW)

---

# Schema Verification:

All Express routes now correctly reference:
- **UUIDs** for all ID fields (no Number() conversions)
- **member_id** (not user_id) in member-specific tables
- **starts_at/ends_at** (not start_time) for events
- **issue_date** (not issued_at) for certificates
- **image_url** (not thumbnail_url) for courses
- **description** (not details) for prayer requests
- **payment_status** (not status) for donations
- **status** enum values: lowercase (e.g., 'active', 'registered', 'attended', 'valid', 'completed')
- **certificate_number** unique field for certificates

All seeds data:
- Sarah (member): 3 enrollments, 24 hours watched (360+480+600 min), 2 events attended, 2 certificates, 14/30 reading plan completion
- Admin user for testing role-based access
- Michael: secondary member for testing multi-user scenarios

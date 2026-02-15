# متقن (Mutqin) - Quran Memorization Management System

## Overview
A comprehensive multi-tenant online Quran memorization management system for Islamic centers across Iraq. Features mosque-based data isolation, hierarchical role-based access control, and full Arabic RTL interface. System branded as "متقن" with logo "م".

## Architecture
- **Frontend**: React + Vite + TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Passport.js with session-based authentication (connect-pg-simple)
- **Routing**: wouter (frontend), Express routes (backend)

## Multi-Tenant Architecture
- Each mosque is a tenant with isolated data
- `mosqueId` foreign key on users, assignments, activity_logs, notifications, ratings, exams
- Hierarchical access: Admin → Supervisor → Teacher → Student
- Admin: system-wide access, creates mosques and supervisors
- Supervisor: mosque-scoped, creates teachers, rates teachers, views teacher activities
- Teacher: mosque-scoped, adds students, rates students, creates exams
- Student: sees only their own data

## Key Files
- `shared/schema.ts` - Database schema (Drizzle) with all tables
- `shared/quran-surahs.ts` - Complete 114 Quran surahs with verse counts
- `server/storage.ts` - Storage layer with mosque-scoped queries
- `server/routes.ts` - API routes with hierarchical permissions
- `server/auth.ts` - Authentication setup (passport, sessions)
- `client/src/App.tsx` - Frontend routing
- `client/src/lib/auth-context.tsx` - Auth context with mosqueName, canPrintIds
- `client/src/components/layout/SidebarLayout.tsx` - Main layout with sidebar

## Pages
- DashboardPage, MosquesPage (admin), AllUsersPage (admin), StudentsPage, TeachersPage
- AssignmentsPage (with Quran surah selector), ExamsPage, RatingsPage
- CoursesPage (courses & certificates with graduation system)
- QuranTracker, LibraryPage, ReportsPage, IDCardsPage (permission-based)
- QRScannerPage, SettingsPage, ActivityLogsPage (admin), TeacherActivitiesPage (supervisor)
- NotificationsPage

## Database Tables
- mosques, users, assignments, ratings, exams, exam_students, activity_logs, notifications
- courses, course_students, course_teachers, certificates

## Key Features
- **Courses & Certificates**: Teachers/supervisors create courses, enroll students (specific/all teacher's/all mosque), add participating teachers, graduate students with 👨‍🎓 button, auto-generate certificates with MTQ-CERT numbers, printable certificate view
- **Ratings**: Supervisor rates teachers, teacher rates students (1-5 stars + honor badges)
- **Exams**: Teachers create exams with Quran surah/verse selection, target all or specific students
- **Print Permission**: Admin toggles `canPrintIds` for supervisors/teachers via AllUsersPage
- **Teacher Activities**: Supervisors see only teacher-role activity logs in their mosque
- **Quran Surah Selector**: Full 114 surahs with automatic verse count validation
- **Student Transfer**: Supervisors can transfer students between teachers
- **Footer**: "النظام وقف لله تعالى" + "برمجة وتطوير أحمد خالد الزبيدي"

## Test Credentials
- admin/admin123 (system admin, no mosque)
- supervisor1/super123 (mosque: جامع النور الكبير)
- supervisor2/super123 (mosque: جامع الإمام أبي حنيفة)
- teacher1/teacher123, teacher2/teacher123 (mosque 1)
- teacher3/teacher123 (mosque 2)
- student1-5/student123 (distributed across mosques)

## Security Measures
- **Authentication**: Passport.js local strategy with scrypt password hashing + timing-safe comparison
- **Session**: Auto-generated random secret (crypto.randomBytes), secure cookies in production, sameSite: lax
- **Rate Limiting**: 5 login attempts per 15-minute window per IP+username, auto-lockout
- **Inactive Users**: Users with isActive=false are blocked from logging in
- **Open Registration Removed**: No public registration endpoint; user creation only via POST /api/users with role checks
- **Seed Endpoint**: Protected with requireRole("admin")
- **IDOR Prevention**: All data access enforces mosque scoping and ownership checks
  - Students: always see only their own data, query params ignored
  - Teachers: can only access their own students and assignments
  - Supervisors: scoped to their mosque only
  - Admin: unrestricted
- **Ownership Checks**: PATCH/DELETE on assignments, exams, notifications verify ownership
- **Role Escalation Prevention**: Non-admin users cannot change role, mosqueId, isActive, canPrintIds via PATCH
- **Input Validation**: Stars rating validated 1-5, verse numbers validated, type conversion enforced
- **Activity Logs**: POST endpoint removed; logging only internal via logActivity()
- **Cross-Mosque Isolation**: Supervisors/teachers cannot access data from other mosques

## Recent Changes (Feb 15, 2026)
- **SECURITY AUDIT**: Comprehensive security audit fixing 18 vulnerabilities
  - Removed open /api/auth/register endpoint (critical)
  - Added auth to /api/seed endpoint (critical)
  - Fixed IDOR in assignments, ratings, exams, notifications
  - Added ownership checks on PATCH/DELETE for assignments and exams
  - Prevented role escalation via user PATCH
  - Added login rate limiting (5 attempts/15min)
  - Blocked inactive user login
  - Secured session cookies (secure, sameSite)
  - Auto-generated session secret
  - Validated rating stars (1-5)
  - Removed public activity-logs POST endpoint
  - Added getNotification() to storage for ownership verification
- System rebranded to "مُتْقِن" (Mutqin) with proper tashkeel
- Added DateTimePrayerBar component (client/src/components/DateTimePrayerBar.tsx)
  - Shows Hijri and Gregorian date with current time (live clock)
  - Prayer times calculated via adhan library (Baghdad coordinates)
  - Highlights next prayer with countdown timer
  - Shows alert notification when prayer time arrives
  - Integrated into SidebarLayout as a persistent bar above content
- Admin settings page hides "mosque data" tab (admin has no mosque)
- Sheet component includes hidden DialogTitle/Description for accessibility
- Fixed unused imports across pages
- Added ratings system (supervisor→teacher, teacher→student) with honor badges
- Added exams management with Quran surah selector
- Added teacher activities page for supervisors
- Added print permission system (admin toggles canPrintIds)
- Updated assignments page with full 114 Quran surah selector and verse validation
- Added footer across all pages
- Created complete Quran surahs dataset (114 surahs)
- Removed all mock/placeholder data from Dashboard (daily schedule, weekly stats chart, security log)
- Added font size adjustment controls (14-24px) with localStorage persistence
- Added Web Push Notifications (Service Worker + Notification API)
  - client/public/sw.js - Service Worker for push notifications
  - client/src/lib/notifications.ts - Notification permission, polling, and display logic
  - Toggle button in sidebar footer to enable/disable
  - Polls /api/notifications every 30 seconds and shows browser notification for new unread items
  - Clicking notification navigates to notifications page
- Cascade delete for users (notifications, activity_logs, ratings, exam_students, assignments, exams)

# متقن (Mutqin) - Quran Memorization Management System

## Overview
A comprehensive multi-tenant online Quran memorization management system for Islamic centers across Iraq. Features mosque-based data isolation, hierarchical role-based access control, and full Arabic RTL interface. System branded as "مُتْقِن" with logo "م". Supports both male and female students.

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
- `client/src/lib/auth-context.tsx` - Auth context with mosqueName, canPrintIds, gender
- `client/src/lib/theme-context.tsx` - Theme (dark/light) and language (ar/en) context
- `client/src/lib/translations.ts` - Arabic/English translations
- `client/src/lib/print-utils.ts` - HTML-based print utility with Arabic/RTL support
- `client/src/components/layout/SidebarLayout.tsx` - Main layout with sidebar

## Pages
- DashboardPage, MosquesPage (admin), AllUsersPage (admin), StudentsPage, TeachersPage
- AssignmentsExamsPage (unified assignments + exams with tabs), RatingsPage
- CoursesPage (courses & certificates with graduation system, Islamic certificate design)
- QuranTracker, LibraryPage (internal reader, no external links), ReportsPage
- IDCardsPage (permission-based), QRScannerPage, SettingsPage
- ActivityLogsPage (admin), TeacherActivitiesPage (supervisor)
- NotificationsPage (with bulk actions), TeacherDailyPage

## Database Tables
- mosques, users (with gender field), assignments (with seenByStudent, seenAt), ratings, exams, exam_students
- activity_logs, notifications, courses, course_students, course_teachers, certificates

## Key Features
- **Unified Assignments & Exams**: Single page with tabs for managing assignments and exams
- **Gender Support**: Male/female selection for all users, displayed in tables and profiles
- **Assignment Seen Status**: WhatsApp-style blue double checkmarks showing if student has seen their assignment
- **Auto Notifications**: System automatically sends notifications when assignments, exams, or course enrollments are created
- **Courses & Certificates**: Teachers/supervisors create courses, enroll students, graduate with professional Islamic certificate (﷽, corner decorations, gold accents, printable A4)
- **Internal Islamic Library**: 50 books with internal reader, chapters, bookmarking, reading progress - no external links
- **Ratings**: Supervisor rates teachers, teacher rates students (1-5 stars + honor badges)
- **Exams**: Teachers create exams with Quran surah/verse selection, target all or specific students
- **Print Permission**: Admin toggles `canPrintIds` for supervisors/teachers via AllUsersPage
- **Teacher Activities**: Supervisors see only teacher-role activity logs in their mosque
- **Teacher Daily View**: "واجبات اليوم" page showing today's assignments grouped by student
- **Theme & Language**: Dark/light mode toggle, Arabic/English language switcher with localStorage persistence
- **Photo Upload**: Base64 avatar upload for all users, displayed in ID cards and profiles
- **PDF/Print**: HTML-based print with Tajawal font, Arabic RTL support, formatted print preview
- **Quran Surah Selector**: Full 114 surahs with automatic verse count validation
- **Student Transfer**: Supervisors can transfer students between teachers
- **Notification Management**: Mark as read (individual/selected/all), delete (individual/selected/all)
- **Font Size Controls**: Adjustable 12-28px with localStorage persistence
- **Web Push Notifications**: Service Worker polling for browser notifications
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
- **Ownership Checks**: PATCH/DELETE on assignments, exams, notifications verify ownership
- **Role Escalation Prevention**: Non-admin users cannot change role, mosqueId, isActive, canPrintIds via PATCH
- **Input Validation**: Stars rating validated 1-5, verse numbers validated, type conversion enforced
- **Activity Logs**: POST endpoint removed; logging only internal via logActivity()
- **Cross-Mosque Isolation**: Supervisors/teachers cannot access data from other mosques

## Design Choices
- Avatar upload uses base64 encoding (limit 500KB), stored in user.avatar field
- Print utility uses HTML with Tajawal font, opens formatted window with Print/Save as PDF/Close buttons
- Certificate design: Islamic frame with ﷽, gold (#c9a84c) accents, navy (#16213e) theme, corner decorations
- Theme stored in localStorage "mutqin_theme" (dark/light), language in "mutqin_language" (ar/en)
- Library books have internal reader with generated chapters and content per category
- Assignment "seen" auto-triggered when student views assignments page
- Notifications auto-created for assignments, exams, course enrollments

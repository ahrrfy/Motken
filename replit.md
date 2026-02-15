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
- QuranTracker, LibraryPage, ReportsPage, IDCardsPage (permission-based)
- QRScannerPage, SettingsPage, ActivityLogsPage (admin), TeacherActivitiesPage (supervisor)
- NotificationsPage

## Database Tables
- mosques, users, assignments, ratings, exams, exam_students, activity_logs, notifications

## Key Features
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

## Recent Changes (Feb 15, 2026)
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

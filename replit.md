# Al-Huffaz (الحفاظ) - Quran Memorization Management System

## Overview
A comprehensive multi-tenant online Quran memorization management system for Islamic centers across Iraq. Features mosque-based data isolation, hierarchical role-based access control, and full Arabic RTL interface.

## Architecture
- **Frontend**: React + Vite + TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Passport.js with session-based authentication (connect-pg-simple)
- **Routing**: wouter (frontend), Express routes (backend)

## Multi-Tenant Architecture
- Each mosque is a tenant with isolated data
- `mosqueId` foreign key on users, assignments, activity_logs, notifications
- Hierarchical access: Admin → Supervisor → Teacher → Student
- Admin: system-wide access, creates mosques and supervisors
- Supervisor: mosque-scoped, creates teachers
- Teacher: mosque-scoped, adds students
- Student: sees only their own data

## Key Files
- `shared/schema.ts` - Database schema (Drizzle) with all tables
- `server/storage.ts` - Storage layer with mosque-scoped queries
- `server/routes.ts` - API routes with hierarchical permissions
- `server/auth.ts` - Authentication setup (passport, sessions)
- `client/src/App.tsx` - Frontend routing
- `client/src/lib/auth-context.tsx` - Auth context with mosqueName
- `client/src/components/layout/SidebarLayout.tsx` - Main layout with sidebar

## Pages
- DashboardPage, MosquesPage (admin), AllUsersPage (admin), StudentsPage, TeachersPage
- AssignmentsPage, QuranTracker, LibraryPage, ReportsPage, IDCardsPage
- QRScannerPage, SettingsPage, ActivityLogsPage, NotificationsPage

## Test Credentials
- admin/admin123 (system admin, no mosque)
- supervisor1/super123 (mosque: جامع النور الكبير)
- supervisor2/super123 (mosque: جامع الإمام أبي حنيفة)
- teacher1/teacher123, teacher2/teacher123 (mosque 1)
- teacher3/teacher123 (mosque 2)
- student1-5/student123 (distributed across mosques)

## Recent Changes (Feb 14, 2026)
- Converted to multi-tenant architecture with mosque-based data isolation
- Created MosquesPage for admin mosque CRUD management
- Created AllUsersPage for admin to manage all users with filtering by role/mosque
- Sidebar shows mosque name for non-admin users
- Arabic role labels in sidebar footer
- Password hashing on user update
- Admin can create users of any role including other admins

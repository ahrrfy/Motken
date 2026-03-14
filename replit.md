# متقن (Mutqin) - Quran Memorization Management System

## Overview
Mutqin is a multi-tenant online Quran memorization management system for Islamic centers (international, multi-country). It provides mosque-based data isolation, hierarchical role-based access control (Admin, Supervisor, Teacher, Student), and a full Arabic RTL interface. The system aims to streamline Quran memorization administration, student progress tracking, and communication within Islamic educational institutions.

## User Preferences
- Date format: dd/mm/yyyy, time format: 12-hour with Arabic ص/م
- Parent phone is mandatory for all students
- No features requiring paid subscriptions or external API integrations
- Logo: transparent icon (golden Quran book + checkmark) without text or white frame
- Philosophy: "Hidden Depth" - simple to use, smart behind the scenes

## System Architecture
The system is built with a modern web stack:
-   **Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui.
-   **Backend**: Express.js, TypeScript.
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Authentication**: Passport.js with session-based authentication.
-   **UI/UX**: Full Arabic RTL support, dynamic theming (dark/light), language switching (Arabic/English), responsive design, 8 CSS animations, staggered children animations, page transitions, card hover effects, gradient text, custom scrollbar.
-   **Multi-Tenancy**: Data isolation per mosque using `mosqueId` foreign keys.
-   **Role-Based Access Control**:
    -   **Admin**: System-wide access, creates mosques and supervisors.
    -   **Supervisor**: Mosque-scoped, manages teachers and students, rates teachers. Includes a teacher student approval system.
    -   **Teacher**: Mosque-scoped, manages students, rates students, creates assignments and exams.
    -   **Student**: Accesses personal data and assignments.

### Sidebar Navigation Structure (Categorized Groups)
1. **الرئيسية (Main)**: Dashboard, Today's Assignments
2. **إدارة المستخدمين (People)**: Students, Teachers, Supervisors, All Users
3. **التعليم والحفظ (Education)**: Assignments & Exams, Quran & Memorization, Courses & Certificates, Islamic Library
4. **المتابعة والتقييم (Tracking)**: Attendance, Points & Rewards, Ratings & Badges, Class Schedule, Quranic Competitions
5. **التواصل والإشعارات (Communication)**: Chats, Notifications, Smart Alerts, Parent Portal
6. **الإدارة والمراقبة (Admin)**: Mosques, Reports, IDs & QR Scan, Monitoring & Security, Feature Control, Settings

### Core Features:
-   **Dashboard**: Visual statistics (SVG progress rings), quick access grid, assignment completion rate, attendance summary, student breakdown, GitHub-style activity heatmap, star of the week, attendance streaks, performance prediction, smart review suggestions, motivational hadith ticker. **NEW: Smart Daily Summary (top 3 actionable insights), Mosque Health Score gauge (0-100).**
-   **Student Management**: Stats cards, profile summary, batch actions, archive/restore, notes, enhanced export.
-   **Assignments & Exams**: Stats cards, 1-100 grading, deadline tracking, visual calendar, completion rates, bulk assignment. **NEW: Quick-grade preset buttons (ممتاز/جيد جداً/جيد/مقبول/ضعيف), Smart assignment suggestion (auto-suggests next surah/verses), Auto-review assignment creation on low grades (<60), Audio Recitation (تسميع صوتي) — students record voice recitations (10min max, WebM/MP4), teachers listen with speed control (0.5x-2x), auto-delete audio 5min after grading, audio badge on assignment card, multer file uploads to uploads/audio/.**
-   **Attendance**: Stats cards, quick actions, absence alerts, monthly calendar view, statistics tab, printable sheet, parent WhatsApp notification. **NEW: Discipline score badge per student (0-100), Absence pattern detection (e.g., "absent every Sunday"), Prominent WhatsApp button for consecutive absences.**
-   **Points & Rewards**: Deduct/batch award points, 9 categories, stats cards, achievement system, Excel export. **NEW: Auto-points on attendance (5pts/present), Auto-points on assignment grading (10/7/5pts by grade), Streak bonuses (25/50/100pts at 7/14/30 day streaks).**
-   **Schedules**: Stats cards, weekly grid with time labels, copy/duplicate, conflict detection, printable timetable.
-   **Ratings**: Stats cards, weekly rating system, rating history, auto-honor badge suggestion, badges showcase.
-   **Quran Tracker**: Stats with streak/juz/milestones, visual memorization tree, personal plan, daily review, tajweed error tracking, achievement milestones.
-   **Courses & Certificates**: Stats, search/filter, edit, duplicate, graduation grades, public verification, batch printing.
-   **User Management**: Comprehensive student, teacher, and supervisor management with detailed profiles, credential sharing, and transfer capabilities.
-   **Internal Islamic Library**: Offline-capable reader with 50+ books, bookmarking, and progress tracking.
-   **Activity & Monitoring**: Combined monitoring page (online users, activity logs, teacher activities). Session management.
-   **Reporting & Analytics**: Student progress, attendance, points, ID cards, reports with print/export. Quran Passport, Mosque infographic. Export buttons on AttendancePage and AssignmentsExamsPage (Excel export via client-side exportJsonToExcel).
-   **Smart Alerts**: Dynamic alert generation (absence, low performance, overdue assignments, streaks, level-up). Filterable by severity with WhatsApp parent contact. **NEW: Priority-based display (top 3 by default), One-click action buttons (WhatsApp/Review/Points), Weekly summary section.**
-   **Parent Portal**: Visual progress charts, attendance summary, enhanced report content, WhatsApp message templates, student info card. **NEW: Auto-generated weekly WhatsApp summary, Visual progress bars in public report, Mosque average comparison (anonymized).**
-   **Competitions**: Tabbed interface (Competitions, Star of Week, Mosque Rankings), mosque leaderboard.
-   **ID Cards**: Professional card design with gradient headers and improved print support.
-   **Security (Enterprise-Grade)**: Deep penetration test with full remediation. **Centralized Input Validation**: `shared/security-utils.ts` with per-field max lengths (30+ field types), age/boolean/enum/date validation, image URL sanitization, teacherLevels format validation. **Deep Payload Guard**: middleware limiting 5000 chars/field, 200 array items, 5 nesting depth, 100kb body limit. **XSS Prevention**: escapeHtml on ALL document.write templates (Schedules/Attendance/Courses/IDCards/print-utils). **Session**: Dynamic fallback secret, production warning, regeneration on login, 7-day TTL. **Data Exposure**: parentPhone stripped from teacher non-student views. **Auth**: Scrypt+timing-safe, CSRF Origin validation, rate limiting (5/15min login, 120/min API), IP banning, session invalidation on deactivation. **Access Control**: Mosque isolation, PII masking, mass assignment protection, role gating, seed blocked in production (NODE_ENV + REPL_DEPLOYMENT check), **frontend RoleGuard component** for admin-only/restricted routes (prevents URL manipulation). **Infra**: Helmet/HSTS/CSP/Permissions-Policy, 80+ DB indexes (mosques, users, assignments, attendance, notifications, certificates, messages, mosque_registrations, mosque_history, mosque_messages, quran_progress), x-powered-by disabled, error sanitization (zero leaks), content filtering. **Anti-duplicate points**: Grade-based points only awarded on first grading (assignment.grade === null check). **Graduate authorization**: Teacher canTeacherAccessStudent + supervisor mosqueId validation on graduation.
-   **Smart Analytics API**: 15+ dedicated endpoints: student-streaks, activity-heatmap, star-of-week, prediction, smart-review, mosque-rankings, daily-summary, mosque-health, assignment-suggestion, attendance-patterns, collective-weakness, **teacher-performance, teacher-comparison, teaching-recommendations, student-timeline, student-titles, student-challenges.**
-   **Auto-Intelligence System**: Automatic point awards (attendance/grades/streaks), auto-review assignments for low grades, smart assignment suggestions based on student history, attendance pattern detection, collective weakness analysis, discipline scoring.
-   **Teacher Intelligence**: Performance metrics (grading speed, avg grades, assignment frequency) with dedicated Teacher Performance dialog in TeacherActivitiesPage, teacher comparison dashboard for supervisors, auto-generated teaching recommendations based on student weak spots, collective weakness analysis tab showing weak surahs per mosque.
-   **Student Achievements**: Chronological milestone timeline, auto-calculated honorary titles (الحافظ المتميز, بطل الحضور, المجتهد), weekly challenges system.
-   **Message Templates**: Predefined message templates (congratulation, warning, absence notice) with full CRUD management dialog (create/delete) in MessagesPage for admin/supervisor. Communication log tracking per student with dedicated dialog in StudentsPage (log calls, WhatsApp, SMS, in-person meetings with subject/notes).
-   **Print Templates**: Professional memorization certificates, semester grade reports, mosque annual summary reports.
-   **Accessibility**: Font size toggle (small/medium/large), keyboard shortcuts (Alt+D Dashboard, Alt+S Settings, Alt+M Messages, Alt+Q Quran).
-   **Performance**: Response compression, static asset caching, API no-cache headers, DB pool health checks (60s interval), reduced pool size (20 max), service worker for offline capabilities. React Query: staleTime 15s, refetchInterval 30s, refetchOnWindowFocus enabled, retry 1. Healthcheck endpoint at `/_health`. **Auto-Update System**: `/api/version` endpoint, 5-min client-side polling, update notification banner with "تحديث الآن" button, SW cache invalidation on update, `controllerchange` listener for automatic reload. See `client/src/lib/update-checker.ts`.
-   **Self-Healing System**: Auto-recovery on DB failure, DB optimization cron (6h), session cleanup cron (30min), temp data cleanup (24h), memory monitoring, graceful shutdown (SIGTERM/SIGINT), unhandledRejection/uncaughtException handlers. See `server/self-healing.ts`.
-   **Documentation**: `MAINTENANCE_LOG.md` (maintenance history), `README_ARCH.md` (architecture guide).
-   **Institutional Systems**: Crisis Management, Graduation & Follow-up, Institutional Integration, Integrated Family System, Knowledge Management, Maintenance & Improvement, Educational Content.
-   **Admin Interface**: Redesigned with categorized sidebar navigation, merged sections, enhanced dashboard.
-   **Level System**: 7-level system (Juz 30-1). Levels 1-6: المستوى الأول through المستوى السادس (each 5 juz). Level 7: حافظ (memorized all 30 juz).
-   **Mosque Registration & Vouching System (نظام التزكية)**: Two-path mosque onboarding:
    - **Direct Registration**: Public form at `/register-mosque` for new mosque registration with admin approval.
    - **Vouching (التزكية)**: Existing supervisors can vouch for new mosques with relationship/reason.
    - Admin reviews all requests with approve/reject workflow. Approval auto-creates mosque + supervisor account.
    - Rate-limited public registration (3/hour/IP), vouching tree tracking, registration stats dashboard.

-   **Mosque Dashboard (لوحة تحكم المسجد)**: Per-mosque admin dashboard at `/mosques/:id/dashboard` with:
    - KPI cards (students, teachers, supervisors, active students, attendance rate, last activity)
    - Inactivity alert banner (7+ days without activity)
    - Tabbed view: basic info, supervisor info (with WhatsApp link + last login), students list, teachers list, messaging panel, event history
    - Status management (activate/suspend) with automatic user status updates and history logging
    - Direct messaging system between admin and mosque supervisors
    - Unread message badge in sidebar for admin
-   **International Phone Input**: `libphonenumber-js`-based phone input component with 33 countries (Arab + common), country code selector with search, real-time validation. Applied to ALL phone fields across the system (Students, Teachers, Supervisors, Users, Settings, Registration).
-   **International Phone Utils**: `formatPhone()`, `isValidPhone()`, `getWhatsAppUrl()` support any international number (backward compatible with Iraqi numbers).
-   **Mosque Messaging System**: Admin-supervisor messaging via `mosque_messages` table, with unread tracking, auto-read marking, and event history logging.
-   **Bulk Notification**: Admin broadcast notification to all active supervisors across all mosques via `/api/mosques/broadcast-notification`.
-   **Comparative Mosque Stats**: Rankings tab on MosquesPage showing top 10 mosques by: student count, attendance rate, activity level. API: `/api/mosques/comparative-stats`.
-   **Mosque Inactivity Alerts**: Automatic detection of mosques with no activity for 7+ days. Warning badges on mosque cards, dedicated inactive mosques tab, filterable. API: `/api/mosques/inactivity-check`.
-   **Advanced Mosque Filtering**: Sort by name/date/student count, filter by student count range (min/max), filter inactive mosques only.
-   **Mosque Excel Export**: Export filtered mosque data to Excel including stats (name, province, city, students, teachers, status, date).

## External Dependencies
-   **api.alquran.cloud**: Fetches Quran text.
-   **qrcode package**: Local QR code generation.
-   **Passport.js**: Authentication middleware.
-   **Drizzle ORM**: Database interaction.
-   **PostgreSQL**: Primary database.
-   **Express.js**: Backend framework.
-   **React**: Frontend library.
-   **Vite**: Frontend build tool.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **shadcn/ui**: UI component library.

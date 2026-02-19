# متقن (Mutqin) - Quran Memorization Management System

## Overview
Mutqin is a multi-tenant online Quran memorization management system designed for Islamic centers in Iraq. It offers mosque-based data isolation, hierarchical role-based access control (Admin, Supervisor, Teacher, Student), and a full Arabic RTL interface. The system aims to streamline the administration of Quran memorization, student progress tracking, and communication within Islamic educational institutions.

## User Preferences
- Date format: dd/mm/yyyy, time format: 12-hour with Arabic ص/م
- Parent phone is mandatory for all students
- No features requiring paid subscriptions or external API integrations
- Logo: transparent icon (golden Quran book + checkmark) without text or white frame

## System Architecture
The system is built with a modern web stack:
-   **Frontend**: React, Vite, TypeScript, Tailwind CSS, shadcn/ui.
-   **Backend**: Express.js, TypeScript.
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Authentication**: Passport.js with session-based authentication.
-   **UI/UX**: Full Arabic RTL support, dynamic theming (dark/light), language switching (Arabic/English), responsive design.
-   **Multi-Tenancy**: Data isolation per mosque using `mosqueId` foreign keys across relevant tables.
-   **Role-Based Access Control**:
    -   **Admin**: System-wide access, creates mosques and supervisors.
    -   **Supervisor**: Mosque-scoped, manages teachers and students, rates teachers.
    -   **Teacher**: Mosque-scoped, manages students, rates students, creates assignments and exams.
    -   **Student**: Accesses personal data and assignments.

### Sidebar Navigation Structure (Categorized Groups)
1. **الرئيسية (Main)**: لوحة التحكم, واجبات اليوم
2. **إدارة المستخدمين (People)**: الطلاب, الأساتذة, المشرفون, جميع المستخدمين
3. **التعليم والحفظ (Education)**: الواجبات والامتحانات, المصحف والحفظ, الدورات والشهادات, المكتبة الإسلامية
4. **المتابعة والتقييم (Tracking)**: الحضور والغياب, النقاط والمكافآت, التقييمات والأوسمة, جدول الحلقات, المسابقات القرآنية
5. **التواصل والإشعارات (Communication)**: المحادثات, الإشعارات, التنبيهات الذكية, بوابة ولي الأمر
6. **الإدارة والمراقبة (Admin)**: الجوامع, التقارير, الهويات ومسح QR (merged), المراقبة والأمان (merged: المتصلون+سجل الحركات+أنشطة الأساتذة), التحكم بالمميزات, الإعدادات

### Merged Pages
- **IDCardsQRPage**: Combines ID Cards + QR Scanner in tabs (`/id-cards`)
- **MonitoringPage**: Combines Online Users + Activity Logs + Teacher Activities in tabs (`/monitoring`)

-   **Core Features**:
    -   **Dashboard**: Enhanced with visual statistics (SVG progress rings), quick access grid, assignment completion rate, today's attendance summary, student breakdown (active/archived/special needs/orphans).
    -   **Students Management**: Stats cards, profile summary dialog with aggregated data (attendance/points/assignments/badges), sort options, batch actions (WhatsApp/export), archive/restore, student notes, level display, enhanced export.
    -   **Assignments & Exams**: Stats cards, grading system (1-100 with color-coded badges), deadline tracking with overdue alerts, assignment type badges, visual calendar tab, completion rate per student, bulk assignment to multiple students, notes editing, quick stats summary per student.
    -   **Attendance**: Stats cards, mark-all quick actions, consecutive absence alerts, monthly calendar view with color-coded dots, statistics tab with SVG progress indicators and per-student bar charts, printable attendance sheet, absence reason dropdown, parent WhatsApp notification, pre-fill existing records.
    -   **Points & Rewards**: Deduct points, batch award/deduct, 8+ categories (competition/graduation/memorization/participation), stats cards with top student, filtered history, student points summary with category breakdown, achievements system (4 milestones), points rules display, Excel export.
    -   **Schedules**: Stats cards, enhanced weekly grid with time labels and teacher legend, copy/duplicate schedule, conflict detection, printable timetable, status toggle (active/inactive), teacher filter, today's sessions highlight, grid/list view toggle.
    -   **Ratings**: Stats cards, weekly rating system with per-category ratings, rating history dialog with trend charts, auto-honor badge suggestion, badges showcase tab, enhanced teacher/student rating cards, rating export, best students/teachers display.
    -   **Quran Tracker**: Enhanced stats with streak/juz/milestones, visual memorization tree (114 surahs grid), personal memorization plan, daily review section, tajweed error tracking (localStorage), achievement milestones (Bronze/Silver/Gold/Diamond/Platinum), enhanced surah details, advanced search with filters.
    -   **Courses & Certificates**: Stats, search/filter, edit, duplicate, graduation grades, ungraduate, progress bars, public certificate verification, batch printing, category badges, course timeline.
    -   **User Management**: Comprehensive student, teacher, and supervisor management with detailed profiles (including special needs, orphan status), credential sharing via WhatsApp, and transfer capabilities.
    -   **Internal Islamic Library**: Offline-capable reader with 50+ books, chapters, bookmarking, and progress tracking.
    -   **Activity & Monitoring**: Combined monitoring page with tabs for online users, activity logs, and teacher activities. Session management (kick/suspend/ban).
    -   **Reporting & Analytics**: Tracking of student progress, attendance, points, and generation of ID cards and reports with print/export capabilities.
    -   **Communication**: Internal messaging system, automated notifications for key events, smart alerts, and a rotating Hadith ticker.
    -   **Security**: Scrypt password hashing, session security, rate limiting, IP banning, IDOR prevention, and comprehensive input validation.
    -   **Performance**: Response compression (gzip/brotli), static asset caching, and service worker for offline capabilities.

## Recent Changes
-   **Feb 19, 2026**: Teacher student approval system - teachers can add students but they require supervisor approval. Supervisors get notified and can approve/reject with reason. Pending students shown in amber section at top of students page.
-   **Feb 19, 2026**: Added level filter dropdown to all major pages with filter bars (Attendance, Assignments, Points, Ratings, Courses).
-   **Feb 19, 2026**: Converted 5-level system to 6-level reverse-order (military-style) system. Each level covers 5 juz: Level 1 (Juz 30-26), Level 2 (Juz 25-21), Level 3 (Juz 20-16), Level 4 (Juz 15-11), Level 5 (Juz 10-6), Level 6 (Juz 5-1). Updated names: مبتدئ/متوسط/متقدم/متميز/خبير/حافظ.
-   **Feb 17, 2026**: Added 7 major institutional systems: Crisis Management (emergency teacher substitution with auto-distribution, incident records), Graduation & Follow-up (graduate files with ijazah chains, follow-up tracking), Institutional Integration (student transfers between mosques with approval workflow), Integrated Family System (parent-student linking, family dashboard), Knowledge Management (tajweed rules encyclopedia by category), Maintenance & Improvement (feedback/suggestions with response workflow), Educational Content (similar verses training, interactive tajweed exercises with quiz mode).
-   **Feb 17, 2026**: Mandatory privacy policy acceptance for all users (non-optional, admin exempt). Comprehensive backup/restore system with integrity validation. Fixed language switching (lang/dir attributes). Phone uniqueness validation (11+ digits, green border). Save buttons on all settings tabs.
-   **Feb 17, 2026**: Admin interface redesign - categorized sidebar navigation with collapsible groups, merged similar sections (ID Cards + QR Scanner, Monitoring pages), enhanced dashboard with visual statistics and quick access grid.
-   **Feb 17, 2026**: Comprehensive enhancement of all 8 major sections with 60+ new features including stats cards, visual calendars, batch operations, Excel exports, WhatsApp integration, print functionality, achievement systems, and advanced filtering.

## External Dependencies
-   **api.alquran.cloud**: Used for fetching Quran text for display.
-   **qrcode package**: Local generation of QR codes for ID cards.
-   **Passport.js**: Authentication middleware.
-   **Drizzle ORM**: Database interaction.
-   **PostgreSQL**: Primary database.
-   **Express.js**: Backend framework.
-   **React**: Frontend library.
-   **Vite**: Frontend build tool.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **shadcn/ui**: UI component library.

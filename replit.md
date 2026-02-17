# متقن (Mutqin) - Quran Memorization Management System

## Overview
Mutqin is a multi-tenant online Quran memorization management system designed for Islamic centers in Iraq. It offers mosque-based data isolation, hierarchical role-based access control (Admin, Supervisor, Teacher, Student), and a full Arabic RTL interface. The system aims to streamline the administration of Quran memorization, student progress tracking, and communication within Islamic educational institutions.

## User Preferences
Not specified.

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
-   **Core Features**:
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
    -   **Activity & Monitoring**: Detailed activity logs for teachers and supervisors, real-time online user monitoring with session management (kick/suspend/ban).
    -   **Reporting & Analytics**: Tracking of student progress, attendance, points, and generation of ID cards and reports with print/export capabilities.
    -   **Communication**: Internal messaging system, automated notifications for key events, and a rotating Hadith ticker.
    -   **Security**: Scrypt password hashing, session security, rate limiting, IP banning, IDOR prevention, and comprehensive input validation.
    -   **Performance**: Response compression (gzip/brotli), static asset caching, and service worker for offline capabilities.

## Recent Changes
-   **Feb 17, 2026**: Comprehensive enhancement of all 8 major sections with 60+ new features including stats cards, visual calendars, batch operations, Excel exports, WhatsApp integration, print functionality, achievement systems, and advanced filtering across Students, Attendance, Points, Assignments, Schedules, Ratings, Quran Tracker, and Courses pages.

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
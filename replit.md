# متقن (Mutqin) - Quran Memorization Management System

## Overview
Mutqin is a multi-tenant online Quran memorization management system for Islamic centers in Iraq. It provides mosque-based data isolation, hierarchical role-based access control (Admin, Supervisor, Teacher, Student), and a full Arabic RTL interface. The system aims to streamline Quran memorization administration, student progress tracking, and communication within Islamic educational institutions.

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
-   **Dashboard**: Visual statistics (SVG progress rings), quick access grid, assignment completion rate, attendance summary, student breakdown, GitHub-style activity heatmap, star of the week, attendance streaks, performance prediction, smart review suggestions, motivational hadith ticker.
-   **Student Management**: Stats cards, profile summary, batch actions, archive/restore, notes, enhanced export.
-   **Assignments & Exams**: Stats cards, 1-100 grading, deadline tracking, visual calendar, completion rates, bulk assignment.
-   **Attendance**: Stats cards, quick actions, absence alerts, monthly calendar view, statistics tab, printable sheet, parent WhatsApp notification.
-   **Points & Rewards**: Deduct/batch award points, 8+ categories, stats cards, achievement system, Excel export.
-   **Schedules**: Stats cards, weekly grid with time labels, copy/duplicate, conflict detection, printable timetable.
-   **Ratings**: Stats cards, weekly rating system, rating history, auto-honor badge suggestion, badges showcase.
-   **Quran Tracker**: Stats with streak/juz/milestones, visual memorization tree, personal plan, daily review, tajweed error tracking, achievement milestones.
-   **Courses & Certificates**: Stats, search/filter, edit, duplicate, graduation grades, public verification, batch printing.
-   **User Management**: Comprehensive student, teacher, and supervisor management with detailed profiles, credential sharing, and transfer capabilities.
-   **Internal Islamic Library**: Offline-capable reader with 50+ books, bookmarking, and progress tracking.
-   **Activity & Monitoring**: Combined monitoring page (online users, activity logs, teacher activities). Session management.
-   **Reporting & Analytics**: Student progress, attendance, points, ID cards, reports with print/export. Quran Passport, Mosque infographic.
-   **Smart Alerts**: Dynamic alert generation (absence, low performance, overdue assignments, streaks, level-up). Filterable by severity with WhatsApp parent contact.
-   **Parent Portal**: Visual progress charts, attendance summary, enhanced report content, WhatsApp message templates, student info card.
-   **Competitions**: Tabbed interface (Competitions, Star of Week, Mosque Rankings), mosque leaderboard.
-   **ID Cards**: Professional card design with gradient headers and improved print support.
-   **Security**: Helmet HTTP security headers, Scrypt password hashing, session security, login/API rate limiting, IP banning, IDOR prevention, request body size limits, random default passwords, input validation. Includes security hardening against privilege escalation and unauthorized access. Deep security audit: mosque isolation on all endpoints (schedules/competitions/leaderboard/messages/points/badges/conversations/attendance/parent-reports/graduates/family-links/incidents/emergency-substitutions), mass assignment protection with field whitelists on all PATCH endpoints (users/emergency-substitutions/incidents/graduates/student-transfers/feedback), role gating on all mutation endpoints (courses/competitions/schedules/tajweed/similar-verses), XSS sanitization in print utilities, content text filtering on competitions/schedules. Database indexes on all foreign key columns (27+ tables) for DoS prevention.
-   **Smart Analytics API**: 6 dedicated endpoints for student-streaks, activity-heatmap, star-of-week, prediction, smart-review, mosque-rankings.
-   **Performance**: Response compression, static asset caching, service worker for offline capabilities.
-   **Institutional Systems**: Crisis Management, Graduation & Follow-up, Institutional Integration, Integrated Family System, Knowledge Management, Maintenance & Improvement, Educational Content.
-   **Admin Interface**: Redesigned with categorized sidebar navigation, merged sections, enhanced dashboard.
-   **Level System**: 6-level reverse-order system (Juz 30-1), with updated names: مبتدئ/متوسط/متقدم/متميز/خبير/حافظ.

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
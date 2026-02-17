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
    -   **Assignments & Exams**: Unified management page, Quran surah/verse selection, student progress tracking, automated notifications.
    -   **User Management**: Comprehensive student, teacher, and supervisor management with detailed profiles (including special needs, orphan status), credential sharing via WhatsApp, and transfer capabilities.
    -   **Courses & Certificates**: Creation of courses, student enrollment, and generation of gender/age-specific printable certificates.
    -   **Internal Islamic Library**: Offline-capable reader with 50+ books, chapters, bookmarking, and progress tracking.
    -   **Activity & Monitoring**: Detailed activity logs for teachers and supervisors, real-time online user monitoring with session management (kick/suspend/ban).
    -   **Reporting & Analytics**: Tracking of student progress, attendance, points, and generation of ID cards and reports with print/export capabilities.
    -   **Communication**: Internal messaging system, automated notifications for key events, and a rotating Hadith ticker.
    -   **Security**: Scrypt password hashing, session security, rate limiting, IP banning, IDOR prevention, and comprehensive input validation.
    -   **Performance**: Response compression (gzip/brotli), static asset caching, and service worker for offline capabilities.

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
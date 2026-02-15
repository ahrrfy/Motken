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
- Supervisor: mosque-scoped, creates teachers and students, rates teachers, views teacher activities
- Teacher: mosque-scoped, adds students, rates students, creates exams
- Student: sees only their own data

## Key Files
- `shared/schema.ts` - Database schema (Drizzle) with all tables
- `shared/quran-surahs.ts` - Complete 114 Quran surahs with verse counts
- `shared/hadiths.ts` - 60 authentic hadiths from Bukhari/Muslim for ticker
- `server/storage.ts` - Storage layer with mosque-scoped queries
- `server/routes.ts` - API routes with hierarchical permissions
- `server/auth.ts` - Authentication setup (passport, sessions)
- `server/session-tracker.ts` - In-memory session tracking (IP, device, user agent)
- `client/src/App.tsx` - Frontend routing
- `client/src/lib/auth-context.tsx` - Auth context with mosqueName, canPrintIds, gender
- `client/src/lib/api.ts` - Resilient API fetch with retries & timeout
- `client/src/lib/theme-context.tsx` - Theme (dark/light) and language (ar/en) context
- `client/src/lib/translations.ts` - Arabic/English translations
- `client/src/lib/print-utils.ts` - HTML-based print utility with Arabic/RTL support
- `client/src/components/layout/SidebarLayout.tsx` - Main layout with sidebar
- `client/src/components/HadithTicker.tsx` - Rotating hadith ticker bar
- `client/src/components/DevicePermissions.tsx` - Camera/location/notification permissions

## Pages
- DashboardPage, MosquesPage (admin), AllUsersPage (admin), StudentsPage, TeachersPage
- AssignmentsExamsPage (unified assignments + exams with tabs), RatingsPage
- CoursesPage (courses & certificates with graduation system, Islamic certificate design)
- QuranTracker, LibraryPage (internal reader, no external links), ReportsPage
- IDCardsPage (permission-based), QRScannerPage, SettingsPage
- ActivityLogsPage (admin), TeacherActivitiesPage (supervisor)
- OnlineUsersPage (admin - session monitoring, kick/suspend/ban)
- NotificationsPage (with bulk actions), TeacherDailyPage

## Database Tables
- mosques, users (with gender, age, telegramId, parentPhone, educationLevel, isSpecialNeeds, isOrphan fields; NO email field), assignments (with seenByStudent, seenAt), ratings, exams, exam_students
- activity_logs, notifications, courses, course_students, course_teachers, certificates
- banned_devices (permanent IP bans with indexes on ip_address and device_fingerprint)

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
- **Teacher Activities**: Admin and supervisors see teacher-role activity logs (admin sees all, supervisor sees own mosque)
- **Teacher Daily View**: "واجبات اليوم" page showing today's assignments grouped by student
- **Theme & Language**: Dark/light mode toggle, Arabic/English language switcher with localStorage persistence
- **Photo Upload**: Base64 avatar upload for all users, displayed in ID cards and profiles
- **PDF/Print**: HTML-based print with Tajawal font, Arabic RTL support, formatted print preview
- **ID Card Export**: Individual (9cm x 6cm per card) or batch (A4 all cards) PDF export + PNG export at 300 DPI, QR codes generated locally via `qrcode` package
- **Quran Verse Display**: Students see actual Quran text (Amiri font, api.alquran.cloud API) when clicking assignments
- **Quran Surah Selector**: Full 114 surahs with automatic verse count validation
- **Enhanced Student Fields**: Age, Telegram ID, parent phone, education level (school/university/postgraduate), special needs status, orphan status
- **Special Needs/Orphan Stats**: Tracked in reports, printed stats, and Excel exports
- **Student Transfer**: Supervisors can transfer students between teachers
- **Notification Management**: Mark as read (individual/selected/all), delete (individual/selected/all)
- **Font Size Controls**: Adjustable 12-28px with localStorage persistence
- **Web Push Notifications**: Service Worker polling for browser notifications
- **Online User Monitoring**: In-memory session tracking with IP/device/browser/OS info, green/orange status indicators, 10-second auto-refresh
- **Admin Controls**: Kick session, kick all user sessions, suspend/activate accounts, permanent IP ban
- **Permanent Banning**: IP-based bans stored in bannedDevices table, blocks login from banned IPs
- **Hadith Ticker**: 60 authentic hadiths (Bukhari/Muslim) with fade animation, 15-second rotation, emerald gradient bar
- **Device Permissions**: Camera (QR), geolocation (prayer times), notifications with visual status indicators in Settings
- **Resilient API**: Automatic retries (3x exponential backoff) for GET requests, 15s timeout, Arabic error messages
- **Response Compression**: gzip/brotli compression middleware for all responses
- **Static Asset Caching**: 24h max-age + 7-day stale-while-revalidate for js/css/images/fonts
- **Service Worker Caching**: Stale-while-revalidate for static assets, offline capability
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
- **IP Banning**: Permanent IP bans block login even with new accounts, validated to 45 chars max
- **Cascade Deletes**: Mosque deletion cascades to all child records (users, logs, notifications)
- **Notification Array Limits**: Bulk operations limited to 100 items to prevent abuse
- **Comprehensive Error Handling**: All async routes wrapped in try/catch

## Design Choices
- Avatar upload uses base64 encoding (limit 500KB), stored in user.avatar field
- Print utility uses HTML with Tajawal font, opens formatted window with Print/Save as PDF/Close buttons
- Certificate printing uses direct window.open() without openPrintWindow header/footer, only certificate design
- Certificate design: Islamic frame with ﷽, gold (#c9a84c) accents, navy (#16213e) theme, corner decorations
- Email field completely removed from entire system (schema, all pages, API routes, seed data)
- Prayer times use geolocation with fallback to Baghdad coordinates (33.3152, 44.3661), all times in Asia/Baghdad timezone, recalculate every 60 seconds
- Student form field order: name → username → password → gender → age → phone → parentPhone → telegramId → address → educationLevel → isSpecialNeeds → isOrphan
- Quran verses fetched from api.alquran.cloud and cached per assignment, displayed with Amiri font at 20px
- Theme stored in localStorage "mutqin_theme" (dark/light), language in "mutqin_language" (ar/en)
- Library books have internal reader with generated chapters and content per category
- Assignment "seen" auto-triggered when student views assignments page
- Notifications auto-created for assignments, exams, course enrollments
- Session tracking uses in-memory Map with 5-minute online timeout and 30-minute auto-cleanup
- API retry logic only retries GET requests to avoid duplicate mutations
- Hadith ticker starts at random index, rotates every 15 seconds with 500ms fade transition

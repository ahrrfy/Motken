# Mutqin (مُتْقِن) — Architecture Guide

## System Philosophy: العمق الخفي (Hidden Depth)
Simple to use, smart behind the scenes. The user sees a clean, intuitive interface.
The system handles complexity internally through auto-intelligence, predictive validation, and self-healing.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────┐
│                      Client (React)                        │
│  ┌──────────┐ ┌────────────┐ ┌───────────┐ ┌───────────┐  │
│  │ Pages    │ │ Components │ │ Lib/Utils │ │ Theme/i18n│  │
│  │ (39+)   │ │ (UI/Layout)│ │ (API/Auth)│ │ (AR/EN)   │  │
│  └──────────┘ └────────────┘ └───────────┘ └───────────┘  │
│                         │                                  │
│                    fetch() / POST                          │
└─────────────────────────┬──────────────────────────────────┘
                          │ HTTPS (HSTS)
┌─────────────────────────┴──────────────────────────────────┐
│                    Server (Express.js)                      │
│                                                            │
│  ┌─ Security Layer ──────────────────────────────────────┐ │
│  │ Helmet (CSP/HSTS/X-Frame) │ CSRF (Origin check)      │ │
│  │ Rate Limiting (4 tiers)   │ Permissions-Policy        │ │
│  │ Path blocking (.env/.git) │ Body size limit (500KB)   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Auth Layer ──────────────────────────────────────────┐ │
│  │ Passport.js (Local Strategy)                          │ │
│  │ Scrypt hashing │ Session (connect-pg-simple)          │ │
│  │ Session regeneration │ Auto-invalidation              │ │
│  │ Role-based access (Admin/Supervisor/Teacher/Student)  │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ API Routes (server/routes.ts) ───────────────────────┐ │
│  │ 200+ endpoints across 7 modules                       │ │
│  │ Feature flag middleware │ Content filtering            │ │
│  │ Mosque isolation │ PII masking │ Field whitelists      │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Self-Healing Layer (server/self-healing.ts) ─────────┐ │
│  │ DB health check (60s) │ Auto-recovery                 │ │
│  │ DB optimization (6h)  │ Session cleanup (30min)       │ │
│  │ Memory monitoring     │ Temp data cleanup (24h)       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ Process Management ─────────────────────────────────┐  │
│  │ Graceful shutdown (SIGTERM/SIGINT)                    │  │
│  │ unhandledRejection / uncaughtException handlers       │  │
│  │ 10s forced shutdown timeout                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │                                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│                   PostgreSQL Database                        │
│                                                             │
│  27+ Tables │ 52+ Indexes │ Drizzle ORM                     │
│  Pool: 20 max, 2 min │ 30s statement timeout                │
│  Health check: 60s │ Session store: connect-pg-simple        │
│                                                             │
│  Key Tables:                                                │
│  ├── users (RBAC, mosque isolation)                         │
│  ├── mosques (multi-tenant root)                            │
│  ├── assignments / exams (education)                        │
│  ├── attendance (tracking)                                  │
│  ├── points / badges / ratings (gamification)               │
│  ├── courses / certificates (education management)          │
│  ├── messages / notifications (communication)               │
│  ├── activity_logs (audit trail)                            │
│  ├── banned_devices (security)                              │
│  ├── mosque_registrations (onboarding)                      │
│  └── 17+ more specialized tables                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Module Structure

### Backend (server/)
| File | Lines | Responsibility |
|------|-------|---------------|
| `index.ts` | ~290 | Express setup, security middleware, rate limiting, CSRF, graceful shutdown |
| `routes.ts` | ~6180 | All API endpoints (200+), business logic, feature flags |
| `auth.ts` | ~225 | Passport.js, session management, password hashing, login rate limiting |
| `storage.ts` | ~1160 | Database operations (IStorage interface + DatabaseStorage) |
| `db.ts` | ~115 | PostgreSQL pool, Drizzle ORM, index creation (52+ indexes) |
| `self-healing.ts` | ~170 | Auto-recovery, cron jobs, health monitoring |
| `session-tracker.ts` | ~140 | Active session tracking, per-user session management |

### Frontend (client/src/)
| Directory | Contents |
|-----------|----------|
| `pages/` | 39+ page components (Dashboard, Students, Quran, etc.) |
| `components/` | Reusable UI components (layout, sidebar, dialogs) |
| `lib/` | Utilities (auth-context, theme-context, queryClient, print-utils, notifications) |

### Shared (shared/)
| File | Contents |
|------|----------|
| `schema.ts` | 27+ Drizzle table definitions, Zod validation schemas, TypeScript types |
| `quran-surahs.ts` | 114 Quran surah metadata |
| `content-filter.ts` | Text content filtering and sanitization |

---

## Security Architecture (OWASP Top 10)

| OWASP Category | Protection |
|----------------|-----------|
| A01: Broken Access Control | Role-based middleware, mosque isolation on ALL endpoints, field whitelists |
| A02: Cryptographic Failures | Scrypt hashing, HTTPS enforced (HSTS), SESSION_SECRET in env |
| A03: Injection | Drizzle ORM (parameterized), input validation, content filtering |
| A04: Insecure Design | Multi-tenant isolation, PII masking, session regeneration |
| A05: Security Misconfiguration | Helmet headers, x-powered-by disabled, .env/.git blocked |
| A06: Vulnerable Components | No unused dependencies, minimal attack surface |
| A07: Auth Failures | 5-attempt lockout, session invalidation, IP banning |
| A08: Data Integrity | CSRF protection, field whitelists, bulk limits (200 items) |
| A09: Logging Failures | Audit logs for security events, failed login warnings |
| A10: SSRF | No outbound requests except Quran API (public, read-only) |

---

## Rate Limiting Tiers

| Tier | Limit | Scope |
|------|-------|-------|
| General API | 120/min | All `/api/` routes |
| Public Endpoints | 15/min | Parent reports, certificates, family dashboard |
| Authentication | 20/15min | Login, mosque registration |
| Sensitive Actions | 10/15min | Password changes, password resets |
| Login Brute Force | 5/15min | Per IP+username combination |
| Mosque Registration | 3/hour | Per IP (custom Map-based) |

---

## Auto-Intelligence System

The system automatically performs smart actions without user intervention:
- **Auto-points**: Awards points on attendance (5pts), assignments (10/7/5pts by grade), streaks (25/50/100pts)
- **Auto-review**: Creates review assignments when grade < 60
- **Smart suggestions**: Suggests next surah/verses based on student history
- **Attendance patterns**: Detects absence patterns (e.g., "absent every Sunday")
- **Discipline scoring**: 0-100 score per student based on attendance/behavior
- **Collective weakness**: Identifies common weak areas across students
- **Teacher performance**: Grading speed, average grades, assignment frequency metrics

---

## Data Flow

```
User Action → React Component → fetch() → Express Router
  → Auth Middleware (requireAuth/requireRole)
  → CSRF Check (Origin/Referer validation)
  → Rate Limit Check
  → Feature Flag Check
  → Route Handler (try-catch)
    → Storage Layer (Drizzle ORM)
    → PostgreSQL (parameterized queries)
  → JSON Response (no sensitive data)
```

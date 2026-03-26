# بنية نظام مُتْقِن

## المكدس التقني
| الطبقة | التقنية |
|--------|---------|
| Frontend | React 19 + TypeScript + Vite 7 |
| Styling | Tailwind CSS 4 + Shadcn/UI (Radix) |
| Backend | Express 5 + TypeScript |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache | Redis 7 (أو In-memory fallback) |
| Files | MinIO (S3-compatible) |
| Auth | Passport.js + Sessions + 2FA (TOTP) |
| Real-time | WebSocket |
| CI/CD | GitHub Actions |
| Deploy | Docker + Nginx + Let's Encrypt |

## هيكل المجلدات
```
├── client/src/           # React SPA
│   ├── pages/            # 51 صفحة
│   ├── components/       # مكونات UI
│   ├── mobile/           # واجهة الموبايل
│   ├── hooks/            # React hooks
│   └── lib/              # أدوات (API, auth, PDF, Excel)
├── server/               # Express API
│   ├── routes/           # 25 وحدة مسار (~227 endpoint)
│   ├── storage/          # طبقة الوصول للبيانات
│   ├── services/         # منطق الأعمال
│   └── lib/              # أدوات (logger, file-storage)
├── shared/               # أنواع مشتركة
│   └── schema/           # Drizzle ORM schema (36 جدول)
├── script/               # سكريبتات (build, seed, migrate, backup)
├── e2e/                  # اختبارات Playwright
└── docs/                 # التوثيق
```

## الأمان
- CSP مع nonce (بدون unsafe-inline للـ scripts)
- Rate limiting (4 مستويات)
- CSRF protection
- Scrypt password hashing + 2FA (TOTP)
- Deep payload validation
- Session management (HttpOnly, Secure, SameSite)
- Device banning (IP + fingerprint)

## الأدوار
| الدور | الوصف |
|-------|-------|
| admin | إدارة النظام كاملاً |
| supervisor | إدارة مسجد واحد |
| teacher | إدارة الطلاب والواجبات |
| student | عرض الواجبات والتقدم |
| parent | عرض تقارير الأبناء |

# مهمة: تطبيق إصلاحات أمنية — استبدال 4 ملفات

## التعليمات

الملف المرفق `security-fixes.zip` يحتوي على 4 ملفات TypeScript مُصلّحة أمنياً. المطلوب:

### الخطوة 1: فك الضغط
```bash
unzip security-fixes.zip -d /tmp/security-fixes
```

### الخطوة 2: استبدال الملفات (4 ملفات فقط)
استبدل كل ملف بالملف المقابل من الأرشيف:

```bash
cp /tmp/security-fixes/server/auth.ts server/auth.ts
cp /tmp/security-fixes/server/routes/admin.ts server/routes/admin.ts
cp /tmp/security-fixes/server/routes/analytics.ts server/routes/analytics.ts
cp /tmp/security-fixes/server/routes/assignments.ts server/routes/assignments.ts
```

### الخطوة 3: إضافة متغيرات البيئة (Secrets)
أضف هذه المتغيرات في Secrets:

| المتغير | القيمة | ملاحظة |
|---------|--------|--------|
| `SESSION_SECRET` | نص عشوائي طويل (64+ حرف) | **إلزامي في الإنتاج** — النظام يرفض التشغيل بدونه |
| `ADMIN_USERNAME` | اسم مستخدم المدير الجديد | بدل `ahrrfy` المكشوف |
| `ADMIN_PASSWORD` | كلمة مرور قوية (حروف+أرقام+رموز، 12+ حرف) | بدل `6399137` المكشوفة |
| `SEED_SECRET` | نص سري لحماية نقطة التهيئة | مطلوب فقط إذا احتجت /api/seed |

لتوليد SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### الخطوة 4: تغيير كلمة مرور المدير الحالي
**مهم جداً**: كلمة المرور القديمة `6399137` للمستخدم `ahrrfy` مكشوفة في الكود القديم. يجب تغييرها من داخل النظام أو من قاعدة البيانات مباشرة.

### الخطوة 5: التحقق
```bash
# تأكد من عدم وجود كلمات مرور مكشوفة
grep -r "6399137" server/
grep -r "ahrrfy" server/routes/admin.ts

# تأكد من وجود الإصلاحات
grep "checkDataAccess" server/routes/analytics.ts
grep "SEED_SECRET" server/routes/admin.ts
grep "path.basename" server/routes/assignments.ts
grep "process.exit" server/auth.ts
```

يجب أن يعطي:
- أول أمرين: **لا نتائج** (البيانات المكشوفة حُذفت)
- آخر 4 أوامر: **نتائج موجودة** (الإصلاحات مطبّقة)

## ⚠️ تحذيرات مهمة
- **لا تعدّل** على الملفات المُصلّحة — هي جاهزة للاستبدال المباشر
- **لا تشغّل** /api/seed في الإنتاج بدون تعيين SEED_SECRET
- **لا تنسَ** تغيير كلمة مرور المدير الحالي
- بعد الاستبدال، أعد تشغيل السيرفر: `kill 1` أو من زر Stop/Run

## ملخص التغييرات
| الملف | الثغرة | الإصلاح |
|-------|--------|---------|
| `server/auth.ts` | SESSION_SECRET يسقط لـ REPL_ID العام | يرفض التشغيل بدون SESSION_SECRET في الإنتاج |
| `server/routes/admin.ts` | بيانات المدير بنص واضح + /api/seed مفتوح | بيانات من متغيرات البيئة + حماية بـ SEED_SECRET |
| `server/routes/analytics.ts` | 8 نقاط IDOR تكشف بيانات أي طالب | دالة checkDataAccess تفحص الصلاحيات |
| `server/routes/assignments.ts` | Path Traversal في ملفات الصوت | path.basename + resolve validation |

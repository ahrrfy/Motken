# قواعد إلزامية — نظام مُتْقِن

## ⛔ قواعد مكافحة حلقة الوهم

### عند بدء جلسة جديدة:
1. **اقرأ `.claude/fix-log.md` أولاً** — هذا سجل الإصلاحات المُثبتة بالدليل
2. **لا تقل "الإصلاحات لم تُطبّق"** بدون تشغيل `bash .claude/scripts/verify-fix.sh check-all`
3. إذا الإصلاح موجود في السجل مع دليل grep + build ناجح → **لا تعيد إصلاحه**
4. إذا المستخدم يطلب "فحص الإصلاحات" → شغّل `verify-fix.sh check-all` وأعرض النتائج الفعلية

### عند إنهاء أي إصلاح:
1. **تحقق بـ grep** أن الكود الجديد موجود فعلاً في الملف
2. **شغّل `npx vite build --mode development`** وتأكد من نجاحه
3. **سجّل في `.claude/fix-log.md`** مع الدليل الكامل (grep output + build result)
4. **لا تقل "تم الإصلاح"** إلا بعد الخطوات الثلاث أعلاه

### قاعدة الـ 3 محاولات:
- إذا نفس الإصلاح فشل 3 مرات ← **توقف فوراً واسأل المستخدم**
- لا تكرر نفس المنهج — إذا فشل مرتين، **غيّر الطريقة بالكامل**
- سجّل كل محاولة فاشلة في fix-log.md مع سبب الفشل

### قاعدة الصدق:
- ❌ لا تقل "مكتمل" إذا لم تتحقق بـ grep + build
- ❌ لا تقل "يعمل" إذا لم تختبر فعلياً (preview/browser/API)
- ❌ لا تقل "لا توجد مشاكل" بدون فحص حقيقي
- ✅ إذا لا تعرف الحالة ← قل **"لم أتحقق بعد"**
- ✅ إذا فشلت ← قل **"فشلت والسبب هو X"**

### صيغة التحقق المطلوبة:
```
## التحقق من [وصف الإصلاح]
- grep: ✅ السطر [X] يحتوي `[الكود]`
- build: ✅ نجح (0 errors)
- تشغيل: ✅ [وصف الاختبار]
→ الحالة: مُثبت ✅
```

## 🔧 أوامر مساعدة
```bash
# تحقق من إصلاح واحد
bash .claude/scripts/verify-fix.sh verify "path/to/file" "pattern" "وصف"

# تحقق من جميع الإصلاحات المسجلة
bash .claude/scripts/verify-fix.sh check-all

# فحص البناء
bash .claude/scripts/verify-fix.sh build

# عرض السجل
cat .claude/fix-log.md
```

## 📁 بنية المشروع
- **Frontend**: React + Vite + TypeScript (`client/`)
- **Backend**: Express + Drizzle ORM + PostgreSQL (`server/`)
- **Shared**: Schema types (`shared/`)
- **Port**: 5001
- **اللغة**: عربي (RTL) — خط Cairo
- **PDF**: html-to-image + jsPDF (`client/src/lib/pdf-generator.ts`)

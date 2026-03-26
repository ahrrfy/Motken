# سجل الإصلاحات المُثبتة

> هذا الملف يُكتب تلقائياً بواسطة verify-fix.sh
> كل إصلاح مسجل هنا تم التحقق منه بـ grep + build

---

## [2026-03-26] — نظام PDF احترافي (html-to-image + jsPDF)
- **الملف**: `client/src/lib/pdf-generator.ts`
- **قبل**: `html2canvas` (كان يفكك الحروف العربية)
- **بعد**: `toPng` من html-to-image (SVG-based، يحافظ على العربي)
- **دليل grep**: ✅ مُثبت — السطر 2
  ```
  2:import { toPng } from "html-to-image";
  190:  const dataUrl = await toPng(wrapper, {
  ```
- **دليل البناء**: ✅ vite build نجح
- **دليل التشغيل**: ✅ المستخدم أكد أن PDF يعمل
- **الحالة**: ✅ مُثبت

---

## [2026-03-26] — مكوّن ImportWizard (استيراد 5 مراحل)
- **الملف**: `client/src/components/ImportWizard.tsx`
- **قبل**: استيراد مباشر بدون معاينة
- **بعد**: `ImportWizard` — معالج 5 مراحل مع فحص تكرار
- **دليل grep**: ✅ مُثبت — السطر 65
  ```
  65:export function ImportWizard({
  ```
- **دليل البناء**: ✅ vite build نجح
- **الحالة**: ✅ مُثبت

---

## [2026-03-26] — مكوّن ExportDialog (تصدير Excel/CSV)
- **الملف**: `client/src/components/ExportDialog.tsx`
- **قبل**: تصدير مباشر بدون اختيار حقول
- **بعد**: `ExportDialog` — اختيار حقول + معاينة + Excel/CSV
- **دليل grep**: ✅ مُثبت — السطر 26
  ```
  26:export function ExportDialog({
  ```
- **دليل البناء**: ✅ vite build نجح
- **الحالة**: ✅ مُثبت

---

## [2026-03-26] — مكوّن BookUploadDialog (رفع كتب PDF/Word)
- **الملف**: `client/src/components/BookUploadDialog.tsx`
- **قبل**: إدخال نص فقط
- **بعد**: `BookUploadDialog` — رفع PDF/Word/TXT + استخراج نص + تقسيم فصول
- **دليل grep**: ✅ مُثبت — السطر 35
  ```
  35:export function BookUploadDialog({
  ```
- **دليل البناء**: ✅ vite build نجح
- **الحالة**: ✅ مُثبت

---

## [2026-03-26] — مكوّن HijriDatePicker (تاريخ هجري + ميلادي)
- **الملف**: `client/src/components/HijriDatePicker.tsx`
- **قبل**: تاريخ ميلادي فقط
- **بعد**: `HijriDatePicker` — عرض هجري وميلادي معاً
- **دليل grep**: ✅ مُثبت — السطر 19
  ```
  19:export function HijriDatePicker({
  ```
- **دليل البناء**: ✅ vite build نجح
- **الحالة**: ✅ مُثبت

---

### [2026-03-26 22:53] — فحص بناء ناجح
```
✓ built in 14.93s
```


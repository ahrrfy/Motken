/**
 * دوال الهاتف المركزية المشتركة — مُتْقِن
 *
 * ملف واحد يُستخدم من الخادم والعميل.
 * كل تنظيف/تنسيق/تحقق من أرقام الهاتف يمر عبر هذه الدوال.
 */

/** قائمة مفاتيح الدول المدعومة (مرتبة بالأولوية) */
export const DIAL_CODES = [
  "+964", "+966", "+963", "+962", "+965", "+971", "+973", "+974",
  "+968", "+967", "+20", "+961", "+218", "+216", "+213", "+212",
  "+249", "+970", "+90", "+98", "+92", "+91", "+62", "+60",
  "+49", "+44", "+1", "+61", "+46", "+31", "+33",
] as const;

/**
 * تنظيف أرقام الهاتف — يُزيل كل شيء عدا الأرقام
 */
export function cleanDigits(phone: string | null | undefined): string {
  return (phone || "").replace(/[^\d]/g, "");
}

/**
 * تنسيق الهاتف — يُحوّل أي شكل لصيغة دولية موحدة +XXX...
 *
 * الأنماط المدعومة:
 * - 07XXXXXXXXX → +964XXXXXXXXXX (عراقي)
 * - 05XXXXXXXX → +966XXXXXXXX (سعودي)
 * - 9647XXXXXXXX → +9647XXXXXXXX
 * - +9647XXXXXXXX → بدون تغيير
 * - أي رقم يبدأ بمفتاح دولي معروف → +مفتاح...
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-\.\(\)]/g, "");

  // إذا يبدأ بـ + وأرقام فقط — شكل صحيح بالفعل
  if (/^\+\d{7,15}$/.test(cleaned)) return cleaned;

  // إزالة + لو موجود في مكان غير البداية أو غير صحيح
  const digits = cleaned.replace(/[^\d]/g, "");
  if (!digits || digits.length < 7) return cleaned.startsWith("+") ? cleaned : (digits ? `+${digits}` : "");

  // العراق: 07X → +964
  if (cleaned.startsWith("07") && digits.length >= 11 && digits.length <= 13) {
    return "+964" + digits.substring(1);
  }

  // السعودية: 05X → +966
  if (cleaned.startsWith("05") && digits.length >= 10 && digits.length <= 12) {
    return "+966" + digits.substring(1);
  }

  // إذا يبدأ بأرقام مفتاح دولي معروف (بدون +)
  if (!cleaned.startsWith("+")) {
    // مرتبة من الأطول للأقصر لتجنب تطابق خاطئ
    const sortedCodes = [...DIAL_CODES].sort((a, b) => b.length - a.length);
    for (const code of sortedCodes) {
      const codeDigits = code.replace("+", "");
      if (digits.startsWith(codeDigits) && digits.length >= codeDigits.length + 5) {
        return "+" + digits;
      }
    }
  }

  // إذا يبدأ بـ + بالفعل
  if (cleaned.startsWith("+")) return cleaned;

  // افتراضي: إرجاع مع + لو يشبه رقماً دولياً
  if (digits.length >= 10) return "+" + digits;

  return cleaned;
}

/**
 * التحقق من صلاحية رقم الهاتف
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  const n = normalizePhone(phone);
  return /^\+\d{7,15}$/.test(n);
}

/**
 * بناء رابط WhatsApp من رقم هاتف
 */
export function buildWhatsAppUrl(phone: string | null | undefined, message?: string): string {
  const normalized = normalizePhone(phone);
  const digits = cleanDigits(normalized);
  if (!digits) return "";
  const url = `https://wa.me/${digits}`;
  return message ? `${url}?text=${encodeURIComponent(message)}` : url;
}

/**
 * مقارنة رقمي هاتف (بغض النظر عن التنسيق)
 */
export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = cleanDigits(normalizePhone(a));
  const db = cleanDigits(normalizePhone(b));
  if (!da || !db) return false;
  return da === db;
}

/**
 * هل النص يحتوي على أرقام فقط (للبحث)
 */
export function isPhoneQuery(query: string): boolean {
  const digits = cleanDigits(query);
  return digits.length >= 4 && digits.length === query.replace(/[\s\-\+\.]/g, "").length;
}

/**
 * بحث برقم الهاتف — يتحقق إذا كان الهاتف المخزّن يحتوي على أرقام البحث
 */
export function phoneMatchesSearch(stored: string | null | undefined, query: string): boolean {
  const storedDigits = cleanDigits(stored);
  const queryDigits = cleanDigits(query);
  if (!storedDigits || !queryDigits) return false;
  return storedDigits.includes(queryDigits) || queryDigits.includes(storedDigits);
}

/** الحد الأقصى لطول حقل الهاتف */
export const PHONE_MAX_LENGTH = 20;

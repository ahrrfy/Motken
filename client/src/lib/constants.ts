/**
 * ثوابت موحدة للنظام — مستويات التحفيظ
 * يجب استخدام هذه الثوابت في كل الصفحات بدلاً من تعريفات محلية
 */

/** أسماء المستويات بالعربية */
export const LEVEL_NAMES: Record<number, string> = {
  1: "المستوى الأول",
  2: "المستوى الثاني",
  3: "المستوى الثالث",
  4: "المستوى الرابع",
  5: "المستوى الخامس",
  6: "المستوى السادس",
  7: "حافظ",
};

/** نطاق الأجزاء لكل مستوى */
export const LEVEL_RANGES: Record<number, string> = {
  1: "الجزء 30-26",
  2: "الجزء 25-21",
  3: "الجزء 20-16",
  4: "الجزء 15-11",
  5: "الجزء 10-6",
  6: "الجزء 5-1",
  7: "30 جزء",
};

/** ألوان المستويات (Tailwind classes) */
export const LEVEL_COLORS: Record<number, string> = {
  1: "bg-amber-100 text-amber-700",
  2: "bg-blue-100 text-blue-700",
  3: "bg-emerald-100 text-emerald-700",
  4: "bg-purple-100 text-purple-700",
  5: "bg-orange-100 text-orange-700",
  6: "bg-yellow-100 text-yellow-800",
  7: "bg-green-100 text-green-800",
};

/** عدد المستويات الكلي */
export const TOTAL_LEVELS = 7;

/** خيارات المستويات للقوائم المنسدلة (value + label) */
export const LEVEL_OPTIONS = Array.from({ length: TOTAL_LEVELS }, (_, i) => {
  const level = i + 1;
  return {
    value: String(level),
    label: level === 7
      ? `حافظ (${LEVEL_RANGES[level]})`
      : `${LEVEL_NAMES[level]} (${LEVEL_RANGES[level]})`,
  };
});

/** الحصول على اسم المستوى مع النطاق */
export function getLevelLabel(level: number | null | undefined): string {
  if (!level || level < 1 || level > TOTAL_LEVELS) return "غير محدد";
  return LEVEL_NAMES[level];
}

/** الحصول على لون المستوى */
export function getLevelColor(level: number | null | undefined): string {
  if (!level || level < 1 || level > TOTAL_LEVELS) return "bg-gray-100 text-gray-600";
  return LEVEL_COLORS[level];
}

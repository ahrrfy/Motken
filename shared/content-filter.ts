const bannedPatterns: string[] = [
  "لعن", "يلعن", "ملعون",
  "كلب", "حمار", "خنزير", "بقرة", "حيوان",
  "غبي", "أغبي", "أحمق", "معتوه", "مجنون",
  "كافر", "مرتد", "زنديق", "منافق",
  "حرام عليك", "ابن ال",
  "سب", "شتم", "يشتم",
  "قتل", "اقتل", "يقتل", "نقتل", "ذبح", "اذبح",
  "تفجير", "انتحاري", "متفجرات", "قنبلة",
  "داعش", "ارهاب", "ارهابي", "إرهاب", "إرهابي",
  "تطرف", "متطرف",
  "طائفي", "طائفية",
  "سلاح", "اسلحة", "أسلحة",
  "خمر", "مخدرات", "حشيش",
  "زنا", "فاحشة", "فاسق", "فاجر",
  "عاهرة", "قحبة", "شرموطة", "عرص",
  "تحرش", "اغتصاب",
  "لواط",
  "كس", "طيز", "زب",
  "واطي", "حقير", "وسخ", "قذر",
  "نجس", "نجاسة",
  "fuck", "shit", "bitch", "ass", "damn", "hell",
  "sex", "porn", "drug", "kill", "terror", "bomb",
  "isis", "racist", "hate",
];

export function containsBannedContent(text: string): { blocked: boolean; reason?: string } {
  if (!text || typeof text !== "string") return { blocked: false };

  const normalized = text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[ـ]/g, "")
    .trim();

  for (const pattern of bannedPatterns) {
    const normalizedPattern = pattern
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[ـ]/g, "");

    if (normalized.includes(normalizedPattern)) {
      return {
        blocked: true,
        reason: "يحتوي النص على محتوى غير لائق أو مخالف لسياسة النظام",
      };
    }
  }

  return { blocked: false };
}

export function filterTextFields(obj: Record<string, any>, fieldsToCheck: string[]): { blocked: boolean; reason?: string; field?: string } {
  for (const field of fieldsToCheck) {
    const value = obj[field];
    if (value && typeof value === "string") {
      const result = containsBannedContent(value);
      if (result.blocked) {
        return { ...result, field };
      }
    }
  }
  return { blocked: false };
}

const bannedPatterns: string[] = [
  "عاهرة", "قحبة", "شرموطة", "عرص",
  "كس", "طيز", "زب",
  "داعش", "انتحاري", "متفجرات",
  "fuck", "shit", "bitch",
  "porn", "isis",
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

    const regex = new RegExp(`(?:^|\\s|[^\\p{L}])${normalizedPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s|[^\\p{L}])`, "u");
    if (regex.test(` ${normalized} `)) {
      return {
        blocked: true,
        reason: "يحتوي النص على محتوى غير لائق",
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

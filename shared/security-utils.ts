const MAX_FIELD_LENGTHS: Record<string, number> = {
  name: 200,
  username: 50,
  province: 100,
  city: 100,
  area: 200,
  landmark: 300,
  address: 500,
  phone: 20,
  parentPhone: 20,
  telegramId: 100,
  managerName: 200,
  description: 1000,
  notes: 2000,
  comment: 1000,
  adminNotes: 2000,
  title: 300,
  message: 5000,
  content: 5000,
  location: 300,
  rejectionReason: 1000,
  vouchReason: 1000,
  voucherRelationship: 200,
  mosqueName: 200,
  applicantName: 200,
  applicantPhone: 20,
  mosquePhone: 20,
  requestedUsername: 50,
  requestedPassword: 128,
  educationLevel: 100,
  gender: 20,
  level: 50,
  surahName: 2000,
  type: 50,
  status: 50,
  reason: 500,
  category: 100,
};

export function validateStringField(value: any, fieldName: string): { valid: boolean; error?: string } {
  if (value === undefined || value === null) return { valid: true };
  if (typeof value !== "string") return { valid: false, error: `الحقل ${fieldName} يجب أن يكون نصاً` };
  const maxLen = MAX_FIELD_LENGTHS[fieldName] || 500;
  if (value.length > maxLen) return { valid: false, error: `الحقل ${fieldName} يجب ألا يتجاوز ${maxLen} حرف` };
  return { valid: true };
}

export function validateFields(body: Record<string, any>, fields: string[]): { valid: boolean; error?: string } {
  for (const field of fields) {
    const result = validateStringField(body[field], field);
    if (!result.valid) return result;
  }
  return { valid: true };
}

export function validateAge(age: any): { valid: boolean; error?: string } {
  if (age === undefined || age === null) return { valid: true };
  const num = Number(age);
  if (!Number.isInteger(num) || num < 3 || num > 120) {
    return { valid: false, error: "العمر يجب أن يكون رقماً بين 3 و 120" };
  }
  return { valid: true };
}

export function validateBoolean(value: any, fieldName: string): { valid: boolean; error?: string } {
  if (value === undefined || value === null) return { valid: true };
  if (typeof value !== "boolean") {
    return { valid: false, error: `الحقل ${fieldName} يجب أن يكون صح/خطأ` };
  }
  return { valid: true };
}

export function validateEnum(value: any, fieldName: string, allowed: string[]): { valid: boolean; error?: string } {
  if (value === undefined || value === null) return { valid: true };
  if (typeof value !== "string" || !allowed.includes(value)) {
    return { valid: false, error: `قيمة غير صالحة للحقل ${fieldName}` };
  }
  return { valid: true };
}

export function validateDate(value: any, fieldName: string): { valid: boolean; error?: string } {
  if (value === undefined || value === null) return { valid: true };
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return { valid: false, error: `تاريخ غير صالح في الحقل ${fieldName}` };
  }
  return { valid: true };
}

export function sanitizeImageUrl(url: any): string | null {
  if (!url || typeof url !== "string") return null;
  // الصور base64 قد تكون كبيرة (~375KB)، الحد 500KB
  if (url.startsWith("data:image/") && url.length > 500000) return null;
  if (!url.startsWith("data:image/") && url.length > 5000) return null;
  if (url.startsWith("data:image/")) return url;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) return url;
  return null;
}

export function validateTeacherLevels(value: any): { valid: boolean; error?: string } {
  if (value === undefined || value === null) return { valid: true };
  if (typeof value !== "string") return { valid: false, error: "مستويات التدريس يجب أن تكون نصاً" };
  const parts = value.split(",").map(p => p.trim());
  const validLevels = ["1", "2", "3", "4", "5", "6"];
  for (const p of parts) {
    if (!validLevels.includes(p)) {
      return { valid: false, error: "مستويات التدريس يجب أن تكون أرقام من 1 إلى 6" };
    }
  }
  return { valid: true };
}

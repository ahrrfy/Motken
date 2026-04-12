/**
 * نظام معالجة أخطاء موحّد لنظام سِرَاجُ الْقُرْآنِ
 * يوفر رسائل خطأ دقيقة بالعربية مع تحديد الحقل والمصدر
 */

import { ZodError } from "zod";

export type ErrorSource = "validation" | "database" | "permission" | "server" | "network";

export interface ApiError {
  message: string;
  field?: string;
  source: ErrorSource;
  details?: string[];
}

/**
 * أسماء الحقول بالعربية
 */
const fieldNames: Record<string, string> = {
  studentId: "الطالب",
  teacherId: "المعلم",
  mosqueId: "الجامع/المركز",
  surahName: "اسم السورة",
  fromVerse: "من آية",
  toVerse: "إلى آية",
  type: "نوع الواجب",
  status: "الحالة",
  scheduledDate: "تاريخ التسليم",
  examDate: "تاريخ الامتحان",
  examTime: "وقت الامتحان",
  title: "العنوان",
  description: "الوصف",
  notes: "الملاحظات",
  grade: "الدرجة",
  name: "الاسم",
  username: "اسم المستخدم",
  password: "كلمة المرور",
  phone: "رقم الهاتف",
  gender: "الجنس",
  role: "الدور",
  date: "التاريخ",
  startDate: "تاريخ البداية",
  endDate: "تاريخ النهاية",
  dayOfWeek: "اليوم",
  startTime: "وقت البداية",
  endTime: "وقت النهاية",
  amount: "المبلغ/الكمية",
  reason: "السبب",
  category: "الفئة",
  content: "المحتوى",
  subject: "الموضوع",
  parentPhone: "هاتف ولي الأمر",
  relationship: "صلة القرابة",
  severity: "الخطورة",
  surahNumber: "رقم السورة",
  verseStatuses: "حالات الآيات",
  stars: "عدد النجوم",
  badgeType: "نوع الشارة",
  rewardName: "اسم المكافأة",
  certificateNumber: "رقم الشهادة",
  maxStudents: "الحد الأقصى للطلاب",
};

/**
 * تحويل اسم حقل إنجليزي لعربي
 */
function getFieldName(field: string): string {
  return fieldNames[field] || field;
}

/**
 * تحويل أخطاء Zod لرسائل عربية مفهومة
 */
function formatZodError(error: ZodError): ApiError {
  const issues = error.issues;
  if (issues.length === 0) {
    return { message: "بيانات غير صالحة", source: "validation" };
  }

  const firstIssue = issues[0];
  const fieldPath = firstIssue.path.join(".");
  const fieldLabel = getFieldName(fieldPath);

  let message: string;
  switch (firstIssue.code) {
    case "invalid_type":
      if (firstIssue.received === "undefined" || firstIssue.received === "null") {
        message = `حقل '${fieldLabel}' مطلوب`;
      } else {
        const expectedType = firstIssue.expected === "string" ? "نص" :
          firstIssue.expected === "number" ? "رقم" :
          firstIssue.expected === "boolean" ? "قيمة منطقية" :
          firstIssue.expected === "date" ? "تاريخ" : firstIssue.expected;
        message = `حقل '${fieldLabel}' يجب أن يكون ${expectedType}`;
      }
      break;
    case "too_small":
      message = `حقل '${fieldLabel}' قصير جداً (الحد الأدنى: ${(firstIssue as any).minimum})`;
      break;
    case "too_big":
      message = `حقل '${fieldLabel}' طويل جداً (الحد الأقصى: ${(firstIssue as any).maximum})`;
      break;
    case "invalid_enum_value":
      message = `قيمة حقل '${fieldLabel}' غير مقبولة`;
      break;
    case "invalid_string":
      if ((firstIssue as any).validation === "email") {
        message = `حقل '${fieldLabel}' يجب أن يكون بريداً إلكترونياً صحيحاً`;
      } else if ((firstIssue as any).validation === "url") {
        message = `حقل '${fieldLabel}' يجب أن يكون رابطاً صحيحاً`;
      } else {
        message = `حقل '${fieldLabel}' بتنسيق غير صحيح`;
      }
      break;
    default:
      message = `خطأ في حقل '${fieldLabel}': ${firstIssue.message}`;
  }

  const details = issues.length > 1
    ? issues.map(i => {
        const f = getFieldName(i.path.join("."));
        return `${f}: ${i.message}`;
      })
    : undefined;

  return {
    message,
    field: fieldPath,
    source: "validation",
    details,
  };
}

/**
 * تحويل أخطاء قاعدة البيانات لرسائل مفهومة
 */
function formatDatabaseError(err: any): ApiError {
  const msg = err.message || "";
  const code = err.code || "";

  // unique constraint violation
  if (code === "23505" || msg.includes("unique") || msg.includes("duplicate")) {
    if (msg.includes("username")) {
      return { message: "اسم المستخدم مُستخدم مسبقاً", field: "username", source: "database" };
    }
    if (msg.includes("phone")) {
      return { message: "رقم الهاتف مُسجّل مسبقاً", field: "phone", source: "database" };
    }
    if (msg.includes("certificate_number")) {
      return { message: "رقم الشهادة مُستخدم مسبقاً", field: "certificateNumber", source: "database" };
    }
    return { message: "البيانات موجودة مسبقاً (تكرار)", source: "database" };
  }

  // foreign key violation
  if (code === "23503" || msg.includes("foreign key") || msg.includes("violates foreign key")) {
    if (msg.includes("student") || msg.includes("user")) {
      return { message: "الطالب/المستخدم المحدد غير موجود", source: "database" };
    }
    if (msg.includes("mosque")) {
      return { message: "الجامع/المركز المحدد غير موجود", source: "database" };
    }
    if (msg.includes("exam")) {
      return { message: "الامتحان المحدد غير موجود", source: "database" };
    }
    return { message: "أحد العناصر المرتبطة غير موجود", source: "database" };
  }

  // not null violation
  if (code === "23502" || msg.includes("not-null") || msg.includes("not null")) {
    const match = msg.match(/column "(\w+)"/);
    if (match) {
      const fieldLabel = getFieldName(match[1]);
      return { message: `حقل '${fieldLabel}' مطلوب ولا يمكن تركه فارغاً`, field: match[1], source: "database" };
    }
    return { message: "حقل مطلوب مفقود", source: "database" };
  }

  // check constraint
  if (code === "23514" || msg.includes("check")) {
    return { message: "القيمة المُدخلة خارج النطاق المسموح", source: "database" };
  }

  return { message: "خطأ في قاعدة البيانات", source: "database" };
}

/**
 * معالج أخطاء رئيسي — يُستخدم في catch blocks
 * يكشف نوع الخطأ تلقائياً ويُرجع رسالة مناسبة
 */
export function handleApiError(err: any, context?: string): { status: number; body: ApiError } {
  // Handle null/undefined errors
  if (err === null || err === undefined) {
    const contextMsg = context ? ` [${context}]` : "";
    console.error(`[خطأ سيرفر]${contextMsg}: خطأ غير معروف (null/undefined)`);
    return {
      status: 500,
      body: { message: "حدث خطأ داخلي في السيرفر. يرجى المحاولة مرة أخرى.", source: "server" },
    };
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    return { status: 400, body: formatZodError(err) };
  }

  // PostgreSQL errors (have error codes)
  if (err.code && typeof err.code === "string" && err.code.match(/^[0-9]{5}$/)) {
    return { status: 400, body: formatDatabaseError(err) };
  }

  // Express validation / manual validation errors
  if (err.status === 400 || err.statusCode === 400) {
    return {
      status: 400,
      body: {
        message: err.message || "بيانات غير صالحة",
        source: "validation",
      },
    };
  }

  // Permission errors
  if (err.status === 403 || err.statusCode === 403) {
    return {
      status: 403,
      body: {
        message: err.message || "غير مصرح بهذا الإجراء",
        source: "permission",
      },
    };
  }

  // Log unexpected errors with full details
  const contextMsg = context ? ` [${context}]` : "";
  console.error(`[خطأ سيرفر]${contextMsg}:`, err?.message || err);
  if (err?.stack) {
    console.error(`[Stack]${contextMsg}:`, err.stack);
  }

  return {
    status: 500,
    body: {
      message: "حدث خطأ داخلي في السيرفر. يرجى المحاولة مرة أخرى.",
      source: "server",
    },
  };
}

/**
 * Helper مختصر للاستخدام في catch blocks
 *
 * استخدام:
 * ```
 * catch (err: any) {
 *   sendError(res, err, "إنشاء واجب");
 * }
 * ```
 */
export function sendError(res: any, err: any, context?: string): void {
  const { status, body } = handleApiError(err, context);
  res.status(status).json(body);
}

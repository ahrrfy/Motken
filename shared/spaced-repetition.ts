/**
 * خوارزمية المراجعة الذكية (SM-2 مبسطة) لحفظ القرآن الكريم
 * تحدد موعد المراجعة التالي بناءً على أداء المراجعات السابقة
 */

export interface ReviewResult {
  nextReviewDate: Date;
  newInterval: number;      // بالأيام
  newEaseFactor: number;
  reviewStreak: number;
}

export interface ReviewInput {
  grade: number;            // 1-5 (1=سيء, 5=ممتاز)
  currentInterval: number;  // الفترة الحالية بالأيام
  currentEaseFactor: number; // معامل السهولة (2.5 افتراضي)
  currentStreak: number;    // عدد المراجعات المتتالية الناجحة
}

/**
 * فترات المراجعة الأساسية (بالأيام)
 * متدرجة حسب مستوى الإتقان
 */
const BASE_INTERVALS = [1, 3, 7, 14, 30, 60, 90, 180];

/**
 * حساب موعد المراجعة التالي بناءً على نتيجة المراجعة
 *
 * @param input بيانات المراجعة الحالية
 * @returns نتيجة المراجعة مع الموعد التالي
 */
export function calculateNextReview(input: ReviewInput): ReviewResult {
  const { grade, currentInterval, currentEaseFactor, currentStreak } = input;

  let newInterval: number;
  let newEaseFactor: number;
  let newStreak: number;

  if (grade >= 4) {
    // أداء ممتاز — زيادة الفترة
    newStreak = currentStreak + 1;
    newEaseFactor = Math.min(3.0, currentEaseFactor + 0.1);

    if (currentInterval === 0 || currentStreak === 0) {
      // أول مراجعة ناجحة
      newInterval = 1;
    } else if (currentStreak === 1) {
      newInterval = 3;
    } else {
      // استخدام الفترات الأساسية مع معامل السهولة
      const idx = Math.min(currentStreak - 1, BASE_INTERVALS.length - 1);
      newInterval = Math.round(BASE_INTERVALS[idx] * newEaseFactor / 2.5);
    }

  } else if (grade === 3) {
    // أداء متوسط — نفس الفترة أو أقل قليلاً
    newStreak = currentStreak; // لا تزيد ولا تنقص
    newEaseFactor = currentEaseFactor;
    newInterval = Math.max(1, Math.round(currentInterval * 0.8));

  } else if (grade === 2) {
    // أداء ضعيف — تقليل الفترة
    newStreak = Math.max(0, currentStreak - 1);
    newEaseFactor = Math.max(1.5, currentEaseFactor - 0.15);
    newInterval = Math.max(1, Math.round(currentInterval * 0.5));

  } else {
    // أداء سيء جداً (1) — إعادة من البداية
    newStreak = 0;
    newEaseFactor = Math.max(1.3, currentEaseFactor - 0.3);
    newInterval = 1; // مراجعة غداً
  }

  // الحد الأقصى 180 يوم
  newInterval = Math.min(newInterval, 180);

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
  nextReviewDate.setHours(0, 0, 0, 0);

  return {
    nextReviewDate,
    newInterval,
    newEaseFactor,
    reviewStreak: newStreak,
  };
}

/**
 * حساب أولوية المراجعة (0-1)
 * كلما زادت القيمة، كانت المراجعة أكثر إلحاحاً
 */
export function calculateReviewPriority(
  nextReviewDate: Date,
  interval: number,
  easeFactor: number,
): number {
  const now = new Date();
  const diffDays = (now.getTime() - nextReviewDate.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) {
    // لم يحن موعد المراجعة بعد
    return 0;
  }

  // كلما تأخرت المراجعة، زادت الأولوية
  // وكلما كان المعامل أقل (صعوبة أكبر)، زادت الأولوية
  const overdueFactor = Math.min(1, diffDays / Math.max(interval, 1));
  const difficultyFactor = 1 - ((easeFactor - 1.3) / (3.0 - 1.3));

  return Math.min(1, (overdueFactor * 0.7) + (difficultyFactor * 0.3));
}

/**
 * وصف مستوى الإتقان بالعربية
 */
export function getRetentionLevel(interval: number, streak: number): string {
  if (streak === 0 || interval <= 1) return "يحتاج تثبيت";
  if (interval <= 3) return "مبتدئ";
  if (interval <= 7) return "متوسط";
  if (interval <= 30) return "جيد";
  if (interval <= 90) return "ممتاز";
  return "متقن";
}

import { storage } from "../storage";

export async function logActivity(user: any, action: string, module: string, details?: string) {
  await storage.createActivityLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    mosqueId: user.mosqueId,
    action,
    module,
    details,
    status: "success",
  });
}

export function getTeacherLevelsArray(teacher: any): number[] {
  if (!teacher.teacherLevels) return [1, 2, 3, 4, 5, 6, 7];
  return teacher.teacherLevels.split(",").map(Number).filter((n: number) => n >= 1 && n <= 7);
}

export function canTeacherAccessStudent(teacher: any, student: any): boolean {
  if (!teacher.mosqueId || teacher.mosqueId !== student.mosqueId) return false;
  const teacherLevels = getTeacherLevelsArray(teacher);
  const studentLevel = student.level || 1;
  return teacherLevels.includes(studentLevel);
}

export function canTeacherAccessAssignment(teacher: any, assignment: any, student: any): boolean {
  if (assignment.mosqueId !== teacher.mosqueId) return false;
  return canTeacherAccessStudent(teacher, student);
}

export function calculateStudentLevel(juzCount: number): number {
  if (juzCount >= 30) return 7;
  if (juzCount >= 26) return 6;
  if (juzCount >= 21) return 5;
  if (juzCount >= 16) return 4;
  if (juzCount >= 11) return 3;
  if (juzCount >= 6) return 2;
  return 1;
}

export const LEVEL_NAMES: Record<number, { ar: string; en: string }> = {
  1: { ar: "المستوى الأول", en: "Level 1" },
  2: { ar: "المستوى الثاني", en: "Level 2" },
  3: { ar: "المستوى الثالث", en: "Level 3" },
  4: { ar: "المستوى الرابع", en: "Level 4" },
  5: { ar: "المستوى الخامس", en: "Level 5" },
  6: { ar: "المستوى السادس", en: "Level 6" },
  7: { ar: "حافظ", en: "Hafiz" },
};

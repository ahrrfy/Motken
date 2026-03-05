import {
  type User, type InsertUser,
  type Mosque, type InsertMosque,
  type Assignment, type InsertAssignment,
  type ActivityLog, type InsertActivityLog,
  type Notification, type InsertNotification,
  type Rating, type InsertRating,
  type Exam, type InsertExam,
  type ExamStudent, type InsertExamStudent,
  type Course, type InsertCourse,
  type CourseStudent, type InsertCourseStudent,
  type CourseTeacher, type InsertCourseTeacher,
  type Certificate, type InsertCertificate,
  type BannedDevice, type InsertBannedDevice,
  type FeatureFlag, type InsertFeatureFlag,
  type Attendance, type InsertAttendance,
  type Message, type InsertMessage,
  type Point, type InsertPoint,
  type Badge, type InsertBadge,
  type Schedule, type InsertSchedule,
  type Competition, type InsertCompetition,
  type CompetitionParticipant, type InsertCompetitionParticipant,
  type ParentReport, type InsertParentReport,
  type EmergencySubstitution, type InsertEmergencySubstitution,
  type IncidentRecord, type InsertIncidentRecord,
  type Graduate, type InsertGraduate,
  type GraduateFollowup, type InsertGraduateFollowup,
  type StudentTransfer, type InsertStudentTransfer,
  type FamilyLink, type InsertFamilyLink,
  type Feedback, type InsertFeedback,
  type TajweedRule, type InsertTajweedRule,
  type SimilarVerse, type InsertSimilarVerse,
  type QuranProgress, type InsertQuranProgress,
  users, mosques, assignments, activityLogs, notifications, ratings, exams, examStudents,
  courses, courseStudents, courseTeachers, certificates, bannedDevices,
  featureFlags, attendance, messages, points, badges, schedules, competitions,
  competitionParticipants, parentReports,
  emergencySubstitutions, incidentRecords, graduates, graduateFollowups,
  studentTransfers, familyLinks, feedback, tajweedRules, similarVerses, quranProgress,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, inArray, sum, count, asc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByMosque(mosqueId: string): Promise<User[]>;
  getUsersByMosqueAndRole(mosqueId: string, role: string): Promise<User[]>;
  getUsersByTeacher(teacherId: string): Promise<User[]>;
  checkPhoneExists(phone: string, excludeId?: string): Promise<boolean>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  getMosque(id: string): Promise<Mosque | undefined>;
  getMosques(): Promise<Mosque[]>;
  createMosque(mosque: InsertMosque): Promise<Mosque>;
  updateMosque(id: string, data: Partial<InsertMosque>): Promise<Mosque | undefined>;
  deleteMosque(id: string): Promise<void>;

  getAssignment(id: string): Promise<Assignment | undefined>;
  getAssignments(): Promise<Assignment[]>;
  getAssignmentsByMosque(mosqueId: string): Promise<Assignment[]>;
  getAssignmentsByStudent(studentId: string): Promise<Assignment[]>;
  getAssignmentsByTeacher(teacherId: string): Promise<Assignment[]>;
  createAssignment(a: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: string, data: Partial<InsertAssignment>): Promise<Assignment | undefined>;
  updateAssignments(studentId: string, oldTeacherId: string | null, newTeacherId: string): Promise<void>;
  deleteAssignment(id: string): Promise<void>;

  getRatingsByUser(toUserId: string): Promise<Rating[]>;
  getRatingsByMosque(mosqueId: string): Promise<Rating[]>;
  createRating(r: InsertRating): Promise<Rating>;

  getExam(id: string): Promise<Exam | undefined>;
  getExamsByTeacher(teacherId: string): Promise<Exam[]>;
  getExamsByMosque(mosqueId: string): Promise<Exam[]>;
  createExam(e: InsertExam): Promise<Exam>;
  updateExam(id: string, data: Partial<InsertExam>): Promise<Exam | undefined>;
  deleteExam(id: string): Promise<void>;

  getExamStudents(examId: string): Promise<ExamStudent[]>;
  createExamStudent(es: InsertExamStudent): Promise<ExamStudent>;
  updateExamStudent(id: string, data: Partial<InsertExamStudent>): Promise<ExamStudent | undefined>;
  getExamsByStudent(studentId: string): Promise<ExamStudent[]>;

  getActivityLogs(): Promise<ActivityLog[]>;
  getActivityLogsByMosque(mosqueId: string): Promise<ActivityLog[]>;
  getActivityLogsByUser(userId: string): Promise<ActivityLog[]>;
  getActivityLogsByMosqueAndRole(mosqueId: string, role: string): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  getNotification(id: string): Promise<Notification | undefined>;
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(n: InsertNotification): Promise<Notification>;
  updateNotification(id: string, data: Partial<InsertNotification>): Promise<Notification | undefined>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  deleteNotifications(ids: string[], userId: string): Promise<void>;

  getCourse(id: string): Promise<Course | undefined>;
  getCourses(): Promise<Course[]>;
  getCoursesByMosque(mosqueId: string): Promise<Course[]>;
  getCoursesByCreator(createdBy: string): Promise<Course[]>;
  createCourse(c: InsertCourse): Promise<Course>;
  updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course | undefined>;
  deleteCourse(id: string): Promise<void>;
  getCourseStudents(courseId: string): Promise<CourseStudent[]>;
  createCourseStudent(cs: InsertCourseStudent): Promise<CourseStudent>;
  updateCourseStudent(id: string, data: Partial<InsertCourseStudent>): Promise<CourseStudent | undefined>;
  deleteCourseStudent(id: string): Promise<void>;
  getCourseTeachers(courseId: string): Promise<CourseTeacher[]>;
  createCourseTeacher(ct: InsertCourseTeacher): Promise<CourseTeacher>;
  deleteCourseTeacher(id: string): Promise<void>;
  getCertificatesByCourse(courseId: string): Promise<Certificate[]>;
  getCertificatesByStudent(studentId: string): Promise<Certificate[]>;
  getCertificatesByMosque(mosqueId: string): Promise<Certificate[]>;
  createCertificate(c: InsertCertificate): Promise<Certificate>;
  deleteCertificate(id: string): Promise<void>;
  getCertificate(id: string): Promise<Certificate | undefined>;
  getCertificateByNumber(certNumber: string): Promise<Certificate | undefined>;
  getCoursesByStudent(studentId: string): Promise<CourseStudent[]>;
  getCoursesByTeacher(teacherId: string): Promise<CourseTeacher[]>;

  getBannedDevices(): Promise<BannedDevice[]>;
  createBannedDevice(bd: InsertBannedDevice): Promise<BannedDevice>;
  deleteBannedDevice(id: string): Promise<void>;
  isBannedIP(ip: string): Promise<boolean>;
  isBannedFingerprint(fingerprint: string): Promise<boolean>;

  getFeatureFlags(): Promise<FeatureFlag[]>;
  getFeatureFlag(featureKey: string): Promise<FeatureFlag | undefined>;
  createFeatureFlag(ff: InsertFeatureFlag): Promise<FeatureFlag>;
  updateFeatureFlag(id: string, data: Partial<InsertFeatureFlag>): Promise<FeatureFlag | undefined>;
  isFeatureEnabled(featureKey: string): Promise<boolean>;

  getAttendance(id: string): Promise<Attendance | undefined>;
  getAttendanceByStudent(studentId: string): Promise<Attendance[]>;
  getAttendanceByTeacher(teacherId: string): Promise<Attendance[]>;
  getAttendanceByMosque(mosqueId: string): Promise<Attendance[]>;
  getAttendanceByDate(date: Date, teacherId: string): Promise<Attendance[]>;
  createAttendance(a: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: string, data: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  deleteAttendance(id: string): Promise<void>;

  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByUser(userId: string): Promise<Message[]>;
  getConversation(userId1: string, userId2: string): Promise<Message[]>;
  createMessage(m: InsertMessage): Promise<Message>;
  markMessageRead(id: string): Promise<void>;
  markAllMessagesRead(senderId: string, receiverId: string): Promise<void>;
  deleteMessage(id: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;

  getPointsByUser(userId: string): Promise<Point[]>;
  getPointsByMosque(mosqueId: string): Promise<Point[]>;
  getTotalPoints(userId: string): Promise<number>;
  createPoint(p: InsertPoint): Promise<Point>;
  getLeaderboard(mosqueId?: string): Promise<{id: string, name: string, username: string, avatar: string | null, totalPoints: number}[]>;

  getBadgesByUser(userId: string): Promise<Badge[]>;
  getBadgesByMosque(mosqueId: string): Promise<Badge[]>;
  createBadge(b: InsertBadge): Promise<Badge>;
  deleteBadge(id: string): Promise<void>;

  getSchedule(id: string): Promise<Schedule | undefined>;
  getSchedulesByMosque(mosqueId: string): Promise<Schedule[]>;
  getSchedulesByTeacher(teacherId: string): Promise<Schedule[]>;
  createSchedule(s: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: string, data: Partial<InsertSchedule>): Promise<Schedule | undefined>;
  deleteSchedule(id: string): Promise<void>;

  getCompetition(id: string): Promise<Competition | undefined>;
  getCompetitions(): Promise<Competition[]>;
  getCompetitionsByMosque(mosqueId: string): Promise<Competition[]>;
  createCompetition(c: InsertCompetition): Promise<Competition>;
  updateCompetition(id: string, data: Partial<InsertCompetition>): Promise<Competition | undefined>;
  deleteCompetition(id: string): Promise<void>;

  getCompetitionParticipants(competitionId: string): Promise<CompetitionParticipant[]>;
  createCompetitionParticipant(cp: InsertCompetitionParticipant): Promise<CompetitionParticipant>;
  updateCompetitionParticipant(id: string, data: Partial<InsertCompetitionParticipant>): Promise<CompetitionParticipant | undefined>;
  deleteCompetitionParticipant(id: string): Promise<void>;

  getParentReport(id: string): Promise<ParentReport | undefined>;
  getParentReportByToken(token: string): Promise<ParentReport | undefined>;
  getParentReportsByStudent(studentId: string): Promise<ParentReport[]>;
  createParentReport(pr: InsertParentReport): Promise<ParentReport>;
  deleteParentReport(id: string): Promise<void>;

  getEmergencySubstitution(id: string): Promise<EmergencySubstitution | undefined>;
  getEmergencySubstitutionsByMosque(mosqueId: string): Promise<EmergencySubstitution[]>;
  createEmergencySubstitution(data: InsertEmergencySubstitution): Promise<EmergencySubstitution>;
  updateEmergencySubstitution(id: string, data: Partial<InsertEmergencySubstitution>): Promise<EmergencySubstitution | undefined>;
  deleteEmergencySubstitution(id: string): Promise<void>;

  getIncidentRecord(id: string): Promise<IncidentRecord | undefined>;
  getIncidentRecordsByMosque(mosqueId: string): Promise<IncidentRecord[]>;
  createIncidentRecord(data: InsertIncidentRecord): Promise<IncidentRecord>;
  updateIncidentRecord(id: string, data: Partial<InsertIncidentRecord>): Promise<IncidentRecord | undefined>;
  deleteIncidentRecord(id: string): Promise<void>;

  getGraduate(id: string): Promise<Graduate | undefined>;
  getGraduatesByMosque(mosqueId: string): Promise<Graduate[]>;
  getGraduatesByStudent(studentId: string): Promise<Graduate[]>;
  createGraduate(data: InsertGraduate): Promise<Graduate>;
  updateGraduate(id: string, data: Partial<InsertGraduate>): Promise<Graduate | undefined>;
  deleteGraduate(id: string): Promise<void>;

  getGraduateFollowup(id: string): Promise<GraduateFollowup | undefined>;
  getGraduateFollowupsByMosque(mosqueId: string): Promise<GraduateFollowup[]>;
  getGraduateFollowupsByGraduate(graduateId: string): Promise<GraduateFollowup[]>;
  createGraduateFollowup(data: InsertGraduateFollowup): Promise<GraduateFollowup>;
  updateGraduateFollowup(id: string, data: Partial<InsertGraduateFollowup>): Promise<GraduateFollowup | undefined>;
  deleteGraduateFollowup(id: string): Promise<void>;

  getStudentTransfer(id: string): Promise<StudentTransfer | undefined>;
  getStudentTransfersByMosque(mosqueId: string): Promise<StudentTransfer[]>;
  getStudentTransfersByStudent(studentId: string): Promise<StudentTransfer[]>;
  createStudentTransfer(data: InsertStudentTransfer): Promise<StudentTransfer>;
  updateStudentTransfer(id: string, data: Partial<InsertStudentTransfer>): Promise<StudentTransfer | undefined>;
  deleteStudentTransfer(id: string): Promise<void>;

  getFamilyLink(id: string): Promise<FamilyLink | undefined>;
  getFamilyLinksByMosque(mosqueId: string): Promise<FamilyLink[]>;
  getFamilyLinksByParentPhone(parentPhone: string): Promise<FamilyLink[]>;
  getFamilyLinksByStudent(studentId: string): Promise<FamilyLink[]>;
  createFamilyLink(data: InsertFamilyLink): Promise<FamilyLink>;
  updateFamilyLink(id: string, data: Partial<InsertFamilyLink>): Promise<FamilyLink | undefined>;
  deleteFamilyLink(id: string): Promise<void>;

  getFeedback(id: string): Promise<Feedback | undefined>;
  getFeedbackByMosque(mosqueId: string): Promise<Feedback[]>;
  getFeedbackByUser(userId: string): Promise<Feedback[]>;
  getAllFeedback(): Promise<Feedback[]>;
  createFeedback(data: InsertFeedback): Promise<Feedback>;
  updateFeedback(id: string, data: Partial<InsertFeedback>): Promise<Feedback | undefined>;
  deleteFeedback(id: string): Promise<void>;

  getTajweedRule(id: string): Promise<TajweedRule | undefined>;
  getAllTajweedRules(): Promise<TajweedRule[]>;
  getTajweedRulesByCategory(category: string): Promise<TajweedRule[]>;
  createTajweedRule(data: InsertTajweedRule): Promise<TajweedRule>;
  updateTajweedRule(id: string, data: Partial<InsertTajweedRule>): Promise<TajweedRule | undefined>;
  deleteTajweedRule(id: string): Promise<void>;

  getSimilarVerse(id: string): Promise<SimilarVerse | undefined>;
  getAllSimilarVerses(): Promise<SimilarVerse[]>;
  createSimilarVerse(data: InsertSimilarVerse): Promise<SimilarVerse>;
  updateSimilarVerse(id: string, data: Partial<InsertSimilarVerse>): Promise<SimilarVerse | undefined>;
  deleteSimilarVerse(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role as any)).orderBy(desc(users.createdAt));
  }

  async getUsersByMosque(mosqueId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.mosqueId, mosqueId)).orderBy(desc(users.createdAt));
  }

  async getUsersByMosqueAndRole(mosqueId: string, role: string): Promise<User[]> {
    return db.select().from(users).where(
      and(eq(users.mosqueId, mosqueId), eq(users.role, role as any))
    ).orderBy(desc(users.createdAt));
  }

  async getUsersByTeacher(teacherId: string): Promise<User[]> {
    return db.select().from(users).where(
      and(eq(users.teacherId, teacherId), eq(users.role, "student"))
    ).orderBy(desc(users.createdAt));
  }

  async checkPhoneExists(phone: string, excludeId?: string): Promise<boolean> {
    const phoneClean = (phone || "").replace(/[^\d]/g, "");
    if (!phoneClean) return false;
    const excludeParam = excludeId || "";
    const result = await db.execute(sql`
      SELECT id FROM users
      WHERE id != ${excludeParam}
        AND (
          REGEXP_REPLACE(COALESCE(phone,''), '[^0-9]', '', 'g') = ${phoneClean}
          OR REGEXP_REPLACE(COALESCE(parent_phone,''), '[^0-9]', '', 'g') = ${phoneClean}
        )
      LIMIT 1
    `);
    return result.rows.length > 0;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(courseStudents).where(eq(courseStudents.studentId, id));
    await db.delete(courseTeachers).where(eq(courseTeachers.teacherId, id));
    await db.delete(certificates).where(eq(certificates.studentId, id));
    await db.delete(certificates).where(eq(certificates.issuedBy, id));
    await db.delete(notifications).where(eq(notifications.userId, id));
    await db.delete(activityLogs).where(eq(activityLogs.userId, id));
    await db.delete(ratings).where(eq(ratings.fromUserId, id));
    await db.delete(ratings).where(eq(ratings.toUserId, id));
    await db.delete(examStudents).where(eq(examStudents.studentId, id));
    await db.delete(assignments).where(eq(assignments.studentId, id));
    await db.delete(assignments).where(eq(assignments.teacherId, id));
    await db.delete(exams).where(eq(exams.teacherId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  async getMosque(id: string): Promise<Mosque | undefined> {
    const [mosque] = await db.select().from(mosques).where(eq(mosques.id, id));
    return mosque;
  }

  async getMosques(): Promise<Mosque[]> {
    return db.select().from(mosques).orderBy(desc(mosques.createdAt));
  }

  async createMosque(mosque: InsertMosque): Promise<Mosque> {
    const [m] = await db.insert(mosques).values(mosque).returning();
    return m;
  }

  async updateMosque(id: string, data: Partial<InsertMosque>): Promise<Mosque | undefined> {
    const [m] = await db.update(mosques).set(data).where(eq(mosques.id, id)).returning();
    return m;
  }

  async deleteMosque(id: string): Promise<void> {
    const mosqueUsers = await this.getUsersByMosque(id);
    for (const user of mosqueUsers) {
      await this.deleteUser(user.id);
    }
    await db.delete(activityLogs).where(eq(activityLogs.mosqueId, id));
    await db.delete(notifications).where(eq(notifications.mosqueId, id));
    await db.delete(mosques).where(eq(mosques.id, id));
  }

  async getAssignment(id: string): Promise<Assignment | undefined> {
    const [assignment] = await db.select().from(assignments).where(eq(assignments.id, id));
    return assignment;
  }

  async getAssignments(): Promise<Assignment[]> {
    return db.select().from(assignments).orderBy(desc(assignments.createdAt));
  }

  async getAssignmentsByMosque(mosqueId: string): Promise<Assignment[]> {
    return db.select().from(assignments).where(eq(assignments.mosqueId, mosqueId)).orderBy(desc(assignments.createdAt));
  }

  async getAssignmentsByStudent(studentId: string): Promise<Assignment[]> {
    return db.select().from(assignments).where(eq(assignments.studentId, studentId)).orderBy(desc(assignments.scheduledDate));
  }

  async getAssignmentsByTeacher(teacherId: string): Promise<Assignment[]> {
    return db.select().from(assignments).where(eq(assignments.teacherId, teacherId)).orderBy(desc(assignments.scheduledDate));
  }

  async createAssignment(a: InsertAssignment): Promise<Assignment> {
    const [assignment] = await db.insert(assignments).values(a).returning();
    return assignment;
  }

  async updateAssignment(id: string, data: Partial<InsertAssignment>): Promise<Assignment | undefined> {
    const [assignment] = await db.update(assignments).set(data).where(eq(assignments.id, id)).returning();
    return assignment;
  }

  async updateAssignments(studentId: string, oldTeacherId: string | null, newTeacherId: string): Promise<void> {
    const conditions = oldTeacherId
      ? and(eq(assignments.studentId, studentId), eq(assignments.teacherId, oldTeacherId))
      : eq(assignments.studentId, studentId);
    await db.update(assignments).set({ teacherId: newTeacherId }).where(conditions);
  }

  async deleteAssignment(id: string): Promise<void> {
    await db.delete(assignments).where(eq(assignments.id, id));
  }

  async getRatingsByUser(toUserId: string): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.toUserId, toUserId)).orderBy(desc(ratings.createdAt));
  }

  async getRatingsByMosque(mosqueId: string): Promise<Rating[]> {
    return db.select().from(ratings).where(eq(ratings.mosqueId, mosqueId)).orderBy(desc(ratings.createdAt));
  }

  async createRating(r: InsertRating): Promise<Rating> {
    const [rating] = await db.insert(ratings).values(r).returning();
    return rating;
  }

  async getExam(id: string): Promise<Exam | undefined> {
    const [exam] = await db.select().from(exams).where(eq(exams.id, id));
    return exam;
  }

  async getExamsByTeacher(teacherId: string): Promise<Exam[]> {
    return db.select().from(exams).where(eq(exams.teacherId, teacherId)).orderBy(desc(exams.createdAt));
  }

  async getExamsByMosque(mosqueId: string): Promise<Exam[]> {
    return db.select().from(exams).where(eq(exams.mosqueId, mosqueId)).orderBy(desc(exams.createdAt));
  }

  async createExam(e: InsertExam): Promise<Exam> {
    const [exam] = await db.insert(exams).values(e).returning();
    return exam;
  }

  async updateExam(id: string, data: Partial<InsertExam>): Promise<Exam | undefined> {
    const [exam] = await db.update(exams).set(data).where(eq(exams.id, id)).returning();
    return exam;
  }

  async deleteExam(id: string): Promise<void> {
    await db.delete(examStudents).where(eq(examStudents.examId, id));
    await db.delete(exams).where(eq(exams.id, id));
  }

  async getExamStudents(examId: string): Promise<ExamStudent[]> {
    return db.select().from(examStudents).where(eq(examStudents.examId, examId)).orderBy(desc(examStudents.createdAt));
  }

  async createExamStudent(es: InsertExamStudent): Promise<ExamStudent> {
    const [entry] = await db.insert(examStudents).values(es).returning();
    return entry;
  }

  async updateExamStudent(id: string, data: Partial<InsertExamStudent>): Promise<ExamStudent | undefined> {
    const [entry] = await db.update(examStudents).set(data).where(eq(examStudents.id, id)).returning();
    return entry;
  }

  async getExamsByStudent(studentId: string): Promise<ExamStudent[]> {
    return db.select().from(examStudents).where(eq(examStudents.studentId, studentId)).orderBy(desc(examStudents.createdAt));
  }

  async getActivityLogs(): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt));
  }

  async getActivityLogsByMosque(mosqueId: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).where(eq(activityLogs.mosqueId, mosqueId)).orderBy(desc(activityLogs.createdAt));
  }

  async getActivityLogsByUser(userId: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).where(eq(activityLogs.userId, userId)).orderBy(desc(activityLogs.createdAt));
  }

  async getActivityLogsByMosqueAndRole(mosqueId: string, role: string): Promise<ActivityLog[]> {
    return db.select().from(activityLogs).where(
      and(eq(activityLogs.mosqueId, mosqueId), eq(activityLogs.userRole, role))
    ).orderBy(desc(activityLogs.createdAt));
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [entry] = await db.insert(activityLogs).values(log).returning();
    return entry;
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const [notif] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notif;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(n: InsertNotification): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(n).returning();
    return notif;
  }

  async updateNotification(id: string, data: Partial<InsertNotification>): Promise<Notification | undefined> {
    const [notif] = await db.update(notifications).set(data).where(eq(notifications.id, id)).returning();
    return notif;
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }

  async deleteNotification(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async deleteNotifications(ids: string[], userId: string): Promise<void> {
    for (const id of ids) {
      await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    }
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async getCourses(): Promise<Course[]> {
    return db.select().from(courses).orderBy(desc(courses.createdAt));
  }

  async getCoursesByMosque(mosqueId: string): Promise<Course[]> {
    return db.select().from(courses).where(eq(courses.mosqueId, mosqueId)).orderBy(desc(courses.createdAt));
  }

  async getCoursesByCreator(createdBy: string): Promise<Course[]> {
    return db.select().from(courses).where(eq(courses.createdBy, createdBy)).orderBy(desc(courses.createdAt));
  }

  async createCourse(c: InsertCourse): Promise<Course> {
    const [course] = await db.insert(courses).values(c).returning();
    return course;
  }

  async updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course | undefined> {
    const [course] = await db.update(courses).set(data).where(eq(courses.id, id)).returning();
    return course;
  }

  async deleteCourse(id: string): Promise<void> {
    await db.delete(courseStudents).where(eq(courseStudents.courseId, id));
    await db.delete(courseTeachers).where(eq(courseTeachers.courseId, id));
    await db.delete(certificates).where(eq(certificates.courseId, id));
    await db.delete(courses).where(eq(courses.id, id));
  }

  async getCourseStudents(courseId: string): Promise<CourseStudent[]> {
    return db.select().from(courseStudents).where(eq(courseStudents.courseId, courseId));
  }

  async createCourseStudent(cs: InsertCourseStudent): Promise<CourseStudent> {
    const [entry] = await db.insert(courseStudents).values(cs).returning();
    return entry;
  }

  async updateCourseStudent(id: string, data: Partial<InsertCourseStudent>): Promise<CourseStudent | undefined> {
    const [entry] = await db.update(courseStudents).set(data).where(eq(courseStudents.id, id)).returning();
    return entry;
  }

  async deleteCourseStudent(id: string): Promise<void> {
    await db.delete(courseStudents).where(eq(courseStudents.id, id));
  }

  async getCourseTeachers(courseId: string): Promise<CourseTeacher[]> {
    return db.select().from(courseTeachers).where(eq(courseTeachers.courseId, courseId));
  }

  async createCourseTeacher(ct: InsertCourseTeacher): Promise<CourseTeacher> {
    const [entry] = await db.insert(courseTeachers).values(ct).returning();
    return entry;
  }

  async deleteCourseTeacher(id: string): Promise<void> {
    await db.delete(courseTeachers).where(eq(courseTeachers.id, id));
  }

  async getCertificatesByCourse(courseId: string): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.courseId, courseId)).orderBy(desc(certificates.createdAt));
  }

  async getCertificatesByStudent(studentId: string): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.studentId, studentId)).orderBy(desc(certificates.createdAt));
  }

  async getCertificatesByMosque(mosqueId: string): Promise<Certificate[]> {
    return db.select().from(certificates).where(eq(certificates.mosqueId, mosqueId)).orderBy(desc(certificates.createdAt));
  }

  async createCertificate(c: InsertCertificate): Promise<Certificate> {
    const [cert] = await db.insert(certificates).values(c).returning();
    return cert;
  }

  async deleteCertificate(id: string): Promise<void> {
    await db.delete(certificates).where(eq(certificates.id, id));
  }

  async getCertificate(id: string): Promise<Certificate | undefined> {
    const [cert] = await db.select().from(certificates).where(eq(certificates.id, id));
    return cert;
  }

  async getCertificateByNumber(certNumber: string): Promise<Certificate | undefined> {
    const [cert] = await db.select().from(certificates).where(eq(certificates.certificateNumber, certNumber));
    return cert;
  }

  async getCoursesByStudent(studentId: string): Promise<CourseStudent[]> {
    return db.select().from(courseStudents).where(eq(courseStudents.studentId, studentId));
  }

  async getCoursesByTeacher(teacherId: string): Promise<CourseTeacher[]> {
    return db.select().from(courseTeachers).where(eq(courseTeachers.teacherId, teacherId));
  }

  async getBannedDevices(): Promise<BannedDevice[]> {
    return db.select().from(bannedDevices).orderBy(desc(bannedDevices.createdAt));
  }

  async createBannedDevice(bd: InsertBannedDevice): Promise<BannedDevice> {
    const [entry] = await db.insert(bannedDevices).values(bd).returning();
    return entry;
  }

  async deleteBannedDevice(id: string): Promise<void> {
    await db.delete(bannedDevices).where(eq(bannedDevices.id, id));
  }

  async isBannedIP(ip: string): Promise<boolean> {
    const [result] = await db.select().from(bannedDevices).where(eq(bannedDevices.ipAddress, ip)).limit(1);
    return !!result;
  }

  async isBannedFingerprint(fingerprint: string): Promise<boolean> {
    const [result] = await db.select().from(bannedDevices).where(eq(bannedDevices.deviceFingerprint, fingerprint)).limit(1);
    return !!result;
  }

  async getFeatureFlags(): Promise<FeatureFlag[]> {
    return db.select().from(featureFlags).orderBy(desc(featureFlags.createdAt));
  }

  async getFeatureFlag(featureKey: string): Promise<FeatureFlag | undefined> {
    const [ff] = await db.select().from(featureFlags).where(eq(featureFlags.featureKey, featureKey));
    return ff;
  }

  async createFeatureFlag(ff: InsertFeatureFlag): Promise<FeatureFlag> {
    const [entry] = await db.insert(featureFlags).values(ff).returning();
    return entry;
  }

  async updateFeatureFlag(id: string, data: Partial<InsertFeatureFlag>): Promise<FeatureFlag | undefined> {
    const [entry] = await db.update(featureFlags).set(data).where(eq(featureFlags.id, id)).returning();
    return entry;
  }

  async isFeatureEnabled(featureKey: string): Promise<boolean> {
    const [ff] = await db.select().from(featureFlags).where(eq(featureFlags.featureKey, featureKey));
    return ff?.isEnabled ?? false;
  }

  async getAttendance(id: string): Promise<Attendance | undefined> {
    const [entry] = await db.select().from(attendance).where(eq(attendance.id, id));
    return entry;
  }

  async getAttendanceByStudent(studentId: string): Promise<Attendance[]> {
    return db.select().from(attendance).where(eq(attendance.studentId, studentId)).orderBy(desc(attendance.date));
  }

  async getAttendanceByTeacher(teacherId: string): Promise<Attendance[]> {
    return db.select().from(attendance).where(eq(attendance.teacherId, teacherId)).orderBy(desc(attendance.date));
  }

  async getAttendanceByMosque(mosqueId: string): Promise<Attendance[]> {
    return db.select().from(attendance).where(eq(attendance.mosqueId, mosqueId)).orderBy(desc(attendance.date));
  }

  async getAttendanceByDate(date: Date, teacherId: string): Promise<Attendance[]> {
    return db.select().from(attendance).where(
      and(eq(attendance.date, date), eq(attendance.teacherId, teacherId))
    ).orderBy(desc(attendance.createdAt));
  }

  async createAttendance(a: InsertAttendance): Promise<Attendance> {
    const [entry] = await db.insert(attendance).values(a).returning();
    return entry;
  }

  async updateAttendance(id: string, data: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const [entry] = await db.update(attendance).set(data).where(eq(attendance.id, id)).returning();
    return entry;
  }

  async deleteAttendance(id: string): Promise<void> {
    await db.delete(attendance).where(eq(attendance.id, id));
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [msg] = await db.select().from(messages).where(eq(messages.id, id));
    return msg;
  }

  async getMessagesByUser(userId: string): Promise<Message[]> {
    return db.select().from(messages).where(
      or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
    ).orderBy(desc(messages.createdAt));
  }

  async getConversation(userId1: string, userId2: string): Promise<Message[]> {
    return db.select().from(messages).where(
      or(
        and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
      )
    ).orderBy(asc(messages.createdAt));
  }

  async createMessage(m: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(m).returning();
    return msg;
  }

  async markMessageRead(id: string): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
  }

  async markAllMessagesRead(senderId: string, receiverId: string): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(
      and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId))
    );
  }

  async deleteMessage(id: string): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const [result] = await db.select({ value: count() }).from(messages).where(
      and(eq(messages.receiverId, userId), eq(messages.isRead, false))
    );
    return result?.value ?? 0;
  }

  async getPointsByUser(userId: string): Promise<Point[]> {
    return db.select().from(points).where(eq(points.userId, userId)).orderBy(desc(points.createdAt));
  }

  async getPointsByMosque(mosqueId: string): Promise<Point[]> {
    return db.select().from(points).where(eq(points.mosqueId, mosqueId)).orderBy(desc(points.createdAt));
  }

  async getTotalPoints(userId: string): Promise<number> {
    const [result] = await db.select({ value: sum(points.amount) }).from(points).where(eq(points.userId, userId));
    return Number(result?.value ?? 0);
  }

  async createPoint(p: InsertPoint): Promise<Point> {
    const [entry] = await db.insert(points).values(p).returning();
    return entry;
  }

  async getLeaderboard(mosqueId?: string): Promise<{id: string, name: string, username: string, avatar: string | null, totalPoints: number}[]> {
    const query = db.select({
      userId: points.userId,
      total: sum(points.amount),
    }).from(points);

    const results = mosqueId
      ? await query.where(eq(points.mosqueId, mosqueId)).groupBy(points.userId).orderBy(desc(sum(points.amount)))
      : await query.groupBy(points.userId).orderBy(desc(sum(points.amount)));

    const enriched = [];
    for (const r of results) {
      const user = await this.getUser(r.userId);
      if (user) {
        enriched.push({
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          totalPoints: Number(r.total ?? 0),
        });
      }
    }
    return enriched;
  }

  async getBadgesByUser(userId: string): Promise<Badge[]> {
    return db.select().from(badges).where(eq(badges.userId, userId)).orderBy(desc(badges.createdAt));
  }

  async getBadgesByMosque(mosqueId: string): Promise<Badge[]> {
    return db.select().from(badges).where(eq(badges.mosqueId, mosqueId)).orderBy(desc(badges.createdAt));
  }

  async createBadge(b: InsertBadge): Promise<Badge> {
    const [entry] = await db.insert(badges).values(b).returning();
    return entry;
  }

  async deleteBadge(id: string): Promise<void> {
    await db.delete(badges).where(eq(badges.id, id));
  }

  async getSchedule(id: string): Promise<Schedule | undefined> {
    const [entry] = await db.select().from(schedules).where(eq(schedules.id, id));
    return entry;
  }

  async getSchedulesByMosque(mosqueId: string): Promise<Schedule[]> {
    return db.select().from(schedules).where(eq(schedules.mosqueId, mosqueId)).orderBy(asc(schedules.dayOfWeek));
  }

  async getSchedulesByTeacher(teacherId: string): Promise<Schedule[]> {
    return db.select().from(schedules).where(eq(schedules.teacherId, teacherId)).orderBy(asc(schedules.dayOfWeek));
  }

  async createSchedule(s: InsertSchedule): Promise<Schedule> {
    const [entry] = await db.insert(schedules).values(s).returning();
    return entry;
  }

  async updateSchedule(id: string, data: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const [entry] = await db.update(schedules).set(data).where(eq(schedules.id, id)).returning();
    return entry;
  }

  async deleteSchedule(id: string): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }

  async getCompetition(id: string): Promise<Competition | undefined> {
    const [entry] = await db.select().from(competitions).where(eq(competitions.id, id));
    return entry;
  }

  async getCompetitions(): Promise<Competition[]> {
    return db.select().from(competitions).orderBy(desc(competitions.createdAt));
  }

  async getCompetitionsByMosque(mosqueId: string): Promise<Competition[]> {
    return db.select().from(competitions).where(eq(competitions.mosqueId, mosqueId)).orderBy(desc(competitions.createdAt));
  }

  async createCompetition(c: InsertCompetition): Promise<Competition> {
    const [entry] = await db.insert(competitions).values(c).returning();
    return entry;
  }

  async updateCompetition(id: string, data: Partial<InsertCompetition>): Promise<Competition | undefined> {
    const [entry] = await db.update(competitions).set(data).where(eq(competitions.id, id)).returning();
    return entry;
  }

  async deleteCompetition(id: string): Promise<void> {
    await db.delete(competitionParticipants).where(eq(competitionParticipants.competitionId, id));
    await db.delete(competitions).where(eq(competitions.id, id));
  }

  async getCompetitionParticipants(competitionId: string): Promise<CompetitionParticipant[]> {
    return db.select().from(competitionParticipants).where(eq(competitionParticipants.competitionId, competitionId)).orderBy(desc(competitionParticipants.createdAt));
  }

  async createCompetitionParticipant(cp: InsertCompetitionParticipant): Promise<CompetitionParticipant> {
    const [entry] = await db.insert(competitionParticipants).values(cp).returning();
    return entry;
  }

  async updateCompetitionParticipant(id: string, data: Partial<InsertCompetitionParticipant>): Promise<CompetitionParticipant | undefined> {
    const [entry] = await db.update(competitionParticipants).set(data).where(eq(competitionParticipants.id, id)).returning();
    return entry;
  }

  async deleteCompetitionParticipant(id: string): Promise<void> {
    await db.delete(competitionParticipants).where(eq(competitionParticipants.id, id));
  }

  async getParentReport(id: string): Promise<ParentReport | undefined> {
    const [entry] = await db.select().from(parentReports).where(eq(parentReports.id, id));
    return entry;
  }

  async getParentReportByToken(token: string): Promise<ParentReport | undefined> {
    const [entry] = await db.select().from(parentReports).where(eq(parentReports.accessToken, token));
    return entry;
  }

  async getParentReportsByStudent(studentId: string): Promise<ParentReport[]> {
    return db.select().from(parentReports).where(eq(parentReports.studentId, studentId)).orderBy(desc(parentReports.createdAt));
  }

  async createParentReport(pr: InsertParentReport): Promise<ParentReport> {
    const [entry] = await db.insert(parentReports).values(pr).returning();
    return entry;
  }

  async deleteParentReport(id: string): Promise<void> {
    await db.delete(parentReports).where(eq(parentReports.id, id));
  }

  async getEmergencySubstitution(id: string): Promise<EmergencySubstitution | undefined> {
    const [entry] = await db.select().from(emergencySubstitutions).where(eq(emergencySubstitutions.id, id));
    return entry;
  }

  async getEmergencySubstitutionsByMosque(mosqueId: string): Promise<EmergencySubstitution[]> {
    return db.select().from(emergencySubstitutions).where(eq(emergencySubstitutions.mosqueId, mosqueId)).orderBy(desc(emergencySubstitutions.createdAt));
  }

  async createEmergencySubstitution(data: InsertEmergencySubstitution): Promise<EmergencySubstitution> {
    const [entry] = await db.insert(emergencySubstitutions).values(data).returning();
    return entry;
  }

  async updateEmergencySubstitution(id: string, data: Partial<InsertEmergencySubstitution>): Promise<EmergencySubstitution | undefined> {
    const [entry] = await db.update(emergencySubstitutions).set(data).where(eq(emergencySubstitutions.id, id)).returning();
    return entry;
  }

  async deleteEmergencySubstitution(id: string): Promise<void> {
    await db.delete(emergencySubstitutions).where(eq(emergencySubstitutions.id, id));
  }

  async getIncidentRecord(id: string): Promise<IncidentRecord | undefined> {
    const [entry] = await db.select().from(incidentRecords).where(eq(incidentRecords.id, id));
    return entry;
  }

  async getIncidentRecordsByMosque(mosqueId: string): Promise<IncidentRecord[]> {
    return db.select().from(incidentRecords).where(eq(incidentRecords.mosqueId, mosqueId)).orderBy(desc(incidentRecords.createdAt));
  }

  async createIncidentRecord(data: InsertIncidentRecord): Promise<IncidentRecord> {
    const [entry] = await db.insert(incidentRecords).values(data).returning();
    return entry;
  }

  async updateIncidentRecord(id: string, data: Partial<InsertIncidentRecord>): Promise<IncidentRecord | undefined> {
    const [entry] = await db.update(incidentRecords).set(data).where(eq(incidentRecords.id, id)).returning();
    return entry;
  }

  async deleteIncidentRecord(id: string): Promise<void> {
    await db.delete(incidentRecords).where(eq(incidentRecords.id, id));
  }

  async getGraduate(id: string): Promise<Graduate | undefined> {
    const [entry] = await db.select().from(graduates).where(eq(graduates.id, id));
    return entry;
  }

  async getGraduatesByMosque(mosqueId: string): Promise<Graduate[]> {
    return db.select().from(graduates).where(eq(graduates.mosqueId, mosqueId)).orderBy(desc(graduates.createdAt));
  }

  async getGraduatesByStudent(studentId: string): Promise<Graduate[]> {
    return db.select().from(graduates).where(eq(graduates.studentId, studentId)).orderBy(desc(graduates.createdAt));
  }

  async createGraduate(data: InsertGraduate): Promise<Graduate> {
    const [entry] = await db.insert(graduates).values(data).returning();
    return entry;
  }

  async updateGraduate(id: string, data: Partial<InsertGraduate>): Promise<Graduate | undefined> {
    const [entry] = await db.update(graduates).set(data).where(eq(graduates.id, id)).returning();
    return entry;
  }

  async deleteGraduate(id: string): Promise<void> {
    await db.delete(graduates).where(eq(graduates.id, id));
  }

  async getGraduateFollowup(id: string): Promise<GraduateFollowup | undefined> {
    const [entry] = await db.select().from(graduateFollowups).where(eq(graduateFollowups.id, id));
    return entry;
  }

  async getGraduateFollowupsByMosque(mosqueId: string): Promise<GraduateFollowup[]> {
    return db.select().from(graduateFollowups).where(eq(graduateFollowups.mosqueId, mosqueId)).orderBy(desc(graduateFollowups.createdAt));
  }

  async getGraduateFollowupsByGraduate(graduateId: string): Promise<GraduateFollowup[]> {
    return db.select().from(graduateFollowups).where(eq(graduateFollowups.graduateId, graduateId)).orderBy(desc(graduateFollowups.createdAt));
  }

  async createGraduateFollowup(data: InsertGraduateFollowup): Promise<GraduateFollowup> {
    const [entry] = await db.insert(graduateFollowups).values(data).returning();
    return entry;
  }

  async updateGraduateFollowup(id: string, data: Partial<InsertGraduateFollowup>): Promise<GraduateFollowup | undefined> {
    const [entry] = await db.update(graduateFollowups).set(data).where(eq(graduateFollowups.id, id)).returning();
    return entry;
  }

  async deleteGraduateFollowup(id: string): Promise<void> {
    await db.delete(graduateFollowups).where(eq(graduateFollowups.id, id));
  }

  async getStudentTransfer(id: string): Promise<StudentTransfer | undefined> {
    const [entry] = await db.select().from(studentTransfers).where(eq(studentTransfers.id, id));
    return entry;
  }

  async getStudentTransfersByMosque(mosqueId: string): Promise<StudentTransfer[]> {
    return db.select().from(studentTransfers).where(
      or(eq(studentTransfers.fromMosqueId, mosqueId), eq(studentTransfers.toMosqueId, mosqueId))
    ).orderBy(desc(studentTransfers.createdAt));
  }

  async getStudentTransfersByStudent(studentId: string): Promise<StudentTransfer[]> {
    return db.select().from(studentTransfers).where(eq(studentTransfers.studentId, studentId)).orderBy(desc(studentTransfers.createdAt));
  }

  async createStudentTransfer(data: InsertStudentTransfer): Promise<StudentTransfer> {
    const [entry] = await db.insert(studentTransfers).values(data).returning();
    return entry;
  }

  async updateStudentTransfer(id: string, data: Partial<InsertStudentTransfer>): Promise<StudentTransfer | undefined> {
    const [entry] = await db.update(studentTransfers).set(data).where(eq(studentTransfers.id, id)).returning();
    return entry;
  }

  async deleteStudentTransfer(id: string): Promise<void> {
    await db.delete(studentTransfers).where(eq(studentTransfers.id, id));
  }

  async getFamilyLink(id: string): Promise<FamilyLink | undefined> {
    const [entry] = await db.select().from(familyLinks).where(eq(familyLinks.id, id));
    return entry;
  }

  async getFamilyLinksByMosque(mosqueId: string): Promise<FamilyLink[]> {
    return db.select().from(familyLinks).where(eq(familyLinks.mosqueId, mosqueId)).orderBy(desc(familyLinks.createdAt));
  }

  async getFamilyLinksByParentPhone(parentPhone: string): Promise<FamilyLink[]> {
    return db.select().from(familyLinks).where(eq(familyLinks.parentPhone, parentPhone)).orderBy(desc(familyLinks.createdAt));
  }

  async getFamilyLinksByStudent(studentId: string): Promise<FamilyLink[]> {
    return db.select().from(familyLinks).where(eq(familyLinks.studentId, studentId)).orderBy(desc(familyLinks.createdAt));
  }

  async createFamilyLink(data: InsertFamilyLink): Promise<FamilyLink> {
    const [entry] = await db.insert(familyLinks).values(data).returning();
    return entry;
  }

  async updateFamilyLink(id: string, data: Partial<InsertFamilyLink>): Promise<FamilyLink | undefined> {
    const [entry] = await db.update(familyLinks).set(data).where(eq(familyLinks.id, id)).returning();
    return entry;
  }

  async deleteFamilyLink(id: string): Promise<void> {
    await db.delete(familyLinks).where(eq(familyLinks.id, id));
  }

  async getFeedback(id: string): Promise<Feedback | undefined> {
    const [entry] = await db.select().from(feedback).where(eq(feedback.id, id));
    return entry;
  }

  async getFeedbackByMosque(mosqueId: string): Promise<Feedback[]> {
    return db.select().from(feedback).where(eq(feedback.mosqueId, mosqueId)).orderBy(desc(feedback.createdAt));
  }

  async getFeedbackByUser(userId: string): Promise<Feedback[]> {
    return db.select().from(feedback).where(eq(feedback.userId, userId)).orderBy(desc(feedback.createdAt));
  }

  async getAllFeedback(): Promise<Feedback[]> {
    return db.select().from(feedback).orderBy(desc(feedback.createdAt));
  }

  async createFeedback(data: InsertFeedback): Promise<Feedback> {
    const [entry] = await db.insert(feedback).values(data).returning();
    return entry;
  }

  async updateFeedback(id: string, data: Partial<InsertFeedback>): Promise<Feedback | undefined> {
    const [entry] = await db.update(feedback).set(data).where(eq(feedback.id, id)).returning();
    return entry;
  }

  async deleteFeedback(id: string): Promise<void> {
    await db.delete(feedback).where(eq(feedback.id, id));
  }

  async getTajweedRule(id: string): Promise<TajweedRule | undefined> {
    const [entry] = await db.select().from(tajweedRules).where(eq(tajweedRules.id, id));
    return entry;
  }

  async getAllTajweedRules(): Promise<TajweedRule[]> {
    return db.select().from(tajweedRules).orderBy(asc(tajweedRules.sortOrder));
  }

  async getTajweedRulesByCategory(category: string): Promise<TajweedRule[]> {
    return db.select().from(tajweedRules).where(eq(tajweedRules.category, category)).orderBy(asc(tajweedRules.sortOrder));
  }

  async createTajweedRule(data: InsertTajweedRule): Promise<TajweedRule> {
    const [entry] = await db.insert(tajweedRules).values(data).returning();
    return entry;
  }

  async updateTajweedRule(id: string, data: Partial<InsertTajweedRule>): Promise<TajweedRule | undefined> {
    const [entry] = await db.update(tajweedRules).set(data).where(eq(tajweedRules.id, id)).returning();
    return entry;
  }

  async deleteTajweedRule(id: string): Promise<void> {
    await db.delete(tajweedRules).where(eq(tajweedRules.id, id));
  }

  async getSimilarVerse(id: string): Promise<SimilarVerse | undefined> {
    const [entry] = await db.select().from(similarVerses).where(eq(similarVerses.id, id));
    return entry;
  }

  async getAllSimilarVerses(): Promise<SimilarVerse[]> {
    return db.select().from(similarVerses).orderBy(desc(similarVerses.createdAt));
  }

  async createSimilarVerse(data: InsertSimilarVerse): Promise<SimilarVerse> {
    const [entry] = await db.insert(similarVerses).values(data).returning();
    return entry;
  }

  async updateSimilarVerse(id: string, data: Partial<InsertSimilarVerse>): Promise<SimilarVerse | undefined> {
    const [entry] = await db.update(similarVerses).set(data).where(eq(similarVerses.id, id)).returning();
    return entry;
  }

  async deleteSimilarVerse(id: string): Promise<void> {
    await db.delete(similarVerses).where(eq(similarVerses.id, id));
  }

  async resetSystemData(): Promise<void> {
    await db.delete(bannedDevices);
    await db.delete(certificates);
    await db.delete(courseStudents);
    await db.delete(courseTeachers);
    await db.delete(courses);
    await db.delete(examStudents);
    await db.delete(exams);
    await db.delete(ratings);
    await db.delete(assignments);
    await db.delete(notifications);
    await db.delete(activityLogs);
    await db.delete(users).where(
      inArray(users.role, ["teacher", "student", "supervisor"])
    );
    await db.delete(mosques);
  }

  // ==================== QURAN PROGRESS ====================
  async getQuranProgress(userId: string, surahNumber: number): Promise<QuranProgress | undefined> {
    const [row] = await db.select().from(quranProgress)
      .where(and(eq(quranProgress.userId, userId), eq(quranProgress.surahNumber, surahNumber)));
    return row;
  }

  async getQuranProgressByUser(userId: string): Promise<QuranProgress[]> {
    return db.select().from(quranProgress).where(eq(quranProgress.userId, userId));
  }

  async upsertQuranProgress(data: {
    userId: string; mosqueId?: string | null; surahNumber: number;
    verseStatuses?: string; notes?: string | null;
    reviewedToday?: boolean; reviewStreak?: number; lastReviewDate?: string | null;
  }): Promise<QuranProgress> {
    const existing = await this.getQuranProgress(data.userId, data.surahNumber);
    if (existing) {
      const [updated] = await db.update(quranProgress)
        .set({ ...data, updatedAt: new Date() })
        .where(and(eq(quranProgress.userId, data.userId), eq(quranProgress.surahNumber, data.surahNumber)))
        .returning();
      return updated;
    }
    const [created] = await db.insert(quranProgress)
      .values({ ...data, verseStatuses: data.verseStatuses || "{}" })
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();

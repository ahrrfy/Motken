import {
  type User, type InsertUser,
  type Mosque, type InsertMosque,
  type Assignment, type InsertAssignment,
  type ActivityLog, type InsertActivityLog,
  type Notification, type InsertNotification,
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
  type ParentReport, type InsertParentReport,
  type EmergencySubstitution, type InsertEmergencySubstitution,
  type IncidentRecord, type InsertIncidentRecord,
  type Graduate, type InsertGraduate,
  type GraduateFollowup, type InsertGraduateFollowup,
  type StudentTransfer, type InsertStudentTransfer,
  type FamilyLink, type InsertFamilyLink,
  type Feedback, type InsertFeedback,
  type QuranProgress,
  type Announcement, type InsertAnnouncement,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByMosque(mosqueId: string): Promise<User[]>;
  getUsersByMosqueAndRole(mosqueId: string, role: string): Promise<User[]>;
  getUsersByTeacher(teacherId: string): Promise<User[]>;
  checkPhoneExists(phone: string, excludeId?: string, allowedRoles?: string[]): Promise<boolean>;
  getLinkedAccounts(phone: string, excludeId?: string): Promise<User[]>;
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

  createAnnouncement(a: InsertAnnouncement): Promise<Announcement>;
  getAnnouncements(): Promise<Announcement[]>;
  getAnnouncementsBySender(senderId: string): Promise<Announcement[]>;
  getAnnouncementsByMosque(mosqueId: string): Promise<Announcement[]>;

  getPointsByUser(userId: string): Promise<Point[]>;
  getPointsByMosque(mosqueId: string): Promise<Point[]>;
  getTotalPoints(userId: string): Promise<number>;
  createPoint(p: InsertPoint): Promise<Point>;
  getLeaderboard(mosqueId?: string): Promise<{id: string, name: string, username: string, avatar: string | null, totalPoints: number}[]>;

  getBadgesByUser(userId: string): Promise<Badge[]>;
  getBadgesByMosque(mosqueId: string): Promise<Badge[]>;
  createBadge(b: InsertBadge): Promise<Badge>;
  deleteBadge(id: string): Promise<void>;

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

  resetSystemData(): Promise<void>;
  getQuranProgress(userId: string, surahNumber?: number): Promise<QuranProgress | undefined>;
  getQuranProgressByUser(userId: string): Promise<QuranProgress[]>;
  upsertQuranProgress(data: { userId: string; mosqueId?: string; surahNumber: number; verseStatuses: string; notes?: string; reviewedToday?: boolean; reviewStreak?: number; lastReviewDate?: string; easeFactor?: string; reviewInterval?: number; nextReviewDate?: string }): Promise<QuranProgress>;
}

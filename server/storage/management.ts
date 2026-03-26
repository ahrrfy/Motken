import { db } from "../db";
import { eq, desc, or } from "drizzle-orm";
import {
  type ParentReport, type InsertParentReport,
  type EmergencySubstitution, type InsertEmergencySubstitution,
  type IncidentRecord, type InsertIncidentRecord,
  type Graduate, type InsertGraduate,
  type GraduateFollowup, type InsertGraduateFollowup,
  type StudentTransfer, type InsertStudentTransfer,
  type FamilyLink, type InsertFamilyLink,
  type Feedback, type InsertFeedback,
  parentReports, emergencySubstitutions, incidentRecords,
  graduates, graduateFollowups, studentTransfers,
  familyLinks, feedback,
} from "@shared/schema";

export const managementMethods = {
  // ==================== PARENT REPORTS ====================
  async getParentReport(id: string): Promise<ParentReport | undefined> {
    const [entry] = await db.select().from(parentReports).where(eq(parentReports.id, id));
    return entry;
  },

  async getParentReportByToken(token: string): Promise<ParentReport | undefined> {
    const [entry] = await db.select().from(parentReports).where(eq(parentReports.accessToken, token));
    return entry;
  },

  async getParentReportsByStudent(studentId: string): Promise<ParentReport[]> {
    return db.select().from(parentReports).where(eq(parentReports.studentId, studentId)).orderBy(desc(parentReports.createdAt));
  },

  async createParentReport(pr: InsertParentReport): Promise<ParentReport> {
    const [entry] = await db.insert(parentReports).values(pr).returning();
    return entry;
  },

  async deleteParentReport(id: string): Promise<void> {
    await db.delete(parentReports).where(eq(parentReports.id, id));
  },

  // ==================== EMERGENCY SUBSTITUTIONS ====================
  async getEmergencySubstitution(id: string): Promise<EmergencySubstitution | undefined> {
    const [entry] = await db.select().from(emergencySubstitutions).where(eq(emergencySubstitutions.id, id));
    return entry;
  },

  async getEmergencySubstitutionsByMosque(mosqueId: string): Promise<EmergencySubstitution[]> {
    return db.select().from(emergencySubstitutions).where(eq(emergencySubstitutions.mosqueId, mosqueId)).orderBy(desc(emergencySubstitutions.createdAt));
  },

  async createEmergencySubstitution(data: InsertEmergencySubstitution): Promise<EmergencySubstitution> {
    const [entry] = await db.insert(emergencySubstitutions).values(data).returning();
    return entry;
  },

  async updateEmergencySubstitution(id: string, data: Partial<InsertEmergencySubstitution>): Promise<EmergencySubstitution | undefined> {
    const [entry] = await db.update(emergencySubstitutions).set(data).where(eq(emergencySubstitutions.id, id)).returning();
    return entry;
  },

  async deleteEmergencySubstitution(id: string): Promise<void> {
    await db.delete(emergencySubstitutions).where(eq(emergencySubstitutions.id, id));
  },

  // ==================== INCIDENT RECORDS ====================
  async getIncidentRecord(id: string): Promise<IncidentRecord | undefined> {
    const [entry] = await db.select().from(incidentRecords).where(eq(incidentRecords.id, id));
    return entry;
  },

  async getIncidentRecordsByMosque(mosqueId: string): Promise<IncidentRecord[]> {
    return db.select().from(incidentRecords).where(eq(incidentRecords.mosqueId, mosqueId)).orderBy(desc(incidentRecords.createdAt));
  },

  async createIncidentRecord(data: InsertIncidentRecord): Promise<IncidentRecord> {
    const [entry] = await db.insert(incidentRecords).values(data).returning();
    return entry;
  },

  async updateIncidentRecord(id: string, data: Partial<InsertIncidentRecord>): Promise<IncidentRecord | undefined> {
    const [entry] = await db.update(incidentRecords).set(data).where(eq(incidentRecords.id, id)).returning();
    return entry;
  },

  async deleteIncidentRecord(id: string): Promise<void> {
    await db.delete(incidentRecords).where(eq(incidentRecords.id, id));
  },

  // ==================== GRADUATES ====================
  async getGraduate(id: string): Promise<Graduate | undefined> {
    const [entry] = await db.select().from(graduates).where(eq(graduates.id, id));
    return entry;
  },

  async getGraduatesByMosque(mosqueId: string): Promise<Graduate[]> {
    return db.select().from(graduates).where(eq(graduates.mosqueId, mosqueId)).orderBy(desc(graduates.createdAt));
  },

  async getGraduatesByStudent(studentId: string): Promise<Graduate[]> {
    return db.select().from(graduates).where(eq(graduates.studentId, studentId)).orderBy(desc(graduates.createdAt));
  },

  async createGraduate(data: InsertGraduate): Promise<Graduate> {
    const [entry] = await db.insert(graduates).values(data).returning();
    return entry;
  },

  async updateGraduate(id: string, data: Partial<InsertGraduate>): Promise<Graduate | undefined> {
    const [entry] = await db.update(graduates).set(data).where(eq(graduates.id, id)).returning();
    return entry;
  },

  async deleteGraduate(id: string): Promise<void> {
    await db.delete(graduates).where(eq(graduates.id, id));
  },

  // ==================== GRADUATE FOLLOWUPS ====================
  async getGraduateFollowup(id: string): Promise<GraduateFollowup | undefined> {
    const [entry] = await db.select().from(graduateFollowups).where(eq(graduateFollowups.id, id));
    return entry;
  },

  async getGraduateFollowupsByMosque(mosqueId: string): Promise<GraduateFollowup[]> {
    return db.select().from(graduateFollowups).where(eq(graduateFollowups.mosqueId, mosqueId)).orderBy(desc(graduateFollowups.createdAt));
  },

  async getGraduateFollowupsByGraduate(graduateId: string): Promise<GraduateFollowup[]> {
    return db.select().from(graduateFollowups).where(eq(graduateFollowups.graduateId, graduateId)).orderBy(desc(graduateFollowups.createdAt));
  },

  async createGraduateFollowup(data: InsertGraduateFollowup): Promise<GraduateFollowup> {
    const [entry] = await db.insert(graduateFollowups).values(data).returning();
    return entry;
  },

  async updateGraduateFollowup(id: string, data: Partial<InsertGraduateFollowup>): Promise<GraduateFollowup | undefined> {
    const [entry] = await db.update(graduateFollowups).set(data).where(eq(graduateFollowups.id, id)).returning();
    return entry;
  },

  async deleteGraduateFollowup(id: string): Promise<void> {
    await db.delete(graduateFollowups).where(eq(graduateFollowups.id, id));
  },

  // ==================== STUDENT TRANSFERS ====================
  async getStudentTransfer(id: string): Promise<StudentTransfer | undefined> {
    const [entry] = await db.select().from(studentTransfers).where(eq(studentTransfers.id, id));
    return entry;
  },

  async getStudentTransfersByMosque(mosqueId: string): Promise<StudentTransfer[]> {
    return db.select().from(studentTransfers).where(
      or(eq(studentTransfers.fromMosqueId, mosqueId), eq(studentTransfers.toMosqueId, mosqueId))
    ).orderBy(desc(studentTransfers.createdAt));
  },

  async getStudentTransfersByStudent(studentId: string): Promise<StudentTransfer[]> {
    return db.select().from(studentTransfers).where(eq(studentTransfers.studentId, studentId)).orderBy(desc(studentTransfers.createdAt));
  },

  async createStudentTransfer(data: InsertStudentTransfer): Promise<StudentTransfer> {
    const [entry] = await db.insert(studentTransfers).values(data).returning();
    return entry;
  },

  async updateStudentTransfer(id: string, data: Partial<InsertStudentTransfer>): Promise<StudentTransfer | undefined> {
    const [entry] = await db.update(studentTransfers).set(data).where(eq(studentTransfers.id, id)).returning();
    return entry;
  },

  async deleteStudentTransfer(id: string): Promise<void> {
    await db.delete(studentTransfers).where(eq(studentTransfers.id, id));
  },

  // ==================== FAMILY LINKS ====================
  async getFamilyLink(id: string): Promise<FamilyLink | undefined> {
    const [entry] = await db.select().from(familyLinks).where(eq(familyLinks.id, id));
    return entry;
  },

  async getFamilyLinksByMosque(mosqueId: string): Promise<FamilyLink[]> {
    return db.select().from(familyLinks).where(eq(familyLinks.mosqueId, mosqueId)).orderBy(desc(familyLinks.createdAt));
  },

  async getFamilyLinksByParentPhone(parentPhone: string): Promise<FamilyLink[]> {
    return db.select().from(familyLinks).where(eq(familyLinks.parentPhone, parentPhone)).orderBy(desc(familyLinks.createdAt));
  },

  async getFamilyLinksByStudent(studentId: string): Promise<FamilyLink[]> {
    return db.select().from(familyLinks).where(eq(familyLinks.studentId, studentId)).orderBy(desc(familyLinks.createdAt));
  },

  async createFamilyLink(data: InsertFamilyLink): Promise<FamilyLink> {
    const [entry] = await db.insert(familyLinks).values(data).returning();
    return entry;
  },

  async updateFamilyLink(id: string, data: Partial<InsertFamilyLink>): Promise<FamilyLink | undefined> {
    const [entry] = await db.update(familyLinks).set(data).where(eq(familyLinks.id, id)).returning();
    return entry;
  },

  async deleteFamilyLink(id: string): Promise<void> {
    await db.delete(familyLinks).where(eq(familyLinks.id, id));
  },

  // ==================== FEEDBACK ====================
  async getFeedback(id: string): Promise<Feedback | undefined> {
    const [entry] = await db.select().from(feedback).where(eq(feedback.id, id));
    return entry;
  },

  async getFeedbackByMosque(mosqueId: string): Promise<Feedback[]> {
    return db.select().from(feedback).where(eq(feedback.mosqueId, mosqueId)).orderBy(desc(feedback.createdAt));
  },

  async getFeedbackByUser(userId: string): Promise<Feedback[]> {
    return db.select().from(feedback).where(eq(feedback.userId, userId)).orderBy(desc(feedback.createdAt));
  },

  async getAllFeedback(): Promise<Feedback[]> {
    return db.select().from(feedback).orderBy(desc(feedback.createdAt));
  },

  async createFeedback(data: InsertFeedback): Promise<Feedback> {
    const [entry] = await db.insert(feedback).values(data).returning();
    return entry;
  },

  async updateFeedback(id: string, data: Partial<InsertFeedback>): Promise<Feedback | undefined> {
    const [entry] = await db.update(feedback).set(data).where(eq(feedback.id, id)).returning();
    return entry;
  },

  async deleteFeedback(id: string): Promise<void> {
    await db.delete(feedback).where(eq(feedback.id, id));
  },
};

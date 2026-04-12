import { db } from "../db";
import { eq, desc, or } from "drizzle-orm";
import { createCrud } from "./base-repository";
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

const parentReportCrud = createCrud<InsertParentReport, ParentReport>(parentReports);
const emergencySubCrud = createCrud<InsertEmergencySubstitution, EmergencySubstitution>(emergencySubstitutions);
const incidentCrud = createCrud<InsertIncidentRecord, IncidentRecord>(incidentRecords);
const graduateCrud = createCrud<InsertGraduate, Graduate>(graduates);
const followupCrud = createCrud<InsertGraduateFollowup, GraduateFollowup>(graduateFollowups);
const transferCrud = createCrud<InsertStudentTransfer, StudentTransfer>(studentTransfers);
const familyLinkCrud = createCrud<InsertFamilyLink, FamilyLink>(familyLinks);
const feedbackCrud = createCrud<InsertFeedback, Feedback>(feedback);

export const managementMethods = {
  // ==================== PARENT REPORTS ====================
  getParentReport: parentReportCrud.getById,
  async getParentReportByToken(token: string): Promise<ParentReport | undefined> {
    const [entry] = await db.select().from(parentReports).where(eq(parentReports.accessToken, token));
    return entry;
  },
  async getParentReportsByStudent(studentId: string): Promise<ParentReport[]> {
    return parentReportCrud.getByField(parentReports.studentId, studentId);
  },
  createParentReport: parentReportCrud.create,
  deleteParentReport: parentReportCrud.remove,

  // ==================== EMERGENCY SUBSTITUTIONS ====================
  getEmergencySubstitution: emergencySubCrud.getById,
  async getEmergencySubstitutionsByMosque(mosqueId: string): Promise<EmergencySubstitution[]> {
    return emergencySubCrud.getByField(emergencySubstitutions.mosqueId, mosqueId);
  },
  createEmergencySubstitution: emergencySubCrud.create,
  updateEmergencySubstitution: emergencySubCrud.update,
  deleteEmergencySubstitution: emergencySubCrud.remove,

  // ==================== INCIDENT RECORDS ====================
  getIncidentRecord: incidentCrud.getById,
  async getIncidentRecordsByMosque(mosqueId: string): Promise<IncidentRecord[]> {
    return incidentCrud.getByField(incidentRecords.mosqueId, mosqueId);
  },
  createIncidentRecord: incidentCrud.create,
  updateIncidentRecord: incidentCrud.update,
  deleteIncidentRecord: incidentCrud.remove,

  // ==================== GRADUATES ====================
  getGraduate: graduateCrud.getById,
  async getGraduatesByMosque(mosqueId: string): Promise<Graduate[]> {
    return graduateCrud.getByField(graduates.mosqueId, mosqueId);
  },
  async getGraduatesByStudent(studentId: string): Promise<Graduate[]> {
    return graduateCrud.getByField(graduates.studentId, studentId);
  },
  createGraduate: graduateCrud.create,
  updateGraduate: graduateCrud.update,
  deleteGraduate: graduateCrud.remove,

  // ==================== GRADUATE FOLLOWUPS ====================
  getGraduateFollowup: followupCrud.getById,
  async getGraduateFollowupsByMosque(mosqueId: string): Promise<GraduateFollowup[]> {
    return followupCrud.getByField(graduateFollowups.mosqueId, mosqueId);
  },
  async getGraduateFollowupsByGraduate(graduateId: string): Promise<GraduateFollowup[]> {
    return followupCrud.getByField(graduateFollowups.graduateId, graduateId);
  },
  createGraduateFollowup: followupCrud.create,
  updateGraduateFollowup: followupCrud.update,
  deleteGraduateFollowup: followupCrud.remove,

  // ==================== STUDENT TRANSFERS ====================
  getStudentTransfer: transferCrud.getById,
  async getStudentTransfersByMosque(mosqueId: string): Promise<StudentTransfer[]> {
    return db.select().from(studentTransfers).where(
      or(eq(studentTransfers.fromMosqueId, mosqueId), eq(studentTransfers.toMosqueId, mosqueId))
    ).orderBy(desc(studentTransfers.createdAt));
  },
  async getStudentTransfersByStudent(studentId: string): Promise<StudentTransfer[]> {
    return transferCrud.getByField(studentTransfers.studentId, studentId);
  },
  createStudentTransfer: transferCrud.create,
  updateStudentTransfer: transferCrud.update,
  deleteStudentTransfer: transferCrud.remove,

  // ==================== FAMILY LINKS ====================
  getFamilyLink: familyLinkCrud.getById,
  async getFamilyLinksByMosque(mosqueId: string): Promise<FamilyLink[]> {
    return familyLinkCrud.getByField(familyLinks.mosqueId, mosqueId);
  },
  async getFamilyLinksByParentPhone(parentPhone: string): Promise<FamilyLink[]> {
    return familyLinkCrud.getByField(familyLinks.parentPhone, parentPhone);
  },
  async getFamilyLinksByStudent(studentId: string): Promise<FamilyLink[]> {
    return familyLinkCrud.getByField(familyLinks.studentId, studentId);
  },
  createFamilyLink: familyLinkCrud.create,
  updateFamilyLink: familyLinkCrud.update,
  deleteFamilyLink: familyLinkCrud.remove,

  // ==================== FEEDBACK ====================
  getFeedback: feedbackCrud.getById,
  async getFeedbackByMosque(mosqueId: string): Promise<Feedback[]> {
    return feedbackCrud.getByField(feedback.mosqueId, mosqueId);
  },
  async getFeedbackByUser(userId: string): Promise<Feedback[]> {
    return feedbackCrud.getByField(feedback.userId, userId);
  },
  getAllFeedback: () => feedbackCrud.getAll(),
  createFeedback: feedbackCrud.create,
  updateFeedback: feedbackCrud.update,
  deleteFeedback: feedbackCrud.remove,
};

/**
 * سكريبت تهيئة البيانات الأولية — يُشغّل يدوياً فقط
 * Usage: npx tsx script/seed.ts
 *
 * Required env vars: DATABASE_URL, SEED_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
 */

import "dotenv/config";
import { storage } from "../server/storage";
import { hashPassword } from "../server/auth";
import crypto from "crypto";
import { pool } from "../server/db";

async function seed() {
  const seedSecret = process.env.SEED_SECRET;
  if (!seedSecret) {
    console.error("SEED_SECRET environment variable is required");
    process.exit(1);
  }

  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("ADMIN_PASSWORD environment variable is required");
    process.exit(1);
  }

  // Check if already seeded
  const allUsers = await storage.getUsers();
  if (allUsers.length > 0) {
    console.log("Database already has users — aborting seed to prevent duplicates");
    process.exit(0);
  }

  console.log("Starting database seed...");

  const mosque1 = await storage.createMosque({
    name: "جامع النور الكبير",
    province: "بغداد", city: "بغداد", area: "الكرخ",
    landmark: "قرب ساحة النصر", address: "الكرخ - شارع حيفا",
    phone: "07701000001", managerName: "الشيخ عبد الكريم",
    description: "جامع رئيسي لتحفيظ القرآن الكريم", isActive: true,
  });

  const mosque2 = await storage.createMosque({
    name: "جامع الإمام أبي حنيفة",
    province: "بغداد", city: "بغداد", area: "الأعظمية",
    landmark: "قرب جسر الأعظمية", address: "الأعظمية",
    phone: "07701000002", managerName: "الشيخ محمود",
    description: "من أعرق مساجد بغداد", isActive: true,
  });

  const mosque3 = await storage.createMosque({
    name: "جامع الرحمن",
    province: "البصرة", city: "البصرة", area: "المركز",
    landmark: "قرب سوق الهنود", address: "شارع الجمهورية",
    phone: "07701000003", managerName: "الشيخ حسن",
    description: "مسجد تحفيظ القرآن في البصرة", isActive: true,
  });

  const randomPass = () => crypto.randomBytes(12).toString("base64url");

  const adminUser = await storage.createUser({
    username: adminUsername,
    password: await hashPassword(adminPassword),
    name: "المدير", role: "admin", phone: "", isActive: true,
    canPrintIds: true, mosqueId: null,
  });

  const sup1 = await storage.createUser({ username: "supervisor1", password: await hashPassword(randomPass()), name: "المشرف أحمد", role: "supervisor", mosqueId: mosque1.id, phone: "07801111111", isActive: true });
  const sup2 = await storage.createUser({ username: "supervisor2", password: await hashPassword(randomPass()), name: "المشرف خالد", role: "supervisor", mosqueId: mosque2.id, phone: "07802222222", isActive: true });

  const teacher1 = await storage.createUser({ username: "teacher1", password: await hashPassword(randomPass()), name: "الشيخ أحمد", role: "teacher", mosqueId: mosque1.id, phone: "07801234567", isActive: true });
  const teacher2 = await storage.createUser({ username: "teacher2", password: await hashPassword(randomPass()), name: "الشيخ عبد الله", role: "teacher", mosqueId: mosque1.id, phone: "07811234567", isActive: true });
  const teacher3 = await storage.createUser({ username: "teacher3", password: await hashPassword(randomPass()), name: "الشيخ محمد", role: "teacher", mosqueId: mosque2.id, phone: "07821234567", isActive: true });

  const s1 = await storage.createUser({ username: "student1", password: await hashPassword(randomPass()), name: "عمر خالد", role: "student", mosqueId: mosque1.id, teacherId: teacher1.id, phone: "07901234567", isActive: true });
  const s2 = await storage.createUser({ username: "student2", password: await hashPassword(randomPass()), name: "أحمد محمد", role: "student", mosqueId: mosque1.id, teacherId: teacher1.id, phone: "07911234567", isActive: true });
  const s3 = await storage.createUser({ username: "student3", password: await hashPassword(randomPass()), name: "يوسف علي", role: "student", mosqueId: mosque1.id, teacherId: teacher2.id, phone: "07921234567", isActive: true });
  const s4 = await storage.createUser({ username: "student4", password: await hashPassword(randomPass()), name: "سعيد حسن", role: "student", mosqueId: mosque2.id, teacherId: teacher3.id, phone: "07931234567", isActive: true });
  const s5 = await storage.createUser({ username: "student5", password: await hashPassword(randomPass()), name: "كريم محمود", role: "student", mosqueId: mosque2.id, teacherId: teacher3.id, phone: "07941234567", isActive: true });

  await storage.createAssignment({ studentId: s1.id, teacherId: teacher1.id, mosqueId: mosque1.id, surahName: "البقرة", fromVerse: 1, toVerse: 20, type: "new", scheduledDate: new Date(), status: "pending" });
  await storage.createAssignment({ studentId: s2.id, teacherId: teacher1.id, mosqueId: mosque1.id, surahName: "آل عمران", fromVerse: 1, toVerse: 10, type: "review", scheduledDate: new Date(), status: "done" });
  await storage.createAssignment({ studentId: s4.id, teacherId: teacher3.id, mosqueId: mosque2.id, surahName: "الكهف", fromVerse: 1, toVerse: 15, type: "new", scheduledDate: new Date(), status: "pending" });

  console.log("Seed completed: 3 mosques, 12 users, 3 assignments");
  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

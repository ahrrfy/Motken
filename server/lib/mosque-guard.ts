import { storage } from "../storage";
import type { User } from "@shared/schema";

/**
 * Tenant isolation guard — verifies target user belongs to the same mosque as the current user.
 * Returns the target user (avoids re-fetching in route handler).
 * Returns null if targetUserId is not provided (caller decides if that's ok).
 * Throws { status: 404 } if user not found.
 * Throws { status: 403 } if cross-mosque access.
 */
export async function ensureSameMosque(
  currentUser: { mosqueId: string | null; role: string },
  targetUserId: string
): Promise<User> {
  const target = await storage.getUser(targetUserId);
  if (!target) {
    throw Object.assign(new Error("المستخدم غير موجود"), { status: 404 });
  }
  if (currentUser.mosqueId && target.mosqueId !== currentUser.mosqueId) {
    throw Object.assign(new Error("غير مصرح بالوصول لبيانات مسجد آخر"), { status: 403 });
  }
  return target;
}

/**
 * Batch tenant isolation guard for arrays of user IDs (studentIds, teacherIds).
 * Strict mode: rejects the entire request if ANY ID belongs to a different mosque.
 * Returns validated user objects for further use.
 */
export async function ensureAllSameMosque(
  currentUser: { mosqueId: string | null; role: string },
  userIds: string[]
): Promise<User[]> {
  if (!userIds || userIds.length === 0) return [];

  const users: User[] = [];
  for (const uid of userIds) {
    const user = await storage.getUser(uid);
    if (!user) continue; // skip non-existent — same as current behavior
    if (currentUser.mosqueId && user.mosqueId !== currentUser.mosqueId) {
      throw Object.assign(
        new Error("لا يمكن إضافة مستخدمين من مسجد آخر"),
        { status: 403 }
      );
    }
    users.push(user);
  }
  return users;
}

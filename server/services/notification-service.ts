import { storage } from "../storage";
import type { InsertNotification } from "@shared/schema";

/**
 * Centralized notification creation.
 * Replaces scattered `storage.createNotification()` calls across 10+ routes.
 */
export async function notifyUser(
  userId: string,
  title: string,
  message: string,
  type: string = "info",
  mosqueId?: string | null,
): Promise<void> {
  await storage.createNotification({
    userId,
    mosqueId: mosqueId || undefined,
    title,
    message,
    type,
    isRead: false,
  });
}

/**
 * Send notification to all users in a mosque with a specific role.
 */
export async function notifyMosqueRole(
  mosqueId: string,
  role: string,
  title: string,
  message: string,
  type: string = "info",
): Promise<void> {
  const users = await storage.getUsersByMosqueAndRole(mosqueId, role);
  for (const user of users) {
    await storage.createNotification({
      userId: user.id,
      mosqueId,
      title,
      message,
      type,
      isRead: false,
    });
  }
}

/**
 * Send notification to multiple users by ID.
 */
export async function notifyUsers(
  userIds: string[],
  title: string,
  message: string,
  type: string = "info",
  mosqueId?: string | null,
): Promise<void> {
  for (const userId of userIds) {
    await storage.createNotification({
      userId,
      mosqueId: mosqueId || undefined,
      title,
      message,
      type,
      isRead: false,
    });
  }
}

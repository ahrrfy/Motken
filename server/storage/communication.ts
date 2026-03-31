import { db } from "../db";
import { eq, desc, and, or, asc, count } from "drizzle-orm";
import {
  type Notification, type InsertNotification,
  type Message, type InsertMessage,
  type Announcement, type InsertAnnouncement,
  notifications, messages, announcements,
} from "@shared/schema";

export const communicationMethods = {
  // ==================== NOTIFICATIONS ====================
  async getNotification(id: string): Promise<Notification | undefined> {
    const [notif] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notif;
  },

  async getNotifications(userId: string): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  },

  async createNotification(n: InsertNotification): Promise<Notification> {
    const [notif] = await db.insert(notifications).values(n).returning();
    return notif;
  },

  async updateNotification(id: string, data: Partial<InsertNotification>): Promise<Notification | undefined> {
    const [notif] = await db.update(notifications).set(data).where(eq(notifications.id, id)).returning();
    return notif;
  },

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  },

  async deleteNotification(id: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  },

  async deleteNotifications(ids: string[], userId: string): Promise<void> {
    for (const id of ids) {
      await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    }
  },

  // ==================== MESSAGES ====================
  async getMessage(id: string): Promise<Message | undefined> {
    const [msg] = await db.select().from(messages).where(eq(messages.id, id));
    return msg;
  },

  async getMessagesByUser(userId: string): Promise<Message[]> {
    return db.select().from(messages).where(
      or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
    ).orderBy(desc(messages.createdAt));
  },

  async getConversation(userId1: string, userId2: string): Promise<Message[]> {
    return db.select().from(messages).where(
      or(
        and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
      )
    ).orderBy(asc(messages.createdAt));
  },

  async createMessage(m: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(m).returning();
    return msg;
  },

  async markMessageRead(id: string): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
  },

  async markAllMessagesRead(senderId: string, receiverId: string): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(
      and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId))
    );
  },

  async deleteMessage(id: string): Promise<void> {
    await db.delete(messages).where(eq(messages.id, id));
  },

  async getUnreadMessageCount(userId: string): Promise<number> {
    const [result] = await db.select({ value: count() }).from(messages).where(
      and(eq(messages.receiverId, userId), eq(messages.isRead, false))
    );
    return result?.value ?? 0;
  },

  // ==================== ANNOUNCEMENTS ====================
  async createAnnouncement(a: InsertAnnouncement): Promise<Announcement> {
    const [ann] = await db.insert(announcements).values(a).returning();
    return ann;
  },

  async getAnnouncements(): Promise<Announcement[]> {
    return db.select().from(announcements).orderBy(desc(announcements.createdAt)).limit(100);
  },

  async getAnnouncementsBySender(senderId: string): Promise<Announcement[]> {
    return db.select().from(announcements).where(eq(announcements.senderId, senderId)).orderBy(desc(announcements.createdAt)).limit(100);
  },

  async getAnnouncementsByMosque(mosqueId: string): Promise<Announcement[]> {
    return db.select().from(announcements).where(eq(announcements.mosqueId, mosqueId)).orderBy(desc(announcements.createdAt)).limit(100);
  },
};

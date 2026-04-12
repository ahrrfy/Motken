import { db } from "../db";
import { eq, desc, and, or, asc, count } from "drizzle-orm";
import { createCrud } from "./base-repository";
import {
  type Notification, type InsertNotification,
  type Message, type InsertMessage,
  type Announcement, type InsertAnnouncement,
  notifications, messages, announcements,
} from "@shared/schema";

const notifCrud = createCrud<InsertNotification, Notification>(notifications);
const msgCrud = createCrud<InsertMessage, Message>(messages);
const annCrud = createCrud<InsertAnnouncement, Announcement>(announcements);

export const communicationMethods = {
  // ==================== NOTIFICATIONS ====================
  getNotification: notifCrud.getById,
  async getNotifications(userId: string): Promise<Notification[]> {
    return notifCrud.getByField(notifications.userId, userId);
  },
  createNotification: notifCrud.create,
  updateNotification: notifCrud.update,
  deleteNotification: notifCrud.remove,

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  },
  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  },
  async deleteNotifications(ids: string[], userId: string): Promise<void> {
    for (const id of ids) {
      await db.delete(notifications).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    }
  },

  // ==================== MESSAGES ====================
  getMessage: msgCrud.getById,
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
  createMessage: msgCrud.create,
  deleteMessage: msgCrud.remove,

  async markMessageRead(id: string): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(eq(messages.id, id));
  },
  async markAllMessagesRead(senderId: string, receiverId: string): Promise<void> {
    await db.update(messages).set({ isRead: true }).where(
      and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId))
    );
  },
  async getUnreadMessageCount(userId: string): Promise<number> {
    const [result] = await db.select({ value: count() }).from(messages).where(
      and(eq(messages.receiverId, userId), eq(messages.isRead, false))
    );
    return result?.value ?? 0;
  },

  // ==================== ANNOUNCEMENTS ====================
  createAnnouncement: annCrud.create,
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

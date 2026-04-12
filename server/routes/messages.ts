import type { Express } from "express";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import {
  messages,
} from "@shared/schema";
import { logActivity } from "./shared";
import { sendError } from "../error-handler";
import { toSafeUser } from "../services/user-service";
import { broadcastToUser } from "../websocket";

const messageSendTimes = new Map<string, number[]>();

export function registerMessagesRoutes(app: Express) {
  // ==================== MESSAGES ====================
  app.get("/api/messages", requireAuth, async (req, res) => {
    try {
      const msgs = await storage.getMessagesByUser(req.user!.id);
      res.json(msgs);
    } catch (err: unknown) {
      sendError(res, err, "جلب الرسائل");
    }
  });

  app.get("/api/messages/conversations", requireAuth, async (req, res) => {
    try {
      const msgs = await storage.getMessagesByUser(req.user!.id);
      const userIds = new Set<string>();
      for (const msg of msgs) {
        if (msg.senderId !== req.user!.id) userIds.add(msg.senderId);
        if (msg.receiverId !== req.user!.id) userIds.add(msg.receiverId);
      }
      const conversations = [];
      for (const uid of Array.from(userIds)) {
        const user = await storage.getUser(uid);
        if (user) {
          const conv = await storage.getConversation(req.user!.id, uid);
          const lastMsg = conv[conv.length - 1];
          const unread = conv.filter(m => m.receiverId === req.user!.id && !m.isRead).length;
          conversations.push({ user: toSafeUser(user), lastMessage: lastMsg, unreadCount: unread });
        }
      }
      conversations.sort((a, b) => new Date(b.lastMessage?.createdAt || 0).getTime() - new Date(a.lastMessage?.createdAt || 0).getTime());
      res.json(conversations);
    } catch (err: unknown) {
      sendError(res, err, "جلب المحادثات");
    }
  });

  app.get("/api/messages/conversation/:userId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      if (currentUser.role !== "admin") {
        const otherUser = await storage.getUser(req.params.userId);
        if (otherUser && otherUser.mosqueId !== currentUser.mosqueId) {
          return res.status(403).json({ message: "غير مصرح بالوصول لمحادثات مستخدم من جامع آخر" });
        }
      }
      const msgs = await storage.getConversation(req.user!.id, req.params.userId);
      res.json(msgs);
    } catch (err: unknown) {
      sendError(res, err, "جلب المحادثة");
    }
  });

  app.get("/api/messages/unread-count", requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadMessageCount(req.user!.id);
      res.json({ count });
    } catch (err: unknown) {
      sendError(res, err, "جلب عدد الرسائل غير المقروءة");
    }
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const { receiverId } = req.body;
      let { content } = req.body;
      if (!receiverId || !content || typeof content !== "string") {
        return res.status(400).json({ message: "المستلم والمحتوى مطلوبان" });
      }
      if (content.length > 2000) return res.status(400).json({ message: "الرسالة طويلة جداً (الحد الأقصى 2000 حرف)" });
      if (receiverId === req.user!.id) return res.status(400).json({ message: "لا يمكنك إرسال رسالة لنفسك" });
      content = content.replace(/<[^>]*>/g, "").trim();
      if (!content) return res.status(400).json({ message: "المحتوى مطلوب" });
      const receiver = await storage.getUser(receiverId);
      if (!receiver) return res.status(404).json({ message: "المستلم غير موجود" });
      if (req.user!.role !== "admin" && receiver.mosqueId !== req.user!.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بمراسلة مستخدم من جامع آخر" });
      }
      if (receiver.suspendedUntil && new Date(receiver.suspendedUntil) > new Date()) {
        return res.status(403).json({ message: "هذا المستخدم موقوف" });
      }
      const now = Date.now();
      const userTimes = messageSendTimes.get(req.user!.id) || [];
      const recentTimes = userTimes.filter(t => now - t < 60000);
      if (recentTimes.length >= 30) {
        return res.status(429).json({ message: "عدد كبير من الرسائل. انتظر قليلاً" });
      }
      recentTimes.push(now);
      messageSendTimes.set(req.user!.id, recentTimes);
      const msg = await storage.createMessage({
        senderId: req.user!.id,
        receiverId,
        mosqueId: req.user!.mosqueId,
        content,
        isRead: false,
      });
      broadcastToUser(receiverId, { type: "message", data: msg });
      await logActivity(req.user!, "إرسال رسالة", "messages");
      res.status(201).json(msg);
    } catch (err: unknown) {
      sendError(res, err, "إرسال رسالة");
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      const msg = await storage.getMessage(req.params.id);
      if (!msg) return res.status(404).json({ message: "الرسالة غير موجودة" });
      if (msg.receiverId !== req.user!.id) {
        return res.status(403).json({ message: "غير مصرح" });
      }
      await storage.markMessageRead(req.params.id);
      res.json({ message: "تم التحديث" });
    } catch (err: unknown) {
      sendError(res, err, "تحديث حالة الرسالة");
    }
  });

  app.post("/api/messages/mark-all-read/:senderId", requireAuth, async (req, res) => {
    try {
      await storage.markAllMessagesRead(req.params.senderId, req.user!.id);
      res.json({ message: "تم تحديد الكل كمقروء" });
    } catch (err: unknown) {
      sendError(res, err, "تحديد الكل كمقروء");
    }
  });

  app.delete("/api/messages/:id", requireAuth, async (req, res) => {
    try {
      const msg = await storage.getMessage(req.params.id);
      if (!msg) return res.status(404).json({ message: "الرسالة غير موجودة" });
      if (msg.senderId !== req.user!.id) {
        return res.status(403).json({ message: "يمكنك حذف رسائلك فقط" });
      }
      await storage.deleteMessage(req.params.id);
      await logActivity(req.user!, "حذف رسالة", "messages");
      res.json({ message: "تم حذف الرسالة" });
    } catch (err: unknown) {
      sendError(res, err, "حذف رسالة");
    }
  });

  app.post("/api/messages/broadcast", requireAuth, async (req, res) => {
    try {
      if (req.user!.role !== "admin" && req.user!.role !== "supervisor") {
        return res.status(403).json({ message: "غير مصرح بإرسال رسائل جماعية" });
      }
      const { content, targetRole } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "المحتوى مطلوب" });
      }
      const sanitized = content.replace(/<[^>]*>/g, "").trim();
      if (sanitized.length === 0 || sanitized.length > 2000) {
        return res.status(400).json({ message: "محتوى غير صالح" });
      }
      const allUsers = await storage.getUsersByMosque(req.user!.mosqueId!);
      const targets = targetRole ? allUsers.filter(u => u.role === targetRole && u.id !== req.user!.id) : allUsers.filter(u => u.id !== req.user!.id);
      let sent = 0;
      for (const target of targets) {
        const broadcastMsg = await storage.createMessage({
          senderId: req.user!.id,
          receiverId: target.id,
          mosqueId: req.user!.mosqueId,
          content: sanitized,
          isRead: false,
        });
        broadcastToUser(target.id, { type: "message", data: broadcastMsg });
        sent++;
      }
      await logActivity(req.user!, `إرسال رسالة جماعية إلى ${sent} مستخدم`, "messages");
      res.status(201).json({ message: `تم إرسال الرسالة إلى ${sent} مستخدم`, count: sent });
    } catch (err: unknown) {
      sendError(res, err, "إرسال رسالة جماعية");
    }
  });

  app.delete("/api/messages/conversation/:userId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user!;
      const otherUser = await storage.getUser(req.params.userId);
      if (otherUser && currentUser.role !== "admin" && otherUser.mosqueId !== currentUser.mosqueId) {
        return res.status(403).json({ message: "غير مصرح بالوصول لهذه المحادثة" });
      }
      const conv = await storage.getConversation(currentUser.id, req.params.userId);
      for (const msg of conv) {
        await storage.deleteMessage(msg.id);
      }
      await logActivity(currentUser, "حذف محادثة", "messages");
      res.json({ message: "تم حذف المحادثة" });
    } catch (err: unknown) {
      sendError(res, err, "حذف المحادثة");
    }
  });

  app.get("/api/messages/search", requireAuth, async (req, res) => {
    try {
      const query = (req.query.q as string || "").trim().toLowerCase();
      if (!query || query.length < 2) return res.status(400).json({ message: "كلمة البحث قصيرة جداً" });
      const msgs = await storage.getMessagesByUser(req.user!.id);
      const results = msgs.filter(m => m.content.toLowerCase().includes(query)).slice(0, 50);
      res.json(results);
    } catch (err: unknown) {
      sendError(res, err, "البحث في الرسائل");
    }
  });

}

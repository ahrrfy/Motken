import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  MessageCircle, Send, Loader2, Search, Plus, ArrowRight, Users,
  Trash2, CheckCheck, Check, MoreVertical, Megaphone, X, AlertTriangle,
  FileText, Settings, Edit, Phone, Video, Info, Smile, Paperclip
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { formatDateAr, formatTimeAr } from "@/lib/utils";

interface Conversation {
  userId: string;
  userName: string;
  userRole: string;
  userAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
}

interface UserOption {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  mosqueId?: string | null;
}

const MAX_MSG_LENGTH = 2000;

const roleLabels: Record<string, string> = {
  admin: "مدير النظام",
  supervisor: "مشرف",
  teacher: "معلم",
  student: "طالب",
};

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  supervisor: "bg-blue-100 text-blue-700",
  teacher: "bg-emerald-100 text-emerald-700",
  student: "bg-amber-100 text-amber-700",
};

const roleDot: Record<string, string> = {
  admin: "bg-red-400",
  supervisor: "bg-blue-400",
  teacher: "bg-emerald-400",
  student: "bg-amber-400",
};

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [activeUserName, setActiveUserName] = useState("");
  const [activeUserRole, setActiveUserRole] = useState("");
  const [activeUserAvatar, setActiveUserAvatar] = useState<string | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);

  const [newConvoOpen, setNewConvoOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastContent, setBroadcastContent] = useState("");
  const [broadcastTarget, setBroadcastTarget] = useState("all");
  const [broadcastSending, setBroadcastSending] = useState(false);

  const [messageTemplates, setMessageTemplates] = useState<{ id: string, title: string, content: string }[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [deleteConvoConfirm, setDeleteConvoConfirm] = useState<string | null>(null);
  const [deletingConvo, setDeletingConvo] = useState(false);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);

  const [convoSearch, setConvoSearch] = useState("");
  const [convoFilterRole, setConvoFilterRole] = useState("all");
  const [convoFilterUnread, setConvoFilterUnread] = useState(false);

  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [newTemplateCategory, setNewTemplateCategory] = useState("general");
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateContent, setNewTemplateContent] = useState("");
  const [submittingTemplate, setSubmittingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const canManageTemplates = user?.role === "admin" || user?.role === "supervisor";
  const canBroadcast = user?.role === "admin" || user?.role === "supervisor";

  const handleCreateTemplate = async () => {
    if (!newTemplateTitle || !newTemplateContent) {
      toast({ title: "خطأ", description: "العنوان والمحتوى مطلوبان", variant: "destructive" });
      return;
    }
    setSubmittingTemplate(true);
    try {
      const res = await fetch("/api/message-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ category: newTemplateCategory, title: newTemplateTitle, content: newTemplateContent }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إضافة القالب", className: "bg-green-50 border-green-200 text-green-800" });
        setNewTemplateTitle(""); setNewTemplateContent(""); setNewTemplateCategory("general");
        fetchTemplates();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في الإضافة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally { setSubmittingTemplate(false); }
  };

  const handleDeleteTemplate = async (id: string) => {
    setDeletingTemplateId(id);
    try {
      const res = await fetch(`/api/message-templates/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حذف القالب", className: "bg-green-50 border-green-200 text-green-800" });
        fetchTemplates();
      } else {
        toast({ title: "خطأ", description: "فشل في الحذف", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally { setDeletingTemplateId(null); }
  };

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/message-templates", { credentials: "include" });
      if (res.ok) setMessageTemplates(await res.json());
    } catch {} finally { setLoadingTemplates(false); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/conversations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.map((c: any) => ({
          userId: c.user?.id || "",
          userName: c.user?.name || "مستخدم",
          userRole: c.user?.role || "student",
          userAvatar: c.user?.avatar,
          lastMessage: c.lastMessage?.content || "",
          lastMessageTime: c.lastMessage?.createdAt || "",
          unreadCount: c.unreadCount || 0,
        })));
      }
    } catch {}
  }, []);

  useEffect(() => { fetchConversations().finally(() => setLoadingConversations(false)); }, [fetchConversations]);
  useEffect(() => {
    pollRef.current = setInterval(fetchConversations, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchConversations]);

  useEffect(() => {
    if (!activeUserId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages/conversation/${activeUserId}`, { credentials: "include" });
        if (res.ok) setMessages(await res.json());
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [activeUserId]);

  const openConversation = async (userId: string, userName: string, role: string, avatar?: string) => {
    setActiveUserId(userId); setActiveUserName(userName); setActiveUserRole(role);
    setActiveUserAvatar(avatar); setShowMobileChat(true); setLoadingMessages(true);
    setMessages([]); setSearchMode(false);
    try {
      const res = await fetch(`/api/messages/conversation/${userId}`, { credentials: "include" });
      if (res.ok) setMessages(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الرسائل", variant: "destructive" });
    } finally { setLoadingMessages(false); }
    try {
      await fetch(`/api/messages/mark-all-read/${userId}`, { method: "POST", credentials: "include" });
      setConversations(prev => prev.map(c => c.userId === userId ? { ...c, unreadCount: 0 } : c));
    } catch {}
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || !activeUserId || sending) return;
    if (trimmed.length > MAX_MSG_LENGTH) {
      toast({ title: "خطأ", description: `الحد الأقصى ${MAX_MSG_LENGTH} حرف`, variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: activeUserId, content: trimmed }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      const newMsg = await res.json();
      setMessages(prev => [...prev, newMsg]);
      setMessageText("");
      fetchConversations();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "فشل في الإرسال", variant: "destructive" });
    } finally {
      setSending(false);
      // ضمان بقاء المؤشر في مربع الكتابة بعد الإرسال
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const openNewConvoDialog = async () => {
    setNewConvoOpen(true); setUserSearch(""); setLoadingUsers(true);
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.ok) setUsersList((await res.json()).filter((u: UserOption) => u.id !== user?.id));
    } catch {} finally { setLoadingUsers(false); }
  };

  const selectNewUser = (u: UserOption) => { setNewConvoOpen(false); openConversation(u.id, u.name, u.role, u.avatar); };
  const filteredUsers = usersList.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || (roleLabels[u.role] || "").includes(userSearch));

  const handleDeleteMessage = async (msgId: string) => {
    setDeletingMessage(true);
    try {
      const res = await fetch(`/api/messages/${msgId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      setMessages(prev => prev.filter(m => m.id !== msgId));
      toast({ title: "تم", description: "تم حذف الرسالة" });
      fetchConversations();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setDeletingMessage(false); setDeleteMessageId(null); }
  };

  const handleDeleteConversation = async (userId: string) => {
    setDeletingConvo(true);
    try {
      const res = await fetch(`/api/messages/conversation/${userId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("فشل الحذف");
      setConversations(prev => prev.filter(c => c.userId !== userId));
      if (activeUserId === userId) { setActiveUserId(null); setMessages([]); setShowMobileChat(false); }
      toast({ title: "تم", description: "تم حذف المحادثة" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setDeletingConvo(false); setDeleteConvoConfirm(null); }
  };

  const handleBroadcast = async () => {
    const trimmed = broadcastContent.trim();
    if (!trimmed) return;
    setBroadcastSending(true);
    try {
      const res = await fetch("/api/messages/broadcast", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, targetRole: broadcastTarget === "all" ? undefined : broadcastTarget }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      const data = await res.json();
      toast({ title: "تم", description: data.message });
      setBroadcastOpen(false); setBroadcastContent(""); setBroadcastTarget("all");
      fetchConversations();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setBroadcastSending(false); }
  };

  const handleSearchMessages = async () => {
    if (searchQuery.trim().length < 2) { toast({ title: "تنبيه", description: "أدخل كلمتين على الأقل" }); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/messages/search?q=${encodeURIComponent(searchQuery.trim())}`, { credentials: "include" });
      if (res.ok) setSearchResults(await res.json());
    } catch {} finally { setSearchLoading(false); }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr); const now = new Date();
      const diff = now.getTime() - date.getTime(); const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return "الآن";
      if (minutes < 60) return `${minutes}د`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}س`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}ي`;
      return formatDateAr(date);
    } catch { return ""; }
  };

  const formatMessageTime = (dateStr: string) => {
    try { return formatTimeAr(new Date(dateStr)); } catch { return ""; }
  };

  const formatDateSeparator = (dateStr: string) => {
    try {
      const date = new Date(dateStr); const today = new Date(); const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === today.toDateString()) return "اليوم";
      if (date.toDateString() === yesterday.toDateString()) return "أمس";
      const days = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
      return days[date.getDay()] + " " + formatDateAr(date);
    } catch { return ""; }
  };

  const getInitials = (name: string) => name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "؟";
  const getDateKey = (dateStr: string) => { try { return new Date(dateStr).toDateString(); } catch { return ""; } };

  const groupedMessages = messages.reduce<Record<string, Message[]>>((groups, msg) => {
    const key = getDateKey(msg.createdAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(msg);
    return groups;
  }, {});

  const filteredConversations = conversations.filter(c => {
    if (convoSearch && !c.userName.includes(convoSearch) && !(roleLabels[c.userRole] || "").includes(convoSearch)) return false;
    if (convoFilterRole !== "all" && c.userRole !== convoFilterRole) return false;
    if (convoFilterUnread && c.unreadCount === 0) return false;
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden" dir="rtl" data-testid="messages-page">

      {/* ===== SIDEBAR ===== */}
      <div className={`flex flex-col w-full md:w-[340px] border-l bg-white dark:bg-slate-900 flex-shrink-0 ${showMobileChat ? "hidden md:flex" : "flex"}`}>

        {/* Sidebar header */}
        <div className="bg-[#075e54] dark:bg-[#054d44] px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9 ring-2 ring-white/30">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-white/20 text-white text-sm font-bold">
                {getInitials(user?.name || "")}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">{user?.name}</p>
              <p className="text-white/60 text-[10px]">{roleLabels[user?.role || ""] || ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canBroadcast && (
              <button
                onClick={() => setBroadcastOpen(true)}
                className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                title="رسالة جماعية"
                data-testid="button-broadcast"
              >
                <Megaphone className="w-4 h-4" />
              </button>
            )}
            {canManageTemplates && (
              <button
                onClick={() => setTemplateDialogOpen(true)}
                className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                title="إدارة القوالب"
                data-testid="button-manage-templates"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={openNewConvoDialog}
              className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
              title="محادثة جديدة"
              data-testid="button-new-conversation"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-3 py-2 bg-[#f0f2f5] dark:bg-slate-800/50">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              placeholder="ابحث في المحادثات..."
              value={convoSearch}
              onChange={e => setConvoSearch(e.target.value)}
              className="w-full bg-white dark:bg-slate-700 rounded-full pr-9 pl-4 py-1.5 text-sm outline-none border-0 text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
              data-testid="input-search-conversations"
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="px-3 py-1.5 bg-[#f0f2f5] dark:bg-slate-800/50 flex items-center gap-1.5 flex-wrap border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setConvoFilterUnread(!convoFilterUnread)}
            className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${convoFilterUnread ? "bg-emerald-600 text-white" : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}
            data-testid="filter-unread"
          >
            غير مقروء
          </button>
          {["all", "admin", "supervisor", "teacher", "student"].map(r => (
            <button
              key={r}
              onClick={() => setConvoFilterRole(r)}
              className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${convoFilterRole === r ? "bg-[#075e54] text-white" : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"}`}
              data-testid={`filter-role-${r}`}
            >
              {r === "all" ? "الكل" : roleLabels[r] || r}
            </button>
          ))}
        </div>

        {/* Unread badge */}
        {totalUnread > 0 && !convoFilterUnread && (
          <div className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100">
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium" data-testid="badge-total-unread">
              {totalUnread} رسالة غير مقروءة
            </p>
          </div>
        )}

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto" data-testid="list-conversations">
          {loadingConversations ? (
            <div className="flex items-center justify-center py-16 gap-2 text-slate-400" data-testid="status-loading-conversations">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">جاري التحميل...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-16 text-slate-400" data-testid="status-empty-conversations">
              <MessageCircle className="w-14 h-14 mx-auto mb-3 opacity-20" />
              <p className="text-sm">{convoSearch ? "لا توجد نتائج" : "لا توجد محادثات"}</p>
              <button onClick={openNewConvoDialog} className="mt-3 text-xs text-[#075e54] hover:underline font-medium">
                ابدأ محادثة جديدة
              </button>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <div
                key={conv.userId}
                onClick={() => openConversation(conv.userId, conv.userName, conv.userRole, conv.userAvatar)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#f5f6f6] dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 group relative ${activeUserId === conv.userId ? "bg-[#f0f2f5] dark:bg-slate-800" : ""}`}
                data-testid={`conversation-item-${conv.userId}`}
              >
                {/* Role color indicator */}
                <div className="relative shrink-0">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={conv.userAvatar} />
                    <AvatarFallback className="bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-200 font-semibold text-sm">
                      {getInitials(conv.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`absolute bottom-0 left-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${roleDot[conv.userRole] || "bg-slate-300"}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate" data-testid={`text-conv-name-${conv.userId}`}>
                      {conv.userName}
                    </span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap mr-1" data-testid={`text-conv-time-${conv.userId}`}>
                      {formatTime(conv.lastMessageTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[160px]" data-testid={`text-conv-preview-${conv.userId}`}>
                      {conv.lastMessage || <span className="italic opacity-60">ابدأ المحادثة</span>}
                    </p>
                    <div className="flex items-center gap-1">
                      {conv.unreadCount > 0 && (
                        <span className="bg-[#25d366] text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 font-bold" data-testid={`badge-unread-${conv.userId}`}>
                          {conv.unreadCount}
                        </span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-slate-400 hover:text-slate-600">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem className="text-destructive gap-2" onClick={e => { e.stopPropagation(); setDeleteConvoConfirm(conv.userId); }}>
                            <Trash2 className="w-4 h-4" />
                            حذف المحادثة
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===== CHAT VIEW ===== */}
      <div className={`flex-1 flex flex-col ${showMobileChat ? "flex" : "hidden md:flex"}`}
        style={{ backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)", backgroundSize: "24px 24px", backgroundColor: "#efeae2" }}>

        {activeUserId ? (
          <>
            {/* Chat header */}
            <div className="bg-[#075e54] dark:bg-[#054d44] px-4 py-2.5 flex items-center gap-3 shadow-md">
              <button
                className="md:hidden text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                onClick={() => setShowMobileChat(false)}
                data-testid="button-back-to-list"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <Avatar className="w-9 h-9 ring-2 ring-white/30 cursor-pointer">
                <AvatarImage src={activeUserAvatar} />
                <AvatarFallback className="bg-white/20 text-white text-sm font-bold">
                  {getInitials(activeUserName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm leading-tight truncate" data-testid="text-active-user-name">{activeUserName}</p>
                <p className="text-white/60 text-[10px]">{roleLabels[activeUserRole] || activeUserRole}</p>
              </div>
              <div className="flex items-center gap-1">
                {messageTemplates.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors" title="قوالب الرسائل" data-testid="button-message-templates">
                        <FileText className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {messageTemplates.map(t => (
                        <DropdownMenuItem key={t.id} onClick={() => setMessageText(t.content)} className="cursor-pointer">
                          <span className="truncate">{t.title}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <button
                  onClick={() => { setSearchMode(!searchMode); setSearchQuery(""); setSearchResults([]); }}
                  className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
                  title="بحث في الرسائل"
                  data-testid="button-search-messages"
                >
                  <Search className="w-4 h-4" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem className="text-destructive gap-2" onClick={() => setDeleteConvoConfirm(activeUserId)}>
                      <Trash2 className="w-4 h-4" />
                      حذف المحادثة
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Search bar in chat */}
            {searchMode && (
              <div className="bg-white dark:bg-slate-800 px-3 py-2 border-b flex items-center gap-2 shadow-sm">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    placeholder="ابحث في الرسائل..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearchMessages()}
                    className="w-full bg-[#f0f2f5] dark:bg-slate-700 rounded-full pr-9 pl-4 py-1.5 text-sm outline-none border-0"
                    data-testid="input-search-in-messages"
                    autoFocus
                  />
                </div>
                <button onClick={handleSearchMessages} disabled={searchLoading} className="text-[#075e54] font-medium text-sm">
                  {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "بحث"}
                </button>
                <button onClick={() => { setSearchMode(false); setSearchResults([]); }} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {searchMode && searchResults.length > 0 && (
              <div className="bg-white dark:bg-slate-800 border-b max-h-40 overflow-y-auto">
                <p className="text-xs text-slate-400 px-4 py-1">{searchResults.length} نتيجة</p>
                {searchResults.slice(0, 10).map(r => (
                  <div key={r.id} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm border-b last:border-0">
                    <p className="text-[10px] text-slate-400">{formatTime(r.createdAt)}</p>
                    <p className="truncate text-slate-700">{r.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" data-testid="list-messages">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-16 gap-2 text-slate-500" data-testid="status-loading-messages">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">جاري التحميل...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full" data-testid="status-empty-messages">
                  <div className="bg-[#fff9c4] text-slate-600 rounded-xl px-5 py-3 text-sm text-center shadow-sm max-w-xs">
                    <p className="font-medium mb-1">🔒 محادثة مشفرة</p>
                    <p className="text-xs text-slate-500">الرسائل مرئية لك وللطرف الآخر فقط</p>
                  </div>
                </div>
              ) : (
                <>
                  {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
                    <div key={dateKey}>
                      {/* Date separator */}
                      <div className="flex items-center justify-center my-4">
                        <span className="bg-white/90 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[11px] px-3 py-1 rounded-full shadow-sm">
                          {formatDateSeparator(dateMessages[0].createdAt)}
                        </span>
                      </div>

                      {dateMessages.map((msg, idx) => {
                        const isSent = msg.senderId === user?.id;
                        const prevMsg = dateMessages[idx - 1];
                        const nextMsg = dateMessages[idx + 1];
                        const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;
                        const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;

                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isSent ? "justify-start" : "justify-end"} ${isLastInGroup ? "mb-2" : "mb-0.5"} group/msg`}
                            data-testid={`message-item-${msg.id}`}
                          >
                            <div className="relative max-w-[72%]">
                              {/* Bubble */}
                              <div
                                className={`relative px-3 py-2 shadow-sm ${
                                  isSent
                                    ? `bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-800 dark:text-slate-100 ${isLastInGroup ? "rounded-2xl rounded-bl-sm" : "rounded-2xl"}`
                                    : `bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 ${isLastInGroup ? "rounded-2xl rounded-br-sm" : "rounded-2xl"}`
                                }`}
                                data-testid={`message-bubble-${msg.id}`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed" data-testid={`text-message-content-${msg.id}`}>
                                  {msg.content}
                                </p>
                                <div className={`flex items-center gap-1 mt-0.5 ${isSent ? "justify-start" : "justify-end"}`}>
                                  <span className="text-[10px] text-slate-400 dark:text-slate-400" data-testid={`text-message-time-${msg.id}`}>
                                    {formatMessageTime(msg.createdAt)}
                                  </span>
                                  {isSent && (
                                    msg.isRead
                                      ? <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                                      : <Check className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                </div>
                              </div>

                              {/* Delete button */}
                              {isSent && (
                                <button
                                  onClick={() => setDeleteMessageId(msg.id)}
                                  className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                                  title="حذف الرسالة"
                                  data-testid={`button-delete-message-${msg.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input area */}
            <div className="bg-[#f0f2f5] dark:bg-slate-800 px-3 py-2.5 flex items-end gap-2">
              <div className="flex-1 bg-white dark:bg-slate-700 rounded-2xl shadow-sm flex items-end px-3 py-1.5 gap-2">
                <Textarea
                  ref={inputRef}
                  placeholder="اكتب رسالة..."
                  value={messageText}
                  onChange={e => { if (e.target.value.length <= MAX_MSG_LENGTH) setMessageText(e.target.value); }}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  className="flex-1 border-0 bg-transparent resize-none min-h-[36px] max-h-[120px] p-0 text-sm focus-visible:ring-0 shadow-none outline-none"
                  rows={1}
                  data-testid="input-message"
                />
                {messageText.length > MAX_MSG_LENGTH * 0.85 && (
                  <span className="text-[10px] text-slate-400 self-end pb-0.5 shrink-0">
                    {messageText.length}/{MAX_MSG_LENGTH}
                  </span>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={!messageText.trim() || sending}
                className="w-10 h-10 rounded-full bg-[#075e54] hover:bg-[#054d44] disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white flex items-center justify-center transition-colors shadow-sm shrink-0"
                data-testid="button-send-message"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center" data-testid="status-no-conversation">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-white/80 dark:bg-slate-700 shadow-lg flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="w-12 h-12 text-[#075e54] opacity-60" />
              </div>
              <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-300 mb-2">مُتْقِن للرسائل</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">اختر محادثة للبدء أو ابدأ محادثة جديدة</p>
              <button
                onClick={openNewConvoDialog}
                className="bg-[#075e54] hover:bg-[#054d44] text-white px-5 py-2 rounded-full text-sm font-medium transition-colors shadow-sm"
              >
                محادثة جديدة
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===== DIALOGS ===== */}

      {/* New conversation */}
      <Dialog open={newConvoOpen} onOpenChange={setNewConvoOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> محادثة جديدة</DialogTitle>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="ابحث عن مستخدم..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pr-9" data-testid="input-search-users" />
          </div>
          <ScrollArea className="h-[300px]">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8 gap-2" data-testid="status-loading-users">
                <Loader2 className="w-5 h-5 animate-spin text-[#075e54]" />
                <span className="text-sm text-slate-500">جاري التحميل...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm" data-testid="status-empty-users">لا يوجد مستخدمون</div>
            ) : (
              <div data-testid="list-users">
                {filteredUsers.map(u => (
                  <div key={u.id} onClick={() => selectNewUser(u)} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors" data-testid={`user-item-${u.id}`}>
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={u.avatar} />
                      <AvatarFallback className="bg-slate-200 text-slate-600 font-semibold text-sm">{getInitials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-800">{u.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${roleColors[u.role] || ""}`}>{roleLabels[u.role] || u.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Broadcast */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Megaphone className="w-5 h-5 text-[#075e54]" /> رسالة جماعية</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">إرسال إلى</label>
              <Select value={broadcastTarget} onValueChange={setBroadcastTarget}>
                <SelectTrigger data-testid="select-broadcast-target"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستخدمين</SelectItem>
                  <SelectItem value="teacher">المعلمين فقط</SelectItem>
                  <SelectItem value="student">الطلاب فقط</SelectItem>
                  <SelectItem value="supervisor">المشرفين فقط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">نص الرسالة</label>
              <Textarea placeholder="اكتب الرسالة الجماعية..." value={broadcastContent} onChange={e => { if (e.target.value.length <= MAX_MSG_LENGTH) setBroadcastContent(e.target.value); }} rows={4} className="resize-none" data-testid="input-broadcast-content" />
              <span className="text-[10px] text-slate-400">{broadcastContent.length}/{MAX_MSG_LENGTH}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBroadcastOpen(false)}>إلغاء</Button>
            <Button onClick={handleBroadcast} disabled={!broadcastContent.trim() || broadcastSending} className="bg-[#075e54] hover:bg-[#054d44] gap-2" data-testid="button-send-broadcast">
              {broadcastSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              إرسال للجميع
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete conversation confirmation */}
      <Dialog open={!!deleteConvoConfirm} onOpenChange={() => setDeleteConvoConfirm(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" /> حذف المحادثة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">هل أنت متأكد من حذف هذه المحادثة؟ سيتم حذف جميع الرسائل ولا يمكن التراجع.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConvoConfirm(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteConvoConfirm && handleDeleteConversation(deleteConvoConfirm)} disabled={deletingConvo} data-testid="button-confirm-delete-convo">
              {deletingConvo && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              حذف نهائي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete single message */}
      <Dialog open={!!deleteMessageId} onOpenChange={() => setDeleteMessageId(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><Trash2 className="w-5 h-5" /> حذف الرسالة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">هل أنت متأكد من حذف هذه الرسالة؟</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteMessageId(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteMessageId && handleDeleteMessage(deleteMessageId)} disabled={deletingMessage} data-testid="button-confirm-delete-message">
              {deletingMessage && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Templates manager */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> إدارة قوالب الرسائل</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3 border rounded-xl p-4 bg-slate-50 dark:bg-slate-800">
              <h4 className="text-sm font-bold">إضافة قالب جديد</h4>
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Select value={newTemplateCategory} onValueChange={setNewTemplateCategory}>
                  <SelectTrigger data-testid="select-template-category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">عام</SelectItem>
                    <SelectItem value="congratulation">تهنئة</SelectItem>
                    <SelectItem value="warning">تحذير</SelectItem>
                    <SelectItem value="absence">غياب</SelectItem>
                    <SelectItem value="reminder">تذكير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>العنوان *</Label>
                <Input value={newTemplateTitle} onChange={e => setNewTemplateTitle(e.target.value)} placeholder="مثال: تهنئة بإتمام الجزء" data-testid="input-template-title" />
              </div>
              <div className="space-y-2">
                <Label>المحتوى *</Label>
                <Textarea value={newTemplateContent} onChange={e => setNewTemplateContent(e.target.value)} placeholder="نص الرسالة..." className="min-h-[80px]" data-testid="input-template-content" />
              </div>
              <Button onClick={handleCreateTemplate} disabled={submittingTemplate} className="w-full gap-2 bg-[#075e54] hover:bg-[#054d44]" data-testid="button-save-template">
                {submittingTemplate && <Loader2 className="w-4 h-4 animate-spin" />}
                <Plus className="w-4 h-4" />
                إضافة القالب
              </Button>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold">القوالب الحالية ({messageTemplates.length})</h4>
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-[#075e54]" /></div>
              ) : messageTemplates.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">لا توجد قوالب بعد</p>
              ) : (
                <div className="space-y-2">
                  {messageTemplates.map(template => (
                    <div key={template.id} className="flex items-start gap-2 p-3 border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800" data-testid={`template-item-${template.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{template.title}</p>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{template.content}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={() => handleDeleteTemplate(template.id)} disabled={deletingTemplateId === template.id} data-testid={`button-delete-template-${template.id}`}>
                        {deletingTemplateId === template.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

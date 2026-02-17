import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageCircle, Send, Loader2, Search, Plus, ArrowRight, Users,
  Trash2, CheckCheck, Check, MoreVertical, Megaphone, X, AlertTriangle
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
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
  admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  supervisor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  teacher: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  student: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
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

  const [deleteConvoConfirm, setDeleteConvoConfirm] = useState<string | null>(null);
  const [deletingConvo, setDeletingConvo] = useState(false);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);

  const [convoSearch, setConvoSearch] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/conversations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((c: any) => ({
          userId: c.user?.id || "",
          userName: c.user?.name || "مستخدم",
          userRole: c.user?.role || "student",
          userAvatar: c.user?.avatar,
          lastMessage: c.lastMessage?.content || "",
          lastMessageTime: c.lastMessage?.createdAt || "",
          unreadCount: c.unreadCount || 0,
        }));
        setConversations(mapped);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations().finally(() => setLoadingConversations(false));
  }, [fetchConversations]);

  useEffect(() => {
    pollRef.current = setInterval(fetchConversations, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchConversations]);

  useEffect(() => {
    if (!activeUserId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages/conversation/${activeUserId}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [activeUserId]);

  const openConversation = async (userId: string, userName: string, role: string, avatar?: string) => {
    setActiveUserId(userId);
    setActiveUserName(userName);
    setActiveUserRole(role);
    setActiveUserAvatar(avatar);
    setShowMobileChat(true);
    setLoadingMessages(true);
    setMessages([]);
    setSearchMode(false);

    try {
      const res = await fetch(`/api/messages/conversation/${userId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الرسائل", variant: "destructive" });
    } finally {
      setLoadingMessages(false);
    }

    try {
      await fetch(`/api/messages/mark-all-read/${userId}`, {
        method: "POST",
        credentials: "include",
      });
      setConversations(prev =>
        prev.map(c => c.userId === userId ? { ...c, unreadCount: 0 } : c)
      );
    } catch {}

    setTimeout(() => inputRef.current?.focus(), 100);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || !activeUserId || sending) return;
    if (trimmed.length > MAX_MSG_LENGTH) {
      toast({ title: "خطأ", description: `الرسالة طويلة جداً (الحد الأقصى ${MAX_MSG_LENGTH} حرف)`, variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: activeUserId,
          content: trimmed,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "فشل في إرسال الرسالة");
      }
      const newMsg = await res.json();
      setMessages(prev => [...prev, newMsg]);
      setMessageText("");
      fetchConversations();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message || "فشل في إرسال الرسالة", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const openNewConvoDialog = async () => {
    setNewConvoOpen(true);
    setUserSearch("");
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.filter((u: UserOption) => u.id !== user?.id));
      }
    } catch {} finally {
      setLoadingUsers(false);
    }
  };

  const selectNewUser = (u: UserOption) => {
    setNewConvoOpen(false);
    openConversation(u.id, u.name, u.role, u.avatar);
  };

  const filteredUsers = usersList.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    (roleLabels[u.role] || "").includes(userSearch)
  );

  const handleDeleteMessage = async (msgId: string) => {
    setDeletingMessage(true);
    try {
      const res = await fetch(`/api/messages/${msgId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "فشل الحذف");
      }
      setMessages(prev => prev.filter(m => m.id !== msgId));
      toast({ title: "تم", description: "تم حذف الرسالة" });
      fetchConversations();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setDeletingMessage(false);
      setDeleteMessageId(null);
    }
  };

  const handleDeleteConversation = async (userId: string) => {
    setDeletingConvo(true);
    try {
      const res = await fetch(`/api/messages/conversation/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("فشل الحذف");
      setConversations(prev => prev.filter(c => c.userId !== userId));
      if (activeUserId === userId) {
        setActiveUserId(null);
        setMessages([]);
        setShowMobileChat(false);
      }
      toast({ title: "تم", description: "تم حذف المحادثة" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setDeletingConvo(false);
      setDeleteConvoConfirm(null);
    }
  };

  const handleBroadcast = async () => {
    const trimmed = broadcastContent.trim();
    if (!trimmed) return;
    setBroadcastSending(true);
    try {
      const res = await fetch("/api/messages/broadcast", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          targetRole: broadcastTarget === "all" ? undefined : broadcastTarget,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "فشل الإرسال");
      }
      const data = await res.json();
      toast({ title: "تم", description: data.message });
      setBroadcastOpen(false);
      setBroadcastContent("");
      setBroadcastTarget("all");
      fetchConversations();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleSearchMessages = async () => {
    if (searchQuery.trim().length < 2) {
      toast({ title: "تنبيه", description: "أدخل كلمتين على الأقل للبحث" });
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/messages/search?q=${encodeURIComponent(searchQuery.trim())}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch {} finally {
      setSearchLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      if (minutes < 1) return "الآن";
      if (minutes < 60) return `منذ ${minutes} د`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `منذ ${hours} س`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `منذ ${days} ي`;
      return formatDateAr(date);
    } catch {
      return dateStr;
    }
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatTimeAr(date);
    } catch {
      return "";
    }
  };

  const formatDateSeparator = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === today.toDateString()) return "اليوم";
      if (date.toDateString() === yesterday.toDateString()) return "أمس";
      const days = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]; return days[date.getDay()] + " " + formatDateAr(date);
    } catch {
      return "";
    }
  };

  const getInitials = (name: string) => {
    return name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "؟";
  };

  const getDateKey = (dateStr: string) => {
    try {
      return new Date(dateStr).toDateString();
    } catch {
      return "";
    }
  };

  const groupedMessages = messages.reduce<Record<string, Message[]>>((groups, msg) => {
    const key = getDateKey(msg.createdAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(msg);
    return groups;
  }, {});

  const filteredConversations = convoSearch
    ? conversations.filter(c => c.userName.includes(convoSearch) || (roleLabels[c.userRole] || "").includes(convoSearch))
    : conversations;

  const canBroadcast = user?.role === "admin" || user?.role === "supervisor";

  const ConversationsList = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg" data-testid="text-conversations-title">المحادثات</h2>
            {totalUnread > 0 && (
              <Badge variant="destructive" className="text-xs" data-testid="badge-total-unread">
                {totalUnread}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {canBroadcast && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs"
                onClick={() => setBroadcastOpen(true)}
                data-testid="button-broadcast"
                title="رسالة جماعية"
              >
                <Megaphone className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1" onClick={openNewConvoDialog} data-testid="button-new-conversation">
              <Plus className="w-4 h-4" />
              جديد
            </Button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute right-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="بحث في المحادثات..."
            value={convoSearch}
            onChange={(e) => setConvoSearch(e.target.value)}
            className="pr-8 h-8 text-sm"
            data-testid="input-search-conversations"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {loadingConversations ? (
          <div className="flex items-center justify-center py-12" data-testid="status-loading-conversations">
            <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
            <span>جاري التحميل...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground" data-testid="status-empty-conversations">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{convoSearch ? "لا توجد نتائج" : "لا توجد محادثات"}</p>
            <p className="text-sm mt-1">ابدأ محادثة جديدة</p>
          </div>
        ) : (
          <div data-testid="list-conversations">
            {filteredConversations.map((conv) => (
              <div
                key={conv.userId}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b group ${
                  activeUserId === conv.userId ? "bg-primary/10 border-r-4 border-r-primary" : ""
                }`}
                onClick={() => openConversation(conv.userId, conv.userName, conv.userRole, conv.userAvatar)}
                data-testid={`conversation-item-${conv.userId}`}
              >
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={conv.userAvatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(conv.userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-sm truncate" data-testid={`text-conv-name-${conv.userId}`}>
                        {conv.userName}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${roleColors[conv.userRole] || ""}`}>
                        {roleLabels[conv.userRole] || conv.userRole}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-conv-time-${conv.userId}`}>
                        {formatTime(conv.lastMessageTime)}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem
                            className="text-destructive gap-2"
                            onClick={(e) => { e.stopPropagation(); setDeleteConvoConfirm(conv.userId); }}
                          >
                            <Trash2 className="w-4 h-4" />
                            حذف المحادثة
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-muted-foreground truncate max-w-[160px]" data-testid={`text-conv-preview-${conv.userId}`}>
                      {conv.lastMessage}
                    </p>
                    {conv.unreadCount > 0 && (
                      <Badge className="bg-emerald-500 text-white text-[10px] min-w-[20px] h-5 flex items-center justify-center rounded-full mr-1" data-testid={`badge-unread-${conv.userId}`}>
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const ChatView = () => (
    <div className="flex flex-col h-full">
      {activeUserId ? (
        <>
          <div className="p-3 border-b flex items-center gap-3 bg-card">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0"
              onClick={() => setShowMobileChat(false)}
              data-testid="button-back-to-list"
            >
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Avatar className="w-9 h-9 shrink-0">
              <AvatarImage src={activeUserAvatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {getInitials(activeUserName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm" data-testid="text-active-user-name">{activeUserName}</h3>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${roleColors[activeUserRole] || ""}`}>
                  {roleLabels[activeUserRole] || activeUserRole}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { setSearchMode(!searchMode); setSearchQuery(""); setSearchResults([]); }}
                data-testid="button-search-messages"
                title="بحث في الرسائل"
              >
                <Search className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    className="text-destructive gap-2"
                    onClick={() => setDeleteConvoConfirm(activeUserId)}
                  >
                    <Trash2 className="w-4 h-4" />
                    حذف المحادثة
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {searchMode && (
            <div className="p-2 border-b bg-muted/30 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث في الرسائل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchMessages()}
                  className="pr-8 h-8 text-sm"
                  data-testid="input-search-in-messages"
                  autoFocus
                />
              </div>
              <Button size="sm" variant="outline" onClick={handleSearchMessages} disabled={searchLoading} className="h-8">
                {searchLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "بحث"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setSearchMode(false); setSearchResults([]); }} className="h-8 px-2">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}

          {searchMode && searchResults.length > 0 && (
            <div className="border-b bg-muted/20 max-h-40 overflow-y-auto">
              <p className="text-xs text-muted-foreground px-3 py-1">
                {searchResults.length} نتيجة
              </p>
              {searchResults.slice(0, 10).map((r) => (
                <div key={r.id} className="px-3 py-1.5 hover:bg-muted/50 cursor-pointer text-sm border-b last:border-0">
                  <p className="text-xs text-muted-foreground">{formatTime(r.createdAt)}</p>
                  <p className="truncate">{r.content}</p>
                </div>
              ))}
            </div>
          )}

          <ScrollArea className="flex-1 p-3">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-12" data-testid="status-loading-messages">
                <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
                <span>جاري التحميل...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground" data-testid="status-empty-messages">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد رسائل بعد</p>
                <p className="text-sm mt-1">ابدأ المحادثة الآن</p>
              </div>
            ) : (
              <div className="space-y-1" data-testid="list-messages">
                {Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
                  <div key={dateKey}>
                    <div className="flex items-center justify-center my-3">
                      <div className="bg-muted/70 text-muted-foreground text-[11px] px-3 py-1 rounded-full">
                        {formatDateSeparator(dateMessages[0].createdAt)}
                      </div>
                    </div>
                    {dateMessages.map((msg) => {
                      const isSent = msg.senderId === user?.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isSent ? "justify-start" : "justify-end"} mb-1.5 group/msg`}
                          data-testid={`message-item-${msg.id}`}
                        >
                          <div className="relative max-w-[75%]">
                            <div
                              className={`rounded-2xl px-4 py-2 ${
                                isSent
                                  ? "bg-emerald-500 text-white rounded-bl-sm"
                                  : "bg-muted rounded-br-sm"
                              }`}
                              data-testid={`message-bubble-${msg.id}`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words" data-testid={`text-message-content-${msg.id}`}>
                                {msg.content}
                              </p>
                              <div className={`flex items-center gap-1 mt-0.5 ${isSent ? "justify-start" : "justify-end"}`}>
                                <span className={`text-[10px] ${isSent ? "text-white/70" : "text-muted-foreground"}`} data-testid={`text-message-time-${msg.id}`}>
                                  {formatMessageTime(msg.createdAt)}
                                </span>
                                {isSent && (
                                  <span className="text-white/70">
                                    {msg.isRead ? (
                                      <CheckCheck className="w-3.5 h-3.5 inline" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5 inline" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                            {isSent && (
                              <button
                                onClick={() => setDeleteMessageId(msg.id)}
                                className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
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
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t bg-card">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Textarea
                  ref={inputRef}
                  placeholder="اكتب رسالة..."
                  value={messageText}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_MSG_LENGTH) {
                      setMessageText(e.target.value);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  className="min-h-[40px] max-h-[120px] resize-none pr-3"
                  rows={1}
                  data-testid="input-message"
                />
                {messageText.length > 0 && (
                  <span className={`absolute left-2 bottom-1 text-[10px] ${messageText.length > MAX_MSG_LENGTH * 0.9 ? "text-red-500" : "text-muted-foreground"}`}>
                    {messageText.length}/{MAX_MSG_LENGTH}
                  </span>
                )}
              </div>
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!messageText.trim() || sending}
                className="bg-emerald-500 hover:bg-emerald-600 shrink-0 h-10 w-10"
                data-testid="button-send-message"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground" data-testid="status-no-conversation">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">اختر محادثة للبدء</p>
            <p className="text-sm mt-1">أو ابدأ محادثة جديدة</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">
            الرسائل
          </h1>
          <p className="text-muted-foreground text-sm">تواصل مع المستخدمين الآخرين</p>
        </div>
        {totalUnread > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1" data-testid="badge-header-unread">
            {totalUnread} رسالة غير مقروءة
          </Badge>
        )}
      </div>

      <Card className="overflow-hidden" style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}>
        <div className="flex h-full">
          <div className={`w-full md:w-[340px] md:border-l h-full ${showMobileChat ? "hidden md:flex md:flex-col" : "flex flex-col"}`}>
            <ConversationsList />
          </div>
          <div className={`flex-1 h-full ${showMobileChat ? "flex flex-col" : "hidden md:flex md:flex-col"}`}>
            <ChatView />
          </div>
        </div>
      </Card>

      {/* New conversation dialog */}
      <Dialog open={newConvoOpen} onOpenChange={setNewConvoOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              محادثة جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن مستخدم..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pr-9"
                data-testid="input-search-users"
              />
            </div>
            <ScrollArea className="h-[300px]">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8" data-testid="status-loading-users">
                  <Loader2 className="w-5 h-5 animate-spin text-primary ml-2" />
                  <span className="text-sm">جاري التحميل...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm" data-testid="status-empty-users">
                  لا يوجد مستخدمون
                </div>
              ) : (
                <div data-testid="list-users">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg"
                      onClick={() => selectNewUser(u)}
                      data-testid={`user-item-${u.id}`}
                    >
                      <Avatar className="w-9 h-9">
                        <AvatarImage src={u.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{u.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${roleColors[u.role] || ""}`}>
                          {roleLabels[u.role] || u.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Broadcast dialog */}
      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              رسالة جماعية
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">إرسال إلى</label>
              <Select value={broadcastTarget} onValueChange={setBroadcastTarget}>
                <SelectTrigger data-testid="select-broadcast-target">
                  <SelectValue />
                </SelectTrigger>
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
              <Textarea
                placeholder="اكتب الرسالة الجماعية..."
                value={broadcastContent}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_MSG_LENGTH) setBroadcastContent(e.target.value);
                }}
                rows={4}
                className="resize-none"
                data-testid="input-broadcast-content"
              />
              <div className="flex justify-between mt-1">
                <span className={`text-[10px] ${broadcastContent.length > MAX_MSG_LENGTH * 0.9 ? "text-red-500" : "text-muted-foreground"}`}>
                  {broadcastContent.length}/{MAX_MSG_LENGTH}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBroadcastOpen(false)}>إلغاء</Button>
            <Button
              onClick={handleBroadcast}
              disabled={!broadcastContent.trim() || broadcastSending}
              className="bg-emerald-500 hover:bg-emerald-600 gap-2"
              data-testid="button-send-broadcast"
            >
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
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              حذف المحادثة
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            هل أنت متأكد من حذف هذه المحادثة بالكامل؟ سيتم حذف جميع الرسائل ولا يمكن التراجع عن هذا الإجراء.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConvoConfirm(null)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConvoConfirm && handleDeleteConversation(deleteConvoConfirm)}
              disabled={deletingConvo}
              data-testid="button-confirm-delete-convo"
            >
              {deletingConvo ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              حذف نهائي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete single message confirmation */}
      <Dialog open={!!deleteMessageId} onOpenChange={() => setDeleteMessageId(null)}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              حذف الرسالة
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            هل أنت متأكد من حذف هذه الرسالة؟
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteMessageId(null)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMessageId && handleDeleteMessage(deleteMessageId)}
              disabled={deletingMessage}
              data-testid="button-confirm-delete-message"
            >
              {deletingMessage ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

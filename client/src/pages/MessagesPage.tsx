import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Send, Loader2, Search, Plus, ArrowRight, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

interface Conversation {
  userId: string;
  userName: string;
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

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [activeUserName, setActiveUserName] = useState("");
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/conversations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchConversations().finally(() => setLoadingConversations(false));
  }, [fetchConversations]);

  useEffect(() => {
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const openConversation = async (userId: string, userName: string, avatar?: string) => {
    setActiveUserId(userId);
    setActiveUserName(userName);
    setActiveUserAvatar(avatar);
    setShowMobileChat(true);
    setLoadingMessages(true);
    setMessages([]);

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
    if (!messageText.trim() || !activeUserId || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: activeUserId,
          content: messageText.trim(),
          mosqueId: user?.mosqueId || undefined,
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
    openConversation(u.id, u.name, u.avatar);
  };

  const filteredUsers = usersList.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase())
  );

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
      return date.toLocaleDateString("ar");
    } catch {
      return dateStr;
    }
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const getInitials = (name: string) => {
    return name?.split(" ").map(w => w[0]).join("").slice(0, 2) || "؟";
  };

  const ConversationsList = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-lg" data-testid="text-conversations-title">المحادثات</h2>
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs" data-testid="badge-total-unread">
              {totalUnread}
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" className="gap-1" onClick={openNewConvoDialog} data-testid="button-new-conversation">
          <Plus className="w-4 h-4" />
          جديد
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {loadingConversations ? (
          <div className="flex items-center justify-center py-12" data-testid="status-loading-conversations">
            <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
            <span>جاري التحميل...</span>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground" data-testid="status-empty-conversations">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد محادثات</p>
            <p className="text-sm mt-1">ابدأ محادثة جديدة</p>
          </div>
        ) : (
          <div data-testid="list-conversations">
            {conversations.map((conv) => (
              <div
                key={conv.userId}
                className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors border-b ${
                  activeUserId === conv.userId ? "bg-primary/10 border-r-4 border-r-primary" : ""
                }`}
                onClick={() => openConversation(conv.userId, conv.userName, conv.userAvatar)}
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
                    <span className="font-semibold text-sm truncate" data-testid={`text-conv-name-${conv.userId}`}>
                      {conv.userName}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap mr-2" data-testid={`text-conv-time-${conv.userId}`}>
                      {formatTime(conv.lastMessageTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]" data-testid={`text-conv-preview-${conv.userId}`}>
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
            <div>
              <h3 className="font-semibold text-sm" data-testid="text-active-user-name">{activeUserName}</h3>
            </div>
          </div>

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
              <div className="space-y-3" data-testid="list-messages">
                {messages.map((msg) => {
                  const isSent = msg.senderId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isSent ? "justify-start" : "justify-end"}`}
                      data-testid={`message-item-${msg.id}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                          isSent
                            ? "bg-emerald-500 text-white rounded-bl-sm"
                            : "bg-muted rounded-br-sm"
                        }`}
                        data-testid={`message-bubble-${msg.id}`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words" data-testid={`text-message-content-${msg.id}`}>
                          {msg.content}
                        </p>
                        <p className={`text-[10px] mt-1 ${isSent ? "text-white/70" : "text-muted-foreground"}`} data-testid={`text-message-time-${msg.id}`}>
                          {formatMessageTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          <div className="p-3 border-t bg-card">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                placeholder="اكتب رسالة..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                className="flex-1"
                data-testid="input-message"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!messageText.trim() || sending}
                className="bg-emerald-500 hover:bg-emerald-600 shrink-0"
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
          <p className="text-muted-foreground">تواصل مع المستخدمين الآخرين</p>
        </div>
        {totalUnread > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1" data-testid="badge-header-unread">
            {totalUnread} رسالة غير مقروءة
          </Badge>
        )}
      </div>

      <Card className="overflow-hidden" style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}>
        <div className="flex h-full">
          {/* Conversations list - hidden on mobile when chat is open */}
          <div className={`w-full md:w-[340px] md:border-l h-full ${showMobileChat ? "hidden md:flex md:flex-col" : "flex flex-col"}`}>
            <ConversationsList />
          </div>

          {/* Chat view - hidden on mobile when list is shown */}
          <div className={`flex-1 h-full ${showMobileChat ? "flex flex-col" : "hidden md:flex md:flex-col"}`}>
            <ChatView />
          </div>
        </div>
      </Card>

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
                      <div>
                        <p className="font-medium text-sm">{u.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.role === "admin" ? "مدير" : u.role === "supervisor" ? "مشرف" : u.role === "teacher" ? "معلم" : "طالب"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

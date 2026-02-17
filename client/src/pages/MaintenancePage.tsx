import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { formatDateAr } from "@/lib/utils";
import {
  Loader2, MessageSquare, AlertCircle, CheckCircle2, Clock, Send, Trash2, Eye
} from "lucide-react";

interface Feedback {
  id: string;
  userId: string | null;
  userName?: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  anonymous: boolean;
  response: string | null;
  createdAt: string;
}

const typeMap: Record<string, { label: string; color: string }> = {
  suggestion: { label: "اقتراح", color: "bg-blue-100 text-blue-800 border-blue-200" },
  bug: { label: "خلل", color: "bg-red-100 text-red-800 border-red-200" },
  improvement: { label: "تحسين", color: "bg-green-100 text-green-800 border-green-200" },
  complaint: { label: "شكوى", color: "bg-orange-100 text-orange-800 border-orange-200" },
};

const priorityMap: Record<string, { label: string; color: string }> = {
  low: { label: "منخفض", color: "bg-gray-100 text-gray-800 border-gray-200" },
  medium: { label: "متوسط", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  high: { label: "مرتفع", color: "bg-orange-100 text-orange-800 border-orange-200" },
  urgent: { label: "عاجل", color: "bg-red-100 text-red-800 border-red-200" },
};

const statusMap: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوح", color: "bg-blue-100 text-blue-800 border-blue-200" },
  in_progress: { label: "قيد المعالجة", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  resolved: { label: "تم الحل", color: "bg-green-100 text-green-800 border-green-200" },
  closed: { label: "مغلق", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

export default function MaintenancePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("suggestion");
  const [priority, setPriority] = useState("medium");
  const [anonymous, setAnonymous] = useState(false);

  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [responseText, setResponseText] = useState("");
  const [responseStatus, setResponseStatus] = useState("");
  const [responding, setResponding] = useState(false);

  const canManage = user?.role === "admin" || user?.role === "supervisor";

  const fetchFeedback = async () => {
    try {
      const res = await fetch("/api/feedback", { credentials: "include" });
      if (res.ok) setFeedbackList(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الملاحظات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const openCount = feedbackList.filter(f => f.status === "open").length;
  const inProgressCount = feedbackList.filter(f => f.status === "in_progress").length;
  const resolvedCount = feedbackList.filter(f => f.status === "resolved").length;

  const handleSubmit = async () => {
    if (!title || !description) {
      toast({ title: "خطأ", description: "العنوان والوصف مطلوبان", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title, description, type, priority, isAnonymous: anonymous }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إرسال ملاحظتك بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setTitle("");
        setDescription("");
        setType("suggestion");
        setPriority("medium");
        setAnonymous(false);
        fetchFeedback();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إرسال الملاحظة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/feedback/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حذف الملاحظة", className: "bg-green-50 border-green-200 text-green-800" });
        fetchFeedback();
      } else {
        toast({ title: "خطأ", description: "فشل في حذف الملاحظة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const openRespondDialog = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setResponseText(feedback.response || "");
    setResponseStatus(feedback.status);
    setRespondDialogOpen(true);
  };

  const handleRespond = async () => {
    if (!selectedFeedback) return;
    setResponding(true);
    try {
      const res = await fetch(`/api/feedback/${selectedFeedback.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ response: responseText || null, status: responseStatus }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم تحديث الملاحظة", className: "bg-green-50 border-green-200 text-green-800" });
        setRespondDialogOpen(false);
        setSelectedFeedback(null);
        fetchFeedback();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في التحديث", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setResponding(false);
    }
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">
          الملاحظات والاقتراحات
        </h1>
        <p className="text-muted-foreground">نظام الملاحظات والاقتراحات والتحسينات</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-t-4 border-t-blue-500" data-testid="card-stat-total">
          <CardContent className="pt-4 text-center">
            <MessageSquare className="w-6 h-6 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{feedbackList.length}</p>
            <p className="text-xs text-muted-foreground">إجمالي الملاحظات</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-yellow-500" data-testid="card-stat-open">
          <CardContent className="pt-4 text-center">
            <AlertCircle className="w-6 h-6 mx-auto text-yellow-500 mb-1" />
            <p className="text-2xl font-bold">{openCount}</p>
            <p className="text-xs text-muted-foreground">مفتوحة</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-orange-500" data-testid="card-stat-in-progress">
          <CardContent className="pt-4 text-center">
            <Clock className="w-6 h-6 mx-auto text-orange-500 mb-1" />
            <p className="text-2xl font-bold">{inProgressCount}</p>
            <p className="text-xs text-muted-foreground">قيد المعالجة</p>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-green-500" data-testid="card-stat-resolved">
          <CardContent className="pt-4 text-center">
            <CheckCircle2 className="w-6 h-6 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">{resolvedCount}</p>
            <p className="text-xs text-muted-foreground">تم الحل</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" dir="rtl">
        <TabsList className="w-full sm:w-auto" data-testid="tabs-feedback">
          <TabsTrigger value="list" data-testid="tab-list">الملاحظات</TabsTrigger>
          <TabsTrigger value="submit" data-testid="tab-submit">إرسال ملاحظة</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                قائمة الملاحظات
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8" data-testid="status-loading">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
                </div>
              ) : feedbackList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-feedback">
                  لا توجد ملاحظات بعد
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="table-feedback">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">العنوان</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">الأولوية</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">المرسل</TableHead>
                        <TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedbackList.map(f => (
                        <TableRow key={f.id} data-testid={`row-feedback-${f.id}`}>
                          <TableCell className="font-medium" data-testid={`text-title-${f.id}`}>
                            {f.title}
                          </TableCell>
                          <TableCell>
                            <Badge className={typeMap[f.type]?.color || ""} data-testid={`badge-type-${f.id}`}>
                              {typeMap[f.type]?.label || f.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={priorityMap[f.priority]?.color || ""} data-testid={`badge-priority-${f.id}`}>
                              {priorityMap[f.priority]?.label || f.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusMap[f.status]?.color || ""} data-testid={`badge-status-${f.id}`}>
                              {statusMap[f.status]?.label || f.status}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-date-${f.id}`}>
                            {formatDateAr(f.createdAt)}
                          </TableCell>
                          <TableCell data-testid={`text-user-${f.id}`}>
                            {f.anonymous ? "مجهول" : (f.userName || "—")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {canManage && (
                                <Button size="sm" variant="ghost" onClick={() => openRespondDialog(f)} data-testid={`button-respond-${f.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              )}
                              {canManage && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => handleDelete(f.id)}
                                  disabled={deletingId === f.id}
                                  data-testid={`button-delete-${f.id}`}
                                >
                                  {deletingId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submit">
          <Card className="shadow-md max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" />
                إرسال ملاحظة جديدة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>العنوان *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان الملاحظة" data-testid="input-feedback-title" />
              </div>
              <div className="space-y-2">
                <Label>الوصف *</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="اكتب تفاصيل ملاحظتك..." data-testid="input-feedback-description" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>النوع</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger data-testid="select-feedback-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suggestion">اقتراح</SelectItem>
                      <SelectItem value="bug">خلل</SelectItem>
                      <SelectItem value="improvement">تحسين</SelectItem>
                      <SelectItem value="complaint">شكوى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الأولوية</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger data-testid="select-feedback-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفض</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="high">مرتفع</SelectItem>
                      <SelectItem value="urgent">عاجل</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="anonymous"
                  checked={anonymous}
                  onChange={e => setAnonymous(e.target.checked)}
                  className="rounded border-gray-300"
                  data-testid="checkbox-anonymous"
                />
                <Label htmlFor="anonymous" className="cursor-pointer">إرسال بشكل مجهول</Label>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!title || !description || submitting}
                className="w-full"
                data-testid="button-submit-feedback"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                إرسال الملاحظة
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الملاحظة والرد</DialogTitle>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded p-3 space-y-2">
                <p className="font-semibold">{selectedFeedback.title}</p>
                <p className="text-sm text-muted-foreground">{selectedFeedback.description}</p>
                <div className="flex gap-2">
                  <Badge className={typeMap[selectedFeedback.type]?.color || ""}>{typeMap[selectedFeedback.type]?.label}</Badge>
                  <Badge className={priorityMap[selectedFeedback.priority]?.color || ""}>{priorityMap[selectedFeedback.priority]?.label}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select value={responseStatus} onValueChange={setResponseStatus}>
                  <SelectTrigger data-testid="select-response-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">مفتوح</SelectItem>
                    <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                    <SelectItem value="resolved">تم الحل</SelectItem>
                    <SelectItem value="closed">مغلق</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الرد</Label>
                <Textarea
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  rows={3}
                  placeholder="اكتب ردك هنا..."
                  data-testid="input-response-text"
                />
              </div>
              <Button
                onClick={handleRespond}
                disabled={responding}
                className="w-full"
                data-testid="button-confirm-respond"
              >
                {responding && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                حفظ الرد
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

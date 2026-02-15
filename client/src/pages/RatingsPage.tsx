import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Award, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { formatDateAr } from "@/lib/utils";

interface RatingUser {
  id: string;
  name: string;
  username: string;
  role: string;
}

interface Rating {
  id: string;
  fromUserId: string;
  toUserId: string;
  stars: number;
  honorBadge: boolean;
  comment: string | null;
  type: string;
  createdAt: string;
  fromUserName?: string;
}

export default function RatingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<RatingUser[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<RatingUser | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formStars, setFormStars] = useState(0);
  const [formComment, setFormComment] = useState("");
  const [formHonorBadge, setFormHonorBadge] = useState(false);

  const isSupervisor = user?.role === "supervisor";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";

  const fetchData = async () => {
    try {
      const promises: Promise<Response>[] = [];

      if (isSupervisor) {
        promises.push(fetch("/api/users?role=teacher", { credentials: "include" }));
      } else if (isTeacher) {
        promises.push(fetch("/api/users?role=student", { credentials: "include" }));
      }

      if (isStudent && user?.id) {
        promises.push(fetch(`/api/ratings?userId=${user.id}`, { credentials: "include" }));
      } else {
        promises.push(fetch("/api/ratings", { credentials: "include" }));
      }

      const results = await Promise.all(promises);

      if (!isStudent && results[0]?.ok) {
        setUsers(await results[0].json());
      }

      const ratingsIdx = isStudent ? 0 : 1;
      if (results[ratingsIdx]?.ok) {
        setRatings(await results[ratingsIdx].json());
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openRatingDialog = (u: RatingUser) => {
    setSelectedUser(u);
    setFormStars(0);
    setFormComment("");
    setFormHonorBadge(false);
    setDialogOpen(true);
  };

  const handleSubmitRating = async () => {
    if (!selectedUser || formStars === 0) {
      toast({ title: "خطأ", description: "يرجى اختيار عدد النجوم", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          toUserId: selectedUser.id,
          stars: formStars,
          honorBadge: formHonorBadge,
          comment: formComment || null,
          type: isSupervisor ? "supervisor_to_teacher" : "teacher_to_student",
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إضافة التقييم بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إضافة التقييم", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const getUserRatings = (userId: string) => ratings.filter(r => r.toUserId === userId);

  const getAverageStars = (userId: string) => {
    const userRatings = getUserRatings(userId);
    if (userRatings.length === 0) return 0;
    return userRatings.reduce((sum, r) => sum + r.stars, 0) / userRatings.length;
  };

  const getHonorBadgeCount = (userId: string) => getUserRatings(userId).filter(r => r.honorBadge).length;

  const formatDate = (dateStr: string) => formatDateAr(dateStr);

  const renderStars = (count: number, interactive: boolean = false, onSelect?: (n: number) => void) => (
    <div className="flex gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`w-5 h-5 ${
            n <= count
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          } ${interactive ? "cursor-pointer hover:text-yellow-400 transition-colors" : ""}`}
          onClick={interactive && onSelect ? () => onSelect(n) : undefined}
          data-testid={interactive ? `star-${n}` : undefined}
        />
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24" data-testid="status-loading">
        <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
        <span>جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">التقييمات والأوسمة</h1>
        <p className="text-muted-foreground">
          {isSupervisor && "تقييم أداء الأساتذة ومنح الأوسمة"}
          {isTeacher && "تقييم أداء الطلاب ومنح الأوسمة"}
          {isStudent && "التقييمات التي حصلت عليها"}
        </p>
      </div>

      {(isSupervisor || isTeacher) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(u => {
            const avg = getAverageStars(u.id);
            const total = getUserRatings(u.id).length;
            const badges = getHonorBadgeCount(u.id);
            return (
              <Card key={u.id} className="shadow-sm hover:shadow-md transition-shadow" data-testid={`card-user-${u.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {u.name?.charAt(0)}
                      </div>
                      <div>
                        <CardTitle className="text-base" data-testid={`text-name-${u.id}`}>{u.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{u.username}</p>
                      </div>
                    </div>
                    {badges > 0 && (
                      <Badge className="bg-amber-100 text-amber-700 border-none gap-1" data-testid={`badge-honor-${u.id}`}>
                        <Award className="w-3 h-3" />
                        {badges}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(avg))}
                      <span className="text-sm text-muted-foreground" data-testid={`text-avg-${u.id}`}>
                        ({avg.toFixed(1)})
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground" data-testid={`text-total-${u.id}`}>
                      {total} تقييم
                    </span>
                  </div>

                  {getUserRatings(u.id).length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {getUserRatings(u.id).slice(0, 3).map(r => (
                        <div key={r.id} className="bg-muted/30 rounded-lg p-2 text-sm" data-testid={`rating-item-${r.id}`}>
                          <div className="flex items-center justify-between mb-1">
                            {renderStars(r.stars)}
                            <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                          </div>
                          {r.honorBadge && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs mb-1 gap-1">
                              <Award className="w-3 h-3" />
                              وسام شرف
                            </Badge>
                          )}
                          {r.comment && (
                            <p className="text-xs text-muted-foreground flex items-start gap-1 mt-1">
                              <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                              {r.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    className="w-full gap-2"
                    onClick={() => openRatingDialog(u)}
                    data-testid={`button-rate-${u.id}`}
                  >
                    <Star className="w-4 h-4" />
                    تقييم
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {users.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground" data-testid="status-empty">
              لا يوجد {isSupervisor ? "أساتذة" : "طلاب"} لتقييمهم
            </div>
          )}
        </div>
      )}

      {isStudent && (
        <div className="space-y-4">
          {ratings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="status-empty">
              لا توجد تقييمات بعد
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">متوسط التقييم</p>
                      <p className="text-2xl font-bold" data-testid="text-my-avg">
                        {(ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1)}
                      </p>
                    </div>
                    <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">عدد التقييمات</p>
                      <p className="text-2xl font-bold" data-testid="text-my-total">{ratings.length}</p>
                    </div>
                    <MessageSquare className="w-8 h-8 text-primary" />
                  </CardContent>
                </Card>
                <Card className="shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">أوسمة الشرف</p>
                      <p className="text-2xl font-bold" data-testid="text-my-badges">
                        {ratings.filter(r => r.honorBadge).length}
                      </p>
                    </div>
                    <Award className="w-8 h-8 text-amber-500" />
                  </CardContent>
                </Card>
              </div>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-serif">سجل التقييمات</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ratings.map(r => (
                    <div key={r.id} className="border rounded-lg p-3" data-testid={`rating-item-${r.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {renderStars(r.stars)}
                          {r.honorBadge && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs gap-1">
                              <Award className="w-3 h-3" />
                              وسام شرف
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-muted-foreground flex items-start gap-1">
                          <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          {r.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تقييم {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>التقييم بالنجوم *</Label>
              <div className="flex justify-center py-2">
                {renderStars(formStars, true, setFormStars)}
              </div>
            </div>

            <div className="space-y-2">
              <Label>تعليق</Label>
              <Textarea
                value={formComment}
                onChange={e => setFormComment(e.target.value)}
                placeholder="أضف تعليقاً..."
                data-testid="input-comment"
              />
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <input
                type="checkbox"
                id="honorBadge"
                checked={formHonorBadge}
                onChange={e => setFormHonorBadge(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
                data-testid="checkbox-honor-badge"
              />
              <Label htmlFor="honorBadge" className="flex items-center gap-2 cursor-pointer text-amber-800 m-0">
                <Award className="w-4 h-4 text-amber-500" />
                منح وسام شرف
              </Label>
            </div>

            <Button
              onClick={handleSubmitRating}
              disabled={submitting || formStars === 0}
              className="w-full"
              data-testid="button-submit-rating"
            >
              {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              إرسال التقييم
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
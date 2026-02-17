import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { formatDateAr } from "@/lib/utils";
import {
  Loader2, Plus, Trophy, ArrowRight, Users, Trash2, Edit, BookOpen
} from "lucide-react";

interface QuranSurah {
  number: number;
  name: string;
  versesCount: number;
}

interface Competition {
  id: string;
  mosqueId: string | null;
  createdBy: string;
  title: string;
  description: string | null;
  surahName: string | null;
  fromVerse: number | null;
  toVerse: number | null;
  competitionDate: string;
  status: string;
  createdAt: string;
  participants?: Participant[];
}

interface Participant {
  id: string;
  competitionId: string;
  studentId: string;
  score: number | null;
  rank: number | null;
  notes: string | null;
  createdAt: string;
}

interface Student {
  id: string;
  name: string;
  username?: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  upcoming: { label: "قادمة", color: "bg-blue-100 text-blue-800 border-blue-200" },
  active: { label: "جارية", color: "bg-green-100 text-green-800 border-green-200" },
  completed: { label: "منتهية", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

export default function CompetitionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [surahs, setSurahs] = useState<QuranSurah[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [competitionDate, setCompetitionDate] = useState("");
  const [selectedSurah, setSelectedSurah] = useState("");
  const [fromVerse, setFromVerse] = useState("");
  const [toVerse, setToVerse] = useState("");
  const [status, setStatus] = useState("upcoming");

  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);

  const [editingParticipant, setEditingParticipant] = useState<string | null>(null);
  const [editScore, setEditScore] = useState("");
  const [editRank, setEditRank] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingParticipant, setSavingParticipant] = useState(false);
  const [deletingParticipant, setDeletingParticipant] = useState<string | null>(null);

  const currentSurah = surahs.find(s => String(s.number) === selectedSurah);

  const canManage = user?.role === "admin" || user?.role === "teacher" || user?.role === "supervisor";

  const fetchCompetitions = async () => {
    try {
      const res = await fetch("/api/competitions", { credentials: "include" });
      if (res.ok) setCompetitions(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل المسابقات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitions();

    fetch("/api/users?role=student", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setStudents(data))
      .catch(() => {});

    fetch("/api/quran-surahs", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setSurahs(data))
      .catch(() => {});
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCompetitionDate("");
    setSelectedSurah("");
    setFromVerse("");
    setToVerse("");
    setStatus("upcoming");
  };

  const handleCreate = async () => {
    if (!title || !competitionDate) {
      toast({ title: "خطأ", description: "العنوان وتاريخ المسابقة مطلوبان", variant: "destructive" });
      return;
    }

    const surah = surahs.find(s => String(s.number) === selectedSurah);

    setSubmitting(true);
    try {
      const res = await fetch("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          description: description || null,
          surahName: surah?.name || null,
          fromVerse: fromVerse ? parseInt(fromVerse) : null,
          toVerse: toVerse ? parseInt(toVerse) : null,
          competitionDate,
          status,
        }),
      });

      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إنشاء المسابقة بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        resetForm();
        fetchCompetitions();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء المسابقة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (comp: Competition) => {
    setDetailLoading(true);
    setSelectedCompetition(comp);
    try {
      const res = await fetch(`/api/competitions/${comp.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSelectedCompetition(data);
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل تفاصيل المسابقة", variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async (compId: string) => {
    try {
      const res = await fetch(`/api/competitions/${compId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSelectedCompetition(data);
      }
    } catch {}
  };

  const handleAddParticipant = async () => {
    if (!selectedStudentId || !selectedCompetition) return;

    setAddingParticipant(true);
    try {
      const res = await fetch(`/api/competitions/${selectedCompetition.id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ studentId: selectedStudentId }),
      });

      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إضافة المشارك", className: "bg-green-50 border-green-200 text-green-800" });
        setAddParticipantOpen(false);
        setSelectedStudentId("");
        refreshDetail(selectedCompetition.id);
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إضافة المشارك", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setAddingParticipant(false);
    }
  };

  const startEditParticipant = (p: Participant) => {
    setEditingParticipant(p.id);
    setEditScore(p.score !== null ? String(p.score) : "");
    setEditRank(p.rank !== null ? String(p.rank) : "");
    setEditNotes(p.notes || "");
  };

  const handleSaveParticipant = async (participantId: string) => {
    if (!selectedCompetition) return;

    setSavingParticipant(true);
    try {
      const res = await fetch(`/api/competitions/${selectedCompetition.id}/participants/${participantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          score: editScore ? parseInt(editScore) : null,
          rank: editRank ? parseInt(editRank) : null,
          notes: editNotes || null,
        }),
      });

      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حفظ النتيجة", className: "bg-green-50 border-green-200 text-green-800" });
        setEditingParticipant(null);
        refreshDetail(selectedCompetition.id);
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في حفظ النتيجة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setSavingParticipant(false);
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (!selectedCompetition) return;

    setDeletingParticipant(participantId);
    try {
      const res = await fetch(`/api/competitions/${selectedCompetition.id}/participants/${participantId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إزالة المشارك", className: "bg-green-50 border-green-200 text-green-800" });
        refreshDetail(selectedCompetition.id);
      } else {
        toast({ title: "خطأ", description: "فشل في إزالة المشارك", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setDeletingParticipant(null);
    }
  };

  const getStudentName = (studentId: string) => {
    return students.find(s => s.id === studentId)?.name || studentId;
  };

  const getStatusBadge = (s: string) => {
    const info = statusMap[s] || statusMap.upcoming;
    return <Badge className={info.color} data-testid={`badge-status-${s}`}>{info.label}</Badge>;
  };

  if (selectedCompetition) {
    return (
      <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedCompetition(null); fetchCompetitions(); }}
            data-testid="button-back-to-list"
          >
            <ArrowRight className="w-4 h-4 ml-1" />
            العودة
          </Button>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-competition-detail-title">
            تفاصيل المسابقة
          </h1>
        </div>

        <Card className="border-t-4 border-t-primary shadow-md" data-testid="card-competition-info">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  {selectedCompetition.title}
                </CardTitle>
                {selectedCompetition.description && (
                  <CardDescription className="mt-2">{selectedCompetition.description}</CardDescription>
                )}
              </div>
              {getStatusBadge(selectedCompetition.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">التاريخ: </span>
                <span data-testid="text-competition-date">{formatDateAr(selectedCompetition.competitionDate)}</span>
              </div>
              {selectedCompetition.surahName && (
                <div>
                  <span className="text-muted-foreground">السورة: </span>
                  <span data-testid="text-competition-surah">{selectedCompetition.surahName}</span>
                  {selectedCompetition.fromVerse && selectedCompetition.toVerse && (
                    <span> (آية {selectedCompetition.fromVerse} - {selectedCompetition.toVerse})</span>
                  )}
                </div>
              )}
              <div>
                <span className="text-muted-foreground">عدد المشاركين: </span>
                <span data-testid="text-participant-count">{selectedCompetition.participants?.length || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                المشاركون
              </CardTitle>
              {canManage && (
                <Dialog open={addParticipantOpen} onOpenChange={setAddParticipantOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" data-testid="button-add-participant">
                      <Plus className="w-4 h-4 ml-1" />
                      إضافة مشارك
                    </Button>
                  </DialogTrigger>
                  <DialogContent dir="rtl">
                    <DialogHeader>
                      <DialogTitle>إضافة مشارك</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>اختر الطالب</Label>
                        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                          <SelectTrigger data-testid="select-participant-student">
                            <SelectValue placeholder="اختر الطالب" />
                          </SelectTrigger>
                          <SelectContent>
                            {students.map(s => (
                              <SelectItem key={s.id} value={s.id} data-testid={`option-participant-${s.id}`}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleAddParticipant}
                        disabled={!selectedStudentId || addingParticipant}
                        className="w-full"
                        data-testid="button-confirm-add-participant"
                      >
                        {addingParticipant && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                        إضافة
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {detailLoading ? (
              <div className="flex items-center justify-center py-8" data-testid="status-loading-detail">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
              </div>
            ) : !selectedCompetition.participants?.length ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-no-participants">
                لا يوجد مشاركون بعد
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-testid="table-participants">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">الدرجة</TableHead>
                      <TableHead className="text-right">الترتيب</TableHead>
                      <TableHead className="text-right">ملاحظات</TableHead>
                      {canManage && <TableHead className="text-right">إجراءات</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCompetition.participants.map(p => (
                      <TableRow key={p.id} data-testid={`row-participant-${p.id}`}>
                        <TableCell data-testid={`text-participant-name-${p.id}`}>
                          {getStudentName(p.studentId)}
                        </TableCell>
                        <TableCell>
                          {editingParticipant === p.id ? (
                            <Input
                              type="number"
                              value={editScore}
                              onChange={e => setEditScore(e.target.value)}
                              className="w-20"
                              data-testid={`input-score-${p.id}`}
                            />
                          ) : (
                            <span data-testid={`text-score-${p.id}`}>{p.score ?? "—"}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingParticipant === p.id ? (
                            <Input
                              type="number"
                              value={editRank}
                              onChange={e => setEditRank(e.target.value)}
                              className="w-20"
                              data-testid={`input-rank-${p.id}`}
                            />
                          ) : (
                            <span data-testid={`text-rank-${p.id}`}>{p.rank ?? "—"}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingParticipant === p.id ? (
                            <Input
                              value={editNotes}
                              onChange={e => setEditNotes(e.target.value)}
                              className="w-32"
                              data-testid={`input-notes-${p.id}`}
                            />
                          ) : (
                            <span data-testid={`text-notes-${p.id}`}>{p.notes || "—"}</span>
                          )}
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {editingParticipant === p.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleSaveParticipant(p.id)}
                                    disabled={savingParticipant}
                                    data-testid={`button-save-participant-${p.id}`}
                                  >
                                    {savingParticipant && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
                                    حفظ
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingParticipant(null)}
                                    data-testid={`button-cancel-edit-${p.id}`}
                                  >
                                    إلغاء
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEditParticipant(p)}
                                    data-testid={`button-edit-participant-${p.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-500 hover:text-red-700"
                                    onClick={() => handleDeleteParticipant(p.id)}
                                    disabled={deletingParticipant === p.id}
                                    data-testid={`button-delete-participant-${p.id}`}
                                  >
                                    {deletingParticipant === p.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">
            المسابقات
          </h1>
          <p className="text-muted-foreground">إدارة المسابقات القرآنية</p>
        </div>

        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-competition">
                <Plus className="w-4 h-4 ml-1" />
                إنشاء مسابقة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>إنشاء مسابقة جديدة</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>عنوان المسابقة *</Label>
                  <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="أدخل عنوان المسابقة"
                    data-testid="input-competition-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="وصف المسابقة (اختياري)"
                    data-testid="input-competition-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label>تاريخ المسابقة *</Label>
                  <Input
                    type="date"
                    value={competitionDate}
                    onChange={e => setCompetitionDate(e.target.value)}
                    data-testid="input-competition-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger data-testid="select-competition-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">قادمة</SelectItem>
                      <SelectItem value="active">جارية</SelectItem>
                      <SelectItem value="completed">منتهية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>السورة (اختياري)</Label>
                  <Select value={selectedSurah} onValueChange={(val) => { setSelectedSurah(val); setFromVerse(""); setToVerse(""); }}>
                    <SelectTrigger data-testid="select-competition-surah">
                      <SelectValue placeholder="اختر السورة" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {surahs.map(s => (
                        <SelectItem key={s.number} value={String(s.number)}>
                          {s.number}. {s.name} ({s.versesCount} آية)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSurah && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>من الآية {currentSurah && <span className="text-xs text-muted-foreground">(1 - {currentSurah.versesCount})</span>}</Label>
                      <Input
                        type="number"
                        placeholder="1"
                        min={1}
                        max={currentSurah?.versesCount}
                        value={fromVerse}
                        onChange={e => setFromVerse(e.target.value)}
                        data-testid="input-competition-from-verse"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>إلى الآية {currentSurah && <span className="text-xs text-muted-foreground">(حتى {currentSurah.versesCount})</span>}</Label>
                      <Input
                        type="number"
                        placeholder="10"
                        min={parseInt(fromVerse) || 1}
                        max={currentSurah?.versesCount}
                        value={toVerse}
                        onChange={e => setToVerse(e.target.value)}
                        data-testid="input-competition-to-verse"
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleCreate}
                  disabled={submitting}
                  className="w-full"
                  data-testid="button-submit-competition"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                  إنشاء المسابقة
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16" data-testid="status-loading-competitions">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="mr-3 text-muted-foreground">جاري تحميل المسابقات...</span>
        </div>
      ) : competitions.length === 0 ? (
        <Card className="shadow-md">
          <CardContent className="py-16 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-lg" data-testid="text-no-competitions">لا توجد مسابقات حالياً</p>
            {canManage && <p className="text-sm text-muted-foreground mt-2">ابدأ بإنشاء مسابقة جديدة</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-competitions">
          {competitions.map(comp => (
            <Card
              key={comp.id}
              className="shadow-md hover:shadow-lg transition-shadow cursor-pointer border-t-4 border-t-primary/30"
              onClick={() => openDetail(comp)}
              data-testid={`card-competition-${comp.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg leading-tight" data-testid={`text-competition-title-${comp.id}`}>
                    {comp.title}
                  </CardTitle>
                  {getStatusBadge(comp.status)}
                </div>
                {comp.description && (
                  <CardDescription className="mt-1 line-clamp-2" data-testid={`text-competition-desc-${comp.id}`}>
                    {comp.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Trophy className="w-4 h-4" />
                  <span data-testid={`text-competition-date-${comp.id}`}>{formatDateAr(comp.competitionDate)}</span>
                </div>

                {comp.surahName && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="w-4 h-4" />
                    <span data-testid={`text-competition-surah-${comp.id}`}>
                      {comp.surahName}
                      {comp.fromVerse && comp.toVerse && ` (${comp.fromVerse} - ${comp.toVerse})`}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span data-testid={`text-competition-participants-${comp.id}`}>
                    {(comp as any).participantCount ?? 0} مشارك
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CalendarIcon, Clock, CheckCircle2, User, BookOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

interface Student {
  id: string;
  name: string;
}

interface Assignment {
  id: string;
  studentId: string;
  surahName: string;
  fromVerse: number;
  toVerse: number;
  scheduledDate: string;
  status: string;
  type: string;
  seenByStudent: boolean;
  seenAt: string | null;
}

interface QuranSurah {
  number: number;
  name: string;
  versesCount: number;
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedSurah, setSelectedSurah] = useState("");
  const [fromVerse, setFromVerse] = useState("");
  const [toVerse, setToVerse] = useState("");
  const [time, setTime] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [surahs, setSurahs] = useState<QuranSurah[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const currentSurah = surahs.find(s => String(s.number) === selectedSurah);

  useEffect(() => {
    fetch("/api/users?role=student", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setStudents(data))
      .catch(() => {})
      .finally(() => setLoadingStudents(false));

    fetch("/api/assignments", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setAssignments(data))
      .catch(() => {})
      .finally(() => setLoadingAssignments(false));

    fetch("/api/quran-surahs", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setSurahs(data))
      .catch(() => {});
  }, []);

  const handleSurahChange = (val: string) => {
    setSelectedSurah(val);
    setFromVerse("");
    setToVerse("");
  };

  const handleFromVerseChange = (val: string) => {
    const num = parseInt(val);
    if (!currentSurah) { setFromVerse(val); return; }
    if (num > currentSurah.versesCount) { setFromVerse(String(currentSurah.versesCount)); return; }
    if (num < 1 && val !== "") { setFromVerse("1"); return; }
    setFromVerse(val);
  };

  const handleToVerseChange = (val: string) => {
    const num = parseInt(val);
    if (!currentSurah) { setToVerse(val); return; }
    if (num > currentSurah.versesCount) { setToVerse(String(currentSurah.versesCount)); return; }
    const from = parseInt(fromVerse) || 1;
    if (num < from && val !== "") { setToVerse(String(from)); return; }
    setToVerse(val);
  };

  const handleAssign = async () => {
    if (!selectedStudent || !date || !time || !selectedSurah) {
      toast({ title: "خطأ في البيانات", description: "يرجى تعبئة جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    const surah = surahs.find(s => String(s.number) === selectedSurah);
    const scheduledDate = new Date(date);
    const [hours, minutes] = time.split(":");
    scheduledDate.setHours(parseInt(hours), parseInt(minutes));

    setSubmitting(true);
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          studentId: selectedStudent,
          teacherId: user?.id,
          mosqueId: user?.mosqueId || null,
          surahName: surah?.name || "",
          fromVerse: parseInt(fromVerse) || 1,
          toVerse: parseInt(toVerse) || 10,
          type: "new",
          scheduledDate: scheduledDate.toISOString(),
          status: "pending",
        }),
      });

      if (res.ok) {
        const newAssignment = await res.json();
        setAssignments(prev => [newAssignment, ...prev]);
        toast({
          title: "تم تحديد الواجب بنجاح",
          description: `تم إرسال إشعار للطالب ${students.find(s => s.id === selectedStudent)?.name} بموعد التسميع`,
          className: "bg-green-50 border-green-200 text-green-800"
        });
        setSelectedStudent("");
        setSelectedSurah("");
        setFromVerse("");
        setToVerse("");
        setTime("");
        setDate(undefined);
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء الواجب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const getStudentName = (studentId: string) => {
    return students.find(s => s.id === studentId)?.name || "—";
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-serif text-primary" data-testid="text-page-title">إدارة واجبات الطلاب</h1>
        <p className="text-muted-foreground">تحديد مقرر الحفظ ومواعيد التسميع للحلقات</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-t-4 border-t-primary shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              تحديد واجب جديد
            </CardTitle>
            <CardDescription>اختر الطالب وحدد الآيات والموعد</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>الطالب</Label>
              {loadingStudents ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="status-loading-students">
                  <Loader2 className="w-4 h-4 animate-spin" /> جاري التحميل...
                </div>
              ) : (
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger className="bg-white" data-testid="select-student">
                    <SelectValue placeholder="اختر الطالب" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id} data-testid={`option-student-${s.id}`}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>السورة</Label>
                <Select value={selectedSurah} onValueChange={handleSurahChange}>
                  <SelectTrigger className="bg-white" data-testid="select-surah">
                    <SelectValue placeholder="اختر السورة" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {surahs.map((s) => (
                      <SelectItem key={s.number} value={String(s.number)}>
                        {s.number}. {s.name} ({s.versesCount} آية)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>من الآية {currentSurah && <span className="text-xs text-muted-foreground">(1 - {currentSurah.versesCount})</span>}</Label>
                <Input
                  type="number"
                  placeholder="1"
                  min={1}
                  max={currentSurah?.versesCount}
                  value={fromVerse}
                  onChange={e => handleFromVerseChange(e.target.value)}
                  data-testid="input-from-verse"
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
                  onChange={e => handleToVerseChange(e.target.value)}
                  data-testid="input-to-verse"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 flex flex-col">
                <Label className="mb-2">تاريخ التسميع</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-right font-normal",
                        !date && "text-muted-foreground"
                      )}
                      data-testid="button-select-date"
                    >
                      {date ? format(date, "PPP", { locale: ar }) : <span>اختر التاريخ</span>}
                      <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>وقت التسميع</Label>
                <div className="relative">
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full"
                    data-testid="input-time"
                  />
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <Button onClick={handleAssign} disabled={submitting} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 mt-4" data-testid="button-submit-assignment">
              {submitting ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 ml-2" />}
              تأكيد وإرسال للطالب
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-muted/30 border-none">
            <CardHeader>
              <CardTitle className="text-lg">الواجبات الأخيرة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingAssignments ? (
                <div className="flex items-center justify-center py-8" data-testid="status-loading-assignments">
                  <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
                  <span>جاري التحميل...</span>
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="status-empty-assignments">
                  لا توجد واجبات
                </div>
              ) : (
                assignments.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-slate-100" data-testid={`card-assignment-${task.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm" data-testid={`text-assignment-student-${task.id}`}>{getStudentName(task.studentId)}</p>
                        <p className="text-xs text-muted-foreground">{task.surahName} ({task.fromVerse}-{task.toVerse})</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-1 text-sm font-bold text-primary mb-1">
                        <Clock className="w-3 h-3" />
                        {task.scheduledDate ? format(new Date(task.scheduledDate), "hh:mm a", { locale: ar }) : "—"}
                      </div>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full",
                        task.status === "done" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      )} data-testid={`status-assignment-${task.id}`}>
                        {task.status === "done" ? "تم التسميع" : "انتظار"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-blue-50/50 border-blue-100">
            <CardContent className="p-4 flex gap-3">
              <div className="p-2 bg-blue-100 rounded-full h-fit text-blue-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-blue-900 text-sm">تذكير تلقائي</h4>
                <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">
                  سيقوم النظام بإرسال إشعار تلقائي للطالب قبل موعد التسميع بـ 15 دقيقة لتذكيره بالاستعداد.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

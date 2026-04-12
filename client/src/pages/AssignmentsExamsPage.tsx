import { useState, useEffect, useMemo } from "react";
import { LEVEL_OPTIONS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { format, differenceInHours, differenceInDays, isSameDay, isAfter, isBefore, startOfDay, endOfDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";
import { ar } from "date-fns/locale";
import { cn, formatDateAr } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
  CalendarIcon, Clock, CheckCircle2, User, BookOpen, Loader2,
  Plus, Calendar as CalendarLucide, Users, FileText, Trash2, Search, X,
  BarChart3, TrendingUp, Award, Percent, Edit, Save, ChevronLeft, ChevronRight, Mic, Download, MessageCircle, PhoneCall, Archive, ArchiveRestore, Ban, UserCircle
} from "lucide-react";
import { getWhatsAppUrl } from "@/lib/phone-utils";
import { exportJsonToExcel } from "@/lib/excel-utils";
import AudioRecorder from "@/components/AudioRecorder";
import AudioPlayer from "@/components/AudioPlayer";

interface Student {
  id: string;
  name: string;
  username?: string;
  level?: number;
  phone?: string | null;
  parentPhone?: string | null;
}

interface Assignment {
  id: string;
  studentId: string;
  teacherId: string;
  surahName: string;
  fromVerse: number;
  toVerse: number;
  scheduledDate: string;
  status: string;
  type: string;
  grade?: number | null;
  notes?: string | null;
  hasAudio?: boolean;
  audioFileName?: string | null;
  audioUploadedAt?: string | null;
  audioGradedAt?: string | null;
  seenByStudent: boolean;
  seenAt: string | null;
  isArchived?: boolean;
}

interface Teacher {
  id: string;
  name: string;
}

interface QuranSurah {
  number: number;
  name: string;
  versesCount: number;
}

interface ExamStudent {
  id: string;
  examId: string;
  studentId: string;
  grade: number | null;
  status: string;
}

interface Exam {
  id: string;
  teacherId: string;
  title: string;
  surahName: string;
  fromVerse: number;
  toVerse: number;
  examDate: string;
  examTime: string;
  description: string | null;
  isForAll: boolean;
  students?: ExamStudent[];
}

const JUZ_DATA: { juz: number; label: string; surahs: { number: number; fromVerse: number; toVerse: number }[] }[] = [
  { juz: 1, label: "الجزء الأول", surahs: [{ number: 1, fromVerse: 1, toVerse: 7 }, { number: 2, fromVerse: 1, toVerse: 141 }] },
  { juz: 2, label: "الجزء الثاني", surahs: [{ number: 2, fromVerse: 142, toVerse: 252 }] },
  { juz: 3, label: "الجزء الثالث", surahs: [{ number: 2, fromVerse: 253, toVerse: 286 }, { number: 3, fromVerse: 1, toVerse: 91 }] },
  { juz: 4, label: "الجزء الرابع", surahs: [{ number: 3, fromVerse: 92, toVerse: 200 }, { number: 4, fromVerse: 1, toVerse: 23 }] },
  { juz: 5, label: "الجزء الخامس", surahs: [{ number: 4, fromVerse: 24, toVerse: 147 }] },
  { juz: 6, label: "الجزء السادس", surahs: [{ number: 4, fromVerse: 148, toVerse: 176 }, { number: 5, fromVerse: 1, toVerse: 81 }] },
  { juz: 7, label: "الجزء السابع", surahs: [{ number: 5, fromVerse: 82, toVerse: 120 }, { number: 6, fromVerse: 1, toVerse: 110 }] },
  { juz: 8, label: "الجزء الثامن", surahs: [{ number: 6, fromVerse: 111, toVerse: 165 }, { number: 7, fromVerse: 1, toVerse: 87 }] },
  { juz: 9, label: "الجزء التاسع", surahs: [{ number: 7, fromVerse: 88, toVerse: 206 }, { number: 8, fromVerse: 1, toVerse: 40 }] },
  { juz: 10, label: "الجزء العاشر", surahs: [{ number: 8, fromVerse: 41, toVerse: 75 }, { number: 9, fromVerse: 1, toVerse: 92 }] },
  { juz: 11, label: "الجزء الحادي عشر", surahs: [{ number: 9, fromVerse: 93, toVerse: 129 }, { number: 10, fromVerse: 1, toVerse: 109 }, { number: 11, fromVerse: 1, toVerse: 5 }] },
  { juz: 12, label: "الجزء الثاني عشر", surahs: [{ number: 11, fromVerse: 6, toVerse: 123 }, { number: 12, fromVerse: 1, toVerse: 52 }] },
  { juz: 13, label: "الجزء الثالث عشر", surahs: [{ number: 12, fromVerse: 53, toVerse: 111 }, { number: 13, fromVerse: 1, toVerse: 43 }, { number: 14, fromVerse: 1, toVerse: 52 }] },
  { juz: 14, label: "الجزء الرابع عشر", surahs: [{ number: 15, fromVerse: 1, toVerse: 99 }, { number: 16, fromVerse: 1, toVerse: 128 }] },
  { juz: 15, label: "الجزء الخامس عشر", surahs: [{ number: 17, fromVerse: 1, toVerse: 111 }, { number: 18, fromVerse: 1, toVerse: 74 }] },
  { juz: 16, label: "الجزء السادس عشر", surahs: [{ number: 18, fromVerse: 75, toVerse: 110 }, { number: 19, fromVerse: 1, toVerse: 98 }, { number: 20, fromVerse: 1, toVerse: 135 }] },
  { juz: 17, label: "الجزء السابع عشر", surahs: [{ number: 21, fromVerse: 1, toVerse: 112 }, { number: 22, fromVerse: 1, toVerse: 78 }] },
  { juz: 18, label: "الجزء الثامن عشر", surahs: [{ number: 23, fromVerse: 1, toVerse: 118 }, { number: 24, fromVerse: 1, toVerse: 64 }, { number: 25, fromVerse: 1, toVerse: 20 }] },
  { juz: 19, label: "الجزء التاسع عشر", surahs: [{ number: 25, fromVerse: 21, toVerse: 77 }, { number: 26, fromVerse: 1, toVerse: 227 }, { number: 27, fromVerse: 1, toVerse: 55 }] },
  { juz: 20, label: "الجزء العشرون", surahs: [{ number: 27, fromVerse: 56, toVerse: 93 }, { number: 28, fromVerse: 1, toVerse: 88 }, { number: 29, fromVerse: 1, toVerse: 45 }] },
  { juz: 21, label: "الجزء الحادي والعشرون", surahs: [{ number: 29, fromVerse: 46, toVerse: 69 }, { number: 30, fromVerse: 1, toVerse: 60 }, { number: 31, fromVerse: 1, toVerse: 34 }, { number: 32, fromVerse: 1, toVerse: 30 }, { number: 33, fromVerse: 1, toVerse: 30 }] },
  { juz: 22, label: "الجزء الثاني والعشرون", surahs: [{ number: 33, fromVerse: 31, toVerse: 73 }, { number: 34, fromVerse: 1, toVerse: 54 }, { number: 35, fromVerse: 1, toVerse: 45 }, { number: 36, fromVerse: 1, toVerse: 27 }] },
  { juz: 23, label: "الجزء الثالث والعشرون", surahs: [{ number: 36, fromVerse: 28, toVerse: 83 }, { number: 37, fromVerse: 1, toVerse: 182 }, { number: 38, fromVerse: 1, toVerse: 88 }, { number: 39, fromVerse: 1, toVerse: 31 }] },
  { juz: 24, label: "الجزء الرابع والعشرون", surahs: [{ number: 39, fromVerse: 32, toVerse: 75 }, { number: 40, fromVerse: 1, toVerse: 85 }, { number: 41, fromVerse: 1, toVerse: 46 }] },
  { juz: 25, label: "الجزء الخامس والعشرون", surahs: [{ number: 41, fromVerse: 47, toVerse: 54 }, { number: 42, fromVerse: 1, toVerse: 53 }, { number: 43, fromVerse: 1, toVerse: 89 }, { number: 44, fromVerse: 1, toVerse: 59 }, { number: 45, fromVerse: 1, toVerse: 37 }] },
  { juz: 26, label: "الجزء السادس والعشرون", surahs: [{ number: 46, fromVerse: 1, toVerse: 35 }, { number: 47, fromVerse: 1, toVerse: 38 }, { number: 48, fromVerse: 1, toVerse: 29 }, { number: 49, fromVerse: 1, toVerse: 18 }, { number: 50, fromVerse: 1, toVerse: 45 }, { number: 51, fromVerse: 1, toVerse: 30 }] },
  { juz: 27, label: "الجزء السابع والعشرون", surahs: [{ number: 51, fromVerse: 31, toVerse: 60 }, { number: 52, fromVerse: 1, toVerse: 49 }, { number: 53, fromVerse: 1, toVerse: 62 }, { number: 54, fromVerse: 1, toVerse: 55 }, { number: 55, fromVerse: 1, toVerse: 78 }, { number: 56, fromVerse: 1, toVerse: 96 }, { number: 57, fromVerse: 1, toVerse: 29 }] },
  { juz: 28, label: "الجزء الثامن والعشرون", surahs: [{ number: 58, fromVerse: 1, toVerse: 22 }, { number: 59, fromVerse: 1, toVerse: 24 }, { number: 60, fromVerse: 1, toVerse: 13 }, { number: 61, fromVerse: 1, toVerse: 14 }, { number: 62, fromVerse: 1, toVerse: 11 }, { number: 63, fromVerse: 1, toVerse: 11 }, { number: 64, fromVerse: 1, toVerse: 18 }, { number: 65, fromVerse: 1, toVerse: 12 }, { number: 66, fromVerse: 1, toVerse: 12 }] },
  { juz: 29, label: "الجزء التاسع والعشرون", surahs: [{ number: 67, fromVerse: 1, toVerse: 30 }, { number: 68, fromVerse: 1, toVerse: 52 }, { number: 69, fromVerse: 1, toVerse: 52 }, { number: 70, fromVerse: 1, toVerse: 44 }, { number: 71, fromVerse: 1, toVerse: 28 }, { number: 72, fromVerse: 1, toVerse: 28 }, { number: 73, fromVerse: 1, toVerse: 20 }, { number: 74, fromVerse: 1, toVerse: 56 }, { number: 75, fromVerse: 1, toVerse: 40 }, { number: 76, fromVerse: 1, toVerse: 31 }, { number: 77, fromVerse: 1, toVerse: 50 }] },
  { juz: 30, label: "جزء عمّ", surahs: [{ number: 78, fromVerse: 1, toVerse: 40 }, { number: 79, fromVerse: 1, toVerse: 46 }, { number: 80, fromVerse: 1, toVerse: 42 }, { number: 81, fromVerse: 1, toVerse: 29 }, { number: 82, fromVerse: 1, toVerse: 19 }, { number: 83, fromVerse: 1, toVerse: 36 }, { number: 84, fromVerse: 1, toVerse: 25 }, { number: 85, fromVerse: 1, toVerse: 22 }, { number: 86, fromVerse: 1, toVerse: 17 }, { number: 87, fromVerse: 1, toVerse: 19 }, { number: 88, fromVerse: 1, toVerse: 26 }, { number: 89, fromVerse: 1, toVerse: 30 }, { number: 90, fromVerse: 1, toVerse: 20 }, { number: 91, fromVerse: 1, toVerse: 15 }, { number: 92, fromVerse: 1, toVerse: 21 }, { number: 93, fromVerse: 1, toVerse: 11 }, { number: 94, fromVerse: 1, toVerse: 8 }, { number: 95, fromVerse: 1, toVerse: 8 }, { number: 96, fromVerse: 1, toVerse: 19 }, { number: 97, fromVerse: 1, toVerse: 5 }, { number: 98, fromVerse: 1, toVerse: 8 }, { number: 99, fromVerse: 1, toVerse: 8 }, { number: 100, fromVerse: 1, toVerse: 11 }, { number: 101, fromVerse: 1, toVerse: 11 }, { number: 102, fromVerse: 1, toVerse: 8 }, { number: 103, fromVerse: 1, toVerse: 3 }, { number: 104, fromVerse: 1, toVerse: 9 }, { number: 105, fromVerse: 1, toVerse: 5 }, { number: 106, fromVerse: 1, toVerse: 4 }, { number: 107, fromVerse: 1, toVerse: 7 }, { number: 108, fromVerse: 1, toVerse: 3 }, { number: 109, fromVerse: 1, toVerse: 6 }, { number: 110, fromVerse: 1, toVerse: 3 }, { number: 111, fromVerse: 1, toVerse: 5 }, { number: 112, fromVerse: 1, toVerse: 4 }, { number: 113, fromVerse: 1, toVerse: 5 }, { number: 114, fromVerse: 1, toVerse: 6 }] },
];

function getDeadlineInfo(scheduledDate: string, status: string) {
  const now = new Date();
  const date = new Date(scheduledDate);
  const diffHours = differenceInHours(date, now);
  const diffDays = differenceInDays(date, now);

  if (status === "done") {
    return { label: "مكتمل", color: "text-green-600", bgColor: "bg-green-50", badgeVariant: "bg-green-100 text-green-700" as string };
  }

  if (isBefore(date, now)) {
    return { label: "متأخر", color: "text-red-600", bgColor: "bg-red-50", badgeVariant: "bg-red-100 text-red-700" as string };
  }

  if (isSameDay(date, now)) {
    return { label: `اليوم - بعد ${diffHours > 0 ? diffHours + " ساعة" : "قريباً"}`, color: "text-yellow-600", bgColor: "bg-yellow-50", badgeVariant: "bg-yellow-100 text-yellow-700" as string };
  }

  if (diffDays <= 3) {
    return { label: `بعد ${diffDays} ${diffDays === 1 ? "يوم" : "أيام"}`, color: "text-yellow-600", bgColor: "bg-yellow-50", badgeVariant: "bg-yellow-100 text-yellow-700" as string };
  }

  return { label: `بعد ${diffDays} يوم`, color: "text-green-600", bgColor: "bg-green-50", badgeVariant: "bg-green-100 text-green-700" as string };
}

function getTypeBadge(type: string) {
  switch (type) {
    case "new": return { label: "جديد", className: "bg-green-100 text-green-700 border-green-200" };
    case "review": return { label: "مراجعة", className: "bg-blue-100 text-blue-700 border-blue-200" };
    case "test": return { label: "اختبار", className: "bg-purple-100 text-purple-700 border-purple-200" };
    default: return { label: type, className: "bg-gray-100 text-gray-700 border-gray-200" };
  }
}

function getGradeColor(grade: number) {
  if (grade >= 80) return "bg-green-100 text-green-700 border-green-200";
  if (grade >= 60) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-red-100 text-red-700 border-red-200";
}

export default function AssignmentsExamsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [assignDate, setAssignDate] = useState<Date>();
  const [assignSelectedStudent, setAssignSelectedStudent] = useState("");
  const [assignSelectedSurah, setAssignSelectedSurah] = useState("");
  const [assignFromVerse, setAssignFromVerse] = useState("");
  const [assignToVerse, setAssignToVerse] = useState("");
  const [assignTime, setAssignTime] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [surahs, setSurahs] = useState<QuranSurah[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [assignType, setAssignType] = useState("new");

  const [surahEntries, setSurahEntries] = useState<Array<{surah: string; fromVerse: string; toVerse: string}>>([]);

  const assignCurrentSurah = surahs.find(s => String(s.number) === assignSelectedSurah);

  const [exams, setExams] = useState<Exam[]>([]);
  const [examLoading, setExamLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [expandedExamData, setExpandedExamData] = useState<Exam | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [gradingStudent, setGradingStudent] = useState<string | null>(null);
  const [gradeValues, setGradeValues] = useState<Record<string, string>>({});
  const [deletingExam, setDeletingExam] = useState<string | null>(null);

  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
  const [verseText, setVerseText] = useState<Record<string, any[]>>({});
  const [loadingVerses, setLoadingVerses] = useState<string | null>(null);

  const [assignSearchTerm, setAssignSearchTerm] = useState("");
  const [assignFilterStatus, setAssignFilterStatus] = useState("all");
  const [assignFilterSurah, setAssignFilterSurah] = useState("all");
  const [assignFilterDateFrom, setAssignFilterDateFrom] = useState("");
  const [assignFilterDateTo, setAssignFilterDateTo] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");

  const [examTitle, setExamTitle] = useState("");
  const [examScope, setExamScope] = useState<"verses" | "surahs" | "juz">("verses");
  const [examSelectedSurah, setExamSelectedSurah] = useState("");
  const [examSelectedSurahs, setExamSelectedSurahs] = useState<string[]>([]);
  const [examSelectedJuz, setExamSelectedJuz] = useState<number[]>([]);
  const [examFromVerse, setExamFromVerse] = useState("");
  const [examToVerse, setExamToVerse] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examTime, setExamTime] = useState("");
  const [examDescription, setExamDescription] = useState("");
  const [isForAll, setIsForAll] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [examStudentSearch, setExamStudentSearch] = useState("");

  const [assignGradeInput, setAssignGradeInput] = useState<Record<string, string>>({});
  const [markingDone, setMarkingDone] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const [studentStatsDialog, setStudentStatsDialog] = useState<string | null>(null);

  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelectedStudents, setBulkSelectedStudents] = useState<string[]>([]);
  const [bulkStudentSearch, setBulkStudentSearch] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";
  const isSupervisor = user?.role === "supervisor";

  const examCurrentSurah = surahs.find(s => s.number.toString() === examSelectedSurah);

  const totalAssignments = assignments.length;
  const pendingAssignments = assignments.filter(a => a.status === "pending").length;
  const completedAssignments = assignments.filter(a => a.status === "done").length;
  const totalExams = exams.length;

  const studentCompletionRates = useMemo(() => {
    const rates: Record<string, { total: number; done: number; avgGrade: number; grades: number[] }> = {};
    assignments.forEach(a => {
      if (!rates[a.studentId]) rates[a.studentId] = { total: 0, done: 0, avgGrade: 0, grades: [] };
      rates[a.studentId].total++;
      if (a.status === "done") {
        rates[a.studentId].done++;
        if (a.grade != null) rates[a.studentId].grades.push(a.grade);
      }
    });
    Object.keys(rates).forEach(k => {
      const g = rates[k].grades;
      rates[k].avgGrade = g.length > 0 ? Math.round(g.reduce((a, b) => a + b, 0) / g.length) : 0;
    });
    return rates;
  }, [assignments]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(calendarMonth);
    const end = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start, end });
    const firstDayOfWeek = getDay(start);
    const paddingDays = firstDayOfWeek === 6 ? 0 : firstDayOfWeek + 1;
    return { days, paddingDays };
  }, [calendarMonth]);

  const assignmentsByDate = useMemo(() => {
    const map: Record<string, Assignment[]> = {};
    assignments.forEach(a => {
      if (a.scheduledDate) {
        const key = format(new Date(a.scheduledDate), "yyyy-MM-dd");
        if (!map[key]) map[key] = [];
        map[key].push(a);
      }
    });
    return map;
  }, [assignments]);

  const fetchExams = async () => {
    try {
      const res = await fetch("/api/exams", { credentials: "include" });
      if (res.ok) setExams(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الامتحانات", variant: "destructive" });
    } finally {
      setExamLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/users?role=student", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setStudents(data))
      .catch(() => {})
      .finally(() => setLoadingStudents(false));

    fetch("/api/users?role=teacher", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setTeachers(data))
      .catch(() => {});

    fetch("/api/assignments", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setAssignments(data))
      .catch(() => {})
      .finally(() => setLoadingAssignments(false));

    fetch("/api/quran-surahs", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => setSurahs(data))
      .catch(() => {});

    fetchExams();
  }, []);

  useEffect(() => {
    if (user?.role === "student" && assignments.length > 0) {
      const unseen = assignments.filter(a => !a.seenByStudent);
      if (unseen.length > 0) {
        Promise.all(unseen.map(a =>
          fetch(`/api/assignments/${a.id}/seen`, { method: "PATCH", credentials: "include" })
            .then(r => r.ok ? a.id : null)
        )).then(seenIds => {
          const ids = seenIds.filter(Boolean) as string[];
          if (ids.length > 0) {
            setAssignments(prev => prev.map(a =>
              ids.includes(a.id) ? { ...a, seenByStudent: true, seenAt: new Date().toISOString() } : a
            ));
          }
        });
      }
    }
  }, [assignments.length, user]);

  const [isSuggesting, setIsSuggesting] = useState(false);

  const handleSuggestNext = async () => {
    if (!assignSelectedStudent) {
      toast({ title: "تنبيه", description: "يرجى اختيار طالب أولاً", variant: "destructive" });
      return;
    }

    setIsSuggesting(true);
    try {
      const res = await fetch(`/api/assignment-suggestion/${assignSelectedStudent}`, { credentials: "include" });
      if (res.ok) {
        const suggestion = await res.json();
        const surah = surahs.find(s => s.name === suggestion.surahName);
        if (surah) {
          setAssignSelectedSurah(String(surah.number));
          setAssignFromVerse(String(suggestion.fromVerse));
          setAssignToVerse(String(suggestion.toVerse));
          setAssignType(suggestion.type || "new");
          toast({ title: "تم التحديث", description: "تم ملء البيانات بناءً على آخر إنجاز للطالب" });
        }
      } else {
        toast({ title: "عذراً", description: "لا توجد اقتراحات حالياً لهذا الطالب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في جلب الاقتراحات", variant: "destructive" });
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleAssignSurahChange = (val: string) => {
    setAssignSelectedSurah(val);
    setAssignFromVerse("");
    setAssignToVerse("");
  };

  const handleAssignFromVerseChange = (val: string) => {
    const num = parseInt(val);
    if (!assignCurrentSurah) { setAssignFromVerse(val); return; }
    if (num > assignCurrentSurah.versesCount) { setAssignFromVerse(String(assignCurrentSurah.versesCount)); return; }
    if (num < 1 && val !== "") { setAssignFromVerse("1"); return; }
    setAssignFromVerse(val);
  };

  const handleAssignToVerseChange = (val: string) => {
    const num = parseInt(val);
    if (!assignCurrentSurah) { setAssignToVerse(val); return; }
    if (num > assignCurrentSurah.versesCount) { setAssignToVerse(String(assignCurrentSurah.versesCount)); return; }
    const from = parseInt(assignFromVerse) || 1;
    if (num < from && val !== "") { setAssignToVerse(String(from)); return; }
    setAssignToVerse(val);
  };

  const handleAddSurahEntry = () => {
    if (!assignSelectedSurah || !assignFromVerse || !assignToVerse) {
      toast({ title: "خطأ", description: "يرجى اختيار السورة وتحديد الآيات أولاً", variant: "destructive" });
      return;
    }
    setSurahEntries(prev => [...prev, { surah: assignSelectedSurah, fromVerse: assignFromVerse, toVerse: assignToVerse }]);
    setAssignSelectedSurah("");
    setAssignFromVerse("");
    setAssignToVerse("");
  };

  const handleRemoveSurahEntry = (index: number) => {
    setSurahEntries(prev => prev.filter((_, i) => i !== index));
  };

  const handleAssign = async () => {
    const targetStudents = bulkMode ? bulkSelectedStudents : [assignSelectedStudent];

    if (targetStudents.length === 0 || !targetStudents[0]) {
      toast({ title: "خطأ في البيانات", description: "يرجى اختيار طالب واحد على الأقل", variant: "destructive" });
      return;
    }
    if (!assignDate || !assignTime) {
      toast({ title: "خطأ في البيانات", description: "يرجى تحديد التاريخ والوقت", variant: "destructive" });
      return;
    }

    const allEntries = [...surahEntries];
    if (assignSelectedSurah && assignFromVerse && assignToVerse) {
      allEntries.push({ surah: assignSelectedSurah, fromVerse: assignFromVerse, toVerse: assignToVerse });
    }

    if (allEntries.length === 0) {
      toast({ title: "خطأ في البيانات", description: "يرجى إضافة سورة واحدة على الأقل", variant: "destructive" });
      return;
    }

    const scheduledDate = new Date(assignDate);
    const [hours, minutes] = assignTime.split(":");
    scheduledDate.setHours(parseInt(hours), parseInt(minutes));

    if (bulkMode) setBulkSubmitting(true);
    else setAssignSubmitting(true);

    try {
      const requests: Promise<{ surah: string; studentId: string; response: Response }>[] = [];
      for (const entry of allEntries) {
        const surah = surahs.find(s => String(s.number) === entry.surah);
        const surahName = surah?.name || "";
        for (const studentId of targetStudents) {
          requests.push(
            fetch("/api/assignments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                studentId,
                teacherId: user?.id,
                mosqueId: user?.mosqueId || null,
                surahName,
                fromVerse: parseInt(entry.fromVerse) || 1,
                toVerse: parseInt(entry.toVerse) || 10,
                type: assignType,
                scheduledDate: scheduledDate.toISOString(),
                status: "pending",
              }),
            }).then(response => ({ surah: surahName, studentId, response }))
          );
        }
      }

      const settledResults = await Promise.allSettled(requests);
      const newAssignments: any[] = [];
      const failures: string[] = [];

      for (const result of settledResults) {
        if (result.status === "fulfilled") {
          const { surah, studentId, response } = result.value;
          if (response.ok) {
            const data = await response.json();
            newAssignments.push(data);
          } else {
            const errorData = await response.json().catch(() => ({ message: "خطأ غير معروف" }));
            const studentName = students.find(s => s.id === studentId)?.name || studentId;
            failures.push(`${surah} (${studentName}): ${errorData.message || "فشل"}`);
          }
        } else {
          failures.push(`خطأ في الاتصال: ${result.reason?.message || "خطأ شبكة"}`);
        }
      }

      if (newAssignments.length > 0) {
        setAssignments(prev => [...newAssignments, ...prev]);
      }

      const totalRequests = requests.length;
      if (failures.length === 0) {
        const surahCount = allEntries.length;
        const studentCount = targetStudents.length;
        toast({
          title: "تم تحديد الواجب بنجاح",
          description: surahCount > 1
            ? `تم إنشاء ${newAssignments.length} واجب (${surahCount} سور × ${studentCount} طالب)`
            : bulkMode
              ? `تم إنشاء ${newAssignments.length} واجب لـ ${studentCount} طالب`
              : `تم إرسال إشعار للطالب ${students.find(s => s.id === assignSelectedStudent)?.name} بموعد التسميع`,
          className: "bg-green-50 border-green-200 text-green-800"
        });
      } else if (newAssignments.length > 0) {
        toast({
          title: `تم إنشاء ${newAssignments.length} من ${totalRequests} واجب`,
          description: `فشل: ${failures.slice(0, 3).join(" | ")}${failures.length > 3 ? ` و${failures.length - 3} أخرى` : ""}`,
          variant: "destructive",
          duration: 8000,
        });
      } else {
        toast({
          title: "فشل إنشاء الواجبات",
          description: failures.slice(0, 3).join(" | "),
          variant: "destructive",
          duration: 8000,
        });
      }

      if (newAssignments.length > 0) {
        setAssignSelectedStudent("");
        setAssignSelectedSurah("");
        setAssignFromVerse("");
        setAssignToVerse("");
        setAssignTime("");
        setAssignDate(undefined);
        setAssignType("new");
        setSurahEntries([]);
        setBulkSelectedStudents([]);
        setBulkMode(false);
      } else {
        toast({ title: "خطأ", description: "فشل في إنشاء الواجب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setAssignSubmitting(false);
      setBulkSubmitting(false);
    }
  };

  const handleMarkDone = async (assignmentId: string) => {
    const grade = parseInt(assignGradeInput[assignmentId] || "0");
    if (isNaN(grade) || grade < 1 || grade > 100) {
      toast({ title: "خطأ", description: "الدرجة يجب أن تكون بين 1 و 100", variant: "destructive" });
      return;
    }

    setMarkingDone(assignmentId);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "done", grade }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAssignments(prev => {
          const base = prev.map(a => a.id === assignmentId ? { ...a, ...updated } : a);
          // If the backend returned an auto-created review assignment in the response
          if (updated.autoReviewAssignment) {
            return [updated.autoReviewAssignment, ...base];
          }
          return base;
        });

        toast({ title: "تم بنجاح", description: "تم تقييم الواجب", className: "bg-green-50 border-green-200 text-green-800" });

        if (grade < 60) {
          toast({
            title: "تنبيه: مراجعة تلقائية",
            description: "تم إنشاء واجب مراجعة تلقائياً بسبب انخفاض الدرجة",
            variant: "default",
            className: "bg-blue-50 border-blue-200 text-blue-800"
          });
        }
        setAssignGradeInput(prev => { const n = { ...prev }; delete n[assignmentId]; return n; });
      } else {
        toast({ title: "خطأ", description: "فشل في تحديث الواجب", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setMarkingDone(null);
    }
  };

  const handleSaveNotes = async (assignmentId: string) => {
    setSavingNotes(assignmentId);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes: notesInput[assignmentId] || "" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, ...updated } : a));
        toast({ title: "تم بنجاح", description: "تم حفظ الملاحظات", className: "bg-green-50 border-green-200 text-green-800" });
        setEditingNotes(null);
      } else {
        toast({ title: "خطأ", description: "فشل في حفظ الملاحظات", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setSavingNotes(null);
    }
  };

  const getAssignStudentName = (studentId: string) => {
    return students.find(s => s.id === studentId)?.name || "—";
  };

  const getTeacherName = (teacherId: string) => {
    return teachers.find(t => t.id === teacherId)?.name || "";
  };

  const handleArchive = async (assignmentId: string, archive: boolean) => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/archive`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isArchived: archive }),
      });
      if (res.ok) {
        setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, isArchived: archive } : a));
        toast({ title: "تم بنجاح", description: archive ? "تم نقل الواجب إلى الأرشيف" : "تم إرجاع الواجب من الأرشيف", className: "bg-green-50 border-green-200 text-green-800" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في تحديث الواجب", variant: "destructive" });
    }
  };

  const handleCancelAssignment = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (res.ok) {
        setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, status: "cancelled" } : a));
        toast({ title: "تم بنجاح", description: "تم إلغاء الواجب", className: "bg-green-50 border-green-200 text-green-800" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في إلغاء الواجب", variant: "destructive" });
    }
  };

  const resetExamForm = () => {
    setExamTitle("");
    setExamScope("verses");
    setExamSelectedSurah("");
    setExamSelectedSurahs([]);
    setExamSelectedJuz([]);
    setExamFromVerse("");
    setExamToVerse("");
    setExamDate("");
    setExamTime("");
    setExamDescription("");
    setIsForAll(true);
    setSelectedStudentIds([]);
  };

  const handleCreateExam = async () => {
    if (!examTitle || !examDate) {
      toast({ title: "خطأ", description: "يرجى تعبئة عنوان الامتحان والتاريخ", variant: "destructive" });
      return;
    }

    let surahName = "";
    let fromVerse = 1;
    let toVerse = 1;

    if (examScope === "verses") {
      if (!examSelectedSurah || !examFromVerse || !examToVerse) {
        toast({ title: "خطأ", description: "يرجى تحديد السورة والآيات", variant: "destructive" });
        return;
      }
      const surah = surahs.find(s => s.number.toString() === examSelectedSurah);
      if (!surah) return;
      const fv = parseInt(examFromVerse);
      const tv = parseInt(examToVerse);
      if (fv < 1 || fv > surah.versesCount) {
        toast({ title: "خطأ", description: `رقم آية البداية يجب أن يكون بين 1 و ${surah.versesCount}`, variant: "destructive" });
        return;
      }
      if (tv < fv || tv > surah.versesCount) {
        toast({ title: "خطأ", description: `رقم آية النهاية يجب أن يكون بين ${fv} و ${surah.versesCount}`, variant: "destructive" });
        return;
      }
      surahName = surah.name;
      fromVerse = fv;
      toVerse = tv;
    } else if (examScope === "surahs") {
      if (examSelectedSurahs.length === 0) {
        toast({ title: "خطأ", description: "يرجى اختيار سورة واحدة على الأقل", variant: "destructive" });
        return;
      }
      const selectedNames = examSelectedSurahs.map(num => {
        const s = surahs.find(su => su.number.toString() === num);
        return s?.name || "";
      }).filter(Boolean);
      surahName = selectedNames.join(" ، ");
      fromVerse = 1;
      toVerse = 1;
    } else if (examScope === "juz") {
      if (examSelectedJuz.length === 0) {
        toast({ title: "خطأ", description: "يرجى اختيار جزء واحد على الأقل", variant: "destructive" });
        return;
      }
      const juzLabels = examSelectedJuz.sort((a, b) => a - b).map(j => {
        const jd = JUZ_DATA.find(jj => jj.juz === j);
        return jd?.label || `الجزء ${j}`;
      });
      surahName = juzLabels.join(" ، ");
      fromVerse = 1;
      toVerse = 1;
    }

    if (!isForAll && selectedStudentIds.length === 0) {
      toast({ title: "خطأ", description: "يرجى اختيار طالب واحد على الأقل", variant: "destructive" });
      return;
    }

    setExamSubmitting(true);
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: examTitle,
          surahName,
          fromVerse,
          toVerse,
          examDate,
          examTime: examTime || null,
          description: examDescription || null,
          isForAll,
          studentIds: isForAll ? [] : selectedStudentIds,
        }),
      });

      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إنشاء الامتحان بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        resetExamForm();
        fetchExams();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في إنشاء الامتحان", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setExamSubmitting(false);
    }
  };

  const toggleExpand = async (examId: string) => {
    if (expandedExamId === examId) {
      setExpandedExamId(null);
      setExpandedExamData(null);
      return;
    }

    setExpandedExamId(examId);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/exams/${examId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setExpandedExamData(data);
        const grades: Record<string, string> = {};
        data.students?.forEach((s: ExamStudent) => {
          if (s.grade !== null) grades[s.studentId] = s.grade.toString();
        });
        setGradeValues(grades);
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل تفاصيل الامتحان", variant: "destructive" });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleGrade = async (examId: string, studentId: string) => {
    const grade = parseInt(gradeValues[studentId] || "0");
    if (isNaN(grade) || grade < 0 || grade > 100) {
      toast({ title: "خطأ", description: "الدرجة يجب أن تكون بين 0 و 100", variant: "destructive" });
      return;
    }

    setGradingStudent(studentId);
    try {
      const res = await fetch(`/api/exams/${examId}/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ grade, status: "done" }),
      });

      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حفظ الدرجة", className: "bg-green-50 border-green-200 text-green-800" });
        toggleExpand(examId);
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في حفظ الدرجة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setGradingStudent(null);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    setDeletingExam(examId);
    try {
      const res = await fetch(`/api/exams/${examId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم حذف الامتحان", className: "bg-green-50 border-green-200 text-green-800" });
        setExams(prev => prev.filter(e => e.id !== examId));
        if (expandedExamId === examId) {
          setExpandedExamId(null);
          setExpandedExamData(null);
        }
      } else {
        toast({ title: "خطأ", description: "فشل في حذف الامتحان", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setDeletingExam(null);
    }
  };

  const fetchQuranVerses = async (assignmentId: string, surahName: string, fromVerse: number, toVerse: number) => {
    if (verseText[assignmentId]) {
      setExpandedAssignmentId(expandedAssignmentId === assignmentId ? null : assignmentId);
      return;
    }

    const surah = surahs.find(s => s.name === surahName);
    if (!surah) return;

    setLoadingVerses(assignmentId);
    setExpandedAssignmentId(assignmentId);

    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${surah.number}`);
      const data = await res.json();
      if (data.code === 200 && data.data?.ayahs) {
        const verses = data.data.ayahs
          .filter((a: any) => a.numberInSurah >= fromVerse && a.numberInSurah <= toVerse)
          .map((a: any) => ({ number: a.numberInSurah, text: a.text }));
        setVerseText(prev => ({ ...prev, [assignmentId]: verses }));
      }
    } catch {
    } finally {
      setLoadingVerses(null);
    }
  };

  useEffect(() => {
    if (isStudent) {
      const link = document.createElement('link');
      link.href = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
      return () => { document.head.removeChild(link); };
    }
  }, [isStudent]);

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const toggleBulkStudent = (studentId: string) => {
    setBulkSelectedStudents(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const getExamStudentName = (studentId: string) => {
    return students.find(s => s.id === studentId)?.name || studentId;
  };

  const assignHasActiveFilters = assignSearchTerm || assignFilterStatus !== "all" || assignFilterSurah !== "all" || assignFilterDateFrom || assignFilterDateTo || filterLevel !== "all";

  const clearAssignFilters = () => {
    setAssignSearchTerm("");
    setAssignFilterStatus("all");
    setAssignFilterSurah("all");
    setAssignFilterDateFrom("");
    setAssignFilterDateTo("");
    setFilterLevel("all");
  };

  const filteredAssignments = assignments.filter(a => {
    const archived = a.isArchived || false;
    if (showArchive !== archived) return false;
    if (assignSearchTerm) {
      const studentName = getAssignStudentName(a.studentId);
      if (!studentName.includes(assignSearchTerm) && !a.surahName.includes(assignSearchTerm)) return false;
    }
    if (assignFilterStatus !== "all" && a.status !== assignFilterStatus) return false;
    if (assignFilterSurah !== "all" && a.surahName !== assignFilterSurah) return false;
    if (filterLevel !== "all") {
      const student = students.find(s => s.id === a.studentId);
      if (student && String(student.level || 1) !== filterLevel) return false;
    }
    if (assignFilterDateFrom && a.scheduledDate) {
      if (new Date(a.scheduledDate) < new Date(assignFilterDateFrom)) return false;
    }
    if (assignFilterDateTo && a.scheduledDate) {
      const toDate = new Date(assignFilterDateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(a.scheduledDate) > toDate) return false;
    }
    return true;
  });

  const archivedCount = assignments.filter(a => a.isArchived).length;

  const uniqueSurahNames = Array.from(new Set(assignments.map(a => a.surahName)));

  const formatDate = (dateStr: string) => formatDateAr(dateStr);

  const selectedDateAssignments = useMemo(() => {
    if (!selectedCalendarDate) return [];
    const key = format(selectedCalendarDate, "yyyy-MM-dd");
    return assignmentsByDate[key] || [];
  }, [selectedCalendarDate, assignmentsByDate]);

  const dayNames = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 page-transition">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-assignments-exams">
          الواجبات والامتحانات
        </h1>
        <p className="text-muted-foreground">إدارة واجبات الطلاب والامتحانات في مكان واحد</p>
        {(user?.role === "admin" || user?.role === "supervisor" || user?.role === "teacher") && (
          <Button variant="outline" className="gap-2 mt-2 sm:mt-0" data-testid="button-export-assignments" onClick={() => {
            const typeLabels: Record<string, string> = { new: "حفظ جديد", review: "مراجعة", test: "اختبار", memorization: "تسميع", revision: "تثبيت" };
            exportJsonToExcel(
              assignments.map(a => {
                const student = students.find(s => s.id === a.studentId);
                return {
                  "الطالب": student?.name || a.studentId,
                  "السورة": a.surahName,
                  "من آية": a.fromVerse,
                  "إلى آية": a.toVerse,
                  "النوع": typeLabels[a.type] || a.type,
                  "التاريخ": a.scheduledDate,
                  "الحالة": a.status === "done" ? "مُقيَّم" : a.status === "pending" ? "معلق" : a.status,
                  "الدرجة": a.grade ?? "",
                  "ملاحظات": a.notes || "",
                };
              }),
              "Assignments",
              "assignments_export.xlsx"
            );
          }}>
            <Download className="w-4 h-4" />
            تصدير الواجبات
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="stats-cards">
        <Card className="border-t-4 border-t-blue-500" data-testid="stat-total-assignments">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{totalAssignments}</p>
              <p className="text-xs text-muted-foreground">إجمالي الواجبات</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-yellow-500" data-testid="stat-pending-assignments">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">{pendingAssignments}</p>
              <p className="text-xs text-muted-foreground">واجبات معلقة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-green-500" data-testid="stat-completed-assignments">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full text-green-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{completedAssignments}</p>
              <p className="text-xs text-muted-foreground">واجبات مكتملة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-purple-500" data-testid="stat-total-exams">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-full text-purple-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700">{totalExams}</p>
              <p className="text-xs text-muted-foreground">إجمالي الامتحانات</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="assignments" dir="rtl">
        <TabsList>
          <TabsTrigger value="assignments" className="gap-2" data-testid="tab-assignments">
            📝 الواجبات
          </TabsTrigger>
          <TabsTrigger value="exams" className="gap-2" data-testid="tab-exams">
            📋 الامتحانات
          </TabsTrigger>
          <TabsTrigger value="external" className="gap-2" data-testid="tab-external">
            📚 الواجبات الخارجية
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-6">
          <div className={`grid grid-cols-1 ${(isTeacher || isSupervisor || user?.role === "admin") ? 'lg:grid-cols-2' : ''} gap-8`}>
            {(isTeacher || isSupervisor || user?.role === "admin") && (<Card className="border-t-4 border-t-primary shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  تحديد واجب جديد
                </CardTitle>
                <CardDescription>اختر الطالب وحدد الآيات والموعد</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <Label className="cursor-pointer flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    واجب جماعي (عدة طلاب)
                  </Label>
                  <Switch
                    data-testid="switch-bulk-mode"
                    checked={bulkMode}
                    onCheckedChange={(v) => { setBulkMode(v); setBulkSelectedStudents([]); setAssignSelectedStudent(""); }}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>{bulkMode ? "الطلاب" : "الطالب"}</Label>
                    {!bulkMode && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-blue-600 gap-1"
                        onClick={handleSuggestNext}
                        disabled={isSuggesting || !assignSelectedStudent}
                        data-testid="button-suggest-next"
                      >
                        {isSuggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
                        اقتراح الواجب القادم
                      </Button>
                    )}
                  </div>
                  {loadingStudents ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="status-loading-students">
                      <Loader2 className="w-4 h-4 animate-spin" /> جاري التحميل...
                    </div>
                  ) : bulkMode ? (
                    <div className="space-y-2 border rounded-lg p-3">
                      <Input
                        placeholder="ابحث عن طالب..."
                        value={bulkStudentSearch}
                        onChange={e => setBulkStudentSearch(e.target.value)}
                        className="h-8 text-xs"
                        data-testid="input-bulk-student-search"
                      />
                      <div className="max-h-40 overflow-y-auto space-y-2">
                        {students
                          .filter(s => !bulkStudentSearch.trim() || s.name.toLowerCase().includes(bulkStudentSearch.trim().toLowerCase()))
                          .map(s => (
                          <div key={s.id} className="flex items-center gap-2">
                            <Checkbox
                              data-testid={`checkbox-bulk-student-${s.id}`}
                              checked={bulkSelectedStudents.includes(s.id)}
                              onCheckedChange={() => toggleBulkStudent(s.id)}
                            />
                            <span className="text-sm">{s.name}</span>
                          </div>
                        ))}
                      </div>
                      {bulkSelectedStudents.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1" data-testid="text-bulk-selected-count">
                          تم اختيار {bulkSelectedStudents.length} طالب
                        </p>
                      )}
                    </div>
                  ) : (
                    <SearchableSelect
                      options={students.map((s) => ({ value: s.id, label: s.name }))}
                      value={assignSelectedStudent}
                      onValueChange={setAssignSelectedStudent}
                      placeholder="اختر الطالب"
                      searchPlaceholder="ابحث عن طالب..."
                      emptyText="لا يوجد طالب بهذا الاسم"
                      data-testid="select-student"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label>نوع الواجب</Label>
                  <Select value={assignType} onValueChange={setAssignType}>
                    <SelectTrigger className="bg-white" data-testid="select-assign-type">
                      <SelectValue placeholder="نوع الواجب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">جديد (حفظ جديد)</SelectItem>
                      <SelectItem value="review">مراجعة</SelectItem>
                      <SelectItem value="test">اختبار</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {surahEntries.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      السور المضافة ({surahEntries.length})
                    </Label>
                    <div className="space-y-2 border rounded-lg p-3 bg-muted/30">
                      {surahEntries.map((entry, index) => {
                        const entrySurah = surahs.find(s => String(s.number) === entry.surah);
                        return (
                          <div key={index} className="flex items-center justify-between bg-white rounded-md px-3 py-2 border" data-testid={`surah-entry-${index}`}>
                            <span className="text-sm font-medium">
                              {entrySurah?.name || entry.surah} — الآيات {entry.fromVerse} إلى {entry.toVerse}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveSurahEntry(index)}
                              data-testid={`button-remove-surah-${index}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-3 border rounded-lg p-4 bg-blue-50/30 border-blue-200/50">
                  <Label className="text-sm font-medium">{surahEntries.length > 0 ? "إضافة سورة أخرى" : "اختيار السورة والآيات"}</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2 md:col-span-2">
                      <Select value={assignSelectedSurah} onValueChange={handleAssignSurahChange}>
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
                      <Label>من الآية {assignCurrentSurah && <span className="text-xs text-muted-foreground">(1 - {assignCurrentSurah.versesCount})</span>}</Label>
                      <Input
                        type="number"
                        placeholder="1"
                        min={1}
                        max={assignCurrentSurah?.versesCount}
                        value={assignFromVerse}
                        onChange={e => handleAssignFromVerseChange(e.target.value)}
                        data-testid="input-from-verse"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>إلى الآية {assignCurrentSurah && <span className="text-xs text-muted-foreground">(حتى {assignCurrentSurah.versesCount})</span>}</Label>
                      <Input
                        type="number"
                        placeholder="10"
                        min={parseInt(assignFromVerse) || 1}
                        max={assignCurrentSurah?.versesCount}
                        value={assignToVerse}
                        onChange={e => handleAssignToVerseChange(e.target.value)}
                        data-testid="input-to-verse"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
                    onClick={handleAddSurahEntry}
                    disabled={!assignSelectedSurah || !assignFromVerse || !assignToVerse}
                    data-testid="button-add-surah-entry"
                  >
                    <Plus className="w-4 h-4 ml-1" />
                    إضافة سورة أخرى للواجب
                  </Button>
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
                            !assignDate && "text-muted-foreground"
                          )}
                          data-testid="button-select-date"
                        >
                          {assignDate ? format(assignDate, "PPP", { locale: ar }) : <span>اختر التاريخ</span>}
                          <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={assignDate}
                          onSelect={setAssignDate}
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
                        value={assignTime}
                        onChange={(e) => setAssignTime(e.target.value)}
                        className="w-full"
                        data-testid="input-time"
                      />
                      <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                </div>

                <Button onClick={handleAssign} disabled={assignSubmitting || bulkSubmitting} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 mt-4" data-testid="button-submit-assignment">
                  {(assignSubmitting || bulkSubmitting) ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 ml-2" />}
                  {bulkMode
                    ? `تأكيد وإرسال لـ ${bulkSelectedStudents.length} طالب${surahEntries.length > 0 ? ` (${surahEntries.length + (assignSelectedSurah ? 1 : 0)} سور)` : ""}`
                    : surahEntries.length > 0
                      ? `تأكيد وإرسال (${surahEntries.length + (assignSelectedSurah ? 1 : 0)} سور)`
                      : "تأكيد وإرسال للطالب"}
                </Button>
              </CardContent>
            </Card>)}

            <div className="space-y-6">
              <Card className="bg-muted/30 border-none" dir="rtl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{showArchive ? "أرشيف الواجبات" : "الواجبات"} ({filteredAssignments.length})</CardTitle>
                    {!isStudent && (
                      <Button
                        variant={showArchive ? "default" : "outline"}
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => setShowArchive(!showArchive)}
                        data-testid="button-toggle-archive"
                      >
                        {showArchive ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                        {showArchive ? "الواجبات الحالية" : `الأرشيف (${archivedCount})`}
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-end gap-3 mt-3">
                    <div className="relative w-full sm:w-48">
                      <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="بحث بالاسم أو السورة..."
                        className="pr-8"
                        value={assignSearchTerm}
                        onChange={(e) => setAssignSearchTerm(e.target.value)}
                        data-testid="input-search-assignments"
                      />
                    </div>
                    <div className="w-full sm:w-36">
                      <Select value={assignFilterStatus} onValueChange={setAssignFilterStatus}>
                        <SelectTrigger data-testid="select-filter-assign-status">
                          <SelectValue placeholder="الحالة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الحالة - الكل</SelectItem>
                          <SelectItem value="pending">انتظار</SelectItem>
                          <SelectItem value="done">تم التسميع</SelectItem>
                          <SelectItem value="cancelled">ملغي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full sm:w-40">
                      <Select value={assignFilterSurah} onValueChange={setAssignFilterSurah}>
                        <SelectTrigger data-testid="select-filter-assign-surah">
                          <SelectValue placeholder="السورة" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">السورة - الكل</SelectItem>
                          {uniqueSurahNames.map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full sm:w-36">
                      <Select value={filterLevel} onValueChange={setFilterLevel}>
                        <SelectTrigger data-testid="select-filter-level">
                          <SelectValue placeholder="المستوى" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">المستوى - الكل</SelectItem>
                          {LEVEL_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full sm:w-36">
                      <Label className="text-xs text-muted-foreground mb-1 block">من تاريخ</Label>
                      <Input
                        type="date"
                        value={assignFilterDateFrom}
                        onChange={(e) => setAssignFilterDateFrom(e.target.value)}
                        data-testid="input-filter-assign-date-from"
                      />
                    </div>
                    <div className="w-full sm:w-36">
                      <Label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</Label>
                      <Input
                        type="date"
                        value={assignFilterDateTo}
                        onChange={(e) => setAssignFilterDateTo(e.target.value)}
                        data-testid="input-filter-assign-date-to"
                      />
                    </div>
                    {assignHasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearAssignFilters} className="gap-1 text-destructive hover:text-destructive" data-testid="button-clear-assign-filters">
                        <X className="w-4 h-4" />
                        مسح الفلاتر
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingAssignments ? (
                    <div className="flex items-center justify-center py-8" data-testid="status-loading-assignments">
                      <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
                      <span>جاري التحميل...</span>
                    </div>
                  ) : filteredAssignments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground" data-testid="status-empty-assignments">
                      لا توجد واجبات
                    </div>
                  ) : (
                    (isStudent ? filteredAssignments : filteredAssignments).map((task) => {
                      const deadline = getDeadlineInfo(task.scheduledDate, task.status);
                      const typeBadge = getTypeBadge(task.type);
                      const studentRate = studentCompletionRates[task.studentId];

                      return (
                      <div key={task.id} className={`p-4 bg-white rounded-lg shadow-sm border border-slate-100 ${isStudent ? 'cursor-pointer hover:border-primary/30 transition-colors' : ''}`} data-testid={`card-assignment-${task.id}`} onClick={() => isStudent && fetchQuranVerses(task.id, task.surahName, task.fromVerse, task.toVerse)}>
                        <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p
                                className={cn("font-bold text-sm", (isTeacher || isSupervisor) && "cursor-pointer hover:text-primary")}
                                data-testid={`text-assignment-student-${task.id}`}
                                onClick={(e) => {
                                  if (isTeacher || isSupervisor) {
                                    e.stopPropagation();
                                    setStudentStatsDialog(task.studentId);
                                  }
                                }}
                              >
                                {getAssignStudentName(task.studentId)}
                              </p>
                              {(isTeacher || isSupervisor) && studentRate && (
                                <div className="flex items-center gap-1" data-testid={`progress-student-${task.studentId}`}>
                                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full transition-all"
                                      style={{ width: `${studentRate.total > 0 ? (studentRate.done / studentRate.total) * 100 : 0}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">
                                    {studentRate.total > 0 ? Math.round((studentRate.done / studentRate.total) * 100) : 0}%
                                  </span>
                                </div>
                              )}
                            </div>
                            {getTeacherName(task.teacherId) && (
                              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground" data-testid={`text-teacher-${task.id}`}>
                                <UserCircle className="w-3 h-3" />
                                <span>الأستاذ: {getTeacherName(task.teacherId)}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-muted-foreground">{task.surahName} ({task.fromVerse}-{task.toVerse})</p>
                              <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4", typeBadge.className)} data-testid={`badge-type-${task.id}`}>
                                {typeBadge.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground" data-testid={`date-assignment-${task.id}`}>
                              <CalendarIcon className="w-3 h-3" />
                              {formatDateAr(task.scheduledDate)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isStudent && (() => {
                            const student = students.find(s => s.id === task.studentId);
                            return (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn("h-7 w-7", student?.phone ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-gray-300 cursor-not-allowed")}
                                  onClick={() => student?.phone && window.open(getWhatsAppUrl(student.phone), "_blank")}
                                  disabled={!student?.phone}
                                  title={student?.phone ? "واتساب الطالب" : "لا يوجد رقم هاتف"}
                                  data-testid={`button-whatsapp-student-${task.id}`}
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn("h-7 w-7", student?.parentPhone ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50" : "text-gray-300 cursor-not-allowed")}
                                  onClick={() => student?.parentPhone && window.open(getWhatsAppUrl(student.parentPhone), "_blank")}
                                  disabled={!student?.parentPhone}
                                  title={student?.parentPhone ? "واتساب ولي الأمر" : "لا يوجد رقم ولي أمر"}
                                  data-testid={`button-whatsapp-parent-${task.id}`}
                                >
                                  <PhoneCall className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            );
                          })()}
                        <div className="text-left space-y-1">
                          <div className="flex items-center gap-1 text-sm font-bold text-primary">
                            <Clock className="w-3 h-3" />
                            {task.scheduledDate ? format(new Date(task.scheduledDate), "hh:mm a", { locale: ar }) : "—"}
                          </div>
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            <span className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full",
                              task.status === "done" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                            )} data-testid={`status-assignment-${task.id}`}>
                              {task.status === "done" ? "تم التسميع" : "انتظار"}
                            </span>
                            {task.status === "done" && task.grade != null && (
                              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", getGradeColor(task.grade))} data-testid={`grade-badge-${task.id}`}>
                                {task.grade}/100
                              </span>
                            )}
                            {task.hasAudio && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 flex items-center gap-0.5" data-testid={`audio-badge-${task.id}`}>
                                <Mic className="w-2.5 h-2.5" />
                                تسميع صوتي
                              </span>
                            )}
                          </div>
                          {task.status === "pending" && (
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full block text-center", deadline.badgeVariant)} data-testid={`deadline-badge-${task.id}`}>
                              {deadline.label}
                            </span>
                          )}
                          {!isStudent && (
                          <div className="flex items-center gap-1" data-testid={`seen-status-${task.id}`}>
                            {task.seenByStudent ? (
                              <span className="flex items-center gap-1 text-[10px] text-blue-600">
                                <CheckCircle2 className="w-3 h-3" />
                                <CheckCircle2 className="w-3 h-3 -mr-1.5" />
                                تمت الرؤية
                                {task.seenAt && <span className="text-[9px] text-muted-foreground">({format(new Date(task.seenAt), "hh:mm a", { locale: ar })})</span>}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                <CheckCircle2 className="w-3 h-3" />
                                <CheckCircle2 className="w-3 h-3 -mr-1.5" />
                                لم يُرَ بعد
                              </span>
                            )}
                          </div>
                          )}
                        </div>
                        </div>
                        </div>

                        {isTeacher && task.status === "pending" && (
                          <div className="mt-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100" onClick={e => e.stopPropagation()} data-testid={`grading-section-${task.id}`}>
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-blue-600" />
                              <span className="text-xs font-semibold text-blue-800">تقييم وإتمام</span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {[
                                { label: "ممتاز", grade: 95 },
                                { label: "جيد جداً", grade: 85 },
                                { label: "جيد", grade: 75 },
                                { label: "مقبول", grade: 65 },
                                { label: "ضعيف", grade: 50 },
                              ].map((preset) => (
                                <Button
                                  key={preset.grade}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] px-2"
                                  onClick={() => setAssignGradeInput(prev => ({ ...prev, [task.id]: preset.grade.toString() }))}
                                  data-testid={`button-preset-grade-${task.id}-${preset.grade}`}
                                >
                                  {preset.label} {preset.grade}
                                </Button>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Input
                                type="number"
                                min={1}
                                max={100}
                                placeholder="الدرجة (1-100)"
                                className="w-28 h-8 text-sm"
                                value={assignGradeInput[task.id] || ""}
                                onChange={e => setAssignGradeInput(prev => ({ ...prev, [task.id]: e.target.value }))}
                                data-testid={`input-assign-grade-${task.id}`}
                              />
                              <Button
                                size="sm"
                                className="h-8 text-xs gap-1"
                                disabled={markingDone === task.id}
                                onClick={() => handleMarkDone(task.id)}
                                data-testid={`button-mark-done-${task.id}`}
                              >
                                {markingDone === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                تم التسميع
                              </Button>
                            </div>
                          </div>
                        )}

                        {(isTeacher || isSupervisor) && (
                          <div className="mt-2 flex items-start gap-2" onClick={e => e.stopPropagation()}>
                            {editingNotes === task.id ? (
                              <div className="flex-1 flex items-center gap-2" data-testid={`notes-edit-section-${task.id}`}>
                                <Textarea
                                  className="text-xs h-16 flex-1"
                                  placeholder="أضف ملاحظات..."
                                  value={notesInput[task.id] ?? (task.notes || "")}
                                  onChange={e => setNotesInput(prev => ({ ...prev, [task.id]: e.target.value }))}
                                  data-testid={`input-notes-${task.id}`}
                                />
                                <div className="flex flex-col gap-1">
                                  <Button size="sm" className="h-7 text-xs gap-1" disabled={savingNotes === task.id} onClick={() => handleSaveNotes(task.id)} data-testid={`button-save-notes-${task.id}`}>
                                    {savingNotes === task.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    حفظ
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingNotes(null)} data-testid={`button-cancel-notes-${task.id}`}>
                                    إلغاء
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs gap-1 text-muted-foreground hover:text-primary"
                                onClick={() => {
                                  setEditingNotes(task.id);
                                  setNotesInput(prev => ({ ...prev, [task.id]: task.notes || "" }));
                                }}
                                data-testid={`button-edit-notes-${task.id}`}
                              >
                                <Edit className="w-3 h-3" />
                                {task.notes ? "تعديل الملاحظات" : "إضافة ملاحظات"}
                              </Button>
                            )}
                          </div>
                        )}

                        {task.notes && editingNotes !== task.id && (
                          <div className="mt-1 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1" data-testid={`text-notes-${task.id}`}>
                            📝 {task.notes}
                          </div>
                        )}

                        {isStudent && expandedAssignmentId === task.id && (
                          <div className="mt-3 p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50" data-testid={`verses-display-${task.id}`}>
                            <div className="text-center mb-3">
                              <h4 className="text-sm font-bold text-primary flex items-center justify-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                {task.surahName} - الآيات {task.fromVerse} إلى {task.toVerse}
                              </h4>
                            </div>
                            {loadingVerses === task.id ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              </div>
                            ) : verseText[task.id] ? (
                              <div className="text-right leading-loose" style={{ fontFamily: "'Amiri', 'Traditional Arabic', serif", fontSize: "20px" }} dir="rtl">
                                {verseText[task.id].map((v: any) => (
                                  <span key={v.number}>
                                    <span className="text-gray-800 dark:text-gray-200">{v.text}</span>
                                    <span className="text-amber-600 text-sm mx-1">﴿{v.number}﴾</span>
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        )}

                        {isStudent && task.status === "pending" && (
                          <AudioRecorder
                            assignmentId={task.id}
                            surahName={task.surahName}
                            fromVerse={task.fromVerse}
                            toVerse={task.toVerse}
                            hasExistingAudio={task.hasAudio || false}
                            onAudioUploaded={() => {
                              setAssignments(prev => prev.map(a => a.id === task.id ? { ...a, hasAudio: true } : a));
                            }}
                            onAudioDeleted={() => {
                              setAssignments(prev => prev.map(a => a.id === task.id ? { ...a, hasAudio: false } : a));
                            }}
                          />
                        )}

                        {(isTeacher || isSupervisor) && task.hasAudio && task.status === "pending" && (
                          <AudioPlayer
                            assignmentId={task.id}
                            surahName={task.surahName}
                            fromVerse={task.fromVerse}
                            toVerse={task.toVerse}
                            studentName={students.find(s => s.id === task.studentId)?.name}
                          />
                        )}

                        {(isTeacher || isSupervisor) && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
                            {task.status === "pending" && !task.isArchived && (
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleCancelAssignment(task.id)} data-testid={`button-cancel-${task.id}`}>
                                <Ban className="w-3 h-3" />
                                إلغاء
                              </Button>
                            )}
                            {!task.isArchived && (task.status === "done" || task.status === "cancelled") && (
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50" onClick={() => handleArchive(task.id, true)} data-testid={`button-archive-${task.id}`}>
                                <Archive className="w-3 h-3" />
                                نقل للأرشيف
                              </Button>
                            )}
                            {task.isArchived && (
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleArchive(task.id, false)} data-testid={`button-unarchive-${task.id}`}>
                                <ArchiveRestore className="w-3 h-3" />
                                إرجاع من الأرشيف
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => { if (confirm("هل أنت متأكد من حذف هذا الواجب نهائياً؟")) { fetch(`/api/assignments/${task.id}`, { method: "DELETE", credentials: "include" }).then(() => { setAssignments(prev => prev.filter(a => a.id !== task.id)); toast({ title: "تم الحذف", className: "bg-green-50 border-green-200 text-green-800" }); }); } }} data-testid={`button-delete-${task.id}`}>
                              <Trash2 className="w-3 h-3" />
                              حذف
                            </Button>
                          </div>
                        )}
                      </div>
                    );})
                  )}
                </CardContent>
              </Card>

              {!isStudent && (
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
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="exams" className="mt-6">
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <p className="text-muted-foreground">
                  {isTeacher && "إدارة الامتحانات وتقييم الطلاب"}
                  {isSupervisor && "عرض جميع الامتحانات في الجامع/المركز"}
                  {isStudent && "الامتحانات القادمة"}
                </p>
              </div>
              {isTeacher && (
                <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetExamForm(); }}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 text-white gap-2" data-testid="button-create-exam">
                      <Plus className="w-4 h-4" />
                      إنشاء امتحان
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
                    <DialogHeader>
                      <DialogTitle>إنشاء امتحان جديد</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>عنوان الامتحان *</Label>
                        <Input
                          data-testid="input-exam-title"
                          value={examTitle}
                          onChange={e => setExamTitle(e.target.value)}
                          placeholder="مثال: اختبار سورة البقرة"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>نطاق الامتحان *</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {([
                            { value: "verses" as const, label: "آيات محددة" },
                            { value: "surahs" as const, label: "سور محددة" },
                            { value: "juz" as const, label: "أجزاء محددة" },
                          ]).map(opt => (
                            <Button
                              key={opt.value}
                              type="button"
                              variant={examScope === opt.value ? "default" : "outline"}
                              size="sm"
                              className="text-xs"
                              onClick={() => { setExamScope(opt.value); setExamSelectedSurah(""); setExamSelectedSurahs([]); setExamSelectedJuz([]); setExamFromVerse(""); setExamToVerse(""); }}
                              data-testid={`button-scope-${opt.value}`}
                            >
                              {opt.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {examScope === "verses" && (
                        <>
                          <div className="space-y-2">
                            <Label>السورة *</Label>
                            <Select value={examSelectedSurah} onValueChange={(val) => { setExamSelectedSurah(val); setExamFromVerse("1"); setExamToVerse(""); }}>
                              <SelectTrigger data-testid="select-surah">
                                <SelectValue placeholder="اختر السورة" />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {surahs.map(s => (
                                  <SelectItem key={s.number} value={s.number.toString()} data-testid={`option-surah-${s.number}`}>
                                    {s.number}. {s.name} ({s.versesCount} آية)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>من آية *</Label>
                              <Input
                                data-testid="input-from-verse"
                                type="number"
                                min={1}
                                max={examCurrentSurah?.versesCount || 1}
                                value={examFromVerse}
                                onChange={e => setExamFromVerse(e.target.value)}
                                placeholder="1"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>إلى آية *</Label>
                              <Input
                                data-testid="input-to-verse"
                                type="number"
                                min={parseInt(examFromVerse) || 1}
                                max={examCurrentSurah?.versesCount || 1}
                                value={examToVerse}
                                onChange={e => setExamToVerse(e.target.value)}
                                placeholder={examCurrentSurah?.versesCount.toString() || ""}
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {examScope === "surahs" && (
                        <div className="space-y-2">
                          <Label>اختر السور * ({examSelectedSurahs.length} مختارة)</Label>
                          <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                            {surahs.map(s => (
                              <label key={s.number} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm">
                                <Checkbox
                                  checked={examSelectedSurahs.includes(s.number.toString())}
                                  onCheckedChange={(checked) => {
                                    setExamSelectedSurahs(prev =>
                                      checked ? [...prev, s.number.toString()] : prev.filter(n => n !== s.number.toString())
                                    );
                                  }}
                                  data-testid={`checkbox-surah-${s.number}`}
                                />
                                <span>{s.number}. {s.name} ({s.versesCount} آية)</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {examScope === "juz" && (
                        <div className="space-y-2">
                          <Label>اختر الأجزاء * ({examSelectedJuz.length} مختارة)</Label>
                          <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-1">
                              {JUZ_DATA.map(j => (
                                <label key={j.juz} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer text-sm">
                                  <Checkbox
                                    checked={examSelectedJuz.includes(j.juz)}
                                    onCheckedChange={(checked) => {
                                      setExamSelectedJuz(prev =>
                                        checked ? [...prev, j.juz] : prev.filter(n => n !== j.juz)
                                      );
                                    }}
                                    data-testid={`checkbox-juz-${j.juz}`}
                                  />
                                  <span>{j.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>تاريخ الامتحان (يوم) *</Label>
                          <Input
                            data-testid="input-exam-date"
                            type="date"
                            value={examDate}
                            onChange={e => setExamDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>وقت الامتحان</Label>
                          <Input
                            data-testid="input-exam-time"
                            type="time"
                            value={examTime}
                            onChange={e => setExamTime(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>ملاحظات</Label>
                        <Textarea
                          data-testid="input-description"
                          value={examDescription}
                          onChange={e => setExamDescription(e.target.value)}
                          placeholder="مثال: الامتحان سيكون الساعة 10:00 صباحاً بعد صلاة الضحى في قاعة الجامع/المركز"
                          rows={3}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <Label className="cursor-pointer">لجميع الطلاب</Label>
                        <Switch
                          data-testid="switch-is-for-all"
                          checked={isForAll}
                          onCheckedChange={setIsForAll}
                        />
                      </div>

                      {!isForAll && (
                        <div className="space-y-2 border rounded-lg p-3">
                          <Label>اختر الطلاب</Label>
                          {students.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2" data-testid="text-no-students">لا يوجد طلاب</p>
                          ) : (
                            <>
                              <Input
                                placeholder="ابحث عن طالب..."
                                value={examStudentSearch}
                                onChange={e => setExamStudentSearch(e.target.value)}
                                className="h-8 text-xs"
                                data-testid="input-exam-student-search"
                              />
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {students
                                  .filter(s => !examStudentSearch.trim() || s.name.toLowerCase().includes(examStudentSearch.trim().toLowerCase()))
                                  .map(s => (
                                  <div key={s.id} className="flex items-center gap-2">
                                    <Checkbox
                                      data-testid={`checkbox-student-${s.id}`}
                                      checked={selectedStudentIds.includes(s.id)}
                                      onCheckedChange={() => toggleStudentSelection(s.id)}
                                    />
                                    <span className="text-sm">{s.name}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                          {selectedStudentIds.length > 0 && (
                            <p className="text-xs text-muted-foreground" data-testid="text-selected-count">
                              تم اختيار {selectedStudentIds.length} طالب
                            </p>
                          )}
                        </div>
                      )}

                      <Button
                        onClick={handleCreateExam}
                        disabled={examSubmitting}
                        className="w-full"
                        data-testid="button-submit-exam"
                      >
                        {examSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                        إنشاء الامتحان
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {examLoading ? (
              <div className="flex items-center justify-center py-12" data-testid="status-loading-assignments-exams">
                <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
                <span>جاري التحميل...</span>
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-12" data-testid="status-empty">
                <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground text-lg">لا توجد امتحانات</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exams.map(exam => (
                  <Card
                    key={exam.id}
                    className={`cursor-pointer transition-shadow hover:shadow-md ${expandedExamId === exam.id ? "ring-2 ring-primary" : ""}`}
                    data-testid={`card-exam-${exam.id}`}
                    onClick={() => toggleExpand(exam.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg leading-tight" data-testid={`text-exam-title-${exam.id}`}>
                          {exam.title}
                        </CardTitle>
                        {isTeacher && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                            data-testid={`button-delete-exam-${exam.id}`}
                            disabled={deletingExam === exam.id}
                            onClick={(e) => { e.stopPropagation(); handleDeleteExam(exam.id); }}
                          >
                            {deletingExam === exam.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen className="w-4 h-4 text-primary shrink-0" />
                        <span data-testid={`text-exam-surah-${exam.id}`}>
                          {exam.fromVerse === 1 && exam.toVerse === 1 && exam.surahName.includes("،")
                            ? exam.surahName
                            : exam.fromVerse === 1 && exam.toVerse === 1
                              ? `سورة ${exam.surahName} كاملة`
                              : `${exam.surahName} (${exam.fromVerse}-${exam.toVerse})`
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarLucide className="w-4 h-4 text-primary shrink-0" />
                        <span data-testid={`text-exam-date-${exam.id}`}>{formatDate(exam.examDate)}</span>
                      </div>
                      {exam.examTime && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-primary shrink-0" />
                        <span data-testid={`text-exam-time-${exam.id}`}>{exam.examTime}</span>
                      </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1">
                          <Users className="w-3 h-3" />
                          {exam.isForAll ? "جميع الطلاب" : "طلاب محددون"}
                        </Badge>
                      </div>
                      {exam.description && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                          <span data-testid={`text-exam-desc-${exam.id}`}>{exam.description}</span>
                        </div>
                      )}

                      {expandedExamId === exam.id && (
                        <div className="border-t pt-3 mt-3" onClick={e => e.stopPropagation()}>
                          {loadingDetails ? (
                            <div className="flex items-center justify-center py-4" data-testid="status-loading-details">
                              <Loader2 className="w-5 h-5 animate-spin text-primary ml-2" />
                              <span className="text-sm">جاري التحميل...</span>
                            </div>
                          ) : expandedExamData?.students && expandedExamData.students.length > 0 ? (
                            <div className="space-y-3">
                              <h4 className="font-semibold text-sm flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                الطلاب ({expandedExamData.students.length})
                              </h4>
                              {expandedExamData.students.map((es) => (
                                <div
                                  key={es.studentId}
                                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg gap-2"
                                  data-testid={`row-exam-student-${es.studentId}`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                      {getExamStudentName(es.studentId).charAt(0)}
                                    </div>
                                    <span className="text-sm truncate" data-testid={`text-student-name-${es.studentId}`}>
                                      {getExamStudentName(es.studentId)}
                                    </span>
                                    {(isTeacher || isSupervisor) && (() => {
                                      const student = students.find(s => s.id === es.studentId);
                                      return student ? (
                                        <div className="flex items-center gap-0.5">
                                          {student.phone && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={(e) => { e.stopPropagation(); window.open(getWhatsAppUrl(student.phone!), "_blank"); }} title="واتساب الطالب" data-testid={`button-exam-whatsapp-${es.studentId}`}>
                                              <MessageCircle className="w-3 h-3" />
                                            </Button>
                                          )}
                                          {student.parentPhone && (
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); window.open(getWhatsAppUrl(student.parentPhone!), "_blank"); }} title="واتساب ولي الأمر" data-testid={`button-exam-whatsapp-parent-${es.studentId}`}>
                                              <PhoneCall className="w-3 h-3" />
                                            </Button>
                                          )}
                                        </div>
                                      ) : null;
                                    })()}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {es.status === "done" ? (
                                      <Badge className="bg-green-100 text-green-700 border-none" data-testid={`status-graded-${es.studentId}`}>
                                        {es.grade}/100
                                      </Badge>
                                    ) : isTeacher ? (
                                      <div className="flex items-center gap-1">
                                        <Input
                                          data-testid={`input-grade-${es.studentId}`}
                                          type="number"
                                          min={0}
                                          max={100}
                                          className="w-16 h-8 text-sm"
                                          placeholder="الدرجة"
                                          value={gradeValues[es.studentId] || ""}
                                          onChange={e => setGradeValues(prev => ({ ...prev, [es.studentId]: e.target.value }))}
                                        />
                                        <Button
                                          size="sm"
                                          className="h-8 text-xs"
                                          data-testid={`button-grade-${es.studentId}`}
                                          disabled={gradingStudent === es.studentId}
                                          onClick={() => handleGrade(exam.id, es.studentId)}
                                        >
                                          {gradingStudent === es.studentId ? <Loader2 className="w-3 h-3 animate-spin" /> : "حفظ"}
                                        </Button>
                                      </div>
                                    ) : (
                                      <Badge variant="outline" data-testid={`status-pending-${es.studentId}`}>قيد الانتظار</Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-2" data-testid="text-no-exam-students">
                              لا يوجد طلاب مسجلين
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>


        <TabsContent value="external" className="mt-6">
          <ExternalAssignmentsTab />
        </TabsContent>
      </Tabs>

      <Dialog open={!!studentStatsDialog} onOpenChange={(open) => !open && setStudentStatsDialog(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl" data-testid="dialog-student-stats">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              إحصائيات الطالب: {studentStatsDialog ? getAssignStudentName(studentStatsDialog) : ""}
            </DialogTitle>
          </DialogHeader>
          {studentStatsDialog && (() => {
            const rate = studentCompletionRates[studentStatsDialog];
            if (!rate) return <p className="text-sm text-muted-foreground py-4 text-center">لا توجد بيانات</p>;
            const completionPct = rate.total > 0 ? Math.round((rate.done / rate.total) * 100) : 0;
            return (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg text-center" data-testid="stat-student-total">
                    <p className="text-2xl font-bold text-blue-700">{rate.total}</p>
                    <p className="text-xs text-blue-600">إجمالي الواجبات</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-center" data-testid="stat-student-done">
                    <p className="text-2xl font-bold text-green-700">{rate.done}</p>
                    <p className="text-xs text-green-600">مكتملة</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg text-center" data-testid="stat-student-pending">
                    <p className="text-2xl font-bold text-yellow-700">{rate.total - rate.done}</p>
                    <p className="text-xs text-yellow-600">معلقة</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg text-center" data-testid="stat-student-avg-grade">
                    <p className="text-2xl font-bold text-purple-700">{rate.avgGrade || "—"}</p>
                    <p className="text-xs text-purple-600">متوسط الدرجات</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1"><TrendingUp className="w-4 h-4" /> نسبة الإنجاز</span>
                    <span className="font-bold">{completionPct}%</span>
                  </div>
                  <Progress value={completionPct} className="h-3" data-testid="progress-student-completion" />
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== EXTERNAL ASSIGNMENTS TAB ====================
interface ExtAssignment {
  id: string;
  student_id?: string;
  student_name?: string;
  linked_student_name?: string;
  student_avatar?: string;
  book_name: string;
  pages_from?: number;
  pages_to?: number;
  assigned_date: string;
  due_date?: string;
  completion_date?: string;
  status: string;
  notes?: string;
  creator_name?: string;
  is_archived?: boolean;
}

function ExternalAssignmentsTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<ExtAssignment[]>([]);
  const [extStudents, setExtStudents] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editItem, setEditItem] = useState<ExtAssignment | null>(null);
  const [form, setForm] = useState({
    studentId: "", studentName: "", bookName: "", pagesFrom: "", pagesTo: "",
    assignedDate: "", dueDate: "", notes: "",
  });

  // Filters
  const [extSearchTerm, setExtSearchTerm] = useState("");
  const [extFilterStatus, setExtFilterStatus] = useState("all");
  const [extFilterDateFrom, setExtFilterDateFrom] = useState("");
  const [extFilterDateTo, setExtFilterDateTo] = useState("");
  const [extShowArchive, setExtShowArchive] = useState(false);

  // Bulk mode
  const [extBulkMode, setExtBulkMode] = useState(false);
  const [extBulkSelectedStudents, setExtBulkSelectedStudents] = useState<string[]>([]);

  const canEdit = user?.role === "admin" || user?.role === "supervisor" || user?.role === "teacher";

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/external-assignments", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently handle network errors
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await fetch("/api/users?role=student", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setExtStudents(data.map((s: any) => ({ id: s.id, name: s.name })));
      }
    } catch {}
  };

  useEffect(() => { fetchItems(); fetchStudents(); }, []);

  // Computed stats
  const totalExt = items.filter(i => !i.is_archived).length;
  const pendingExt = items.filter(i => i.status !== "done" && !i.is_archived).length;
  const completedExt = items.filter(i => i.status === "done" && !i.is_archived).length;
  const archivedExtCount = items.filter(i => i.is_archived).length;

  // Filtered items
  const filteredExtItems = useMemo(() => {
    return items.filter(item => {
      if ((item.is_archived || false) !== extShowArchive) return false;
      if (extSearchTerm) {
        const name = item.student_name || item.linked_student_name || "";
        if (!name.includes(extSearchTerm) && !item.book_name.includes(extSearchTerm)) return false;
      }
      if (extFilterStatus !== "all" && item.status !== extFilterStatus) return false;
      const itemDate = item.assigned_date?.split("T")[0] || "";
      if (extFilterDateFrom && itemDate < extFilterDateFrom) return false;
      if (extFilterDateTo && itemDate > extFilterDateTo) return false;
      return true;
    });
  }, [items, extShowArchive, extSearchTerm, extFilterStatus, extFilterDateFrom, extFilterDateTo]);

  const extHasActiveFilters = extSearchTerm || extFilterStatus !== "all" || extFilterDateFrom || extFilterDateTo;

  const clearExtFilters = () => {
    setExtSearchTerm("");
    setExtFilterStatus("all");
    setExtFilterDateFrom("");
    setExtFilterDateTo("");
  };

  const openNew = () => {
    setEditItem(null);
    setForm({ studentId: "", studentName: "", bookName: "", pagesFrom: "", pagesTo: "", assignedDate: "", dueDate: "", notes: "" });
    setExtBulkMode(false);
    setExtBulkSelectedStudents([]);
    setDialogOpen(true);
  };

  const openEdit = (item: ExtAssignment) => {
    setEditItem(item);
    setForm({
      studentId: item.student_id || "",
      studentName: item.student_name || "",
      bookName: item.book_name,
      pagesFrom: item.pages_from?.toString() || "",
      pagesTo: item.pages_to?.toString() || "",
      assignedDate: item.assigned_date?.split("T")[0] || "",
      dueDate: item.due_date?.split("T")[0] || "",
      notes: item.notes || "",
    });
    setExtBulkMode(false);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.bookName || !form.assignedDate) {
      toast({ title: "خطأ", description: "اسم الكتاب وتاريخ الواجب مطلوبان", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const baseBody: any = {
        bookName: form.bookName,
        pagesFrom: form.pagesFrom ? parseInt(form.pagesFrom) : null,
        pagesTo: form.pagesTo ? parseInt(form.pagesTo) : null,
        assignedDate: form.assignedDate,
        dueDate: form.dueDate || null,
        notes: form.notes || null,
      };

      if (editItem) {
        // Edit mode
        baseBody.studentId = form.studentId || null;
        baseBody.studentName = form.studentName || null;
        const res = await fetch(`/api/external-assignments/${editItem.id}`, {
          method: "PATCH", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(baseBody),
        });
        if (res.ok) {
          toast({ title: "تم بنجاح", description: "تم تحديث الواجب", className: "bg-green-50 border-green-200 text-green-800" });
          setDialogOpen(false);
          fetchItems();
        } else {
          const err = await res.json();
          toast({ title: "خطأ", description: err.message, variant: "destructive" });
        }
      } else if (extBulkMode && extBulkSelectedStudents.length > 0) {
        // Bulk create
        baseBody.studentIds = extBulkSelectedStudents;
        const res = await fetch("/api/external-assignments", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(baseBody),
        });
        if (res.ok) {
          toast({ title: "تم بنجاح", description: `تمت إضافة ${extBulkSelectedStudents.length} واجب`, className: "bg-green-50 border-green-200 text-green-800" });
          setDialogOpen(false);
          fetchItems();
        } else {
          const err = await res.json();
          toast({ title: "خطأ", description: err.message, variant: "destructive" });
        }
      } else {
        // Single create
        baseBody.studentId = form.studentId || null;
        baseBody.studentName = form.studentName || null;
        const res = await fetch("/api/external-assignments", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(baseBody),
        });
        if (res.ok) {
          toast({ title: "تم بنجاح", description: "تمت إضافة الواجب", className: "bg-green-50 border-green-200 text-green-800" });
          setDialogOpen(false);
          fetchItems();
        } else {
          const err = await res.json();
          toast({ title: "خطأ", description: err.message, variant: "destructive" });
        }
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const markComplete = async (item: ExtAssignment) => {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(`/api/external-assignments/${item.id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done", completionDate: today }),
    });
    if (res.ok) { toast({ title: "تم", description: "تم تحديد الواجب كمكتمل", className: "bg-green-50 border-green-200 text-green-800" }); fetchItems(); }
  };

  const handleArchive = async (item: ExtAssignment) => {
    const res = await fetch(`/api/external-assignments/${item.id}/archive`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: !item.is_archived }),
    });
    if (res.ok) {
      toast({ title: "تم", description: item.is_archived ? "تم استعادة الواجب" : "تم أرشفة الواجب", className: "bg-green-50 border-green-200 text-green-800" });
      fetchItems();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const res = await fetch(`/api/external-assignments/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { toast({ title: "تم الحذف", className: "bg-red-50 border-red-200 text-red-800" }); fetchItems(); }
  };

  const getExtDeadlineInfo = (dueDate?: string, status?: string) => {
    if (status === "done") return { label: "مكتمل", className: "bg-green-100 text-green-700" };
    if (!dueDate) return { label: "معلق", className: "bg-amber-100 text-amber-700" };
    const now = new Date();
    const due = new Date(dueDate);
    if (isBefore(due, now)) return { label: "متأخر", className: "bg-red-100 text-red-700" };
    const diff = differenceInDays(due, now);
    if (isSameDay(due, now)) return { label: "اليوم", className: "bg-yellow-100 text-yellow-700" };
    if (diff <= 3) return { label: `بعد ${diff} ${diff === 1 ? "يوم" : "أيام"}`, className: "bg-yellow-100 text-yellow-700" };
    return { label: "معلق", className: "bg-amber-100 text-amber-700" };
  };

  return (
    <div className="space-y-4" data-testid="external-assignments-tab">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="border-t-4 border-t-blue-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full text-blue-600"><BookOpen className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{totalExt}</p>
              <p className="text-xs text-muted-foreground">إجمالي الواجبات</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-yellow-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-full text-yellow-600"><Clock className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold text-yellow-700">{pendingExt}</p>
              <p className="text-xs text-muted-foreground">واجبات معلقة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-green-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full text-green-600"><CheckCircle2 className="w-5 h-5" /></div>
            <div>
              <p className="text-2xl font-bold text-green-700">{completedExt}</p>
              <p className="text-xs text-muted-foreground">واجبات مكتملة</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header + Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">الواجبات الخارجية ({filteredExtItems.length})</CardTitle>
              <CardDescription>واجبات من الكتب والمراجع خارج القرآن الكريم</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              {canEdit && (
                <>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setExtShowArchive(!extShowArchive)} data-testid="button-ext-toggle-archive">
                    {extShowArchive ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                    {extShowArchive ? "الواجبات الحالية" : `الأرشيف (${archivedExtCount})`}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" data-testid="button-export-ext" onClick={() => {
                    exportJsonToExcel(
                      items.filter(i => !i.is_archived).map(a => ({
                        "الطالب": a.linked_student_name || a.student_name || "—",
                        "الكتاب": a.book_name,
                        "من صفحة": a.pages_from ?? "",
                        "إلى صفحة": a.pages_to ?? "",
                        "تاريخ الواجب": a.assigned_date?.split("T")[0] || "",
                        "الموعد النهائي": a.due_date?.split("T")[0] || "",
                        "الحالة": a.status === "done" ? "مكتمل" : "معلق",
                        "تاريخ الإكمال": a.completion_date?.split("T")[0] || "",
                        "ملاحظات": a.notes || "",
                      })),
                      "ExternalAssignments",
                      "external_assignments_export.xlsx"
                    );
                  }}>
                    <Download className="w-3.5 h-3.5" />
                    تصدير
                  </Button>
                  <Button onClick={openNew} size="sm" className="gap-1" data-testid="button-add-external">
                    <Plus className="w-4 h-4" />
                    إضافة واجب
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 mt-3">
            <div className="relative w-full sm:w-48">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث بالاسم أو الكتاب..." className="pr-8" value={extSearchTerm} onChange={e => setExtSearchTerm(e.target.value)} data-testid="input-ext-search" />
            </div>
            <div className="w-full sm:w-36">
              <Select value={extFilterStatus} onValueChange={setExtFilterStatus}>
                <SelectTrigger data-testid="select-ext-filter-status"><SelectValue placeholder="الحالة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الحالة - الكل</SelectItem>
                  <SelectItem value="pending">معلق</SelectItem>
                  <SelectItem value="done">مكتمل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-36">
              <Label className="text-xs text-muted-foreground mb-1 block">من تاريخ</Label>
              <Input type="date" value={extFilterDateFrom} onChange={e => setExtFilterDateFrom(e.target.value)} data-testid="input-ext-filter-date-from" />
            </div>
            <div className="w-full sm:w-36">
              <Label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</Label>
              <Input type="date" value={extFilterDateTo} onChange={e => setExtFilterDateTo(e.target.value)} data-testid="input-ext-filter-date-to" />
            </div>
            {extHasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearExtFilters} className="gap-1 text-destructive hover:text-destructive" data-testid="button-clear-ext-filters">
                <X className="w-4 h-4" />
                مسح الفلاتر
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : filteredExtItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {extShowArchive ? "لا توجد واجبات مؤرشفة" : items.length === 0 ? "لا توجد واجبات خارجية بعد" : "لا توجد نتائج مطابقة للفلاتر"}
            </div>
          ) : (
            filteredExtItems.map(item => {
              const displayName = item.linked_student_name || item.student_name;
              const deadline = getExtDeadlineInfo(item.due_date, item.status);
              return (
                <div key={item.id} className={`p-4 bg-white rounded-lg shadow-sm border border-slate-100 ${item.status === "done" ? "border-r-4 border-r-green-500" : item.due_date && isBefore(new Date(item.due_date), new Date()) && item.status !== "done" ? "border-r-4 border-r-red-400" : "border-r-4 border-r-amber-400"}`} data-testid={`ext-assignment-${item.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        {item.student_avatar ? (
                          <img src={item.student_avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {displayName && <span className="font-bold text-sm">{displayName}</span>}
                          <span className={`${displayName ? "text-sm text-muted-foreground" : "font-bold text-sm"}`}>{item.book_name}</span>
                          {(item.pages_from || item.pages_to) && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              ص {item.pages_from || "—"} → {item.pages_to || "—"}
                            </span>
                          )}
                          <Badge className={`${deadline.className} border-none text-xs`}>
                            {deadline.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> تاريخ الواجب: {item.assigned_date?.split("T")[0]}</span>
                          {item.due_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> الموعد النهائي: {item.due_date?.split("T")[0]}</span>}
                          {item.completion_date && <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> تم بتاريخ: {item.completion_date?.split("T")[0]}</span>}
                        </div>
                        {item.notes && <p className="text-xs text-muted-foreground border-t pt-1 mt-1">{item.notes}</p>}
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1 shrink-0">
                        {item.status !== "done" && !item.is_archived && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:bg-green-50" onClick={() => markComplete(item)} title="تحديد كمكتمل">
                            <CheckCircle2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => openEdit(item)} title="تعديل">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-muted" onClick={() => handleArchive(item)} title={item.is_archived ? "استعادة" : "أرشفة"}>
                          {item.is_archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => handleDelete(item.id)} title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editItem ? "تعديل واجب خارجي" : "إضافة واجب خارجي"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {/* Bulk mode toggle (only for new) */}
            {!editItem && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <Label className="cursor-pointer flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  واجب جماعي (عدة طلاب)
                </Label>
                <Switch checked={extBulkMode} onCheckedChange={v => { setExtBulkMode(v); setExtBulkSelectedStudents([]); setForm(p => ({ ...p, studentId: "" })); }} data-testid="switch-ext-bulk-mode" />
              </div>
            )}

            {/* Student selection */}
            {extBulkMode && !editItem ? (
              <div className="space-y-1.5">
                <Label>اختر الطلاب ({extBulkSelectedStudents.length} محدد)</Label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {extStudents.map(s => (
                    <label key={s.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                      <Checkbox checked={extBulkSelectedStudents.includes(s.id)} onCheckedChange={c => {
                        setExtBulkSelectedStudents(prev => c ? [...prev, s.id] : prev.filter(x => x !== s.id));
                      }} />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>الطالب (اختياري)</Label>
                <SearchableSelect
                  value={form.studentId}
                  onValueChange={v => setForm(p => ({ ...p, studentId: v, studentName: "" }))}
                  placeholder="اختر الطالب"
                  options={extStudents.map(s => ({ value: s.id, label: s.name }))}
                  data-testid="select-ext-student"
                />
                {!form.studentId && (
                  <Input value={form.studentName} onChange={e => setForm(p => ({ ...p, studentName: e.target.value }))} placeholder="أو اكتب اسم الطالب يدوياً" className="mt-1" data-testid="input-ext-student-name" />
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>اسم الكتاب *</Label>
              <Input value={form.bookName} onChange={e => setForm(p => ({ ...p, bookName: e.target.value }))} placeholder="مثال: متن الآجرومية" data-testid="input-ext-book-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>الصفحة من</Label>
                <Input type="number" value={form.pagesFrom} onChange={e => setForm(p => ({ ...p, pagesFrom: e.target.value }))} placeholder="من" data-testid="input-ext-pages-from" />
              </div>
              <div className="space-y-1.5">
                <Label>الصفحة إلى</Label>
                <Input type="number" value={form.pagesTo} onChange={e => setForm(p => ({ ...p, pagesTo: e.target.value }))} placeholder="إلى" data-testid="input-ext-pages-to" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>تاريخ الواجب *</Label>
                <Input type="date" value={form.assignedDate} onChange={e => setForm(p => ({ ...p, assignedDate: e.target.value }))} data-testid="input-ext-assigned-date" />
              </div>
              <div className="space-y-1.5">
                <Label>الموعد النهائي</Label>
                <Input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} data-testid="input-ext-due-date" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="أي ملاحظات إضافية..." rows={2} data-testid="input-ext-notes" />
            </div>
            <Button onClick={handleSubmit} disabled={submitting || (extBulkMode && !editItem && extBulkSelectedStudents.length === 0)} className="w-full" data-testid="button-submit-external">
              {submitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              {editItem ? "حفظ التعديلات" : extBulkMode ? `إضافة واجب لـ ${extBulkSelectedStudents.length} طالب` : "إضافة الواجب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

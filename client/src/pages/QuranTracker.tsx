import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, RefreshCw, BookOpen, Loader2, Search, Calendar, Award, TrendingUp, Clock, Star, BarChart3, Flame, Target, Map as MapIcon, Bookmark, TreePine, Sparkles, Crown, Medal, Filter, ChevronDown, ChevronUp, SortAsc, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn, formatDateAr } from "@/lib/utils";
import { quranSurahs } from "@shared/quran-surahs";
import { apiGet } from "@/lib/api";

type VerseStatus = "memorized" | "review" | "new";

interface Ayah {
  numberInSurah: number;
  text: string;
}

interface Assignment {
  id: string;
  studentId: string;
  teacherId: string;
  surahName: string;
  fromVerse: number;
  toVerse: number;
  type: string;
  scheduledDate: string;
  status: "pending" | "done" | "cancelled";
  grade: number | null;
  notes: string | null;
  createdAt: string;
}

interface TajweedRule {
  id: string;
  name: string;
  category: string;
  mastered: boolean;
}

const TOTAL_QURAN_VERSES = 6236;
const VERSES_PER_JUZ = 555;
const TOTAL_JUZ = 30;

const surahMeta: Record<number, { revelationType: "مكية" | "مدنية"; meaning: string; juz: number }> = {
  1: { revelationType: "مكية", meaning: "أم الكتاب - افتتاحية القرآن", juz: 1 },
  2: { revelationType: "مدنية", meaning: "أطول سورة - أحكام التشريع", juz: 1 },
  3: { revelationType: "مدنية", meaning: "التوحيد وغزوة أحد", juz: 3 },
  4: { revelationType: "مدنية", meaning: "أحكام النساء والأسرة", juz: 4 },
  5: { revelationType: "مدنية", meaning: "الوفاء بالعقود", juz: 6 },
  6: { revelationType: "مكية", meaning: "التوحيد والعقيدة", juz: 7 },
  7: { revelationType: "مكية", meaning: "قصص الأنبياء والأمم", juz: 8 },
  8: { revelationType: "مدنية", meaning: "أحكام الجهاد وغزوة بدر", juz: 9 },
  9: { revelationType: "مدنية", meaning: "التوبة والبراءة", juz: 10 },
  10: { revelationType: "مكية", meaning: "قصة يونس عليه السلام", juz: 11 },
  11: { revelationType: "مكية", meaning: "قصص الأنبياء والدعوة", juz: 11 },
  12: { revelationType: "مكية", meaning: "أحسن القصص - يوسف عليه السلام", juz: 12 },
  13: { revelationType: "مدنية", meaning: "آيات الله في الكون", juz: 13 },
  14: { revelationType: "مكية", meaning: "دعوة إبراهيم عليه السلام", juz: 13 },
  15: { revelationType: "مكية", meaning: "حفظ القرآن والذكر", juz: 14 },
  16: { revelationType: "مكية", meaning: "نعم الله على الإنسان", juz: 14 },
  17: { revelationType: "مكية", meaning: "رحلة الإسراء والمعراج", juz: 15 },
  18: { revelationType: "مكية", meaning: "أصحاب الكهف والعبر", juz: 15 },
  19: { revelationType: "مكية", meaning: "مريم عليها السلام", juz: 16 },
  20: { revelationType: "مكية", meaning: "قصة موسى عليه السلام", juz: 16 },
  21: { revelationType: "مكية", meaning: "قصص الأنبياء ودعوتهم", juz: 17 },
  22: { revelationType: "مدنية", meaning: "مناسك الحج", juz: 17 },
  23: { revelationType: "مكية", meaning: "صفات المؤمنين", juz: 18 },
  24: { revelationType: "مدنية", meaning: "آداب المجتمع والنور", juz: 18 },
  25: { revelationType: "مكية", meaning: "الفرقان بين الحق والباطل", juz: 18 },
  26: { revelationType: "مكية", meaning: "قصص الأنبياء مع أقوامهم", juz: 19 },
  27: { revelationType: "مكية", meaning: "قصة سليمان وملكة سبأ", juz: 19 },
  28: { revelationType: "مكية", meaning: "قصة موسى وفرعون", juz: 20 },
  29: { revelationType: "مكية", meaning: "الابتلاء والصبر", juz: 20 },
  30: { revelationType: "مكية", meaning: "آيات الله في الخلق", juz: 21 },
  31: { revelationType: "مكية", meaning: "وصايا لقمان الحكيم", juz: 21 },
  32: { revelationType: "مكية", meaning: "السجود لله تعالى", juz: 21 },
  33: { revelationType: "مدنية", meaning: "غزوة الأحزاب والأحكام", juz: 21 },
  34: { revelationType: "مكية", meaning: "قصة سبأ ونعم الله", juz: 22 },
  35: { revelationType: "مكية", meaning: "الحمد لله فاطر السماوات", juz: 22 },
  36: { revelationType: "مكية", meaning: "قلب القرآن", juz: 22 },
  37: { revelationType: "مكية", meaning: "الملائكة الصافات", juz: 23 },
  38: { revelationType: "مكية", meaning: "قصة داود وسليمان", juz: 23 },
  39: { revelationType: "مكية", meaning: "الإخلاص في العبادة", juz: 23 },
  40: { revelationType: "مكية", meaning: "قصة مؤمن آل فرعون", juz: 24 },
  41: { revelationType: "مكية", meaning: "تفصيل آيات القرآن", juz: 24 },
  42: { revelationType: "مكية", meaning: "الشورى في الإسلام", juz: 25 },
  43: { revelationType: "مكية", meaning: "زخرف الدنيا الزائل", juz: 25 },
  44: { revelationType: "مكية", meaning: "يوم القيامة والدخان", juz: 25 },
  45: { revelationType: "مكية", meaning: "الجثو يوم الحساب", juz: 25 },
  46: { revelationType: "مكية", meaning: "بر الوالدين والإيمان", juz: 26 },
  47: { revelationType: "مدنية", meaning: "القتال في سبيل الله", juz: 26 },
  48: { revelationType: "مدنية", meaning: "فتح مكة والنصر", juz: 26 },
  49: { revelationType: "مدنية", meaning: "آداب التعامل والأخلاق", juz: 26 },
  50: { revelationType: "مكية", meaning: "البعث والنشور", juz: 26 },
  51: { revelationType: "مكية", meaning: "آيات الله في الرياح", juz: 26 },
  52: { revelationType: "مكية", meaning: "الطور وعذاب الكافرين", juz: 27 },
  53: { revelationType: "مكية", meaning: "النجم والوحي", juz: 27 },
  54: { revelationType: "مكية", meaning: "القمر ويوم القيامة", juz: 27 },
  55: { revelationType: "مدنية", meaning: "نعم الله الرحمن", juz: 27 },
  56: { revelationType: "مكية", meaning: "أهوال يوم القيامة", juz: 27 },
  57: { revelationType: "مدنية", meaning: "الإنفاق في سبيل الله", juz: 27 },
  58: { revelationType: "مدنية", meaning: "المجادلة وأحكامها", juz: 28 },
  59: { revelationType: "مدنية", meaning: "إجلاء بني النضير", juz: 28 },
  60: { revelationType: "مدنية", meaning: "الولاء والبراء", juz: 28 },
  61: { revelationType: "مدنية", meaning: "الجهاد والنصر", juz: 28 },
  62: { revelationType: "مدنية", meaning: "صلاة الجمعة", juz: 28 },
  63: { revelationType: "مدنية", meaning: "صفات المنافقين", juz: 28 },
  64: { revelationType: "مدنية", meaning: "التغابن يوم القيامة", juz: 28 },
  65: { revelationType: "مدنية", meaning: "أحكام الطلاق", juz: 28 },
  66: { revelationType: "مدنية", meaning: "تحريم الحلال", juz: 28 },
  67: { revelationType: "مكية", meaning: "ملك الله للكون", juz: 29 },
  68: { revelationType: "مكية", meaning: "القلم والأخلاق", juz: 29 },
  69: { revelationType: "مكية", meaning: "الحاقة ويوم القيامة", juz: 29 },
  70: { revelationType: "مكية", meaning: "المعارج والعذاب", juz: 29 },
  71: { revelationType: "مكية", meaning: "دعوة نوح عليه السلام", juz: 29 },
  72: { revelationType: "مكية", meaning: "إسلام الجن", juz: 29 },
  73: { revelationType: "مكية", meaning: "قيام الليل", juz: 29 },
  74: { revelationType: "مكية", meaning: "النبوة والإنذار", juz: 29 },
  75: { revelationType: "مكية", meaning: "يوم القيامة والبعث", juz: 29 },
  76: { revelationType: "مدنية", meaning: "جزاء الأبرار", juz: 29 },
  77: { revelationType: "مكية", meaning: "الرياح المرسلات", juz: 29 },
  78: { revelationType: "مكية", meaning: "يوم النبأ العظيم", juz: 30 },
  79: { revelationType: "مكية", meaning: "الملائكة النازعات", juz: 30 },
  80: { revelationType: "مكية", meaning: "عبس وتولى", juz: 30 },
  81: { revelationType: "مكية", meaning: "أهوال يوم القيامة", juz: 30 },
  82: { revelationType: "مكية", meaning: "انفطار السماء", juz: 30 },
  83: { revelationType: "مكية", meaning: "التطفيف في الميزان", juz: 30 },
  84: { revelationType: "مكية", meaning: "انشقاق السماء", juz: 30 },
  85: { revelationType: "مكية", meaning: "أصحاب الأخدود", juz: 30 },
  86: { revelationType: "مكية", meaning: "النجم الطارق", juz: 30 },
  87: { revelationType: "مكية", meaning: "تسبيح الله الأعلى", juz: 30 },
  88: { revelationType: "مكية", meaning: "أهوال الغاشية", juz: 30 },
  89: { revelationType: "مكية", meaning: "الفجر ونعم الله", juz: 30 },
  90: { revelationType: "مكية", meaning: "البلد والعقبة", juz: 30 },
  91: { revelationType: "مكية", meaning: "الشمس وضحاها", juz: 30 },
  92: { revelationType: "مكية", meaning: "الليل والنهار", juz: 30 },
  93: { revelationType: "مكية", meaning: "الضحى ونعم الله", juz: 30 },
  94: { revelationType: "مكية", meaning: "شرح الصدر", juz: 30 },
  95: { revelationType: "مكية", meaning: "أحسن تقويم", juz: 30 },
  96: { revelationType: "مكية", meaning: "أول ما نزل - اقرأ", juz: 30 },
  97: { revelationType: "مكية", meaning: "ليلة القدر", juz: 30 },
  98: { revelationType: "مدنية", meaning: "البينة والحجة", juz: 30 },
  99: { revelationType: "مدنية", meaning: "زلزلة الأرض", juz: 30 },
  100: { revelationType: "مكية", meaning: "العاديات والخيل", juz: 30 },
  101: { revelationType: "مكية", meaning: "القارعة العظمى", juz: 30 },
  102: { revelationType: "مكية", meaning: "التكاثر في الدنيا", juz: 30 },
  103: { revelationType: "مكية", meaning: "العصر والخسران", juz: 30 },
  104: { revelationType: "مكية", meaning: "الهمز واللمز", juz: 30 },
  105: { revelationType: "مكية", meaning: "أصحاب الفيل", juz: 30 },
  106: { revelationType: "مكية", meaning: "إيلاف قريش", juz: 30 },
  107: { revelationType: "مكية", meaning: "الماعون والصلاة", juz: 30 },
  108: { revelationType: "مكية", meaning: "الكوثر والنحر", juz: 30 },
  109: { revelationType: "مكية", meaning: "البراءة من الشرك", juz: 30 },
  110: { revelationType: "مدنية", meaning: "نصر الله والفتح", juz: 30 },
  111: { revelationType: "مكية", meaning: "هلاك أبي لهب", juz: 30 },
  112: { revelationType: "مكية", meaning: "التوحيد الخالص", juz: 30 },
  113: { revelationType: "مكية", meaning: "الاستعاذة من الشرور", juz: 30 },
  114: { revelationType: "مكية", meaning: "الاستعاذة من الوسواس", juz: 30 },
};

const defaultTajweedRules: TajweedRule[] = [
  { id: "idgham_bighunnah", name: "إدغام بغنة (ينمو)", category: "إدغام", mastered: false },
  { id: "idgham_bilaghunnah", name: "إدغام بلا غنة (لر)", category: "إدغام", mastered: false },
  { id: "idgham_shafawi", name: "إدغام شفوي", category: "إدغام", mastered: false },
  { id: "ikhfa_haqiqi", name: "إخفاء حقيقي", category: "إخفاء", mastered: false },
  { id: "ikhfa_shafawi", name: "إخفاء شفوي", category: "إخفاء", mastered: false },
  { id: "iqlab", name: "إقلاب (الباء)", category: "إقلاب", mastered: false },
  { id: "madd_tabii", name: "مد طبيعي (حركتان)", category: "مد", mastered: false },
  { id: "madd_muttasil", name: "مد متصل (4-5 حركات)", category: "مد", mastered: false },
  { id: "madd_munfasil", name: "مد منفصل (4-5 حركات)", category: "مد", mastered: false },
  { id: "madd_lazim", name: "مد لازم (6 حركات)", category: "مد", mastered: false },
  { id: "madd_arid", name: "مد عارض للسكون", category: "مد", mastered: false },
  { id: "ghunnah_mushaddadah", name: "غنة مشددة (نّ / مّ)", category: "غنة", mastered: false },
  { id: "ghunnah_idgham", name: "غنة في الإدغام", category: "غنة", mastered: false },
  { id: "ghunnah_ikhfa", name: "غنة في الإخفاء", category: "غنة", mastered: false },
];

const milestones = [
  { juz: 1, label: "١ جزء", icon: "🥉", color: "from-amber-600 to-amber-700", name: "البرونزية" },
  { juz: 5, label: "٥ أجزاء", icon: "🥈", color: "from-slate-400 to-slate-500", name: "الفضية" },
  { juz: 10, label: "١٠ أجزاء", icon: "🥇", color: "from-yellow-500 to-yellow-600", name: "الذهبية" },
  { juz: 15, label: "١٥ جزء", icon: "💎", color: "from-cyan-400 to-blue-500", name: "الماسية" },
  { juz: 30, label: "٣٠ جزء", icon: "👑", color: "from-purple-500 to-pink-500", name: "التاج البلاتيني" },
];

function CircularProgress({ percentage, size = 120, strokeWidth = 10 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-emerald-600">{percentage}%</span>
        <span className="text-[10px] text-muted-foreground">مكتمل</span>
      </div>
    </div>
  );
}

function calculateStreak(assignments: Assignment[]): number {
  const doneAssignments = assignments.filter(a => a.status === "done");
  if (doneAssignments.length === 0) return 0;

  const uniqueDays = new Set(
    doneAssignments.map(a => {
      const d = new Date(a.scheduledDate);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  const sortedDays = Array.from(uniqueDays).sort().reverse();
  if (sortedDays.length === 0) return 0;

  let streak = 1;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

  if (sortedDays[0] !== todayKey && sortedDays[0] !== yesterdayKey) return 0;

  for (let i = 1; i < sortedDays.length; i++) {
    const [y1, m1, d1] = sortedDays[i - 1].split("-").map(Number);
    const [y2, m2, d2] = sortedDays[i].split("-").map(Number);
    const date1 = new Date(y1, m1, d1);
    const date2 = new Date(y2, m2, d2);
    const diff = (date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
    if (Math.abs(diff - 1) < 0.1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default function QuranTracker() {
  const { user } = useAuth();
  const [selectedSurah, setSelectedSurah] = useState("1");
  const [verses, setVerses] = useState<Ayah[]>([]);
  const [verseStatuses, setVerseStatuses] = useState<Record<number, VerseStatus>>({});
  const [selectedVerse, setSelectedVerse] = useState<Ayah | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Map<number, Ayah[]>>(new Map());
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [surahSearch, setSurahSearch] = useState("");
  const [activeTab, setActiveTab] = useState("mushaf");

  const [titlesOpen, setTitlesOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [juzFilter, setJuzFilter] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("number");
  const [showFilters, setShowFilters] = useState(false);

  const [reviewedToday, setReviewedToday] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem(`mutqin_review_${new Date().toDateString()}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [reviewStreak, setReviewStreak] = useState<number>(() => {
    try {
      const stored = localStorage.getItem("mutqin_review_streak");
      return stored ? JSON.parse(stored) : 0;
    } catch { return 0; }
  });

  const [tajweedRules, setTajweedRules] = useState<TajweedRule[]>(() => {
    try {
      const stored = localStorage.getItem(`mutqin_tajweed_${user?.id ?? "guest"}`);
      return stored ? JSON.parse(stored) : defaultTajweedRules;
    } catch { return defaultTajweedRules; }
  });

  const [surahNotes, setSurahNotes] = useState<Record<number, string>>(() => {
    try {
      const stored = localStorage.getItem(`mutqin_surah_notes_${user?.id ?? "guest"}`);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const [surahDetailOpen, setSurahDetailOpen] = useState(false);
  const [detailSurahNum, setDetailSurahNum] = useState<number>(1);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [titles, setTitles] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const surahNumber = parseInt(selectedSurah);
  const currentSurah = quranSurahs.find(s => s.number === surahNumber);

  useEffect(() => {
    if (user?.id) {
      setLoadingTimeline(true);
      Promise.all([
        apiGet(`/api/student-timeline/${user.id}`),
        apiGet(`/api/student-titles/${user.id}`),
        user.role === "student" ? apiGet("/api/student-challenges") : Promise.resolve([])
      ]).then(([timelineData, titlesData, challengesData]) => {
        setTimeline(timelineData);
        setTitles(titlesData);
        setChallenges(challengesData);
      }).catch(err => {
        console.error("Error fetching achievements:", err);
      }).finally(() => {
        setLoadingTimeline(false);
      });
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    async function fetchAssignments() {
      try {
        const data = await apiGet("/api/assignments");
        setAssignments(Array.isArray(data) ? data : []);
      } catch {
        setAssignments([]);
      } finally {
        setAssignmentsLoading(false);
      }
    }
    fetchAssignments();
  }, []);

  const surahAssignmentMap = useMemo(() => {
    const map: Record<string, { total: number; done: number; versesMemorized: Set<number> }> = {};
    for (const a of assignments) {
      if (a.status === "cancelled") continue;
      if (!map[a.surahName]) {
        map[a.surahName] = { total: 0, done: 0, versesMemorized: new Set() };
      }
      map[a.surahName].total++;
      if (a.status === "done") {
        map[a.surahName].done++;
        for (let v = a.fromVerse; v <= a.toVerse; v++) {
          map[a.surahName].versesMemorized.add(v);
        }
      }
    }
    return map;
  }, [assignments]);

  const overallStats = useMemo(() => {
    let totalMemorized = 0;
    for (const surah of quranSurahs) {
      const entry = surahAssignmentMap[surah.name];
      if (entry) {
        totalMemorized += entry.versesMemorized.size;
      }
    }
    const completedAssignments = assignments.filter(a => a.status === "done").length;
    const streak = calculateStreak(assignments);
    const percentage = TOTAL_QURAN_VERSES > 0 ? Math.round((totalMemorized / TOTAL_QURAN_VERSES) * 100) : 0;
    const juzMemorized = Math.floor(totalMemorized / VERSES_PER_JUZ);

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weeklyDone = assignments.filter(a => {
      if (a.status !== "done") return false;
      const d = new Date(a.scheduledDate);
      return d >= weekStart;
    });
    let weeklyVerses = 0;
    for (const a of weeklyDone) {
      weeklyVerses += (a.toVerse - a.fromVerse + 1);
    }

    const halfQuranJuz = 15;
    let nextMilestoneText = "";
    if (juzMemorized < 1) {
      nextMilestoneText = `${VERSES_PER_JUZ - totalMemorized} آية للجزء الأول`;
    } else if (juzMemorized < halfQuranJuz) {
      const remaining = halfQuranJuz - juzMemorized;
      nextMilestoneText = `${remaining} أجزاء للوصول إلى نصف القرآن`;
    } else if (juzMemorized < TOTAL_JUZ) {
      const remaining = TOTAL_JUZ - juzMemorized;
      nextMilestoneText = `${remaining} أجزاء لختم القرآن`;
    } else {
      nextMilestoneText = "ما شاء الله! أتممت حفظ القرآن";
    }

    return { totalMemorized, percentage, completedAssignments, streak, juzMemorized, weeklyVerses, nextMilestoneText };
  }, [assignments, surahAssignmentMap]);

  const recentAssignments = useMemo(() => {
    return [...assignments]
      .filter(a => a.status !== "cancelled")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [assignments]);

  const upcomingAssignments = useMemo(() => {
    const now = new Date();
    return [...assignments]
      .filter(a => a.status === "pending" && new Date(a.scheduledDate) >= now)
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
      .slice(0, 10);
  }, [assignments]);

  const memorizedSurahsForReview = useMemo(() => {
    const memorized: typeof quranSurahs = [];
    for (const surah of quranSurahs) {
      const entry = surahAssignmentMap[surah.name];
      if (entry && entry.versesMemorized.size > 0) {
        memorized.push(surah);
      }
    }
    const shuffled = [...memorized].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 5);
  }, [surahAssignmentMap]);

  const filteredSurahs = useMemo(() => {
    let result = [...quranSurahs];

    if (surahSearch.trim()) {
      const q = surahSearch.trim().toLowerCase();
      result = result.filter(s =>
        s.name.includes(q) || String(s.number).includes(q)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter(s => {
        const status = getSurahStatusStatic(s);
        if (statusFilter === "memorized") return status === "memorized";
        if (statusFilter === "in_progress") return status === "in_progress";
        if (statusFilter === "not_started") return status === "not_started";
        return true;
      });
    }

    if (juzFilter !== "all") {
      const juzNum = parseInt(juzFilter);
      result = result.filter(s => {
        const meta = surahMeta[s.number];
        return meta && meta.juz === juzNum;
      });
    }

    if (sortOption === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name, "ar"));
    } else if (sortOption === "progress") {
      result.sort((a, b) => getSurahProgressStatic(b) - getSurahProgressStatic(a));
    } else {
      result.sort((a, b) => a.number - b.number);
    }

    return result;
  }, [surahSearch, statusFilter, juzFilter, sortOption, surahAssignmentMap]);

  function getSurahStatusStatic(surah: typeof quranSurahs[0]) {
    const entry = surahAssignmentMap[surah.name];
    if (!entry || entry.total === 0) return "not_started";
    if (entry.versesMemorized.size >= surah.versesCount) return "memorized";
    return "in_progress";
  }

  function getSurahProgressStatic(surah: typeof quranSurahs[0]) {
    const entry = surahAssignmentMap[surah.name];
    if (!entry) return 0;
    return Math.min(100, Math.round((entry.versesMemorized.size / surah.versesCount) * 100));
  }

  const getStorageKey = useCallback((surahNum: number) => {
    return `mutqin_quran_status_${user?.id ?? "guest"}_${surahNum}`;
  }, [user?.id]);

  const loadStatuses = useCallback((surahNum: number): Record<number, VerseStatus> => {
    try {
      const stored = localStorage.getItem(getStorageKey(surahNum));
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  }, [getStorageKey]);

  const saveStatuses = useCallback((surahNum: number, statuses: Record<number, VerseStatus>) => {
    try {
      localStorage.setItem(getStorageKey(surahNum), JSON.stringify(statuses));
    } catch {}
  }, [getStorageKey]);

  const fetchSurah = useCallback(async (surahNum: number) => {
    if (cache.current.has(surahNum)) {
      setVerses(cache.current.get(surahNum)!);
      setVerseStatuses(loadStatuses(surahNum));
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`);
      if (!res.ok) throw new Error("فشل في تحميل السورة");
      const json = await res.json();
      const ayahs: Ayah[] = json.data.ayahs.map((a: any) => ({
        numberInSurah: a.numberInSurah,
        text: a.text,
      }));
      cache.current.set(surahNum, ayahs);
      setVerses(ayahs);
      setVerseStatuses(loadStatuses(surahNum));
    } catch (e: any) {
      setError(e.message || "حدث خطأ غير متوقع");
      setVerses([]);
    } finally {
      setLoading(false);
    }
  }, [loadStatuses]);

  useEffect(() => {
    fetchSurah(surahNumber);
  }, [surahNumber, fetchSurah]);

  const handleVerseClick = (verse: Ayah) => {
    setSelectedVerse(verse);
    setDialogOpen(true);
  };

  const updateVerseStatus = (verseNum: number, status: VerseStatus) => {
    const updated = { ...verseStatuses, [verseNum]: status };
    setVerseStatuses(updated);
    saveStatuses(surahNumber, updated);
    setDialogOpen(false);
  };

  const getStatus = (verseNum: number): VerseStatus => {
    return verseStatuses[verseNum] || "new";
  };

  const memorizedCount = verses.filter(v => getStatus(v.numberInSurah) === "memorized").length;
  const reviewCount = verses.filter(v => getStatus(v.numberInSurah) === "review").length;
  const newCount = verses.length - memorizedCount - reviewCount;
  const progressPercent = verses.length > 0 ? Math.round((memorizedCount / verses.length) * 100) : 0;

  const getSurahStatus = (surah: typeof quranSurahs[0]) => {
    const entry = surahAssignmentMap[surah.name];
    if (!entry || entry.total === 0) return "not_started";
    if (entry.versesMemorized.size >= surah.versesCount) return "memorized";
    return "in_progress";
  };

  const getSurahProgress = (surah: typeof quranSurahs[0]) => {
    const entry = surahAssignmentMap[surah.name];
    if (!entry) return 0;
    return Math.min(100, Math.round((entry.versesMemorized.size / surah.versesCount) * 100));
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return formatDateAr(d);
    } catch {
      return dateStr;
    }
  };

  const handleReviewSurah = (surahNum: number) => {
    const updated = new Set(reviewedToday);
    updated.add(surahNum);
    setReviewedToday(updated);
    localStorage.setItem(`mutqin_review_${new Date().toDateString()}`, JSON.stringify(Array.from(updated)));

    if (updated.size >= memorizedSurahsForReview.length && memorizedSurahsForReview.length > 0) {
      const newStreak = reviewStreak + 1;
      setReviewStreak(newStreak);
      localStorage.setItem("mutqin_review_streak", JSON.stringify(newStreak));
    }
  };

  const handleTajweedToggle = (ruleId: string) => {
    const updated = tajweedRules.map(r => r.id === ruleId ? { ...r, mastered: !r.mastered } : r);
    setTajweedRules(updated);
    localStorage.setItem(`mutqin_tajweed_${user?.id ?? "guest"}`, JSON.stringify(updated));
  };

  const tajweedCategories = useMemo(() => {
    const cats: Record<string, { total: number; mastered: number; rules: TajweedRule[] }> = {};
    for (const rule of tajweedRules) {
      if (!cats[rule.category]) cats[rule.category] = { total: 0, mastered: 0, rules: [] };
      cats[rule.category].total++;
      if (rule.mastered) cats[rule.category].mastered++;
      cats[rule.category].rules.push(rule);
    }
    return cats;
  }, [tajweedRules]);

  const handleSaveSurahNote = (surahNum: number, note: string) => {
    const updated = { ...surahNotes, [surahNum]: note };
    setSurahNotes(updated);
    localStorage.setItem(`mutqin_surah_notes_${user?.id ?? "guest"}`, JSON.stringify(updated));
  };

  const weeklyGoal = 35;
  const monthlyGoal = 150;
  const monthlyDone = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let count = 0;
    for (const a of assignments) {
      if (a.status !== "done") continue;
      const d = new Date(a.scheduledDate);
      if (d >= monthStart) count += (a.toVerse - a.fromVerse + 1);
    }
    return count;
  }, [assignments]);

  const timelineIcons: Record<string, any> = {
    new_surah: BookOpen,
    excellent_grade: Star,
    badge: Award,
    streak: Flame,
    milestone: Trophy,
  };

  const getTimelineIcon = (type: string) => {
    return timelineIcons[type] || Target;
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto" data-testid="quran-tracker-page" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="page-title">المصحف التفاعلي</h1>
          <p className="text-muted-foreground">تتبع حفظك آية بآية</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4" data-testid="overall-stats">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200/50 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-2">
            <div className="hidden sm:block">
              <CircularProgress percentage={overallStats.percentage} size={90} strokeWidth={8} />
            </div>
            <div className="sm:hidden">
              <CircularProgress percentage={overallStats.percentage} size={70} strokeWidth={6} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground" data-testid="stat-overall-label">إجمالي الحفظ</p>
              <p className="text-sm font-bold text-emerald-700" data-testid="stat-overall-value">
                {overallStats.totalMemorized} / {TOTAL_QURAN_VERSES}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200/50 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Flame className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-700" data-testid="stat-streak">{overallStats.streak}</p>
              <p className="text-xs text-muted-foreground">سلسلة الإنجاز 🔥</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700" data-testid="stat-juz-memorized">{overallStats.juzMemorized}</p>
              <p className="text-xs text-muted-foreground">أجزاء محفوظة</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/50 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700" data-testid="stat-weekly-verses">{overallStats.weeklyVerses}</p>
              <p className="text-xs text-muted-foreground">آيات هذا الأسبوع</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20" data-testid="next-milestone-card">
        <CardContent className="p-3 flex items-center gap-3">
          <Target className="w-5 h-5 text-primary shrink-0" />
          <p className="text-sm font-medium text-primary" data-testid="next-milestone-text">
            الهدف القادم: {overallStats.nextMilestoneText}
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1" data-testid="milestones-bar">
        {milestones.map((m) => {
          const earned = overallStats.juzMemorized >= m.juz;
          return (
            <div
              key={m.juz}
              data-testid={`milestone-${m.juz}`}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg border min-w-[80px] text-center transition-all",
                earned
                  ? `bg-gradient-to-br ${m.color} text-white border-transparent shadow-md`
                  : "bg-muted/30 border-muted text-muted-foreground opacity-50"
              )}
            >
              <span className="text-2xl">{m.icon}</span>
              <span className="text-[10px] font-bold">{m.name}</span>
              <span className="text-[9px]">{m.label}</span>
            </div>
          );
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="h-11">
          <TabsTrigger value="mushaf" className="gap-1 text-[10px] sm:text-sm" data-testid="tab-mushaf">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">المصحف</span>
          </TabsTrigger>
          <TabsTrigger value="tree" className="gap-1 text-[10px] sm:text-sm" data-testid="tab-tree">
            <TreePine className="w-4 h-4" />
            <span className="hidden sm:inline">شجرة الحفظ</span>
          </TabsTrigger>
          <TabsTrigger value="plan" className="gap-1 text-[10px] sm:text-sm" data-testid="tab-plan">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">خطة الحفظ</span>
          </TabsTrigger>
          <TabsTrigger value="tajweed" className="gap-1 text-[10px] sm:text-sm" data-testid="tab-tajweed">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">التجويد</span>
          </TabsTrigger>
          <TabsTrigger value="surah-map" className="gap-1 text-[10px] sm:text-sm" data-testid="tab-surah-map">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">خريطة السور</span>
          </TabsTrigger>
          <TabsTrigger value="heatmap" data-testid="tab-heatmap" className="gap-1.5 text-[10px] sm:text-sm">
            <MapIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">الخريطة الحرارية</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1 text-[10px] sm:text-sm" data-testid="tab-activity">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">النشاط</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="gap-1 text-[10px] sm:text-sm" data-testid="tab-achievements">
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">الإنجازات</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mushaf" className="mt-4 space-y-4">
          {memorizedSurahsForReview.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50" data-testid="daily-review-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-amber-600" />
                  مراجعة اليوم
                  <Badge variant="outline" className="mr-auto text-[10px]">
                    <Flame className="w-3 h-3 ml-1" />
                    سلسلة المراجعة: {reviewStreak} يوم
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2" data-testid="review-surahs">
                  {memorizedSurahsForReview.map((surah) => {
                    const reviewed = reviewedToday.has(surah.number);
                    return (
                      <Button
                        key={surah.number}
                        variant={reviewed ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "text-xs gap-1.5",
                          reviewed ? "bg-emerald-600 hover:bg-emerald-700" : "border-amber-300 hover:bg-amber-100"
                        )}
                        onClick={() => handleReviewSurah(surah.number)}
                        data-testid={`review-surah-${surah.number}`}
                      >
                        {reviewed && <CheckCircle className="w-3 h-3" />}
                        {surah.name}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  تمت المراجعة: {reviewedToday.size} / {memorizedSurahsForReview.length}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-2 mb-4">
            <Select value={selectedSurah} onValueChange={setSelectedSurah} data-testid="surah-select">
              <SelectTrigger className="w-[220px]" data-testid="surah-select-trigger">
                <SelectValue placeholder="اختر السورة" />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-[300px]">
                  {quranSurahs.map((s) => (
                    <SelectItem key={s.number} value={String(s.number)} data-testid={`surah-option-${s.number}`}>
                      {s.number}. {s.name}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-3 shadow-lg border-primary/20 bg-[#fffdf5]" data-testid="quran-card">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <CardTitle className="font-serif text-xl md:text-2xl text-primary flex items-center gap-2" data-testid="surah-title">
                    <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
                    سورة {currentSurah?.name ?? ""}
                  </CardTitle>
                  <div className="flex gap-2">
                    <div className="flex flex-wrap gap-2 text-xs items-center ml-4">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> تم الحفظ</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500"></span> مراجعة</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-300"></span> جديد</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-8 min-h-[300px] md:min-h-[500px]">
                {loading ? (
                  <div className="flex items-center justify-center h-[400px]" data-testid="loading-spinner">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center h-[400px] gap-4" data-testid="error-message">
                    <p className="text-destructive text-lg">{error}</p>
                    <Button variant="outline" onClick={() => fetchSurah(surahNumber)} data-testid="retry-button">
                      <RefreshCw className="w-4 h-4 ml-2" />
                      إعادة المحاولة
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 md:space-y-6 font-serif text-xl md:text-3xl leading-[2] md:leading-[2.5]" dir="rtl" data-testid="verses-container">
                    {verses.map((verse) => {
                      const status = getStatus(verse.numberInSurah);
                      return (
                        <span
                          key={verse.numberInSurah}
                          onClick={() => handleVerseClick(verse)}
                          data-testid={`verse-${verse.numberInSurah}`}
                          className={cn(
                            "inline cursor-pointer px-1 rounded transition-colors duration-200 border-b-2 border-transparent",
                            status === "memorized" ? "text-emerald-900 bg-emerald-50/50 hover:bg-emerald-100" :
                            status === "review" ? "text-amber-900 bg-amber-50/50 hover:bg-amber-100" :
                            "hover:bg-slate-100"
                          )}
                        >
                          {verse.text}
                          {" "}
                          <span className="inline-flex items-center justify-center w-8 h-8 mr-1 text-sm border border-primary/30 rounded-full text-primary/70 font-sans bg-white">
                            {verse.numberInSurah}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card data-testid="surah-stats-card">
                <CardHeader>
                  <CardTitle className="text-lg">إحصائيات السورة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>نسبة الحفظ</span>
                      <span data-testid="progress-percent">{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" data-testid="progress-bar" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="p-2 bg-emerald-50 rounded text-emerald-700" data-testid="stat-memorized">
                      <span className="block font-bold text-lg">{memorizedCount}</span>
                      محفوظة
                    </div>
                    <div className="p-2 bg-amber-50 rounded text-amber-700" data-testid="stat-review">
                      <span className="block font-bold text-lg">{reviewCount}</span>
                      مراجعة
                    </div>
                    <div className="p-2 bg-slate-50 rounded text-slate-700" data-testid="stat-new">
                      <span className="block font-bold text-lg">{newCount}</span>
                      جديد
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground text-center pt-2" data-testid="stat-total">
                    إجمالي الآيات: {verses.length}
                  </div>

                  {currentSurah && surahMeta[currentSurah.number] && (
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">نوع النزول</span>
                        <Badge variant="outline" className="text-[10px]" data-testid="revelation-type">
                          {surahMeta[currentSurah.number].revelationType}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">الجزء</span>
                        <Badge variant="outline" className="text-[10px]" data-testid="surah-juz">
                          {surahMeta[currentSurah.number].juz}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground italic" data-testid="surah-meaning">
                        {surahMeta[currentSurah.number].meaning}
                      </p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs gap-1"
                    onClick={() => {
                      setDetailSurahNum(surahNumber);
                      setSurahDetailOpen(true);
                    }}
                    data-testid="btn-surah-details"
                  >
                    <Bookmark className="w-3 h-3" />
                    تفاصيل السورة والملاحظات
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tree" className="mt-4">
          <Card data-testid="memorization-tree-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TreePine className="w-5 h-5" />
                شجرة الحفظ
              </CardTitle>
              <div className="flex flex-wrap gap-4 text-xs mt-2">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500"></span> تم الحفظ</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400"></span> قيد التقدم</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-200"></span> لم يبدأ</span>
              </div>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))" }}
                  data-testid="tree-grid"
                >
                  {quranSurahs.map((surah) => {
                    const status = getSurahStatus(surah);
                    const progress = getSurahProgress(surah);
                    const meta = surahMeta[surah.number];
                    return (
                      <button
                        key={surah.number}
                        onClick={() => {
                          setSelectedSurah(String(surah.number));
                          setActiveTab("mushaf");
                        }}
                        data-testid={`tree-surah-${surah.number}`}
                        className={cn(
                          "relative p-3 rounded-xl border text-center transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer flex flex-col items-center gap-1",
                          status === "memorized"
                            ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200"
                            : status === "in_progress"
                            ? "bg-amber-50 border-amber-300"
                            : "bg-slate-50/50 border-slate-200"
                        )}
                      >
                        <div className={cn(
                          "text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center",
                          status === "memorized" ? "bg-emerald-500 text-white" :
                          status === "in_progress" ? "bg-amber-400 text-white" :
                          "bg-slate-300 text-slate-600"
                        )}>
                          {surah.number}
                        </div>
                        <p className="text-xs font-bold truncate w-full leading-tight">{surah.name}</p>
                        {meta && (
                          <Badge variant="outline" className="text-[8px] h-4 px-1">
                            {meta.revelationType}
                          </Badge>
                        )}
                        <div className="w-full mt-1">
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                status === "memorized" ? "bg-emerald-500" :
                                status === "in_progress" ? "bg-amber-400" :
                                "bg-transparent"
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{progress}%</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card data-testid="weekly-goal-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  الهدف الأسبوعي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>{overallStats.weeklyVerses} آية</span>
                  <span className="text-muted-foreground">الهدف: {weeklyGoal} آية</span>
                </div>
                <Progress value={Math.min(100, (overallStats.weeklyVerses / weeklyGoal) * 100)} className="h-3" data-testid="weekly-progress-bar" />
                <p className="text-xs text-muted-foreground">
                  {overallStats.weeklyVerses >= weeklyGoal
                    ? "🎉 تم تحقيق الهدف الأسبوعي!"
                    : `متبقي ${weeklyGoal - overallStats.weeklyVerses} آية`
                  }
                </p>
              </CardContent>
            </Card>

            <Card data-testid="monthly-goal-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  الهدف الشهري
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>{monthlyDone} آية</span>
                  <span className="text-muted-foreground">الهدف: {monthlyGoal} آية</span>
                </div>
                <Progress value={Math.min(100, (monthlyDone / monthlyGoal) * 100)} className="h-3" data-testid="monthly-progress-bar" />
                <p className="text-xs text-muted-foreground">
                  {monthlyDone >= monthlyGoal
                    ? "🎉 تم تحقيق الهدف الشهري!"
                    : `متبقي ${monthlyGoal - monthlyDone} آية`
                  }
                </p>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="daily-target-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                الأهداف اليومية المقترحة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                  <p className="text-2xl font-bold text-emerald-700" data-testid="daily-new-target">5</p>
                  <p className="text-xs text-muted-foreground">آيات جديدة يومياً</p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
                  <p className="text-2xl font-bold text-amber-700" data-testid="daily-review-target">10</p>
                  <p className="text-xs text-muted-foreground">آيات مراجعة يومياً</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-center">
                  <p className="text-2xl font-bold text-blue-700" data-testid="daily-total-target">15</p>
                  <p className="text-xs text-muted-foreground">إجمالي يومي</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="upcoming-assignments-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                الواجبات القادمة
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : upcomingAssignments.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm" data-testid="no-upcoming">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  لا توجد واجبات قادمة
                </div>
              ) : (
                <div className="space-y-2" data-testid="upcoming-list">
                  {upcomingAssignments.map((a, i) => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border" data-testid={`upcoming-${i}`}>
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">{a.surahName}</p>
                        <p className="text-xs text-muted-foreground">الآيات {a.fromVerse} - {a.toVerse}</p>
                      </div>
                      <div className="text-left">
                        <Badge variant="outline" className="text-[10px]">
                          <Calendar className="w-3 h-3 ml-1" />
                          {formatDate(a.scheduledDate)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tajweed" className="mt-4">
          <Card data-testid="tajweed-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                تتبع أحكام التجويد
              </CardTitle>
              <p className="text-xs text-muted-foreground">حدد الأحكام التي أتقنتها لتتبع تقدمك</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(tajweedCategories).map(([category, data]) => (
                <div key={category} className="space-y-3" data-testid={`tajweed-category-${category}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm">{category}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{data.mastered}/{data.total}</span>
                      <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${data.total > 0 ? (data.mastered / data.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {data.rules.map((rule) => (
                      <div
                        key={rule.id}
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer",
                          rule.mastered ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200 hover:bg-slate-50"
                        )}
                        onClick={() => handleTajweedToggle(rule.id)}
                        data-testid={`tajweed-rule-${rule.id}`}
                      >
                        <Checkbox
                          checked={rule.mastered}
                          onCheckedChange={() => handleTajweedToggle(rule.id)}
                          data-testid={`tajweed-check-${rule.id}`}
                        />
                        <span className={cn("text-sm flex-1", rule.mastered && "line-through text-muted-foreground")}>
                          {rule.name}
                        </span>
                        {rule.mastered && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">الإتقان الكلي</span>
                  <span className="text-sm font-bold text-emerald-600" data-testid="tajweed-total-progress">
                    {tajweedRules.filter(r => r.mastered).length} / {tajweedRules.length}
                  </span>
                </div>
                <Progress
                  value={tajweedRules.length > 0 ? (tajweedRules.filter(r => r.mastered).length / tajweedRules.length) * 100 : 0}
                  className="h-3"
                  data-testid="tajweed-overall-progress"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surah-map" className="mt-4">
          <Card data-testid="surah-map-card">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  خريطة السور
                </CardTitle>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث عن سورة..."
                      value={surahSearch}
                      onChange={(e) => setSurahSearch(e.target.value)}
                      className="pr-9"
                      data-testid="surah-search-input"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs shrink-0"
                    onClick={() => setShowFilters(!showFilters)}
                    data-testid="toggle-filters-btn"
                  >
                    <Filter className="w-3 h-3" />
                    {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </Button>
                </div>
              </div>

              {showFilters && (
                <div className="flex flex-wrap gap-3 mt-3 p-3 bg-secondary/30 rounded-lg" data-testid="filters-panel">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">حالة الحفظ</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[130px] h-8 text-xs" data-testid="status-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        <SelectItem value="memorized">تم الحفظ</SelectItem>
                        <SelectItem value="in_progress">قيد التقدم</SelectItem>
                        <SelectItem value="not_started">لم يبدأ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">الجزء</label>
                    <Select value={juzFilter} onValueChange={setJuzFilter}>
                      <SelectTrigger className="w-[100px] h-8 text-xs" data-testid="juz-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          <SelectItem value="all">الكل</SelectItem>
                          {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
                            <SelectItem key={j} value={String(j)}>الجزء {j}</SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">الترتيب</label>
                    <Select value={sortOption} onValueChange={setSortOption}>
                      <SelectTrigger className="w-[130px] h-8 text-xs" data-testid="sort-option">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="number">حسب الرقم</SelectItem>
                        <SelectItem value="name">حسب الاسم</SelectItem>
                        <SelectItem value="progress">حسب التقدم</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-xs mt-2">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500"></span> تم الحفظ</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400"></span> قيد التقدم</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-200"></span> لم يبدأ</span>
              </div>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2" data-testid="surah-grid">
                  {filteredSurahs.map((surah) => {
                    const status = getSurahStatus(surah);
                    const progress = getSurahProgress(surah);
                    return (
                      <button
                        key={surah.number}
                        onClick={() => {
                          setSelectedSurah(String(surah.number));
                          setActiveTab("mushaf");
                        }}
                        data-testid={`surah-tile-${surah.number}`}
                        className={cn(
                          "relative p-2 rounded-lg border text-center transition-all duration-200 hover:shadow-md hover:scale-105 cursor-pointer group",
                          status === "memorized"
                            ? "bg-emerald-50 border-emerald-300 hover:border-emerald-400"
                            : status === "in_progress"
                            ? "bg-amber-50 border-amber-300 hover:border-amber-400"
                            : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className={cn(
                          "text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center mx-auto mb-1",
                          status === "memorized" ? "bg-emerald-500 text-white" :
                          status === "in_progress" ? "bg-amber-400 text-white" :
                          "bg-slate-300 text-slate-600"
                        )}>
                          {surah.number}
                        </div>
                        <p className="text-xs font-bold truncate leading-tight">{surah.name}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{surah.versesCount} آية</p>
                        <div className="mt-1.5 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              status === "memorized" ? "bg-emerald-500" :
                              status === "in_progress" ? "bg-amber-400" :
                              "bg-transparent"
                            )}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {!assignmentsLoading && filteredSurahs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground" data-testid="no-results">
                  لا توجد نتائج للبحث
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap" className="mt-4 space-y-4">
          <Card data-testid="quran-heatmap-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapIcon className="w-5 h-5" />
                خريطة المصحف الحرارية
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                عرض بصري لتقدم الحفظ عبر أجزاء القرآن الكريم
              </p>
              <div className="flex flex-wrap gap-4 text-xs mt-2">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500"></span> حفظ متقن (&gt;80%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-300"></span> حفظ جيد (60-80%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-400"></span> قيد المراجعة (30-60%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-200"></span> بداية (1-30%)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-700"></span> لم يبدأ (0%)</span>
              </div>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="overflow-x-auto">
                    <svg width="100%" viewBox="0 0 620 220" className="mx-auto" data-testid="svg-heatmap">
                      {Array.from({ length: 30 }, (_, i) => {
                        const juzNum = i + 1;
                        const col = i % 10;
                        const row = Math.floor(i / 10);
                        const x = col * 60 + 10;
                        const y = row * 70 + 30;

                        const juzSurahs = quranSurahs.filter(s => surahMeta[s.number]?.juz === juzNum);
                        let juzTotalVerses = 0;
                        let juzMemorizedVerses = 0;
                        juzSurahs.forEach(s => {
                          juzTotalVerses += s.versesCount;
                          const entry = surahAssignmentMap[s.name];
                          if (entry) juzMemorizedVerses += entry.versesMemorized.size;
                        });
                        const juzPercent = juzTotalVerses > 0 ? Math.round((juzMemorizedVerses / juzTotalVerses) * 100) : 0;

                        const fillColor = juzPercent > 80 ? "#10b981" :
                                          juzPercent > 60 ? "#6ee7b7" :
                                          juzPercent > 30 ? "#fbbf24" :
                                          juzPercent > 0 ? "#fde68a" :
                                          "#e2e8f0";

                        return (
                          <g key={juzNum} data-testid={`heatmap-juz-${juzNum}`}>
                            <rect
                              x={x} y={y} width={50} height={50} rx={8}
                              fill={fillColor}
                              stroke={juzPercent > 0 ? "#059669" : "#cbd5e1"}
                              strokeWidth={juzPercent > 80 ? 2 : 1}
                              className="transition-all duration-300 cursor-pointer hover:opacity-80"
                            />
                            <text x={x + 25} y={y + 22} textAnchor="middle" fontSize="12" fontWeight="bold" fill={juzPercent > 30 ? "#fff" : "#64748b"}>
                              {juzNum}
                            </text>
                            <text x={x + 25} y={y + 38} textAnchor="middle" fontSize="9" fill={juzPercent > 30 ? "rgba(255,255,255,0.8)" : "#94a3b8"}>
                              {juzPercent}%
                            </text>
                            {col === 0 && (
                              <text x={0} y={y + 30} fontSize="10" fill="#94a3b8" textAnchor="start">
                                {row === 0 ? "١-١٠" : row === 1 ? "١١-٢٠" : "٢١-٣٠"}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      خريطة تفصيلية للسور (114 سورة)
                    </h3>
                    <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(20px, 1fr))" }} data-testid="surah-heatmap-grid">
                      {quranSurahs.map((surah) => {
                        const entry = surahAssignmentMap[surah.name];
                        const totalVerses = surah.versesCount;
                        const memorizedVerses = entry ? entry.versesMemorized.size : 0;
                        const pct = totalVerses > 0 ? Math.round((memorizedVerses / totalVerses) * 100) : 0;

                        const bg = pct > 80 ? "bg-emerald-500" :
                                   pct > 60 ? "bg-emerald-300" :
                                   pct > 30 ? "bg-amber-400" :
                                   pct > 0 ? "bg-amber-200" :
                                   "bg-slate-200 dark:bg-slate-700";

                        return (
                          <button
                            key={surah.number}
                            onClick={() => {
                              setSelectedSurah(String(surah.number));
                              setActiveTab("mushaf");
                            }}
                            className={`w-full aspect-square rounded-sm ${bg} transition-all duration-200 hover:scale-125 hover:z-10 hover:shadow-lg relative group cursor-pointer`}
                            title={`${surah.name} - ${pct}%`}
                            data-testid={`heatmap-surah-${surah.number}`}
                          >
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                              {surah.name} ({pct}%)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-600">
                        {quranSurahs.filter(s => { const e = surahAssignmentMap[s.name]; return e && e.versesMemorized.size >= s.versesCount * 0.8; }).length}
                      </p>
                      <p className="text-xs text-muted-foreground">سورة متقنة</p>
                    </div>
                    <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-500">
                        {quranSurahs.filter(s => { const e = surahAssignmentMap[s.name]; const pct = e ? (e.versesMemorized.size / s.versesCount) * 100 : 0; return pct >= 30 && pct < 80; }).length}
                      </p>
                      <p className="text-xs text-muted-foreground">قيد التقدم</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-amber-600">
                        {quranSurahs.filter(s => { const e = surahAssignmentMap[s.name]; return e && e.versesMemorized.size > 0 && e.versesMemorized.size < s.versesCount * 0.3; }).length}
                      </p>
                      <p className="text-xs text-muted-foreground">بداية الحفظ</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/30 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-slate-500">
                        {quranSurahs.filter(s => { const e = surahAssignmentMap[s.name]; return !e || e.versesMemorized.size === 0; }).length}
                      </p>
                      <p className="text-xs text-muted-foreground">لم يبدأ</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card data-testid="activity-timeline-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                النشاط الأخير
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : recentAssignments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground" data-testid="no-activity">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد واجبات حتى الآن</p>
                </div>
              ) : (
                <div className="relative" data-testid="activity-timeline">
                  <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-primary/10 to-transparent" />
                  <div className="space-y-4">
                    {recentAssignments.map((assignment, index) => (
                      <div
                        key={assignment.id}
                        className="relative pr-10 group"
                        data-testid={`activity-item-${index}`}
                      >
                        <div className={cn(
                          "absolute right-2.5 top-3 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-10",
                          assignment.status === "done" ? "bg-emerald-500" : "bg-amber-400"
                        )} />

                        <div className={cn(
                          "p-4 rounded-xl border transition-all duration-200 hover:shadow-sm",
                          assignment.status === "done"
                            ? "bg-emerald-50/50 border-emerald-200/50"
                            : "bg-amber-50/50 border-amber-200/50"
                        )}>
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm">{assignment.surahName}</span>
                                <Badge variant="outline" className="text-[10px] h-5">
                                  الآيات {assignment.fromVerse} - {assignment.toVerse}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {formatDate(assignment.scheduledDate)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {assignment.grade !== null && assignment.grade !== undefined && (
                                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 gap-1" data-testid={`grade-${index}`}>
                                  <Star className="w-3 h-3" />
                                  {assignment.grade}%
                                </Badge>
                              )}
                              <Badge
                                className={cn(
                                  "text-[10px]",
                                  assignment.status === "done"
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                    : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                )}
                                data-testid={`status-${index}`}
                              >
                                {assignment.status === "done" ? "مكتمل" : "قيد الانتظار"}
                              </Badge>
                            </div>
                          </div>
                          {assignment.notes && (
                            <p className="text-xs text-muted-foreground mt-2 border-t pt-2 border-dashed">
                              {assignment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2" data-testid="timeline-card">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  رحلة الحفظ والإنجازات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTimeline ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : timeline.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>ابدأ رحلتك لتسجيل إنجازاتك هنا</p>
                  </div>
                ) : (
                  <div className="relative pr-4">
                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-muted" />
                    <div className="space-y-6">
                      {timeline.map((item, idx) => {
                        const Icon = getTimelineIcon(item.type);
                        return (
                          <div key={idx} className="relative pr-8" data-testid={`timeline-item-${idx}`}>
                            <div className="absolute right-[-4px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-full bg-primary/10 text-primary">
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold leading-none">{item.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDate(item.date)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card data-testid="titles-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    ألقابي
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {titles.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-xs">
                      اجتهد للحصول على ألقابك الأولى
                    </div>
                  ) : (
                    titles.map((t, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-l from-yellow-50 to-transparent border border-yellow-100"
                        data-testid={`title-item-${idx}`}
                      >
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                          <Crown className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-yellow-900">{t.title}</p>
                          <p className="text-[10px] text-yellow-700/70">لقب فخري</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {user?.role === "student" && (
                <Card data-testid="challenges-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-500" />
                      تحديات الأسبوع
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {challenges.map((c, idx) => (
                      <div key={idx} className="space-y-2" data-testid={`challenge-item-${idx}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-bold">{c.title}</p>
                            <p className="text-[10px] text-muted-foreground">{c.description}</p>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            +{c.reward} نقطة
                          </Badge>
                        </div>
                        <Progress value={(c.current / c.target) * 100} className="h-1.5" />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{c.current} / {c.target}</span>
                          <span>{Math.round((c.current / c.target) * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl" data-testid="verse-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl border-b pb-2 flex justify-between items-center">
              <span>الآية {selectedVerse?.numberInSurah}</span>
              <Badge variant="outline">سورة {currentSurah?.name ?? ""}</Badge>
            </DialogTitle>
            <DialogDescription className="sr-only">تفاصيل الآية وتحديث حالة الحفظ</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="p-4 bg-secondary/30 rounded-lg text-lg font-serif text-center leading-relaxed" data-testid="dialog-verse-text">
              {selectedVerse?.text}
            </div>

            <div className="space-y-2">
              <h4 className="font-bold flex items-center gap-2">
                تحديث حالة الحفظ:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  variant={selectedVerse && getStatus(selectedVerse.numberInSurah) === "memorized" ? "default" : "outline"}
                  className={selectedVerse && getStatus(selectedVerse.numberInSurah) === "memorized" ? "bg-emerald-600 hover:bg-emerald-700" : "hover:bg-emerald-50 text-emerald-700 border-emerald-200"}
                  onClick={() => selectedVerse && updateVerseStatus(selectedVerse.numberInSurah, "memorized")}
                  data-testid="btn-memorized"
                >
                  <CheckCircle className="w-4 h-4 ml-2" />
                  تم الحفظ
                </Button>
                <Button
                  variant={selectedVerse && getStatus(selectedVerse.numberInSurah) === "review" ? "default" : "outline"}
                  className={selectedVerse && getStatus(selectedVerse.numberInSurah) === "review" ? "bg-amber-500 hover:bg-amber-600" : "hover:bg-amber-50 text-amber-700 border-amber-200"}
                  onClick={() => selectedVerse && updateVerseStatus(selectedVerse.numberInSurah, "review")}
                  data-testid="btn-review"
                >
                  <RefreshCw className="w-4 h-4 ml-2" />
                  مراجعة
                </Button>
                <Button
                  variant={selectedVerse && getStatus(selectedVerse.numberInSurah) === "new" ? "default" : "outline"}
                  onClick={() => selectedVerse && updateVerseStatus(selectedVerse.numberInSurah, "new")}
                  data-testid="btn-new"
                >
                  جديد
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={surahDetailOpen} onOpenChange={setSurahDetailOpen}>
        <DialogContent className="max-w-lg" dir="rtl" data-testid="surah-detail-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl border-b pb-2 flex justify-between items-center">
              <span>سورة {quranSurahs.find(s => s.number === detailSurahNum)?.name}</span>
              <Badge variant="outline">{surahMeta[detailSurahNum]?.revelationType}</Badge>
            </DialogTitle>
            <DialogDescription className="sr-only">تفاصيل السورة والملاحظات</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-secondary/30 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">عدد الآيات</p>
                <p className="text-lg font-bold" data-testid="detail-verse-count">
                  {quranSurahs.find(s => s.number === detailSurahNum)?.versesCount}
                </p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">الجزء</p>
                <p className="text-lg font-bold" data-testid="detail-juz">
                  {surahMeta[detailSurahNum]?.juz}
                </p>
              </div>
            </div>

            <div className="p-3 bg-primary/5 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">الموضوع</p>
              <p className="text-sm font-medium" data-testid="detail-meaning">{surahMeta[detailSurahNum]?.meaning}</p>
            </div>

            {(() => {
              const surahName = quranSurahs.find(s => s.number === detailSurahNum)?.name ?? "";
              const surahAssignments = assignments.filter(a => a.surahName === surahName && a.status !== "cancelled");
              if (surahAssignments.length === 0) return (
                <p className="text-sm text-muted-foreground text-center py-2">لا يوجد سجل حفظ لهذه السورة</p>
              );
              return (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold">سجل الحفظ</h4>
                  <div className="max-h-[150px] overflow-y-auto space-y-1.5">
                    {surahAssignments.map((a, i) => (
                      <div key={a.id} className="flex items-center justify-between text-xs p-2 bg-secondary/20 rounded" data-testid={`detail-history-${i}`}>
                        <span>آية {a.fromVerse} - {a.toVerse}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{formatDate(a.scheduledDate)}</span>
                          <Badge variant="outline" className="text-[9px] h-4">
                            {a.status === "done" ? "مكتمل" : "قيد الانتظار"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="space-y-2">
              <h4 className="text-sm font-bold flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5" />
                ملاحظات
              </h4>
              <Textarea
                placeholder="أضف ملاحظاتك عن هذه السورة..."
                value={surahNotes[detailSurahNum] || ""}
                onChange={(e) => handleSaveSurahNote(detailSurahNum, e.target.value)}
                className="min-h-[80px] text-sm"
                data-testid="surah-notes-textarea"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

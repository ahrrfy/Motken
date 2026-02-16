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
import { CheckCircle, RefreshCw, BookOpen, Loader2, Search, Calendar, Award, TrendingUp, Clock, Star, BarChart3 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
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

const TOTAL_QURAN_VERSES = 6236;

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

  const surahNumber = parseInt(selectedSurah);
  const currentSurah = quranSurahs.find(s => s.number === surahNumber);

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
    return { totalMemorized, percentage, completedAssignments, streak };
  }, [assignments, surahAssignmentMap]);

  const recentAssignments = useMemo(() => {
    return [...assignments]
      .filter(a => a.status !== "cancelled")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }, [assignments]);

  const filteredSurahs = useMemo(() => {
    if (!surahSearch.trim()) return quranSurahs;
    const q = surahSearch.trim().toLowerCase();
    return quranSurahs.filter(s =>
      s.name.includes(q) || String(s.number).includes(q)
    );
  }, [surahSearch]);

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
      return d.toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
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

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200/50 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700" data-testid="stat-completed-assignments">{overallStats.completedAssignments}</p>
              <p className="text-xs text-muted-foreground">واجبات مكتملة</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200/50 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700" data-testid="stat-streak">{overallStats.streak}</p>
              <p className="text-xs text-muted-foreground">أيام متتالية</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200/50 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700" data-testid="stat-total-assignments">{assignments.filter(a => a.status !== "cancelled").length}</p>
              <p className="text-xs text-muted-foreground">إجمالي الواجبات</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
        <TabsList className="w-full grid grid-cols-3 h-11">
          <TabsTrigger value="mushaf" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-mushaf">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">المصحف</span>
          </TabsTrigger>
          <TabsTrigger value="surah-map" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-surah-map">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">خريطة السور</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-activity">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">النشاط الأخير</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mushaf" className="mt-4">
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
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="surah-map" className="mt-4">
          <Card data-testid="surah-map-card">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  خريطة السور
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن سورة..."
                    value={surahSearch}
                    onChange={(e) => setSurahSearch(e.target.value)}
                    className="pr-9"
                    data-testid="surah-search-input"
                  />
                </div>
              </div>
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
    </div>
  );
}

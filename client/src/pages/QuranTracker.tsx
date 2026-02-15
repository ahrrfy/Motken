import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, RefreshCw, BookOpen, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { quranSurahs } from "@shared/quran-surahs";

type VerseStatus = "memorized" | "review" | "new";

interface Ayah {
  numberInSurah: number;
  text: string;
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

  const surahNumber = parseInt(selectedSurah);
  const currentSurah = quranSurahs.find(s => s.number === surahNumber);

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

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto" data-testid="quran-tracker-page">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="page-title">المصحف التفاعلي</h1>
          <p className="text-muted-foreground">تتبع حفظك آية بآية</p>
        </div>

        <div className="flex items-center gap-2">
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

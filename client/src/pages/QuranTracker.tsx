import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft, Loader2, BookOpen } from "lucide-react";
import { quranSurahs } from "@shared/quran-surahs";

// ─── بيانات ثابتة ────────────────────────────────────────────────────────────

const surahStartPages: Record<number, number> = {
  1:1,2:2,3:50,4:77,5:106,6:128,7:151,8:177,9:187,10:208,
  11:221,12:235,13:249,14:255,15:262,16:267,17:282,18:293,
  19:305,20:312,21:322,22:332,23:342,24:350,25:359,26:367,
  27:377,28:385,29:396,30:404,31:411,32:415,33:418,34:428,
  35:434,36:440,37:446,38:453,39:458,40:467,41:477,42:483,
  43:489,44:496,45:499,46:502,47:507,48:511,49:515,50:518,
  51:520,52:523,53:526,54:528,55:531,56:534,57:537,58:542,
  59:545,60:549,61:551,62:553,63:554,64:556,65:558,66:560,
  67:562,68:564,69:566,70:568,71:570,72:572,73:574,74:575,
  75:577,76:578,77:580,78:582,79:583,80:585,81:586,82:587,
  83:587,84:589,85:590,86:591,87:591,88:592,89:593,90:594,
  91:595,92:595,93:596,94:596,95:597,96:597,97:598,98:598,
  99:599,100:599,101:600,102:600,103:601,104:601,105:601,
  106:602,107:602,108:602,109:603,110:603,111:603,112:604,
  113:604,114:604,
};

const juzStartPages: number[] = [
  1,22,42,62,82,102,121,142,162,182,
  201,221,241,261,281,301,321,341,361,381,
  401,421,441,461,481,501,521,542,562,582,
];

const TOTAL_PAGES = 604;

// ─── أنواع ────────────────────────────────────────────────────────────────────

interface Ayah {
  text: string;
  numberInSurah: number;
  surah: { number: number; name: string };
  juz: number;
  sajda: boolean;
}

interface SurahGroup {
  surahNum: number;
  surahName: string;
  juz: number;
  ayahs: Ayah[];
}

// ─── مكوّن رأس السورة ─────────────────────────────────────────────────────────

function SurahHeader({ name, surahNum }: { name: string; surahNum: number }) {
  return (
    <div className="my-6 text-center select-none" dir="rtl">
      <div className="inline-flex flex-col items-center gap-2 px-8 py-3 rounded-lg border border-amber-300/60 dark:border-amber-700/40 bg-amber-50/80 dark:bg-amber-950/30">
        <div className="flex items-center gap-3">
          <span className="text-amber-400 text-lg">﴾</span>
          <span
            className="text-xl md:text-2xl font-bold text-amber-800 dark:text-amber-300"
            style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}
          >
            سُورَةُ {name}
          </span>
          <span className="text-amber-400 text-lg">﴿</span>
        </div>
        {surahNum !== 9 && (
          <p
            className="text-lg md:text-xl text-stone-700 dark:text-stone-300 mt-1"
            style={{ fontFamily: "'Amiri Quran', 'Amiri', serif", lineHeight: 2.2 }}
          >
            بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ
          </p>
        )}
      </div>
    </div>
  );
}

// ─── المكوّن الرئيسي ──────────────────────────────────────────────────────────

export default function QuranTracker() {
  const [currentPage, setCurrentPage] = useState<number>(() =>
    Math.min(Math.max(1, Number(localStorage.getItem("quran_last_page") || 1)), TOTAL_PAGES)
  );
  const [pageData, setPageData] = useState<Ayah[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState(String(currentPage));
  const cache = useRef<Record<number, Ayah[]>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // ─── جلب الصفحة ────────────────────────────────────────────────────────────

  const fetchPage = useCallback(async (pageNum: number) => {
    if (cache.current[pageNum]) {
      setPageData(cache.current[pageNum]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/page/${pageNum}/quran-uthmani`);
      if (!res.ok) throw new Error("فشل تحميل الصفحة");
      const json = await res.json();
      const ayahs: Ayah[] = json.data.ayahs.map((a: any) => ({
        text: a.text,
        numberInSurah: a.numberInSurah,
        surah: { number: a.surah.number, name: a.surah.name },
        juz: a.juz,
        sajda: !!a.sajda,
      }));
      cache.current[pageNum] = ayahs;
      setPageData(ayahs);
    } catch {
      setError("تعذّر تحميل الصفحة. تحقق من الاتصال بالإنترنت.");
      setPageData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(currentPage);
    setPageInput(String(currentPage));
    localStorage.setItem("quran_last_page", String(currentPage));
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage, fetchPage]);

  // Prefetch next page silently
  useEffect(() => {
    if (currentPage < TOTAL_PAGES && !cache.current[currentPage + 1]) {
      fetch(`https://api.alquran.cloud/v1/page/${currentPage + 1}/quran-uthmani`)
        .then(r => r.json())
        .then(json => {
          cache.current[currentPage + 1] = json.data.ayahs.map((a: any) => ({
            text: a.text, numberInSurah: a.numberInSurah,
            surah: { number: a.surah.number, name: a.surah.name },
            juz: a.juz, sajda: !!a.sajda,
          }));
        }).catch(() => {});
    }
  }, [currentPage]);

  // ─── تجميع الآيات حسب السورة ───────────────────────────────────────────────

  const groups: SurahGroup[] = pageData
    ? pageData.reduce<SurahGroup[]>((acc, ayah) => {
        const last = acc[acc.length - 1];
        if (last?.surahNum === ayah.surah.number) {
          last.ayahs.push(ayah);
        } else {
          acc.push({
            surahNum: ayah.surah.number,
            surahName: ayah.surah.name,
            juz: ayah.juz,
            ayahs: [ayah],
          });
        }
        return acc;
      }, [])
    : [];

  // ─── معلومات الصفحة الحالية ────────────────────────────────────────────────

  const firstAyah = pageData?.[0];
  const juzNum = firstAyah?.juz ?? 1;
  const currentSurahName = firstAyah?.surah.name ?? "";

  // ─── تحويل رقم لأرقام عربية هندية ─────────────────────────────────────────

  function toArabicNum(n: number): string {
    return n.toString().replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
  }

  // ─── معالجة input الصفحة ───────────────────────────────────────────────────

  function commitPageInput() {
    const num = Number(pageInput);
    if (num >= 1 && num <= TOTAL_PAGES) setCurrentPage(num);
    else setPageInput(String(currentPage));
  }

  // ─── الواجهة ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#fdf6e3] dark:bg-[#1a1209]" dir="rtl">

      {/* ── شريط التنقل الثابت ── */}
      <div className="sticky top-0 z-10 bg-[#fdf6e3]/95 dark:bg-[#1a1209]/95 backdrop-blur border-b border-amber-200/60 dark:border-amber-900/40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">

          {/* السابق / رقم الصفحة / التالي */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 gap-1"
            >
              <ChevronRight className="w-4 h-4" />
              السابق
            </Button>

            <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
              <span>الصفحة</span>
              <Input
                value={pageInput}
                onChange={e => setPageInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && commitPageInput()}
                onBlur={commitPageInput}
                className="w-14 h-7 text-center text-sm border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 p-0"
                dir="ltr"
              />
              <span>من {TOTAL_PAGES}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(TOTAL_PAGES, p + 1))}
              disabled={currentPage >= TOTAL_PAGES || loading}
              className="border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 gap-1"
            >
              التالي
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* اسم السورة والجزء */}
          {!loading && firstAyah && (
            <p className="text-center text-xs text-amber-700 dark:text-amber-400 font-medium">
              {currentSurahName} &nbsp;•&nbsp; الجزء {toArabicNum(juzNum)}
            </p>
          )}

          {/* Dropdown السور والأجزاء */}
          <div className="flex gap-2">
            <Select onValueChange={val => setCurrentPage(surahStartPages[Number(val)] ?? 1)}>
              <SelectTrigger className="flex-1 h-8 text-xs border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300">
                <SelectValue placeholder="انتقل إلى سورة..." />
              </SelectTrigger>
              <SelectContent>
                {quranSurahs.map(s => (
                  <SelectItem key={s.number} value={String(s.number)} className="text-sm">
                    {s.number}. {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={val => setCurrentPage(juzStartPages[Number(val) - 1] ?? 1)}>
              <SelectTrigger className="w-32 h-8 text-xs border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300">
                <SelectValue placeholder="الجزء..." />
              </SelectTrigger>
              <SelectContent>
                {juzStartPages.map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)} className="text-sm">
                    الجزء {toArabicNum(i + 1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── محتوى الصفحة ── */}
      <div ref={containerRef} className="max-w-2xl mx-auto px-4 pb-12">

        {/* حالة التحميل */}
        {loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-amber-700 dark:text-amber-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm">جاري تحميل الصفحة...</span>
          </div>
        )}

        {/* حالة الخطأ */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <BookOpen className="w-12 h-12 text-amber-300" />
            <p className="text-stone-600 dark:text-stone-400 text-sm text-center">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPage(currentPage)}
              className="border-amber-300 text-amber-800"
            >
              إعادة المحاولة
            </Button>
          </div>
        )}

        {/* الآيات */}
        {!loading && !error && groups.map((group, gi) => (
          <div key={gi}>
            <SurahHeader name={group.surahName} surahNum={group.surahNum} />
            <p
              className="text-center text-stone-900 dark:text-stone-100 px-2"
              style={{
                fontFamily: "'Amiri Quran', 'Amiri', serif",
                fontSize: "clamp(1.2rem, 3vw, 1.55rem)",
                lineHeight: 3.4,
                direction: "rtl",
                wordSpacing: "0.04em",
              }}
            >
              {group.ayahs.map(ayah => (
                <span key={ayah.numberInSurah}>
                  {ayah.text}
                  <span
                    style={{
                      fontFamily: "'Amiri', serif",
                      fontSize: "0.72em",
                      color: "var(--verse-num-color, #b45309)",
                      margin: "0 0.2em",
                    }}
                  >
                    {" "}﴿{toArabicNum(ayah.numberInSurah)}﴾{" "}
                  </span>
                  {ayah.sajda && (
                    <span style={{ color: "#16a34a", fontSize: "0.8em" }}>۩ </span>
                  )}
                </span>
              ))}
            </p>
          </div>
        ))}

        {/* رقم الصفحة في الأسفل */}
        {!loading && pageData && (
          <div className="text-center mt-10 text-xs text-amber-400/70 dark:text-amber-600/50 select-none">
            ─── {toArabicNum(currentPage)} ───
          </div>
        )}
      </div>
    </div>
  );
}

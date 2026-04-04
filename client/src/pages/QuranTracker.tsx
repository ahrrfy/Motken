import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronRight, ChevronLeft, Loader2, BookOpen, ZoomIn, ZoomOut } from "lucide-react";
import { quranSurahs } from "@shared/quran-surahs";

// ─── بيانات ثابتة — مصحف المدينة المنورة ──────────────────────────────────────

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

// رابط صور مصحف المدينة المنورة — jsdelivr CDN
const MUSHAF_CDN = "https://cdn.jsdelivr.net/gh/GovarJabbar/Quran-PNG@master";

function getPageImageUrl(pageNum: number): string {
  const padded = String(pageNum).padStart(3, "0");
  return `${MUSHAF_CDN}/${padded}.png`;
}

// معرفة اسم السورة والجزء من رقم الصفحة
function getSurahForPage(page: number): string {
  let surahNum = 1;
  for (const [num, startPage] of Object.entries(surahStartPages)) {
    if (startPage <= page) surahNum = Number(num);
    else break;
  }
  return quranSurahs.find(s => s.number === surahNum)?.name || "";
}

function getJuzForPage(page: number): number {
  for (let i = juzStartPages.length - 1; i >= 0; i--) {
    if (page >= juzStartPages[i]) return i + 1;
  }
  return 1;
}

function toArabicNum(n: number): string {
  return n.toString().replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
}

// ─── المكوّن الرئيسي ──────────────────────────────────────────────────────────

export default function QuranTracker() {
  const [currentPage, setCurrentPage] = useState<number>(() =>
    Math.min(Math.max(1, Number(localStorage.getItem("quran_last_page") || 1)), TOTAL_PAGES)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pageInput, setPageInput] = useState(String(currentPage));
  const [zoom, setZoom] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // تحميل الصورة
  useEffect(() => {
    setPageInput(String(currentPage));
    localStorage.setItem("quran_last_page", String(currentPage));
    setLoading(true);
    setError(false);
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });

    // preload الصفحة التالية
    if (currentPage < TOTAL_PAGES) {
      const next = new Image();
      next.src = getPageImageUrl(currentPage + 1);
    }
  }, [currentPage]);

  const handleImageLoad = () => setLoading(false);
  const handleImageError = () => { setLoading(false); setError(true); };

  const surahName = getSurahForPage(currentPage);
  const juzNum = getJuzForPage(currentPage);

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
        <div className="max-w-3xl mx-auto px-4 py-3 space-y-2">

          {/* السابق / رقم الصفحة / التالي */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
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
              disabled={currentPage >= TOTAL_PAGES}
              className="border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 gap-1"
            >
              التالي
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* اسم السورة والجزء + أزرار التكبير */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              {surahName} &nbsp;•&nbsp; الجزء {toArabicNum(juzNum)}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-amber-700 dark:text-amber-400"
                onClick={() => setZoom(z => Math.max(50, z - 10))}
                disabled={zoom <= 50}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs text-amber-600 dark:text-amber-500 min-w-[36px] text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-amber-700 dark:text-amber-400"
                onClick={() => setZoom(z => Math.min(200, z + 10))}
                disabled={zoom >= 200}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          </div>

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

      {/* ── صفحة المصحف ── */}
      <div ref={containerRef} className="max-w-3xl mx-auto px-2 pb-12 overflow-auto">

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
            <p className="text-stone-600 dark:text-stone-400 text-sm text-center">تعذّر تحميل صفحة المصحف. تحقق من الاتصال بالإنترنت.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setError(false); setLoading(true); }}
              className="border-amber-300 text-amber-800"
            >
              إعادة المحاولة
            </Button>
          </div>
        )}

        {/* صورة صفحة المصحف */}
        <div className="flex justify-center mt-4" style={{ direction: "ltr" }}>
          <img
            ref={imgRef}
            key={currentPage}
            src={getPageImageUrl(currentPage)}
            alt={`صفحة ${currentPage} من مصحف المدينة المنورة`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className="select-none rounded shadow-lg border border-amber-200/60 dark:border-amber-900/40"
            style={{
              width: `${zoom}%`,
              maxWidth: "100%",
              height: "auto",
              display: error ? "none" : "block",
              touchAction: "pinch-zoom",
            }}
            draggable={false}
          />
        </div>

        {/* رقم الصفحة في الأسفل */}
        {!loading && !error && (
          <div className="text-center mt-6 text-xs text-amber-400/70 dark:text-amber-600/50 select-none">
            ─── {toArabicNum(currentPage)} ───
          </div>
        )}
      </div>
    </div>
  );
}

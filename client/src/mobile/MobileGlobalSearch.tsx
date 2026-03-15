import { useState, useEffect, useRef } from "react";
import { Search, X, Users, BookOpen, GraduationCap, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { hapticLight } from "@/lib/haptic";

interface MobileGlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

const surahs = [
  "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس",
  "هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
  "الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
  "لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
  "فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق",
  "الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة",
  "الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج",
  "نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
  "التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد",
  "الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات",
  "القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
  "المسد","الإخلاص","الفلق","الناس"
];

export default function MobileGlobalSearch({ open, onClose }: MobileGlobalSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["/api/students"],
    enabled: open,
  });

  const { data: teachers = [] } = useQuery<any[]>({
    queryKey: ["/api/teachers"],
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const results: { type: string; icon: any; label: string; sub: string; href: string }[] = [];

  if (q.length >= 2) {
    students.filter((s: any) => s.name?.toLowerCase().includes(q)).slice(0, 5).forEach((s: any) => {
      results.push({ type: "student", icon: Users, label: s.name, sub: "طالب", href: "/students" });
    });
    teachers.filter((t: any) => t.name?.toLowerCase().includes(q)).slice(0, 5).forEach((t: any) => {
      results.push({ type: "teacher", icon: GraduationCap, label: t.name, sub: "أستاذ", href: "/teachers" });
    });
    surahs.forEach((name, i) => {
      if (name.includes(q)) {
        results.push({ type: "surah", icon: BookOpen, label: `سورة ${name}`, sub: `السورة ${i + 1}`, href: "/quran" });
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[60] bg-background/98 backdrop-blur-xl flex flex-col" dir="rtl">
      <div className="flex items-center gap-2 p-3 border-b border-border/50">
        <div className="flex-1 relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder="ابحث عن طالب، أستاذ، سورة..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pr-10 pl-4 rounded-xl bg-muted/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            data-testid="input-global-search"
          />
        </div>
        <button
          onClick={onClose}
          className="p-2.5 rounded-xl hover:bg-muted transition-colors"
          data-testid="button-close-search"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {q.length < 2 && (
          <div className="text-center text-muted-foreground text-sm mt-12">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>اكتب حرفين على الأقل للبحث</p>
          </div>
        )}

        {q.length >= 2 && results.length === 0 && (
          <div className="text-center text-muted-foreground text-sm mt-12">
            <p>لا توجد نتائج لـ "{query}"</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-1">
            {results.map((r, i) => {
              const Icon = r.icon;
              return (
                <button
                  key={`${r.type}-${i}`}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/70 active:bg-muted transition-colors text-right"
                  onClick={() => {
                    hapticLight();
                    navigate(r.href);
                    onClose();
                  }}
                  data-testid={`search-result-${r.type}-${i}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

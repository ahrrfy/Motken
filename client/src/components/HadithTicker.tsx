import { useState, useEffect } from "react";
import { authenticHadiths } from "@shared/hadiths";
import { BookOpen } from "lucide-react";

export default function HadithTicker() {
  const [currentIndex, setCurrentIndex] = useState(() => Math.floor(Math.random() * authenticHadiths.length));
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % authenticHadiths.length);
        setFade(true);
      }, 500);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const hadith = authenticHadiths[currentIndex];

  return (
    <div className="bg-gradient-to-r from-emerald-900/90 via-emerald-800/90 to-emerald-900/90 text-white py-2 px-3 sm:px-4 overflow-hidden" dir="rtl" data-testid="hadith-ticker">
      <div className={`flex items-center justify-center gap-2 sm:gap-3 transition-opacity duration-500 ${fade ? 'opacity-100' : 'opacity-0'}`}>
        <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 shrink-0" />
        <p className="text-xs sm:text-sm text-center line-clamp-2 sm:line-clamp-1">
          <span className="font-medium">«{hadith.text}»</span>
          <span className="text-emerald-300 mr-2 text-[10px] sm:text-xs">— {hadith.source}</span>
        </p>
      </div>
    </div>
  );
}

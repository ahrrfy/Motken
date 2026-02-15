import { useState, useEffect, useCallback } from "react";
import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";
import { Clock, Calendar, Moon, Bell, X } from "lucide-react";

const PRAYER_NAMES: Record<string, string> = {
  fajr: "الفجر",
  sunrise: "الشروق",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

const HIJRI_MONTHS = [
  "مُحَرَّم", "صَفَر", "رَبيع الأوَّل", "رَبيع الآخِر",
  "جُمادى الأولى", "جُمادى الآخِرة", "رَجَب", "شَعبان",
  "رَمَضان", "شَوَّال", "ذو القَعدة", "ذو الحِجَّة"
];

const WEEKDAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function getHijriDate() {
  const now = new Date();
  try {
    const hijriFormatter = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
    const parts = hijriFormatter.formatToParts(now);
    const day = parts.find(p => p.type === "day")?.value || "";
    const month = parseInt(parts.find(p => p.type === "month")?.value || "1");
    const year = parts.find(p => p.type === "year")?.value || "";
    const monthName = HIJRI_MONTHS[month - 1] || "";
    return `${day} ${monthName} ${year} هـ`;
  } catch {
    return "";
  }
}

function getGregorianDate() {
  const now = new Date();
  const day = now.getDate();
  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const weekday = WEEKDAYS_AR[now.getDay()];
  return `${weekday}، ${day} ${month} ${year} م`;
}

function getCurrentTime() {
  return new Intl.DateTimeFormat("ar-IQ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Baghdad",
  }).format(new Date());
}

function formatPrayerTime(date: Date) {
  return new Intl.DateTimeFormat("ar-IQ", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Baghdad",
  }).format(date);
}

interface PrayerInfo {
  name: string;
  key: string;
  time: Date;
  formatted: string;
}

function getAllPrayerTimes(lat: number, lng: number): PrayerInfo[] {
  const coordinates = new Coordinates(lat, lng);
  const now = new Date();
  const params = CalculationMethod.MuslimWorldLeague();
  const pt = new PrayerTimes(coordinates, now, params);

  return [
    { key: "fajr", name: PRAYER_NAMES.fajr, time: pt.fajr, formatted: formatPrayerTime(pt.fajr) },
    { key: "sunrise", name: PRAYER_NAMES.sunrise, time: pt.sunrise, formatted: formatPrayerTime(pt.sunrise) },
    { key: "dhuhr", name: PRAYER_NAMES.dhuhr, time: pt.dhuhr, formatted: formatPrayerTime(pt.dhuhr) },
    { key: "asr", name: PRAYER_NAMES.asr, time: pt.asr, formatted: formatPrayerTime(pt.asr) },
    { key: "maghrib", name: PRAYER_NAMES.maghrib, time: pt.maghrib, formatted: formatPrayerTime(pt.maghrib) },
    { key: "isha", name: PRAYER_NAMES.isha, time: pt.isha, formatted: formatPrayerTime(pt.isha) },
  ];
}

function getNextPrayer(prayers: PrayerInfo[]): { prayer: PrayerInfo; remaining: string } | null {
  const now = new Date();
  const mainPrayers = prayers.filter(p => p.key !== "sunrise");

  for (const prayer of mainPrayers) {
    if (prayer.time > now) {
      const diff = prayer.time.getTime() - now.getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const remaining = hours > 0 ? `${hours} ساعة و ${minutes} دقيقة` : `${minutes} دقيقة`;
      return { prayer, remaining };
    }
  }
  return null;
}

export default function DateTimePrayerBar() {
  const [currentTime, setCurrentTime] = useState(getCurrentTime());
  const [hijriDate] = useState(getHijriDate());
  const [gregorianDate] = useState(getGregorianDate());
  const [coords, setCoords] = useState<{lat: number; lng: number}>({ lat: 33.3152, lng: 44.3661 });
  const [prayers, setPrayers] = useState<PrayerInfo[]>([]);
  const [nextPrayer, setNextPrayer] = useState<{ prayer: PrayerInfo; remaining: string } | null>(null);
  const [prayerAlert, setPrayerAlert] = useState<string | null>(null);
  const [alertedPrayers, setAlertedPrayers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    const updatePrayers = () => {
      const newPrayers = getAllPrayerTimes(coords.lat, coords.lng);
      setPrayers(newPrayers);
      setNextPrayer(getNextPrayer(newPrayers));
    };
    updatePrayers();
    const interval = setInterval(updatePrayers, 60000);
    return () => clearInterval(interval);
  }, [coords]);

  const checkPrayerAlert = useCallback(() => {
    const now = new Date();
    const mainPrayers = prayers.filter(p => p.key !== "sunrise");

    for (const prayer of mainPrayers) {
      const diff = prayer.time.getTime() - now.getTime();
      if (diff >= 0 && diff <= 60000 && !alertedPrayers.has(prayer.key)) {
        setPrayerAlert(prayer.name);
        setAlertedPrayers(prev => new Set(prev).add(prayer.key));
        setTimeout(() => setPrayerAlert(null), 30000);
        break;
      }
    }
  }, [prayers, alertedPrayers]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
      setNextPrayer(getNextPrayer(prayers));
      checkPrayerAlert();
    }, 1000);
    return () => clearInterval(interval);
  }, [prayers, checkPrayerAlert]);

  return (
    <>
      {prayerAlert && (
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-3 flex items-center justify-between animate-in slide-in-from-top duration-500 shadow-lg z-50">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2 animate-pulse">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-lg">حان الآن موعد صلاة {prayerAlert}</p>
              <p className="text-emerald-100 text-sm">حيّ على الصلاة.. حيّ على الفلاح</p>
            </div>
          </div>
          <button
            onClick={() => setPrayerAlert(null)}
            className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-colors"
            data-testid="button-dismiss-prayer-alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white shadow-md" dir="rtl">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-0 lg:gap-4">
          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b lg:border-b-0 border-white/10 lg:flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-lg font-bold text-amber-300 tabular-nums" data-testid="text-current-time">{currentTime}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs lg:text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-gray-300 whitespace-nowrap" data-testid="text-gregorian-date">{gregorianDate}</span>
              </div>
              <span className="text-white/20">|</span>
              <div className="flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-amber-200 whitespace-nowrap" data-testid="text-hijri-date">{hijriDate}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto scrollbar-thin lg:flex-1 lg:justify-center">
            {prayers.map((p) => (
              <div
                key={p.key}
                className={`flex flex-col items-center px-2.5 py-1 rounded-md min-w-[60px] transition-all ${
                  nextPrayer?.prayer.key === p.key
                    ? "bg-emerald-600/40 ring-1 ring-emerald-400/50 scale-105"
                    : p.time < new Date() && p.key !== "sunrise"
                    ? "opacity-50"
                    : "hover:bg-white/5"
                }`}
                data-testid={`prayer-${p.key}`}
              >
                <span className={`text-[10px] leading-tight ${
                  nextPrayer?.prayer.key === p.key ? "text-emerald-300 font-bold" : "text-gray-400"
                }`}>{p.name}</span>
                <span className={`text-xs font-bold leading-tight ${
                  nextPrayer?.prayer.key === p.key ? "text-white" : "text-gray-300"
                }`}>{p.formatted}</span>
              </div>
            ))}
          </div>

          {nextPrayer && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-700/30 border-t lg:border-t-0 lg:border-r border-emerald-600/30 lg:flex-shrink-0">
              <Bell className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
              <span className="text-xs text-emerald-200 whitespace-nowrap" data-testid="text-next-prayer">
                <span className="font-bold text-white">{nextPrayer.prayer.name}</span>
                {" "}بعد {nextPrayer.remaining}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

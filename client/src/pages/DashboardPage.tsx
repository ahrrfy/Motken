import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, CheckCircle, TrendingUp, Clock, MapPin, ShieldAlert, Activity, ShieldCheck, Calendar, BellRing, ClipboardList, Loader2, GraduationCap } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

function getBaghdadPrayerTimes() {
  const coordinates = new Coordinates(33.3152, 44.3661); 
  const date = new Date();
  const params = CalculationMethod.MuslimWorldLeague(); 
  params.madhab = "shafi"; 
  
  const prayerTimes = new PrayerTimes(coordinates, date, params);
  
  const formatter = new Intl.DateTimeFormat('ar-IQ', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });

  return {
    fajr: formatter.format(prayerTimes.fajr),
    dhuhr: formatter.format(prayerTimes.dhuhr),
    asr: formatter.format(prayerTimes.asr),
    maghrib: formatter.format(prayerTimes.maghrib),
    isha: formatter.format(prayerTimes.isha),
  };
}

interface Stats {
  totalStudents?: number;
  totalTeachers?: number;
  totalSupervisors?: number;
  totalMosques?: number;
  totalAssignments?: number;
  completedAssignments?: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [prayerTimes, setPrayerTimes] = useState(getBaghdadPrayerTimes());
  const [showNotification, setShowNotification] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrayerTimes(getBaghdadPrayerTimes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user?.role === "student") {
      setLoadingStats(false);
      return;
    }
    fetch("/api/stats", { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [user?.role]);

  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';
  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const getDisplayStats = () => {
    if (!stats || isStudent) return [];

    if (isAdmin) {
      return [
        { title: "الطلاب", value: String(stats.totalStudents ?? 0), icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
        { title: "الأساتذة", value: String(stats.totalTeachers ?? 0), icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-100" },
        { title: "المشرفون", value: String(stats.totalSupervisors ?? 0), icon: ShieldAlert, color: "text-purple-600", bg: "bg-purple-100" },
        { title: "الجوامع", value: String(stats.totalMosques ?? 0), icon: Activity, color: "text-green-700", bg: "bg-green-50" },
        { title: "الواجبات المكتملة", value: String(stats.completedAssignments ?? 0), icon: CheckCircle, color: "text-amber-600", bg: "bg-amber-100" },
        { title: "إجمالي الواجبات", value: String(stats.totalAssignments ?? 0), icon: TrendingUp, color: "text-red-600", bg: "bg-red-50" },
      ];
    }

    if (isSupervisor) {
      return [
        { title: "الأساتذة", value: String(stats.totalTeachers ?? 0), icon: GraduationCap, color: "text-emerald-600", bg: "bg-emerald-100" },
        { title: "الطلاب", value: String(stats.totalStudents ?? 0), icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
        { title: "الواجبات المكتملة", value: String(stats.completedAssignments ?? 0), icon: CheckCircle, color: "text-amber-600", bg: "bg-amber-100" },
        { title: "إجمالي الواجبات", value: String(stats.totalAssignments ?? 0), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
      ];
    }

    if (isTeacher) {
      return [
        { title: "طلابي", value: String(stats.totalStudents ?? 0), icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
        { title: "الواجبات المكتملة", value: String(stats.completedAssignments ?? 0), icon: CheckCircle, color: "text-amber-600", bg: "bg-amber-100" },
        { title: "إجمالي الواجبات", value: String(stats.totalAssignments ?? 0), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
      ];
    }

    return [];
  };

  const displayStats = getDisplayStats();

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {isStudent && showNotification && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500" data-testid="alert-student-notification">
          <BellRing className="h-5 w-5 text-amber-600 animate-pulse" />
          <AlertTitle className="text-lg font-bold mb-1 mr-2">تنبيه: موعد التسميع اقترب!</AlertTitle>
          <AlertDescription className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mr-2">
            <div>
              لديك موعد تسميع <strong>سورة البقرة (الآيات 20-30)</strong> مع <strong>الشيخ أحمد</strong> بعد 15 دقيقة.
            </div>
            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
               <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white border-none" onClick={() => setShowNotification(false)} data-testid="button-dismiss-notification">
                 سأكون جاهزاً
               </Button>
               <Button size="sm" variant="outline" className="border-amber-300 hover:bg-amber-100 text-amber-800" data-testid="button-delay-notification">
                 تأجيل 5 دقائق
               </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-card p-4 rounded-xl shadow-sm border">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground font-serif" data-testid="text-page-title">لوحة التحكم</h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <MapPin className="w-4 h-4" />
            <p data-testid="text-mosque-name">{user?.mosqueName || (isAdmin ? "إدارة النظام" : "المسجد غير محدد")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-2 rounded-lg border border-primary/10 w-full xl:w-auto overflow-x-auto scrollbar-thin">
          <div className="flex items-center gap-2 px-3 border-l border-primary/20">
             <Clock className="w-5 h-5 text-primary" />
             <span className="font-bold text-primary text-sm whitespace-nowrap">أوقات الصلاة (بغداد):</span>
          </div>
          <div className="flex items-center gap-4 px-2 text-sm">
             <div className="flex flex-col items-center">
               <span className="text-xs text-muted-foreground">الفجر</span>
               <span className="font-bold" data-testid="text-prayer-fajr">{prayerTimes.fajr}</span>
             </div>
             <div className="flex flex-col items-center">
               <span className="text-xs text-muted-foreground">الظهر</span>
               <span className="font-bold" data-testid="text-prayer-dhuhr">{prayerTimes.dhuhr}</span>
             </div>
             <div className="flex flex-col items-center">
               <span className="text-xs text-muted-foreground">العصر</span>
               <span className="font-bold" data-testid="text-prayer-asr">{prayerTimes.asr}</span>
             </div>
             <div className="flex flex-col items-center">
               <span className="text-xs text-muted-foreground">المغرب</span>
               <span className="font-bold" data-testid="text-prayer-maghrib">{prayerTimes.maghrib}</span>
             </div>
             <div className="flex flex-col items-center">
               <span className="text-xs text-muted-foreground">العشاء</span>
               <span className="font-bold" data-testid="text-prayer-isha">{prayerTimes.isha}</span>
             </div>
          </div>
        </div>
      </div>

      {displayStats.length > 0 && (
        <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-3' : 'lg:grid-cols-' + Math.min(displayStats.length, 4)} gap-3 md:gap-4`}>
          {displayStats.map((stat, i) => (
            <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow" data-testid={`card-stat-${i}`}>
              <CardContent className="p-3 md:p-6 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 truncate">{stat.title}</p>
                  <h3 className="text-lg md:text-2xl font-bold" data-testid={`text-stat-value-${i}`}>{loadingStats ? "..." : stat.value}</h3>
                </div>
                <div className={`p-2 md:p-3 rounded-full ${stat.bg} shrink-0`}>
                  <stat.icon className={`w-4 h-4 md:w-6 md:h-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {(isTeacher || isSupervisor || isAdmin) && (
        <Card className="shadow-sm border-l-4 border-l-primary bg-white">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              <CardTitle className="font-serif text-lg">جدول أعمال اليوم</CardTitle>
            </div>
            <Badge variant="outline" className="bg-primary/5">5 طلاب للمتابعة</Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="text-xs text-muted-foreground bg-muted/30 uppercase">
                  <tr>
                    <th className="px-4 py-3 rounded-r-lg">الوقت</th>
                    <th className="px-4 py-3">اسم الطالب</th>
                    <th className="px-4 py-3">المقرر (السورة)</th>
                    <th className="px-4 py-3">النوع</th>
                    <th className="px-4 py-3 rounded-l-lg">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {[
                    { time: "04:00 م", name: "عمر خالد", task: "البقرة (20-30)", type: "تسميع جديد", status: "waiting" },
                    { time: "04:30 م", name: "يوسف علي", task: "آل عمران (1-10)", type: "مراجعة", status: "waiting" },
                    { time: "05:00 م", name: "أحمد محمد", task: "الكهف (1-15)", type: "تسميع جديد", status: "done" },
                    { time: "05:30 م", name: "سعيد حسن", task: "الفاتحة", type: "تصحيح تلاوة", status: "waiting" },
                    { time: "06:00 م", name: "كريم محمود", task: "يس", type: "مراجعة", status: "waiting" },
                  ].map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/20 transition-colors" data-testid={`row-agenda-${idx}`}>
                      <td className="px-4 py-3 font-medium text-primary">{item.time}</td>
                      <td className="px-4 py-3 font-bold">{item.name}</td>
                      <td className="px-4 py-3">{item.task}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${item.type.includes('جديد') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.status === 'done' ? (
                          <span className="flex items-center gap-1 text-green-600 font-medium text-xs">
                            <CheckCircle className="w-3 h-3" /> تم
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-500 text-xs">
                            <Clock className="w-3 h-3" /> انتظار
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm border-none">
          <CardHeader>
             <div className="flex items-center justify-between">
              <CardTitle className="font-serif">إحصائيات الحفظ الأسبوعي</CardTitle>
              {isStudent && (
                 <div className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-medium flex items-center gap-2">
                   <Calendar className="w-4 h-4" />
                   الواجب القادم: اليوم 04:30 م
                 </div>
              )}
             </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { name: 'السبت', pages: 40 },
                  { name: 'الأحد', pages: 30 },
                  { name: 'الاثنين', pages: 55 },
                  { name: 'الثلاثاء', pages: 45 },
                  { name: 'الأربعاء', pages: 60 },
                  { name: 'الخميس', pages: 35 },
                  { name: 'الجمعة', pages: 20 },
                ]}>
                  <defs>
                    <linearGradient id="colorPages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  />
                  <Area type="monotone" dataKey="pages" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorPages)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="shadow-sm border-none bg-slate-50 dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-serif text-base">سجل النشاط الأمني</CardTitle>
              <ShieldCheck className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { user: "مدير النظام", action: "تصدير تقرير", time: "الآن", ip: "192.168.1.1" },
                  { user: "الشيخ أحمد", action: "تسجيل دخول", time: "قبل 5د", ip: "192.168.1.45" },
                  { user: "عمر خالد", action: "حفظ سورة", time: "قبل 12د", ip: "192.168.1.88" },
                  { user: "مجهول", action: "محاولة فاشلة", time: "قبل 15د", ip: "10.0.0.1", alert: true },
                ].map((log, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm pb-3 border-b last:border-0 border-slate-100" data-testid={`card-security-log-${i}`}>
                    <div className={`w-2 h-2 mt-1.5 rounded-full ${log.alert ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium">{log.user}</span>
                        <span className="text-xs text-muted-foreground">{log.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{log.action}</p>
                      {isAdmin && <p className="text-[10px] font-mono opacity-50 mt-1">IP: {log.ip}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

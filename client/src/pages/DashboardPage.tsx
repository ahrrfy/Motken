import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, CheckCircle, TrendingUp, Clock, MapPin, ShieldAlert, Activity, ShieldCheck, Calendar, BellRing } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Helper to get simulated prayer times for Baghdad
function getBaghdadPrayerTimes() {
  // Baghdad Coordinates
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

export default function DashboardPage() {
  const { user } = useAuth();
  const [prayerTimes, setPrayerTimes] = useState(getBaghdadPrayerTimes());
  const [showNotification, setShowNotification] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrayerTimes(getBaghdadPrayerTimes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const isAdmin = user?.role === 'admin';
  const isSupervisor = user?.role === 'supervisor';
  const isStudent = user?.role === 'student';

  const stats = [
    { title: "الطلاب النشطين", value: "124", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "الحلقات القائمة", value: "12", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-100" },
    { title: "أتموا الحفظ", value: "8", icon: CheckCircle, color: "text-amber-600", bg: "bg-amber-100" },
    { title: "نسبة التقدم", value: "68%", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
  ];

  const adminStats = [
     { title: "إجمالي التبرعات", value: "2.5M د.ع", icon: Activity, color: "text-green-700", bg: "bg-green-50" },
     { title: "محاولات دخول", value: "345", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" },
  ];

  const displayStats = isAdmin ? [...stats, ...adminStats] : stats;

  return (
    <div className="p-6 space-y-6">
      {/* Student Notification Alert */}
      {isStudent && showNotification && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <BellRing className="h-5 w-5 text-amber-600 animate-pulse" />
          <AlertTitle className="text-lg font-bold mb-1 mr-2">تنبيه: موعد التسميع اقترب!</AlertTitle>
          <AlertDescription className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mr-2">
            <div>
              لديك موعد تسميع <strong>سورة البقرة (الآيات 20-30)</strong> مع <strong>الشيخ أحمد</strong> بعد 15 دقيقة.
            </div>
            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
               <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white border-none" onClick={() => setShowNotification(false)}>
                 سأكون جاهزاً
               </Button>
               <Button size="sm" variant="outline" className="border-amber-300 hover:bg-amber-100 text-amber-800">
                 تأجيل 5 دقائق
               </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Top Bar with Location & Prayer Times */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-card p-4 rounded-xl shadow-sm border">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-serif">لوحة التحكم</h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <MapPin className="w-4 h-4" />
            <p>جامع النور الكبير - بغداد (الوقف السني)</p>
          </div>
        </div>

        {/* Prayer Times Strip */}
        <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-2 rounded-lg border border-primary/10 w-full xl:w-auto overflow-x-auto">
          <div className="flex items-center gap-2 px-3 border-l border-primary/20">
             <Clock className="w-5 h-5 text-primary" />
             <span className="font-bold text-primary text-sm whitespace-nowrap">أوقات الصلاة (بغداد):</span>
          </div>
          <div className="flex items-center gap-4 px-2 text-sm">
             <div className="flex flex-col items-center">
               <span className="text-xs text-muted-foreground">الفجر</span>
               <span className="font-bold">{prayerTimes.fajr}</span>
             </div>
             <div className="flex flex-col items-center">
               <span className="text-xs text-muted-foreground">الظهر</span>
               <span className="font-bold">{prayerTimes.dhuhr}</span>
             </div>
             <div className="flex flex-col items-center">
               <span className="text-xs text-muted-foreground">العصر</span>
               <span className="font-bold">{prayerTimes.asr}</span>
             </div>
             <div className="flex flex-col items-center">
               <span className="text-xs text-muted-foreground">المغرب</span>
               <span className="font-bold">{prayerTimes.maghrib}</span>
             </div>
             <div className="flex flex-col items-center">
               <span className="text-xs text-muted-foreground">العشاء</span>
               <span className="font-bold">{prayerTimes.isha}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-3 xl:grid-cols-3' : 'lg:grid-cols-4'} gap-4`}>
        {displayStats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                <h3 className="text-2xl font-bold">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-full ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
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

        {/* Security / Activity Feed for Admin/Supervisor */}
        {(isAdmin || isSupervisor) && (
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
                  <div key={i} className="flex items-start gap-3 text-sm pb-3 border-b last:border-0 border-slate-100">
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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, CheckCircle, TrendingUp, Clock, MapPin } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

const stats = [
  { title: "الطلاب النشطين", value: "124", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
  { title: "الحلقات القائمة", value: "12", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-100" },
  { title: "أتموا الحفظ", value: "8", icon: CheckCircle, color: "text-amber-600", bg: "bg-amber-100" },
  { title: "نسبة التقدم", value: "68%", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-100" },
];

const activityData = [
  { name: 'السبت', pages: 40 },
  { name: 'الأحد', pages: 30 },
  { name: 'الاثنين', pages: 55 },
  { name: 'الثلاثاء', pages: 45 },
  { name: 'الأربعاء', pages: 60 },
  { name: 'الخميس', pages: 35 },
  { name: 'الجمعة', pages: 20 },
];

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-serif">لوحة التحكم</h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <MapPin className="w-4 h-4" />
            <p>جامع النور الكبير - بغداد</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-card p-2 rounded-lg shadow-sm border">
          <Clock className="w-5 h-5 text-primary" />
          <div className="text-sm">
            <span className="font-bold">الفجر: </span> 05:12 ص |
            <span className="font-bold mx-1">الظهر: </span> 12:04 م
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
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
            <CardTitle className="font-serif">إحصائيات الحفظ الأسبوعي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
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

        <Card className="shadow-sm border-none">
          <CardHeader>
            <CardTitle className="font-serif">المتصلون الآن</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="relative">
                    <img src={`https://i.pravatar.cc/150?u=${i}`} className="w-10 h-10 rounded-full border" alt="User" />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">مستخدم {i + 1}</p>
                    <p className="text-xs text-muted-foreground">طالب - حلقة النور</p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Web</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

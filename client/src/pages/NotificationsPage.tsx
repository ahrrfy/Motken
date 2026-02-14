import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellRing, Calendar, CheckCheck, Clock, Info } from "lucide-react";

export default function NotificationsPage() {
  const notifications = [
    { id: 1, title: "موعد تسميع قادم", message: "لديك موعد تسميع سورة البقرة بعد 15 دقيقة", time: "الآن", type: "urgent", read: false },
    { id: 2, title: "واجب جديد", message: "تم تحديد واجب جديد من قبل الشيخ أحمد", time: "منذ ساعة", type: "info", read: false },
    { id: 3, title: "تقرير شهري", message: "صدر التقرير الشهري الخاص بتقدمك في الحفظ", time: "أمس", type: "success", read: true },
    { id: 4, title: "تنبيه إداري", message: "يرجى تحديث بيانات الملف الشخصي", time: "قبل يومين", type: "warning", read: true },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-primary">الإشعارات والتنبيهات</h1>
          <p className="text-muted-foreground">مركز الرسائل والتنبيهات الخاص بك</p>
        </div>
        <Button variant="outline" className="gap-2">
          <CheckCheck className="w-4 h-4" />
          تحديد الكل كمقروء
        </Button>
      </div>

      <div className="space-y-4">
        {notifications.map((notif) => (
          <Card key={notif.id} className={`transition-all hover:shadow-md ${!notif.read ? 'border-r-4 border-r-primary bg-primary/5' : ''}`}>
            <CardContent className="p-4 flex items-start gap-4">
              <div className={`p-3 rounded-full shrink-0 ${
                notif.type === 'urgent' ? 'bg-red-100 text-red-600' :
                notif.type === 'success' ? 'bg-green-100 text-green-600' :
                notif.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {notif.type === 'urgent' ? <BellRing className="w-5 h-5" /> :
                 notif.type === 'success' ? <CheckCheck className="w-5 h-5" /> :
                 notif.type === 'warning' ? <Info className="w-5 h-5" /> :
                 <Bell className="w-5 h-5" />}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <h4 className={`font-bold text-base ${!notif.read ? 'text-primary' : ''}`}>{notif.title}</h4>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {notif.time}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {notif.message}
                </p>
                {!notif.read && (
                  <Badge variant="secondary" className="mt-2 text-xs font-normal">جديد</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

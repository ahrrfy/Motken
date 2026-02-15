import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const defaultTab = isAdmin ? "profile" : "mosque";

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold font-serif text-primary">الإعدادات</h1>
      
      <Tabs defaultValue={defaultTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="w-max md:w-full justify-start h-12 bg-muted/50 p-1">
            {!isAdmin && (
              <TabsTrigger value="mosque" className="flex-1 max-w-[200px] whitespace-nowrap">بيانات المسجد</TabsTrigger>
            )}
            <TabsTrigger value="profile" className="flex-1 max-w-[200px] whitespace-nowrap">الملف الشخصي</TabsTrigger>
            <TabsTrigger value="general" className="flex-1 max-w-[200px] whitespace-nowrap">إعدادات النظام</TabsTrigger>
            <TabsTrigger value="notifications" className="flex-1 max-w-[200px] whitespace-nowrap">الإشعارات</TabsTrigger>
          </TabsList>
        </div>

        {!isAdmin && (
          <TabsContent value="mosque" className="space-y-6 mt-6">
             <Card>
              <CardHeader>
                <CardTitle>الملف التعريفي للمسجد</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم المسجد</Label>
                    <Input defaultValue={user?.mosqueName || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label>العنوان</Label>
                    <Input defaultValue="بغداد، الكرخ، حي الجامعة" />
                  </div>
                  <div className="space-y-2">
                    <Label>الإمام والخطيب</Label>
                    <Input defaultValue="الشيخ د. محمد أحمد" />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <Input defaultValue="07901234567" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>نبذة تعريفية</Label>
                    <Textarea placeholder="اكتب نبذة عن نشاطات المسجد..." className="min-h-[100px]" />
                  </div>
                </div>
                <Button className="bg-primary text-white">حفظ بيانات المسجد</Button>
              </CardContent>
             </Card>
          </TabsContent>
        )}

        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>بيانات المستخدم</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-20 h-20 rounded-full border-2 border-primary" />
                ) : (
                  <div className="w-20 h-20 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                    {user?.name?.charAt(0)}
                  </div>
                )}
                <Button variant="outline">تغيير الصورة</Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input defaultValue={user?.name} />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input defaultValue={user?.email || ""} />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input defaultValue={user?.phone || ""} />
                </div>
                <div className="space-y-2">
                  <Label>العنوان</Label>
                  <Input defaultValue={user?.address || ""} />
                </div>
              </div>
              <Button className="bg-primary text-white">حفظ التغييرات</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>المظهر واللغة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">الوضع الليلي</Label>
                  <p className="text-sm text-muted-foreground">تفعيل المظهر الداكن للتطبيق</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">اللغة</Label>
                  <p className="text-sm text-muted-foreground">لغة واجهة المستخدم</p>
                </div>
                 <Button variant="outline" className="w-[150px]">العربية</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-6 mt-6">
           <Card>
            <CardHeader>
              <CardTitle>تفضيلات الإشعارات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">تنبيهات الحلقات</Label>
                  <p className="text-sm text-muted-foreground">إشعار عند بدء الحلقة الدراسية</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">تذكير الحفظ اليومي</Label>
                  <p className="text-sm text-muted-foreground">تذكير يومي بمراجعة الورد القرآني</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">رسائل الإدارة</Label>
                  <p className="text-sm text-muted-foreground">استلام تعاميم من إدارة المركز</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

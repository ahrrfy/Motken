import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect, useCallback } from "react";
import { Eye, EyeOff, AArrowUp, AArrowDown, RotateCcw, Minus, Plus } from "lucide-react";
import { Slider } from "@/components/ui/slider";

const FONT_SIZE_KEY = "mutqin_font_size";
const FONT_SIZES = [14, 16, 18, 20, 22, 24];
const DEFAULT_FONT_SIZE = 16;

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const defaultTab = isAdmin ? "profile" : "mosque";

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [username, setUsername] = useState(user?.username || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_FONT_SIZE;
  });

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem(FONT_SIZE_KEY, String(fontSize));
  }, [fontSize]);

  const increaseFontSize = useCallback(() => {
    setFontSize(prev => {
      const idx = FONT_SIZES.indexOf(prev);
      return idx < FONT_SIZES.length - 1 ? FONT_SIZES[idx + 1] : prev;
    });
  }, []);

  const decreaseFontSize = useCallback(() => {
    setFontSize(prev => {
      const idx = FONT_SIZES.indexOf(prev);
      return idx > 0 ? FONT_SIZES[idx - 1] : prev;
    });
  }, []);

  const resetFontSize = useCallback(() => {
    setFontSize(DEFAULT_FONT_SIZE);
  }, []);

  const [saving, setSaving] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [message, setMessage] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [accountMessageType, setAccountMessageType] = useState<"success" | "error">("success");

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, phone, address }),
      });
      if (res.ok) {
        setMessage("تم حفظ التغييرات بنجاح. ستظهر التغييرات بعد تسجيل الخروج وإعادة الدخول");
        setMessageType("success");
      } else {
        const data = await res.json();
        setMessage(data.message || "فشل في حفظ التغييرات");
        setMessageType("error");
      }
    } catch {
      setMessage("حدث خطأ في الاتصال");
      setMessageType("error");
    }
    setSaving(false);
  };

  const handleSaveAccount = async () => {
    setAccountMessage("");

    if (newPassword && newPassword !== confirmPassword) {
      setAccountMessage("كلمة المرور الجديدة غير متطابقة");
      setAccountMessageType("error");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setAccountMessage("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      setAccountMessageType("error");
      return;
    }

    if (!username.trim()) {
      setAccountMessage("اسم المستخدم مطلوب");
      setAccountMessageType("error");
      return;
    }

    setSavingAccount(true);
    try {
      const updateData: any = {};
      if (username !== user?.username) updateData.username = username;
      if (newPassword) updateData.password = newPassword;

      if (Object.keys(updateData).length === 0) {
        setAccountMessage("لم يتم تغيير أي بيانات");
        setAccountMessageType("error");
        setSavingAccount(false);
        return;
      }

      const res = await fetch(`/api/users/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updateData),
      });
      if (res.ok) {
        setAccountMessage("تم حفظ التغييرات بنجاح. سيتم تسجيل خروجك الآن لتفعيل التغييرات...");
        setAccountMessageType("success");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          logout();
        }, 2000);
      } else {
        const data = await res.json();
        setAccountMessage(data.message || "فشل في حفظ التغييرات");
        setAccountMessageType("error");
      }
    } catch {
      setAccountMessage("حدث خطأ في الاتصال");
      setAccountMessageType("error");
    }
    setSavingAccount(false);
  };

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
            {isAdmin && (
              <TabsTrigger value="account" className="flex-1 max-w-[200px] whitespace-nowrap">حساب المدير</TabsTrigger>
            )}
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
                    <Input defaultValue="" />
                  </div>
                  <div className="space-y-2">
                    <Label>الإمام والخطيب</Label>
                    <Input defaultValue="" />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف</Label>
                    <Input defaultValue="" />
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
              </div>
              
              {message && (
                <div className={`p-3 rounded-md text-sm text-center ${messageType === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-destructive/10 text-destructive"}`}>
                  {message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الاسم الكامل</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="input-settings-name" />
                </div>
                <div className="space-y-2">
                  <Label>البريد الإلكتروني</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-settings-email" />
                </div>
                <div className="space-y-2">
                  <Label>رقم الهاتف</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-settings-phone" />
                </div>
                <div className="space-y-2">
                  <Label>العنوان</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} data-testid="input-settings-address" />
                </div>
              </div>
              <Button className="bg-primary text-white" onClick={handleSaveProfile} disabled={saving} data-testid="button-save-profile">
                {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="account" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>إعدادات حساب مدير النظام</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">يمكنك تغيير اسم المستخدم وكلمة المرور. سيتم تسجيل خروجك تلقائياً بعد الحفظ لتفعيل التغييرات.</p>

                {accountMessage && (
                  <div className={`p-3 rounded-md text-sm text-center ${accountMessageType === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-destructive/10 text-destructive"}`}>
                    {accountMessage}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>اسم المستخدم</Label>
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} data-testid="input-admin-username" />
                  </div>

                  <div className="space-y-2">
                    <Label>كلمة المرور الجديدة</Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="اتركه فارغاً إذا لا تريد التغيير"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10"
                        data-testid="input-admin-new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>تأكيد كلمة المرور الجديدة</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="أعد كتابة كلمة المرور الجديدة"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10"
                        data-testid="input-admin-confirm-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button className="bg-primary text-white" onClick={handleSaveAccount} disabled={savingAccount} data-testid="button-save-account">
                  {savingAccount ? "جاري الحفظ..." : "حفظ وتسجيل الخروج"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

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

          <Card>
            <CardHeader>
              <CardTitle>حجم الخط</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">حجم خط الواجهة</Label>
                    <p className="text-sm text-muted-foreground">تكبير أو تصغير حجم النصوص في التطبيق</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-primary min-w-[40px] text-center">{fontSize}px</span>
                    {fontSize !== DEFAULT_FONT_SIZE && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={resetFontSize}
                        className="h-8 w-8"
                        title="إعادة تعيين"
                        data-testid="button-font-reset"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={decreaseFontSize}
                    disabled={fontSize <= FONT_SIZES[0]}
                    className="h-9 w-9 shrink-0"
                    data-testid="button-font-decrease"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>

                  <div className="flex-1 relative">
                    <Slider
                      value={[FONT_SIZES.indexOf(fontSize)]}
                      min={0}
                      max={FONT_SIZES.length - 1}
                      step={1}
                      onValueChange={([val]) => setFontSize(FONT_SIZES[val])}
                      className="w-full"
                      data-testid="slider-font-size"
                    />
                    <div className="flex justify-between mt-1 px-1">
                      <span className="text-[10px] text-muted-foreground">صغير</span>
                      <span className="text-[10px] text-muted-foreground">كبير</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={increaseFontSize}
                    disabled={fontSize >= FONT_SIZES[FONT_SIZES.length - 1]}
                    className="h-9 w-9 shrink-0"
                    data-testid="button-font-increase"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-2">معاينة:</p>
                  <p style={{ fontSize: `${fontSize}px` }}>بسم الله الرحمن الرحيم - هذا نص تجريبي لمعاينة حجم الخط</p>
                </div>
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

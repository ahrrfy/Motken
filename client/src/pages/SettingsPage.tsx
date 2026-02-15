import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useState, useEffect, useCallback, useRef } from "react";
import { Eye, EyeOff, AArrowUp, AArrowDown, RotateCcw, Minus, Plus, Camera, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import DevicePermissions from "@/components/DevicePermissions";

const FONT_SIZE_KEY = "mutqin_font_size";
const DEFAULT_FONT_SIZE = 16;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 28;

const FONT_PRESETS = [
  { label: "صغير جداً", size: 12 },
  { label: "صغير", size: 14 },
  { label: "متوسط", size: 16 },
  { label: "كبير", size: 18 },
  { label: "كبير جداً", size: 22 },
  { label: "ضخم", size: 28 },
];

function getFontCategory(size: number): string {
  if (size <= 12) return "صغير جداً";
  if (size <= 14) return "صغير";
  if (size <= 16) return "متوسط";
  if (size <= 18) return "كبير";
  if (size <= 22) return "كبير جداً";
  return "ضخم";
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { isDark, toggleDark, language, setLanguage } = useTheme();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";
  const defaultTab = isAdmin ? "profile" : "mosque";
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.avatar);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
  const [gender, setGender] = useState(user?.gender || "male");
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
    setFontSize(prev => Math.min(prev + 1, MAX_FONT_SIZE));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setFontSize(prev => Math.max(prev - 1, MIN_FONT_SIZE));
  }, []);

  const resetFontSize = useCallback(() => {
    setFontSize(DEFAULT_FONT_SIZE);
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "خطأ", description: "يرجى اختيار ملف صورة", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const base64 = evt.target?.result as string;
      if (base64.length > 500000) {
        toast({ title: "خطأ", description: "حجم الصورة كبير جداً (الحد الأقصى ~375KB)", variant: "destructive" });
        return;
      }
      setAvatarPreview(base64);
      setUploadingAvatar(true);
      try {
        const res = await fetch(`/api/users/${user?.id}/avatar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ avatar: base64 }),
        });
        if (res.ok) {
          toast({ title: "تم بنجاح", description: "تم تحديث الصورة الشخصية", className: "bg-green-50 border-green-200 text-green-800" });
        } else {
          const data = await res.json();
          toast({ title: "خطأ", description: data.message || "فشل في تحديث الصورة", variant: "destructive" });
          setAvatarPreview(user?.avatar);
        }
      } catch {
        toast({ title: "خطأ", description: "حدث خطأ في الاتصال", variant: "destructive" });
        setAvatarPreview(user?.avatar);
      }
      setUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

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
        body: JSON.stringify({ name, phone, address, gender }),
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
            {isAdmin && (
              <TabsTrigger value="system-management" className="flex-1 max-w-[200px] whitespace-nowrap text-red-600">إدارة النظام</TabsTrigger>
            )}
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
                <div className="relative">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-full border-2 border-primary object-cover" data-testid="img-settings-avatar" />
                  ) : (
                    <div className="w-20 h-20 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                      {user?.name?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    ref={avatarInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                    data-testid="input-avatar-file"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="gap-2"
                    data-testid="button-change-avatar"
                  >
                    <Camera className="w-4 h-4" />
                    {uploadingAvatar ? "جاري الرفع..." : "تغيير الصورة"}
                  </Button>
                </div>
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
                  <Label>رقم الهاتف</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-settings-phone" />
                </div>
                <div className="space-y-2">
                  <Label>العنوان</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} data-testid="input-settings-address" />
                </div>
                <div className="space-y-2">
                  <Label>الجنس</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger data-testid="select-settings-gender">
                      <SelectValue placeholder="اختر الجنس" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                    </SelectContent>
                  </Select>
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
                <Switch checked={isDark} onCheckedChange={toggleDark} data-testid="switch-dark-mode" />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">اللغة</Label>
                  <p className="text-sm text-muted-foreground">لغة واجهة المستخدم</p>
                </div>
                 <Select value={language} onValueChange={(val) => setLanguage(val as "ar" | "en")} data-testid="select-language">
                    <SelectTrigger className="w-[150px]" data-testid="select-language-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ar">العربية</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium" data-testid="text-font-category">
                      {getFontCategory(fontSize)}
                    </span>
                    <span className="text-sm font-bold text-primary min-w-[40px] text-center" data-testid="text-font-size">{fontSize}px</span>
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
                    disabled={fontSize <= MIN_FONT_SIZE}
                    className="h-9 w-9 shrink-0"
                    data-testid="button-font-decrease"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>

                  <div className="flex-1 relative">
                    <Slider
                      value={[fontSize]}
                      min={MIN_FONT_SIZE}
                      max={MAX_FONT_SIZE}
                      step={1}
                      onValueChange={([val]) => setFontSize(val)}
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
                    disabled={fontSize >= MAX_FONT_SIZE}
                    className="h-9 w-9 shrink-0"
                    data-testid="button-font-increase"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {FONT_PRESETS.map((preset) => (
                    <Button
                      key={preset.size}
                      variant={fontSize === preset.size ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFontSize(preset.size)}
                      className="text-xs"
                      data-testid={`button-font-preset-${preset.size}`}
                    >
                      {preset.label} ({preset.size})
                    </Button>
                  ))}
                </div>

                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-2">معاينة:</p>
                  <p style={{ fontSize: `${fontSize}px` }} data-testid="text-font-preview">بسم الله الرحمن الرحيم - هذا نص تجريبي لمعاينة حجم الخط</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-6 mt-6">
           <DevicePermissions />
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

        {isAdmin && (
          <TabsContent value="system-management" className="space-y-6 mt-6">
            <SystemResetSection />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function SystemResetSection() {
  const { toast } = useToast();
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleReset = async () => {
    if (!resetPassword) {
      toast({ title: "خطأ", description: "يرجى إدخال كلمة مرور المدير", variant: "destructive" });
      return;
    }
    if (confirmText !== "تصفير النظام") {
      toast({ title: "خطأ", description: "يرجى كتابة 'تصفير النظام' للتأكيد", variant: "destructive" });
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/system/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: resetPassword }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم تصفير النظام بالكامل", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        setResetPassword("");
        setConfirmText("");
        window.location.reload();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في تصفير النظام", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card className="border-red-200 bg-red-50/30 dark:bg-red-950/10 dark:border-red-900">
      <CardHeader>
        <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          منطقة الخطر - تصفير النظام
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-red-100/50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-300 font-medium mb-2">تحذير: هذا الإجراء لا يمكن التراجع عنه!</p>
          <p className="text-sm text-red-700 dark:text-red-400">سيتم حذف جميع البيانات التالية نهائياً:</p>
          <ul className="text-sm text-red-700 dark:text-red-400 mt-2 space-y-1 list-disc list-inside">
            <li>جميع المساجد المسجلة</li>
            <li>جميع حسابات المشرفين والأساتذة والطلاب</li>
            <li>جميع الواجبات والامتحانات والتقييمات</li>
            <li>جميع الدورات والشهادات</li>
            <li>جميع الإشعارات وسجلات النشاط</li>
          </ul>
          <p className="text-sm text-red-800 dark:text-red-300 font-medium mt-3">سيبقى حساب المدير فقط.</p>
        </div>

        <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full sm:w-auto" data-testid="button-open-reset">
              <Trash2 className="w-4 h-4 ml-2" />
              مسح جميع البيانات وتصفير النظام
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                تأكيد تصفير النظام
              </AlertDialogTitle>
              <AlertDialogDescription className="text-right">
                هذا الإجراء سيحذف جميع البيانات المدخلة بشكل نهائي ولا يمكن التراجع عنه.
                يرجى إدخال كلمة مرور المدير وكتابة "تصفير النظام" للتأكيد.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>كلمة مرور المدير</Label>
                <div className="relative">
                  <Input
                    type={showResetPassword ? "text" : "password"}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="أدخل كلمة مرور المدير"
                    className="pl-10"
                    data-testid="input-reset-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute left-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>اكتب "تصفير النظام" للتأكيد</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder='اكتب: تصفير النظام'
                  dir="rtl"
                  data-testid="input-reset-confirm"
                />
              </div>
            </div>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel data-testid="button-cancel-reset">إلغاء</AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleReset}
                disabled={resetting || !resetPassword || confirmText !== "تصفير النظام"}
                data-testid="button-confirm-reset"
              >
                {resetting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                تأكيد التصفير النهائي
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

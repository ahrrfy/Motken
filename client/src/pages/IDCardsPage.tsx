import { useRef, useState, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Printer, Users, CreditCard, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { formatDateAr } from "@/lib/utils";

interface UserData {
  id: string;
  username: string;
  name: string;
  role: string;
  mosqueId?: string | null;
  email?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface Mosque {
  id: string;
  name: string;
  city?: string;
  address?: string;
}

const roleTranslations: Record<string, string> = {
  student: "طالب",
  teacher: "أستاذ",
  supervisor: "مشرف",
  admin: "مدير",
};

const roleGroupLabels: Record<string, string> = {
  student: "طلاب",
  teacher: "أساتذة",
  supervisor: "مشرفين",
  admin: "مدراء",
};

function formatUserId(id: string): string {
  const year = new Date().getFullYear();
  const last4 = id.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase().padStart(4, "0");
  return `MTQ-${year}-${last4}`;
}

function formatDate(dateStr?: string): string {
  return formatDateAr(dateStr);
}

function IDCard({ user, mosqueName }: { user: UserData; mosqueName: string }) {
  return (
    <div
      className="bg-white w-[320px] rounded-2xl shadow-xl overflow-hidden border border-gray-200 print:shadow-none print:border print:border-gray-300 flex flex-col"
      dir="rtl"
      data-testid={`card-idcard-${user.id}`}
    >
      <div className="h-[90px] bg-primary relative overflow-hidden shrink-0">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`islamic-${user.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M20 0L40 20L20 40L0 20Z" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="20" cy="20" r="8" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#islamic-${user.id})`} />
          </svg>
        </div>
        <div className="absolute inset-0 flex items-center justify-center text-white z-10 gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 shrink-0">
            <span className="font-bold text-lg">م</span>
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold tracking-wide leading-tight">مُتْقِن</h2>
            <p className="text-[10px] opacity-80">لإدارة حلقات القرآن الكريم</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center pt-5 pb-3 px-5">
        <div className="w-[76px] h-[76px] rounded-full border-3 border-primary/20 shadow-md overflow-hidden bg-primary/5 flex items-center justify-center mb-3">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" data-testid={`img-avatar-${user.id}`} />
          ) : (
            <span className="text-3xl font-bold text-primary" data-testid={`text-avatar-letter-${user.id}`}>
              {user.name.charAt(0)}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-gray-800 text-center leading-tight" data-testid={`text-user-name-${user.id}`}>{user.name}</h3>
        <Badge variant="secondary" className="mt-1.5 text-xs" data-testid={`badge-role-${user.id}`}>
          {roleTranslations[user.role] || user.role}
        </Badge>
      </div>

      <div className="mx-5 mb-3 space-y-2 text-[13px] text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 shrink-0">رقم الهوية</span>
          <span className="font-mono font-semibold text-primary text-xs" data-testid={`text-userid-${user.id}`}>{formatUserId(user.id)}</span>
        </div>
        {mosqueName && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400 shrink-0">المسجد</span>
            <span className="font-medium text-xs truncate max-w-[160px] text-left" data-testid={`text-mosque-${user.id}`}>{mosqueName}</span>
          </div>
        )}
        {user.phone && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400 shrink-0">الهاتف</span>
            <span dir="ltr" className="text-xs" data-testid={`text-phone-${user.id}`}>{user.phone}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-gray-400 shrink-0">تاريخ الانضمام</span>
          <span className="text-xs" data-testid={`text-joindate-${user.id}`}>{formatDate(user.createdAt)}</span>
        </div>
      </div>

      <div className="flex flex-col items-center pb-4 mt-auto">
        <div className="p-1.5 bg-white border rounded-lg shadow-sm">
          <QRCodeSVG
            value={JSON.stringify({ id: user.id, name: user.name, role: user.role })}
            size={70}
            data-testid={`qr-code-${user.id}`}
          />
        </div>
        <p className="text-[9px] text-gray-400 mt-1">امسح الرمز للتحقق من الهوية</p>
      </div>

      <div className="w-full h-1.5 bg-primary/80 shrink-0"></div>
    </div>
  );
}

export default function IDCardsPage() {
  const { user: authUser } = useAuth();
  const printRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [filterRole, setFilterRole] = useState<string>("all");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, mosquesRes] = await Promise.all([
          fetch("/api/users", { credentials: "include" }),
          fetch("/api/mosques", { credentials: "include" }),
        ]);
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }
        if (mosquesRes.ok) {
          const mosquesData = await mosquesRes.json();
          setMosques(Array.isArray(mosquesData) ? mosquesData : [mosquesData]);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "بطاقات الهوية - مُتْقِن",
  });

  const mosqueMap = new Map(mosques.map((m) => [m.id, m.name]));

  const getMosqueName = (mosqueId?: string | null) => {
    if (!mosqueId) return "";
    return mosqueMap.get(mosqueId) || "";
  };

  const groupedUsers = {
    student: users.filter((u) => u.role === "student"),
    teacher: users.filter((u) => u.role === "teacher"),
    supervisor: users.filter((u) => u.role === "supervisor"),
    admin: users.filter((u) => u.role === "admin"),
  };

  const filteredUsers = filterRole === "all" ? users : users.filter((u) => u.role === filterRole);

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const selectedUsers = users.filter((u) => selectedUserIds.has(u.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-idcards">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-primary flex items-center gap-2" data-testid="text-idcards-title">
            <CreditCard className="w-7 h-7" />
            بطاقات الهوية
          </h1>
          <p className="text-muted-foreground mt-1">طباعة بطاقات التعريف والـ QR Code</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <Select value={filterRole} onValueChange={setFilterRole} data-testid="select-filter-role">
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-filter-role-trigger">
              <SelectValue placeholder="تصفية حسب الدور" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="student">طلاب</SelectItem>
              <SelectItem value="teacher">أساتذة</SelectItem>
              <SelectItem value="supervisor">مشرفين</SelectItem>
              <SelectItem value="admin">مدراء</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => handlePrint()}
            className="bg-primary hover:bg-primary/90"
            disabled={selectedUsers.length === 0}
            data-testid="button-print-idcard"
          >
            <Printer className="w-4 h-4 ml-2" />
            طباعة ({selectedUsers.length})
          </Button>
        </div>
      </div>

      {users.length === 0 ? (
        <Card data-testid="empty-idcards">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Users className="w-16 h-16 text-muted-foreground/30" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-muted-foreground">لا يوجد مستخدمون</h3>
              <p className="text-sm text-muted-foreground/70">لم يتم العثور على مستخدمين لإنشاء بطاقات هوية</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Checkbox
                  checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                  onCheckedChange={toggleAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-sm font-medium text-muted-foreground">
                  تحديد الكل ({filteredUsers.length} مستخدم)
                </span>
                {selectedUserIds.size > 0 && (
                  <Badge variant="secondary" data-testid="badge-selected-count">
                    {selectedUserIds.size} محدد
                  </Badge>
                )}
              </div>

              <div className="space-y-4">
                {(filterRole === "all"
                  ? (["student", "teacher", "supervisor", "admin"] as const)
                  : [filterRole]
                ).map((role) => {
                  const roleUsers = filterRole === "all" ? groupedUsers[role as keyof typeof groupedUsers] : filteredUsers;
                  if (!roleUsers || roleUsers.length === 0) return null;
                  return (
                    <div key={role} data-testid={`group-${role}`}>
                      {filterRole === "all" && (
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {roleGroupLabels[role]} ({roleUsers.length})
                        </h3>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                        {roleUsers.map((u) => (
                          <label
                            key={u.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedUserIds.has(u.id)
                                ? "bg-primary/5 border-primary/30"
                                : "bg-background hover:bg-muted/50 border-border"
                            }`}
                            data-testid={`user-select-${u.id}`}
                          >
                            <Checkbox
                              checked={selectedUserIds.has(u.id)}
                              onCheckedChange={() => toggleUser(u.id)}
                              data-testid={`checkbox-user-${u.id}`}
                            />
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold text-primary">{u.name.charAt(0)}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{roleTranslations[u.role] || u.role}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedUsers.length > 0 && (
            <div className="bg-muted/20 rounded-xl p-6" data-testid="preview-section">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                معاينة البطاقات ({selectedUsers.length})
              </h2>
              <div
                ref={printRef}
                className="flex flex-wrap justify-center gap-6 print:gap-4"
                data-testid="print-area"
              >
                {selectedUsers.map((u) => (
                  <IDCard key={u.id} user={u} mosqueName={getMosqueName(u.mosqueId)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

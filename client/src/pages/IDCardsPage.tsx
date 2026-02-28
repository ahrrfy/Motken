import { useRef, useState, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Printer, Users, CreditCard, Loader2, FileDown, ChevronDown, Image } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { formatDateAr } from "@/lib/utils";

interface UserData {
  id: string;
  username: string;
  name: string;
  role: string;
  mosqueId?: string | null;
  phone?: string;
  address?: string;
  avatar?: string;
  isActive?: boolean;
  createdAt?: string;
  level?: number | null;
}

const levelNames = ["مبتدئ", "متوسط", "متقدم", "متميز", "خبير", "حافظ"];
const levelColors = [
  { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", hex: "#3b82f6", hexBg: "#dbeafe" },
  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", hex: "#10b981", hexBg: "#d1fae5" },
  { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300", hex: "#8b5cf6", hexBg: "#ede9fe" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", hex: "#f59e0b", hexBg: "#fef3c7" },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", hex: "#f97316", hexBg: "#ffedd5" },
  { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", hex: "#ef4444", hexBg: "#fee2e2" },
];

function getLevelInfo(level?: number | null) {
  if (!level || level < 1 || level > 6) return null;
  return { name: levelNames[level - 1], colors: levelColors[level - 1] };
}

interface Mosque {
  id: string;
  name: string;
  city?: string;
  address?: string;
  image?: string | null;
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

async function generateQRDataURL(data: string): Promise<string> {
  return QRCode.toDataURL(data, { width: 80, margin: 1 });
}

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function generateIDCardHtml(user: UserData, mosqueName: string, qrDataUrl: string, mosqueImage?: string): string {
  const roleLabel = roleTranslations[user.role] || user.role;
  const formattedId = formatUserId(user.id);
  const joinDate = formatDate(user.createdAt);
  const levelInfo = getLevelInfo(user.level);
  const safeName = esc(user.name || "");
  const safeMosqueName = esc(mosqueName || "");
  const avatarSection = user.avatar
    ? `<img src="${esc(user.avatar)}" alt="${safeName}" style="width:100%;height:100%;object-fit:cover;" />`
    : `<span style="font-size:24px;font-weight:bold;color:#16213e;">${safeName.charAt(0)}</span>`;

  const mosqueLogoSection = mosqueImage
    ? `<div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.3);overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
        <img src="${esc(mosqueImage)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />
      </div>`
    : "";

  const headerTitle = safeMosqueName
    ? `<h2 style="font-size:12px;font-weight:bold;margin:0;line-height:1.2;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,0.3);">${safeMosqueName}</h2>`
    : `<h2 style="font-size:14px;font-weight:bold;letter-spacing:1px;margin:0;line-height:1.2;text-shadow:0 1px 2px rgba(0,0,0,0.3);">مُتْقِن</h2>`;

  const levelBadgeHtml = levelInfo
    ? `<span style="display:inline-block;margin-top:3px;padding:1px 8px;border-radius:9999px;background:${levelInfo.colors.hexBg};color:${levelInfo.colors.hex};font-size:9px;font-weight:600;border:1px solid ${levelInfo.colors.hex}30;">${levelInfo.name}</span>`
    : "";

  const levelRowHtml = levelInfo
    ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
        <span style="color:#9ca3af;font-size:10px;">المستوى</span>
        <span style="font-weight:500;font-size:10px;color:${levelInfo.colors.hex};">${levelInfo.name}</span>
      </div>`
    : "";

  return `
    <div style="width:9cm;height:6cm;border-radius:12px;overflow:hidden;border:2px solid #e5e7eb;background:white;display:inline-flex;flex-direction:column;margin:8px;page-break-inside:avoid;font-family:'Tajawal',sans-serif;position:relative;" dir="rtl">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(to left,#3b82f6,#8b5cf6,#ec4899);"></div>
      <div style="height:60px;background:linear-gradient(to left,#16213e,#1a1a2e,#0f3460);position:relative;overflow:hidden;flex-shrink:0;">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;opacity:0.1;">
          <defs>
            <pattern id="p-${user.id}" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M20 0L40 20L20 40L0 20Z" fill="none" stroke="white" stroke-width="0.5"/>
              <circle cx="20" cy="20" r="8" fill="none" stroke="white" stroke-width="0.5"/>
              <circle cx="20" cy="20" r="3" fill="none" stroke="white" stroke-width="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#p-${user.id})"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;color:white;padding:0 12px;z-index:10;">
          <div style="display:flex;align-items:center;gap:8px;">
            ${mosqueLogoSection}
            <div>
              ${headerTitle}
              <p style="font-size:8px;opacity:0.8;margin:0;">لإدارة حلقات القرآن الكريم</p>
            </div>
          </div>
          <div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.3);box-shadow:0 2px 8px rgba(0,0,0,0.2);">
            <img src="/logo.png" style="width:28px;height:28px;border-radius:50%;object-fit:contain;" />
          </div>
        </div>
      </div>
      <div style="display:flex;flex:1;padding:8px 10px 4px;gap:10px;align-items:stretch;">
        <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;justify-content:center;">
          <div style="width:56px;height:56px;border-radius:50%;border:3px solid rgba(22,33,62,0.2);overflow:hidden;background:linear-gradient(135deg,rgba(22,33,62,0.1),rgba(22,33,62,0.05));display:flex;align-items:center;justify-content:center;margin-bottom:4px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
            ${avatarSection}
          </div>
          <h3 style="font-size:13px;font-weight:bold;color:#1f2937;text-align:center;margin:0;line-height:1.2;">${safeName}</h3>
          <span style="display:inline-block;margin-top:2px;padding:1px 8px;border-radius:9999px;background:#f3f4f6;color:#4b5563;font-size:10px;">${roleLabel}</span>
          ${levelBadgeHtml}
        </div>
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
          <div style="padding:5px 8px;background:linear-gradient(135deg,#f9fafb,#f1f5f9);border-radius:8px;border:1px solid #e2e8f0;font-size:11px;color:#4b5563;box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
              <span style="color:#9ca3af;font-size:10px;">رقم الهوية</span>
              <span style="font-family:monospace;font-weight:600;color:#16213e;font-size:10px;background:rgba(22,33,62,0.05);padding:1px 4px;border-radius:4px;">${formattedId}</span>
            </div>
            ${safeMosqueName ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
              <span style="color:#9ca3af;font-size:10px;">الجامع/المركز</span>
              <span style="font-weight:500;font-size:10px;">${safeMosqueName}</span>
            </div>` : ""}
            ${levelRowHtml}
            ${user.phone ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
              <span style="color:#9ca3af;font-size:10px;">الهاتف</span>
              <span dir="ltr" style="font-size:10px;">${esc(user.phone)}</span>
            </div>` : ""}
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="color:#9ca3af;font-size:10px;">الانضمام</span>
              <span style="font-size:10px;">${joinDate}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:center;margin-top:5px;gap:4px;">
            <div style="padding:3px;background:white;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              <img src="${qrDataUrl}" style="width:58px;height:58px;" alt="QR" />
            </div>
            <p style="font-size:7px;color:#9ca3af;writing-mode:vertical-rl;transform:rotate(180deg);">امسح للتحقق</p>
          </div>
        </div>
      </div>
      <div style="width:100%;height:5px;background:linear-gradient(to left,#3b82f6,#8b5cf6,#ec4899);flex-shrink:0;"></div>
    </div>
  `;
}

function QRCodeImage({ value, size }: { value: string; size: number }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(value, {
      width: size * 3,
      margin: 1,
      errorCorrectionLevel: "M",
    }).then(setDataUrl).catch(() => {});
  }, [value, size]);

  if (!dataUrl) return <div style={{ width: size, height: size }} />;
  return <img src={dataUrl} alt="QR" width={size} height={size} style={{ imageRendering: "pixelated" }} />;
}

function IDCard({ user, mosqueName, mosqueImage }: { user: UserData; mosqueName: string; mosqueImage?: string }) {
  const levelInfo = getLevelInfo(user.level);

  return (
    <div
      className="bg-white w-[340px] rounded-2xl shadow-xl overflow-hidden border-2 border-gray-200 print:shadow-none print:border print:border-gray-300 flex flex-col relative"
      dir="rtl"
      data-testid={`card-idcard-${user.id}`}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-l from-blue-500 via-purple-500 to-pink-500" data-testid={`decorative-border-top-${user.id}`} />

      <div className="h-[60px] bg-gradient-to-l from-[#16213e] via-[#1a1a2e] to-[#0f3460] relative overflow-hidden shrink-0" data-testid={`card-header-${user.id}`}>
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`islamic-${user.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M20 0L40 20L20 40L0 20Z" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="20" cy="20" r="8" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="20" cy="20" r="3" fill="none" stroke="white" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#islamic-${user.id})`} />
          </svg>
        </div>
        <div className="absolute inset-0 flex items-center justify-between text-white z-10 px-3">
          <div className="flex items-center gap-2">
            {mosqueImage ? (
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 shrink-0 overflow-hidden shadow-lg">
                <img src={mosqueImage} className="w-8 h-8 rounded-full object-cover" />
              </div>
            ) : null}
            <div>
              {mosqueName && <h2 className="font-serif text-[12px] font-bold leading-tight truncate max-w-[150px] drop-shadow-sm">{mosqueName}</h2>}
              {!mosqueName && <h2 className="font-serif text-sm font-bold tracking-wide leading-tight drop-shadow-sm">مُتْقِن</h2>}
              <p className="text-[8px] opacity-80">لإدارة حلقات القرآن الكريم</p>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30 shrink-0 shadow-lg">
            <img src="/logo.png" className="w-7 h-7 rounded-full object-contain" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 px-3 py-2 gap-3">
        <div className="flex flex-col items-center shrink-0 justify-center">
          <div className="w-[56px] h-[56px] rounded-full border-3 border-primary/30 shadow-lg overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-1.5 ring-2 ring-primary/10 ring-offset-1" data-testid={`avatar-container-${user.id}`}>
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" data-testid={`img-avatar-${user.id}`} />
            ) : (
              <span className="text-2xl font-bold text-primary" data-testid={`text-avatar-letter-${user.id}`}>
                {user.name.charAt(0)}
              </span>
            )}
          </div>
          <h3 className="text-[13px] font-bold text-gray-800 text-center leading-tight" data-testid={`text-user-name-${user.id}`}>{user.name}</h3>
          <Badge variant="secondary" className="mt-0.5 text-[10px] px-2 py-0" data-testid={`badge-role-${user.id}`}>
            {roleTranslations[user.role] || user.role}
          </Badge>
          {levelInfo && (
            <span
              className={`mt-1 text-[9px] px-2 py-0.5 rounded-full font-semibold border ${levelInfo.colors.bg} ${levelInfo.colors.text} ${levelInfo.colors.border}`}
              data-testid={`badge-level-${user.id}`}
            >
              {levelInfo.name}
            </span>
          )}
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="space-y-1.5 text-[11px] text-gray-600 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg p-2.5 border border-gray-100 shadow-sm" data-testid={`info-section-${user.id}`}>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 shrink-0 text-[10px]">رقم الهوية</span>
              <span className="font-mono font-semibold text-primary text-[10px] bg-primary/5 px-1.5 py-0.5 rounded" data-testid={`text-userid-${user.id}`}>{formatUserId(user.id)}</span>
            </div>
            {mosqueName && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400 shrink-0 text-[10px]">الجامع/المركز</span>
                <span className="font-medium text-[10px] truncate max-w-[120px] text-left" data-testid={`text-mosque-${user.id}`}>{mosqueName}</span>
              </div>
            )}
            {levelInfo && (
              <div className="flex justify-between items-center" data-testid={`row-level-${user.id}`}>
                <span className="text-gray-400 shrink-0 text-[10px]">المستوى</span>
                <span className="font-medium text-[10px]" style={{ color: levelInfo.colors.hex }}>{levelInfo.name}</span>
              </div>
            )}
            {user.phone && (
              <div className="flex justify-between items-center">
                <span className="text-gray-400 shrink-0 text-[10px]">الهاتف</span>
                <span dir="ltr" className="text-[10px]" data-testid={`text-phone-${user.id}`}>{user.phone}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-400 shrink-0 text-[10px]">الانضمام</span>
              <span className="text-[10px]" data-testid={`text-joindate-${user.id}`}>{formatDate(user.createdAt)}</span>
            </div>
          </div>

          <div className="flex items-center justify-center mt-1.5 gap-1">
            <div className="p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
              <QRCodeImage
                value={JSON.stringify({ id: user.id, name: user.name, role: user.role })}
                size={58}
              />
            </div>
            <p className="text-[7px] text-gray-400 writing-vertical-rl" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>امسح للتحقق</p>
          </div>
        </div>
      </div>

      <div className="w-full h-1.5 bg-gradient-to-l from-blue-500 via-purple-500 to-pink-500 shrink-0" data-testid={`decorative-border-bottom-${user.id}`} />
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

  const mosqueMap = new Map(mosques.map((m) => [m.id, m]));

  const getMosqueName = (mosqueId?: string | null) => {
    if (!mosqueId) return "";
    return mosqueMap.get(mosqueId)?.name || "";
  };

  const getMosqueImage = (mosqueId?: string | null) => {
    if (!mosqueId) return "";
    return mosqueMap.get(mosqueId)?.image || "";
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

  const handleIndividualExport = async () => {
    for (const u of selectedUsers) {
      const qrData = JSON.stringify({ id: u.id, name: u.name, role: u.role });
      const qrDataUrl = await generateQRDataURL(qrData);
      const cardHtml = generateIDCardHtml(u, getMosqueName(u.mosqueId), qrDataUrl, getMosqueImage(u.mosqueId));
      const win = window.open("", "_blank");
      if (!win) return;
      const safeName = (u.name || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>هوية - ${safeName}</title><style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Tajawal', sans-serif; display: flex; justify-content: center; align-items: flex-start; padding: 10px; background: white; }
        .actions-bar { position: fixed; top: 0; left: 0; right: 0; background: #16213e; color: white; padding: 10px 20px; display: flex; gap: 10px; justify-content: center; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
        .actions-bar button { padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-family: 'Tajawal', sans-serif; font-size: 14px; font-weight: 500; }
        .btn-print { background: #e94560; color: white; }
        .btn-close { background: #555; color: white; }
        .card-area { margin-top: 60px; }
        @media print { .actions-bar { display: none !important; } .card-area { margin-top: 0; } @page { size: 9cm 6cm; margin: 0; } body { padding: 0; } }
      </style></head><body>
      <div class="actions-bar">
        <button class="btn-print" onclick="window.print()">🖨️ طباعة</button>
        <button class="btn-print" onclick="window.print()">📥 حفظ PDF</button>
        <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
      </div>
      <div class="card-area">${cardHtml}</div></body></html>`);
      win.document.close();
    }
  };

  const handleBatchExport = async () => {
    const cardsHtml: string[] = [];
    for (const u of selectedUsers) {
      const qrData = JSON.stringify({ id: u.id, name: u.name, role: u.role });
      const qrDataUrl = await generateQRDataURL(qrData);
      cardsHtml.push(generateIDCardHtml(u, getMosqueName(u.mosqueId), qrDataUrl, getMosqueImage(u.mosqueId)));
    }
    const allCardsHtml = cardsHtml.join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>بطاقات الهوية (${selectedUsers.length})</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Tajawal', sans-serif; background: white; padding: 10px; }
      .actions-bar { position: fixed; top: 0; left: 0; right: 0; background: #16213e; color: white; padding: 10px 20px; display: flex; gap: 10px; justify-content: center; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
      .actions-bar button { padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer; font-family: 'Tajawal', sans-serif; font-size: 14px; font-weight: 500; }
      .btn-print { background: #e94560; color: white; }
      .btn-close { background: #555; color: white; }
      .cards-area { margin-top: 60px; display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; padding: 20px; }
      @media print { .actions-bar { display: none !important; } .cards-area { margin-top: 0; } @page { size: A4 portrait; margin: 10mm; } body { padding: 0; } }
    </style></head><body>
    <div class="actions-bar">
      <button class="btn-print" onclick="window.print()">🖨️ طباعة</button>
      <button class="btn-print" onclick="window.print()">📥 حفظ PDF</button>
      <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
    </div>
    <div class="cards-area">${allCardsHtml}</div></body></html>`);
    win.document.close();
  };

  const [exporting, setExporting] = useState(false);

  const handlePngExport = async () => {
    setExporting(true);
    try {
      for (const u of selectedUsers) {
        const cardEl = document.querySelector(`[data-testid="card-idcard-${u.id}"]`) as HTMLElement;
        if (!cardEl) continue;

        const dataUrl = await toPng(cardEl, {
          quality: 1,
          pixelRatio: 300 / 96,
          backgroundColor: "#ffffff",
          style: {
            direction: "rtl",
          },
        });

        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `هوية_${u.name}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        await new Promise((r) => setTimeout(r, 300));
      }
    } finally {
      setExporting(false);
    }
  };

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
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary flex items-center gap-2" data-testid="text-idcards-title">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                disabled={selectedUsers.length === 0 || exporting}
                data-testid="button-export-pdf"
              >
                {exporting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <FileDown className="w-4 h-4 ml-2" />}
                {exporting ? "جاري التصدير..." : "تصدير"}
                <ChevronDown className="w-3 h-3 mr-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleIndividualExport} data-testid="menu-export-individual">
                <FileDown className="w-4 h-4 ml-2" />
                تصدير PDF منفرد
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBatchExport} data-testid="menu-export-batch">
                <FileDown className="w-4 h-4 ml-2" />
                تصدير PDF مجمع
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePngExport} data-testid="menu-export-png">
                <Image className="w-4 h-4 ml-2" />
                تصدير PNG (300 نقطة)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          <Card className="print:hidden">
            <CardContent className="p-3 sm:p-4">
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
            <div className="bg-muted/20 rounded-xl p-3 sm:p-4 md:p-6 print:bg-white print:p-0 print:rounded-none" data-testid="preview-section">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 print:hidden">
                <CreditCard className="w-5 h-5 text-primary" />
                معاينة البطاقات ({selectedUsers.length})
              </h2>
              <div
                ref={printRef}
                className="flex flex-wrap justify-center gap-6 print:gap-4"
                data-testid="print-area"
              >
                {selectedUsers.map((u) => (
                  <IDCard key={u.id} user={u} mosqueName={getMosqueName(u.mosqueId)} mosqueImage={getMosqueImage(u.mosqueId)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

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
import { Printer, Users, CreditCard, Loader2, FileDown, ChevronDown, Image, Building2, Eye } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { formatDateAr } from "@/lib/utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

const levelNames = ["المستوى الأول", "المستوى الثاني", "المستوى الثالث", "المستوى الرابع", "المستوى الخامس", "المستوى السادس", "حافظ"];
const levelColors = [
  { bg: "bg-sky-100", text: "text-sky-700", border: "border-sky-300", hex: "#0284c7", hexBg: "#e0f2fe" },
  { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300", hex: "#059669", hexBg: "#d1fae5" },
  { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-300", hex: "#7c3aed", hexBg: "#ede9fe" },
  { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", hex: "#d97706", hexBg: "#fef3c7" },
  { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", hex: "#ea580c", hexBg: "#ffedd5" },
  { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-300", hex: "#e11d48", hexBg: "#ffe4e6" },
  { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", hex: "#16a34a", hexBg: "#dcfce7" },
];

function getLevelInfo(level?: number | null) {
  if (!level || level < 1 || level > 7) return null;
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
  return QRCode.toDataURL(data, { width: 120, margin: 1, errorCorrectionLevel: "M" });
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

  const avatarHtml = user.avatar
    ? `<img src="${esc(user.avatar)}" alt="${safeName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
    : `<span style="font-size:20px;font-weight:700;color:#16213e;">${safeName.charAt(0)}</span>`;

  const mosqueLogoHtml = mosqueImage
    ? `<img src="${esc(mosqueImage)}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;" />`
    : "";

  const levelBadgeHtml = levelInfo
    ? `<span style="display:inline-block;padding:1px 10px;border-radius:9999px;background:${levelInfo.colors.hexBg};color:${levelInfo.colors.hex};font-size:9px;font-weight:600;border:1px solid ${levelInfo.colors.hex}40;">${levelInfo.name}</span>`
    : "";

  const infoRows = [
    { label: "رقم الهوية", value: `<span style="font-family:'Courier New',monospace;font-weight:700;color:#16213e;letter-spacing:0.5px;">${formattedId}</span>` },
    safeMosqueName ? { label: "الجامع/المركز", value: `<span style="font-weight:500;">${safeMosqueName}</span>` } : null,
    levelInfo ? { label: "المستوى", value: `<span style="font-weight:600;color:${levelInfo.colors.hex};">${levelInfo.name}</span>` } : null,
    user.phone ? { label: "رقم الهاتف", value: `<span dir="ltr">${esc(user.phone)}</span>` } : null,
    { label: "الانضمام", value: joinDate },
  ].filter(Boolean) as { label: string; value: string }[];

  const infoRowsHtml = infoRows.map(r =>
    `<tr><td style="color:#6b7280;font-size:9px;padding:2px 0;white-space:nowrap;text-align:right;padding-left:8px;">${r.label}</td><td style="font-size:9px;padding:2px 0;text-align:left;">${r.value}</td></tr>`
  ).join("");

  return `
    <div style="width:8.6cm;height:5.4cm;border-radius:10px;overflow:hidden;border:1.5px solid #d1d5db;background:white;display:inline-flex;flex-direction:column;margin:6px;page-break-inside:avoid;font-family:'Tajawal','Segoe UI',sans-serif;position:relative;box-shadow:0 1px 3px rgba(0,0,0,0.08);" dir="rtl">
      <!-- Header -->
      <div style="height:48px;background:linear-gradient(135deg,#0f3460 0%,#16213e 50%,#1a1a2e 100%);display:flex;align-items:center;justify-content:space-between;padding:0 12px;flex-shrink:0;position:relative;">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;opacity:0.06;">
          <defs><pattern id="p-${user.id}" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M15 0L30 15L15 30L0 15Z" fill="none" stroke="white" stroke-width="0.5"/>
            <circle cx="15" cy="15" r="5" fill="none" stroke="white" stroke-width="0.3"/>
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#p-${user.id})"/>
        </svg>
        <div style="display:flex;align-items:center;gap:8px;z-index:1;">
          ${mosqueLogoHtml ? `<div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid rgba(255,255,255,0.2);">${mosqueLogoHtml}</div>` : ""}
          <div style="color:white;">
            <div style="font-size:11px;font-weight:700;line-height:1.3;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeMosqueName || "سِرَاجُ الْقُرْآنِ"}</div>
            <div style="font-size:7px;opacity:0.7;">لإدارة حلقات القرآن الكريم</div>
          </div>
        </div>
        <div style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.2);z-index:1;">
          <img src="/logo.png" style="width:26px;height:26px;border-radius:50%;object-fit:contain;" />
        </div>
      </div>

      <!-- Body -->
      <div style="flex:1;display:flex;padding:8px 10px 6px;gap:8px;overflow:hidden;">
        <!-- Right: Avatar + Name -->
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:80px;flex-shrink:0;">
          <div style="width:50px;height:50px;border-radius:50%;border:2px solid #e5e7eb;overflow:hidden;background:#f9fafb;display:flex;align-items:center;justify-content:center;margin-bottom:4px;">
            ${avatarHtml}
          </div>
          <div style="text-align:center;max-width:78px;overflow:hidden;">
            <div style="font-size:10px;font-weight:700;color:#1f2937;line-height:1.3;word-break:break-word;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${safeName}</div>
          </div>
          <div style="margin-top:2px;display:flex;flex-direction:column;align-items:center;gap:2px;">
            <span style="display:inline-block;padding:1px 10px;border-radius:9999px;background:#16213e;color:white;font-size:9px;font-weight:600;">${roleLabel}</span>
            ${levelBadgeHtml}
          </div>
        </div>

        <!-- Left: Info + QR -->
        <div style="flex:1;display:flex;flex-direction:column;justify-content:space-between;min-width:0;">
          <table style="width:100%;border-collapse:collapse;font-size:9px;color:#374151;">
            ${infoRowsHtml}
          </table>
          <div style="display:flex;align-items:flex-end;justify-content:flex-start;gap:4px;margin-top:4px;">
            <div style="padding:2px;background:white;border:1px solid #e5e7eb;border-radius:6px;line-height:0;">
              <img src="${qrDataUrl}" style="width:48px;height:48px;" alt="QR" />
            </div>
            <span style="font-size:6px;color:#9ca3af;writing-mode:vertical-rl;transform:rotate(180deg);line-height:1;">امسح للتحقق</span>
          </div>
        </div>
      </div>

      <!-- Footer stripe -->
      <div style="height:4px;background:linear-gradient(to left,#0f3460,#16213e,#1a1a2e);flex-shrink:0;"></div>
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
  const roleLabel = roleTranslations[user.role] || user.role;

  return (
    <div
      className="bg-white rounded-[10px] shadow-md overflow-hidden border border-gray-300 flex flex-col relative print:shadow-none print:border print:border-gray-400"
      style={{ width: "325px", height: "204px" }}
      dir="rtl"
      data-testid={`card-idcard-${user.id}`}
    >
      <div className="h-[48px] bg-gradient-to-l from-[#0f3460] via-[#16213e] to-[#1a1a2e] relative overflow-hidden shrink-0 flex items-center justify-between px-3" data-testid={`card-header-${user.id}`}>
        <div className="absolute inset-0 opacity-[0.06]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`ip-${user.id}`} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M15 0L30 15L15 30L0 15Z" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="15" cy="15" r="5" fill="none" stroke="white" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#ip-${user.id})`} />
          </svg>
        </div>
        <div className="flex items-center gap-2 z-10">
          {mosqueImage ? (
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center overflow-hidden border border-white/20 shrink-0">
              <img src={mosqueImage} className="w-[30px] h-[30px] rounded-full object-cover" />
            </div>
          ) : null}
          <div className="text-white">
            <div className="text-[11px] font-bold leading-tight truncate max-w-[180px]">{mosqueName || "سِرَاجُ الْقُرْآنِ"}</div>
            <div className="text-[7px] opacity-70">لإدارة حلقات القرآن الكريم</div>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center border border-white/20 shrink-0 z-10">
          <img src="/logo.png" className="w-[26px] h-[26px] rounded-full object-contain" />
        </div>
      </div>

      <div className="flex flex-1 px-2.5 py-2 gap-2 overflow-hidden">
        <div className="flex flex-col items-center justify-center shrink-0" style={{ width: "80px" }}>
          <div className="w-[50px] h-[50px] rounded-full border-2 border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center mb-1" data-testid={`avatar-container-${user.id}`}>
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" data-testid={`img-avatar-${user.id}`} />
            ) : (
              <span className="text-xl font-bold text-[#16213e]" data-testid={`text-avatar-letter-${user.id}`}>
                {user.name.charAt(0)}
              </span>
            )}
          </div>
          <div className="text-center max-w-[78px] overflow-hidden">
            <div className="text-[10px] font-bold text-gray-800 leading-tight line-clamp-2" data-testid={`text-user-name-${user.id}`}>{user.name}</div>
          </div>
          <div className="flex flex-col items-center gap-0.5 mt-1">
            <span className="inline-block px-2.5 py-px rounded-full bg-[#16213e] text-white text-[9px] font-semibold" data-testid={`badge-role-${user.id}`}>
              {roleLabel}
            </span>
            {levelInfo && (
              <span
                className={`inline-block px-2.5 py-px rounded-full text-[9px] font-semibold border ${levelInfo.colors.bg} ${levelInfo.colors.text} ${levelInfo.colors.border}`}
                data-testid={`badge-level-${user.id}`}
              >
                {levelInfo.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-between min-w-0">
          <table className="w-full text-[9px] text-gray-700" style={{ borderCollapse: "collapse" }} data-testid={`info-section-${user.id}`}>
            <tbody>
              <tr>
                <td className="text-gray-400 py-[2px] pr-0 pl-2 whitespace-nowrap text-[9px]">رقم الهوية</td>
                <td className="py-[2px] text-left">
                  <span className="font-mono font-bold text-[#16213e] tracking-wide text-[9px]" data-testid={`text-userid-${user.id}`}>{formatUserId(user.id)}</span>
                </td>
              </tr>
              {mosqueName && (
                <tr>
                  <td className="text-gray-400 py-[2px] pr-0 pl-2 whitespace-nowrap text-[9px]">الجامع/المركز</td>
                  <td className="py-[2px] text-left">
                    <span className="font-medium text-[9px] block truncate max-w-[110px]" data-testid={`text-mosque-${user.id}`}>{mosqueName}</span>
                  </td>
                </tr>
              )}
              {levelInfo && (
                <tr data-testid={`row-level-${user.id}`}>
                  <td className="text-gray-400 py-[2px] pr-0 pl-2 whitespace-nowrap text-[9px]">المستوى</td>
                  <td className="py-[2px] text-left">
                    <span className="font-semibold text-[9px]" style={{ color: levelInfo.colors.hex }}>{levelInfo.name}</span>
                  </td>
                </tr>
              )}
              {user.phone && (
                <tr>
                  <td className="text-gray-400 py-[2px] pr-0 pl-2 whitespace-nowrap text-[9px]">الهاتف</td>
                  <td className="py-[2px] text-left">
                    <span dir="ltr" className="text-[9px]" data-testid={`text-phone-${user.id}`}>{user.phone}</span>
                  </td>
                </tr>
              )}
              <tr>
                <td className="text-gray-400 py-[2px] pr-0 pl-2 whitespace-nowrap text-[9px]">الانضمام</td>
                <td className="py-[2px] text-left">
                  <span className="text-[9px]" data-testid={`text-joindate-${user.id}`}>{formatDate(user.createdAt)}</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex items-end gap-1 mt-1">
            <div className="p-[2px] bg-white border border-gray-200 rounded-md leading-[0]">
              <QRCodeImage
                value={JSON.stringify({ id: user.id, name: user.name, role: user.role })}
                size={48}
              />
            </div>
            <span className="text-[6px] text-gray-400" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", lineHeight: 1 }}>امسح للتحقق</span>
          </div>
        </div>
      </div>

      <div className="w-full h-1 bg-gradient-to-l from-[#0f3460] via-[#16213e] to-[#1a1a2e] shrink-0" data-testid={`decorative-border-bottom-${user.id}`} />
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
  const [selectedMosqueId, setSelectedMosqueId] = useState<string>("");
  const [previewUser, setPreviewUser] = useState<UserData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, mosquesRes] = await Promise.all([
          fetch("/api/users", { credentials: "include" }),
          fetch("/api/mosques", { credentials: "include" }),
        ]);
        if (usersRes.ok) setUsers(await usersRes.json());
        if (mosquesRes.ok) {
          const mosquesData = await mosquesRes.json();
          setMosques(Array.isArray(mosquesData) ? mosquesData : [mosquesData]);
        }
      } catch {} finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "بطاقات الهوية - سِرَاجُ الْقُرْآنِ",
  });

  const mosqueMap = new Map(mosques.map((m) => [m.id, m]));
  const getMosqueName = (mosqueId?: string | null) => mosqueId ? (mosqueMap.get(mosqueId)?.name || "") : "";
  const getMosqueImage = (mosqueId?: string | null) => mosqueId ? (mosqueMap.get(mosqueId)?.image || "") : "";

  const mosqueFilteredUsers = selectedMosqueId
    ? users.filter((u) => u.mosqueId === selectedMosqueId)
    : users;

  const groupedUsers = {
    student: mosqueFilteredUsers.filter((u) => u.role === "student"),
    teacher: mosqueFilteredUsers.filter((u) => u.role === "teacher"),
    supervisor: mosqueFilteredUsers.filter((u) => u.role === "supervisor"),
    admin: mosqueFilteredUsers.filter((u) => u.role === "admin"),
  };

  const filteredUsers = filterRole === "all" ? mosqueFilteredUsers : mosqueFilteredUsers.filter((u) => u.role === filterRole);

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedUserIds.size === filteredUsers.length) setSelectedUserIds(new Set());
    else setSelectedUserIds(new Set(filteredUsers.map((u) => u.id)));
  };

  const selectedUsers = users.filter((u) => selectedUserIds.has(u.id));

  const handleIndividualExport = async () => {
    for (const u of selectedUsers) {
      const qrData = JSON.stringify({ id: u.id, name: u.name, role: u.role });
      const qrDataUrl = await generateQRDataURL(qrData);
      const cardHtml = generateIDCardHtml(u, getMosqueName(u.mosqueId), qrDataUrl, getMosqueImage(u.mosqueId) || undefined);
      const win = window.open("", "_blank");
      if (!win) return;
      const safeName = esc(u.name || "");
      win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>هوية - ${safeName}</title><style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Tajawal', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f3f4f6; }
        .actions-bar { position: fixed; top: 0; left: 0; right: 0; background: #16213e; color: white; padding: 10px 20px; display: flex; gap: 10px; justify-content: center; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
        .actions-bar button { padding: 8px 24px; border: none; border-radius: 8px; cursor: pointer; font-family: 'Tajawal', sans-serif; font-size: 14px; font-weight: 600; transition: opacity 0.2s; }
        .actions-bar button:hover { opacity: 0.9; }
        .btn-print { background: #059669; color: white; }
        .btn-close { background: #6b7280; color: white; }
        .card-area { margin-top: 60px; padding: 20px; }
        @media print { .actions-bar { display: none !important; } .card-area { margin-top: 0; padding: 0; } @page { size: 8.6cm 5.4cm; margin: 0; } body { padding: 0; background: white; min-height: auto; } }
      </style></head><body>
      <div class="actions-bar">
        <button class="btn-print" onclick="window.print()">طباعة</button>
        <button class="btn-print" onclick="window.print()">حفظ PDF</button>
        <button class="btn-close" onclick="window.close()">إغلاق</button>
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
      cardsHtml.push(generateIDCardHtml(u, getMosqueName(u.mosqueId), qrDataUrl, getMosqueImage(u.mosqueId) || undefined));
    }
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>بطاقات الهوية (${selectedUsers.length})</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Tajawal', sans-serif; background: #f3f4f6; padding: 20px; }
      .actions-bar { position: fixed; top: 0; left: 0; right: 0; background: #16213e; color: white; padding: 10px 20px; display: flex; gap: 10px; justify-content: center; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
      .actions-bar button { padding: 8px 24px; border: none; border-radius: 8px; cursor: pointer; font-family: 'Tajawal', sans-serif; font-size: 14px; font-weight: 600; }
      .btn-print { background: #059669; color: white; }
      .btn-close { background: #6b7280; color: white; }
      .cards-area { margin-top: 60px; display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; padding: 20px; }
      @media print { .actions-bar { display: none !important; } .cards-area { margin-top: 0; gap: 8px; padding: 0; } @page { size: A4 portrait; margin: 8mm; } body { padding: 0; background: white; } }
    </style></head><body>
    <div class="actions-bar">
      <button class="btn-print" onclick="window.print()">طباعة</button>
      <button class="btn-print" onclick="window.print()">حفظ PDF</button>
      <button class="btn-close" onclick="window.close()">إغلاق</button>
    </div>
    <div class="cards-area">${cardsHtml.join("")}</div></body></html>`);
    win.document.close();
  };

  // Reset selection when mosque changes
  const handleMosqueChange = (val: string) => {
    setSelectedMosqueId(val === "all" ? "" : val);
    setSelectedUserIds(new Set());
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
          style: { direction: "rtl" },
        });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `هوية_${u.name}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise((r) => setTimeout(r, 300));
      }
    } finally { setExporting(false); }
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
      </div>

      {/* اختيار المسجد/المركز أولاً */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm">اختر الجامع/المركز:</span>
            </div>
            <SearchableSelect
              options={[
                { value: "all", label: "جميع الجوامع والمراكز" },
                ...mosques.map((m) => ({ value: m.id, label: m.name })),
              ]}
              value={selectedMosqueId || "all"}
              onValueChange={handleMosqueChange}
              placeholder="اختر الجامع أو المركز"
              searchPlaceholder="ابحث عن جامع..."
              emptyText="لا يوجد جامع بهذا الاسم"
              triggerClassName="w-full sm:w-[280px]"
              data-testid="select-mosque-idcards"
            />
            <div className="flex flex-wrap gap-2 sm:mr-auto">
              <Select value={filterRole} onValueChange={setFilterRole} data-testid="select-filter-role">
                <SelectTrigger className="w-[140px]" data-testid="select-filter-role-trigger">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* شريط الأدوات */}
      <div className="flex flex-wrap gap-2 print:hidden">
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
            <Button variant="outline" disabled={selectedUsers.length === 0 || exporting} data-testid="button-export-pdf">
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
        {selectedUsers.length > 0 && selectedUsers.length <= 4 && (
          <Button
            variant="outline"
            onClick={() => setPreviewUser(selectedUsers[0])}
            data-testid="button-preview-card"
          >
            <Eye className="w-4 h-4 ml-2" />
            معاينة حية
          </Button>
        )}
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
                  <IDCard key={u.id} user={u} mosqueName={getMosqueName(u.mosqueId)} mosqueImage={getMosqueImage(u.mosqueId) || undefined} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* نافذة المعاينة الحية */}
      <Dialog open={!!previewUser} onOpenChange={(open) => !open && setPreviewUser(null)}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              معاينة البطاقة
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4 pt-0 bg-gray-50">
            {previewUser && (
              <IDCard
                user={previewUser}
                mosqueName={getMosqueName(previewUser.mosqueId)}
                mosqueImage={getMosqueImage(previewUser.mosqueId) || undefined}
              />
            )}
          </div>
          <div className="flex gap-2 p-4 pt-2 border-t justify-center">
            {selectedUsers.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const idx = selectedUsers.findIndex(u => u.id === previewUser?.id);
                    const prev = idx > 0 ? selectedUsers[idx - 1] : selectedUsers[selectedUsers.length - 1];
                    setPreviewUser(prev);
                  }}
                >
                  السابق
                </Button>
                <span className="text-sm text-muted-foreground self-center">
                  {selectedUsers.findIndex(u => u.id === previewUser?.id) + 1} / {selectedUsers.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const idx = selectedUsers.findIndex(u => u.id === previewUser?.id);
                    const next = idx < selectedUsers.length - 1 ? selectedUsers[idx + 1] : selectedUsers[0];
                    setPreviewUser(next);
                  }}
                >
                  التالي
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { formatDateAr, toHijri } from "./utils";
import { escapeHtml } from "@/lib/html-utils";

/**
 * @deprecated Use usePrintPreview() hook from @/lib/print-context instead.
 * This stub is kept temporarily to avoid breaking existing callers.
 */
export function openPrintWindow(_title: string, _contentHtml: string, _options?: { landscape?: boolean; mosqueName?: string; mosqueImage?: string }) {
  console.warn("[print-utils] openPrintWindow is deprecated. Use usePrintPreview() hook from @/lib/print-context instead.");
}

export function generateStatsHtml(stats: Record<string, any>, isAdmin: boolean): string {
  const items = [
    { label: "إجمالي الطلاب", value: stats.totalStudents || 0 },
    { label: "إجمالي الأساتذة", value: stats.totalTeachers || 0 },
    ...(isAdmin ? [{ label: "إجمالي المشرفين", value: stats.totalSupervisors || 0 }] : []),
    ...(isAdmin ? [{ label: "إجمالي المساجد", value: stats.totalMosques || 0 }] : []),
    { label: "إجمالي الواجبات", value: stats.totalAssignments || 0 },
    { label: "المكتملة", value: stats.completedAssignments || 0 },
    { label: "المعلقة", value: stats.pendingAssignments || 0 },
    { label: "طلاب نشطين", value: stats.activeStudents || 0 },
    { label: "طلاب غير نشطين", value: stats.inactiveStudents || 0 },
    { label: "ذوي الاحتياجات الخاصة", value: stats.specialNeedsStudents || 0 },
    { label: "الأيتام", value: stats.orphanStudents || 0 },
  ];

  return `
    <div class="stats-grid">
      ${items.map(i => `<div class="stat-card"><div class="value">${i.value}</div><div class="label">${i.label}</div></div>`).join("")}
    </div>
  `;
}

export function generateUsersTableHtml(users: any[]): string {
  if (!users || users.length === 0) return "<p>لا يوجد بيانات</p>";
  return `
    <table style="width:100%;border-collapse:collapse;margin-top:20px;">
      <thead>
        <tr style="background:#f0f0f0;">
          <th style="border:1px solid #ccc;padding:8px;text-align:right;">#</th>
          <th style="border:1px solid #ccc;padding:8px;text-align:right;">الاسم</th>
          <th style="border:1px solid #ccc;padding:8px;text-align:right;">الدور</th>
          <th style="border:1px solid #ccc;padding:8px;text-align:right;">المستوى</th>
          <th style="border:1px solid #ccc;padding:8px;text-align:right;">الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${users.map((u, i) => `
          <tr>
            <td style="border:1px solid #ccc;padding:8px;">${i + 1}</td>
            <td style="border:1px solid #ccc;padding:8px;">${escapeHtml(u.name || "")}</td>
            <td style="border:1px solid #ccc;padding:8px;">${escapeHtml(u.role || "")}</td>
            <td style="border:1px solid #ccc;padding:8px;">${escapeHtml(String(u.level || ""))}</td>
            <td style="border:1px solid #ccc;padding:8px;">${u.isActive ? "نشط" : "غير نشط"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

export function generateSemesterReportHtml(student: any, grades: any[], mosqueName: string): string {
  const avgGrade = grades.length > 0 
    ? Math.round(grades.reduce((sum, g) => sum + (g.grade || 0), 0) / grades.length) 
    : 0;

  return `
    <div style="padding: 20px;">
      <h3 style="text-align: center; color: #16213e; margin-bottom: 30px;">تقرير الدرجات الفصلي</h3>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
        <div><strong>اسم الطالب:</strong> ${escapeHtml(student.name || "")}</div>
        <div><strong>المركز:</strong> ${escapeHtml(mosqueName || "")}</div>
        <div><strong>المستوى:</strong> ${escapeHtml(String(student.level || "—"))}</div>
        <div><strong>المعدل العام:</strong> ${avgGrade}%</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>السورة</th>
            <th>من آية</th>
            <th>إلى آية</th>
            <th>الدرجة</th>
          </tr>
        </thead>
        <tbody>
          ${grades.map(g => `
            <tr>
              <td>${formatDateAr(g.createdAt)}</td>
              <td>${escapeHtml(g.surahName || "")}</td>
              <td>${g.fromVerse}</td>
              <td>${g.toVerse}</td>
              <td style="font-weight: bold; color: ${g.grade >= 90 ? '#059669' : g.grade >= 75 ? '#2563eb' : '#dc2626'}">${g.grade}%</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; text-align: center;">
        <div>
          <p>ختم المشرف</p>
          <div style="margin-top: 40px; border-bottom: 1px dashed #ccc; width: 150px; margin-left: auto; margin-right: auto;"></div>
        </div>
        <div>
          <p>توقيع المدرس</p>
          <div style="margin-top: 40px; border-bottom: 1px dashed #ccc; width: 150px; margin-left: auto; margin-right: auto;"></div>
        </div>
      </div>
    </div>
  `;
}

export function generateAnnualSummaryHtml(stats: any, topStudents: any[], mosqueName: string): string {
  return `
    <div style="padding: 20px;">
      <h3 style="text-align: center; color: #16213e; margin-bottom: 30px;">التقرير السنوي للمركز</h3>
      
      <div class="stats-grid">
        <div class="stat-card"><div class="value">${stats.totalStudents || 0}</div><div class="label">إجمالي الطلاب</div></div>
        <div class="stat-card"><div class="value">${stats.completedAssignments || 0}</div><div class="label">تسميعات مكتملة</div></div>
        <div class="stat-card"><div class="value">${stats.totalTeachers || 0}</div><div class="label">عدد المعلمين</div></div>
        <div class="stat-card"><div class="value">${stats.activeStudents || 0}</div><div class="label">طلاب نشطين</div></div>
      </div>

      <h4 class="section-title">أوائل الطلبة</h4>
      <table>
        <thead>
          <tr>
            <th>الترتيب</th>
            <th>اسم الطالب</th>
            <th>إجمالي النقاط</th>
          </tr>
        </thead>
        <tbody>
          ${topStudents.map((s, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(s.userName || s.name || "")}</td>
              <td>${s.totalPoints || s.points}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="margin-top: 40px; line-height: 1.8;">
        <p>الحمد لله الذي بنعمته تتم الصالحات، يسرنا في <strong>${escapeHtml(mosqueName || "")}</strong> أن نضع بين أيديكم هذا التقرير الذي يبرز جهود أبنائنا وبناتنا في حفظ كتاب الله تعالى خلال العام المنصرم.</p>
      </div>
    </div>
  `;
}

export function generateCertificateHtml(cert: any, studentName: string, courseName: string, mosqueName: string): string {
  const d = new Date(cert.issuedAt);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const gregorianDate = `${day}/${month}/${year}`;
  const hijriDate = toHijri(d) + " هـ";
  return `
    <div style="padding:40px 50px;border:3px solid #16213e;background:linear-gradient(135deg,#fefefe 0%,#f8f4e8 100%);position:relative;min-height:600px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:'Tajawal',sans-serif;">
      <div style="position:absolute;inset:8px;border:2px solid #c9a84c;pointer-events:none;"></div>
      <div style="position:absolute;top:20px;right:24px;font-size:14px;color:#aaa;">رقم: ${escapeHtml(cert.certificateNumber || "")}</div>
      
      <div style="font-size:22px;color:#c9a84c;letter-spacing:3px;margin-bottom:16px;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
      <h1 style="font-size:44px;color:#16213e;margin-bottom:8px;font-family:'Scheherazade New','Amiri',serif;">شهادة إتمام</h1>
      <div style="width:160px;height:3px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);margin:0 auto 14px;"></div>
      <h2 style="font-size:20px;color:#888;margin-bottom:24px;font-weight:400;">${escapeHtml(mosqueName || "سِرَاجُ الْقُرْآنِ")}</h2>

      <p style="font-size:20px;color:#666;margin-bottom:10px;">يشهد بأن</p>
      <h3 style="font-size:46px;color:#16213e;margin-bottom:16px;border-bottom:3px solid #c9a84c;padding-bottom:10px;display:inline-block;min-width:300px;font-family:'Scheherazade New','Amiri',serif;">${escapeHtml(studentName || "")}</h3>
      
      <p style="font-size:20px;color:#555;margin-bottom:8px;">قد أتمّ بنجاح متطلبات الدورة التعليمية</p>
      <h4 style="font-size:30px;color:#0f3460;margin-bottom:14px;">${escapeHtml(courseName || "")}</h4>
      
      ${cert.graduationGrade ? `<p style="font-size:22px;color:#16213e;margin-bottom:20px;">بتقدير: <strong style="color:#c9a84c;font-size:28px;">${escapeHtml(cert.graduationGrade)}</strong></p>` : ""}

      <div style="display:flex;justify-content:space-between;width:100%;margin-top:30px;padding-top:20px;border-top:2px solid #e8e0cc;">
        <div style="text-align:center;min-width:140px;">
          <div style="width:70px;height:70px;border:2px solid #ccc;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#bbb;">الختم</div>
          <p style="font-size:14px;color:#888;">ختم المركز</p>
        </div>
        <div style="text-align:center;">
          <p style="font-size:16px;color:#888;margin-bottom:4px;">${hijriDate}</p>
          <p style="font-size:14px;color:#aaa;">${gregorianDate}</p>
        </div>
        <div style="text-align:center;min-width:140px;">
          <div style="width:140px;border-bottom:2px solid #999;margin:24px auto 10px;"></div>
          <p style="font-size:15px;color:#888;">توقيع المسؤول</p>
        </div>
      </div>
    </div>
  `;
}

// ==================== جواز سفر القرآن الكريم ====================

const JUZ_NAMES_AR = [
  "الأول","الثاني","الثالث","الرابع","الخامس",
  "السادس","السابع","الثامن","التاسع","العاشر",
  "الحادي عشر","الثاني عشر","الثالث عشر","الرابع عشر","الخامس عشر",
  "السادس عشر","السابع عشر","الثامن عشر","التاسع عشر","العشرون",
  "الحادي والعشرون","الثاني والعشرون","الثالث والعشرون","الرابع والعشرون","الخامس والعشرون",
  "السادس والعشرون","السابع والعشرون","الثامن والعشرون","التاسع والعشرون","الثلاثون",
];

export interface QuranPassportData {
  studentName: string;
  studentAge?: number | null;
  joinedAt?: string;
  mosqueName: string;
  mosqueImage?: string | null;
  juzProgress: Array<{
    juz: number;
    totalVerses: number;
    memorizedVerses: number;
    completionPercent: number;
    complete: boolean;
    masteryStatus?: "not_started" | "memorizing" | "memorized" | "mastered";
    surahs: Array<{ number: number; name: string; totalVerses: number; memorizedVerses: number; complete: boolean; }>;
  }>;
  totalMemorizedVerses: number;
  totalVerses: number;
  totalCompletionPercent: number;
  generatedAt: string;
}

export function openQuranPassport(data: QuranPassportData): void {

  const hijriDate = toHijri(new Date(data.generatedAt));
  const gregorianDate = formatDateAr(data.generatedAt);
  const completedJuz = data.juzProgress.filter(j => j.complete).length;
  const inProgressJuz = data.juzProgress.filter(j => !j.complete && j.memorizedVerses > 0).length;

  const juzCells = data.juzProgress.map(j => {
    const pct = j.completionPercent;
    const status = j.masteryStatus || (j.complete ? "memorized" : j.memorizedVerses > 0 ? "memorizing" : "not_started");
    const mainSurahs = j.surahs.slice(0, 3).map(s => s.name).join("، ");
    const moreCount = j.surahs.length > 3 ? `+${j.surahs.length - 3}` : "";
    const r = 22;
    const circ = 2 * Math.PI * r;
    const dash = circ * (pct / 100);
    const gap = circ - dash;
    // ألوان حسب الحالة: لم يبدأ / قيد الحفظ / محفوظ / مُتقَن
    const colors: Record<string, { bg: string; border: string; text: string; track: string; progress: string; label: string; stamp: string }> = {
      not_started: { bg: "#f5f5f5", border: "#e0e0e0", text: "#9e9e9e", track: "#e0e0e0", progress: "#bbb", label: "—", stamp: "" },
      memorizing: { bg: "#fffde7", border: "#f59e0b", text: "#92400e", track: "#fde68a", progress: "#f59e0b", label: `${pct}%`, stamp: "" },
      memorized: { bg: "#e8f5e9", border: "#2e7d32", text: "#1b5e20", track: "#c8e6c9", progress: "#2e7d32", label: "حافظ", stamp: "✓" },
      mastered: { bg: "#e3f2fd", border: "#1565c0", text: "#0d47a1", track: "#bbdefb", progress: "#1565c0", label: "مُتقِن", stamp: "★" },
    };
    const c = colors[status];
    const stampHtml = c.stamp ? `<div style="position:absolute;top:4px;left:4px;width:24px;height:24px;border:2px solid ${c.border};border-radius:50%;display:flex;align-items:center;justify-content:center;background:${c.bg};"><span style="color:${c.border};font-size:12px;font-weight:700;">${c.stamp}</span></div>` : "";
    return `<div style="background:${c.bg};border:1.5px solid ${c.border};border-radius:10px;padding:7px 5px 5px;display:flex;flex-direction:column;align-items:center;position:relative;min-height:90px;gap:1px;">
      ${stampHtml}
      <p style="font-size:8.5px;font-weight:700;color:${c.text};margin-bottom:1px;text-align:center;line-height:1.2;">الجزء ${JUZ_NAMES_AR[j.juz - 1]}</p>
      <svg width="52" height="52" viewBox="0 0 54 54">
        <circle cx="27" cy="27" r="${r}" fill="none" stroke="${c.track}" stroke-width="4"/>
        ${status !== "not_started" ? `<circle cx="27" cy="27" r="${r}" fill="none" stroke="${c.progress}" stroke-width="4" stroke-dasharray="${dash.toFixed(1)} ${gap.toFixed(1)}" stroke-dashoffset="${(circ * 0.25).toFixed(1)}" stroke-linecap="round"/>` : ""}
        <text x="27" y="31" text-anchor="middle" fill="${c.text}" font-size="${status === "not_started" ? '10' : '11'}" font-weight="700" font-family="Tajawal,sans-serif">${c.label}</text>
      </svg>
      <p style="font-size:7px;color:#666;text-align:center;line-height:1.3;max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(mainSurahs)}${moreCount ? " " + moreCount : ""}</p>
    </div>`;
  }).join("\n");

  const mosqueLogoHtml = data.mosqueImage
    ? `<img src="${escapeHtml(data.mosqueImage)}" style="width:58px;height:58px;border-radius:50%;object-fit:cover;border:3px solid #d4af37;"/>`
    : `<div style="width:58px;height:58px;border-radius:50%;border:3px solid #d4af37;display:flex;align-items:center;justify-content:center;background:#1b5e20;"><span style="font-size:26px;color:#d4af37;">☽</span></div>`;

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<title>جواز سفر القرآن — ${escapeHtml(data.studentName)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800&family=Amiri:wght@400;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box;}
@page{size:A4 landscape;margin:0;}
body{font-family:'Tajawal','Segoe UI',Tahoma,sans-serif;direction:rtl;background:#f5f0e8;width:297mm;height:210mm;overflow:hidden;print-color-adjust:exact;-webkit-print-color-adjust:exact;}
.passport{width:297mm;height:210mm;background:linear-gradient(135deg,#fefefe 0%,#f8f3e8 100%);display:flex;flex-direction:column;border:8px solid #1b5e20;position:relative;overflow:hidden;}
.passport::before{content:'';position:absolute;top:12px;left:12px;right:12px;bottom:12px;border:2px solid #d4af37;pointer-events:none;z-index:0;}
.passport::after{content:'';position:absolute;top:18px;left:18px;right:18px;bottom:18px;border:1px solid rgba(212,175,55,0.4);pointer-events:none;z-index:0;}
.banner{background:linear-gradient(135deg,#1b5e20 0%,#2e7d32 50%,#1b5e20 100%);padding:9px 24px;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1;border-bottom:3px solid #d4af37;flex-shrink:0;}
.banner-center{text-align:center;flex:1;}
.banner-title{font-family:'Amiri',serif;font-size:21px;font-weight:700;color:#d4af37;letter-spacing:1px;text-shadow:1px 1px 3px rgba(0,0,0,0.3);}
.banner-subtitle{font-size:9px;color:rgba(212,175,55,0.75);letter-spacing:3px;margin-top:1px;}
.banner-name{font-size:15px;font-weight:700;color:white;margin-top:3px;}
.banner-mosque{font-size:10px;color:rgba(255,255,255,0.7);margin-top:1px;}
.body{display:flex;flex:1;overflow:hidden;position:relative;z-index:1;}
.left-panel{width:135px;flex-shrink:0;background:linear-gradient(180deg,rgba(27,94,32,0.05) 0%,rgba(27,94,32,0.02) 100%);border-left:2px solid rgba(212,175,55,0.3);padding:10px 9px;display:flex;flex-direction:column;gap:6px;}
.info-label{font-size:8px;color:#888;font-weight:500;}
.info-value{font-size:10px;color:#1b5e20;font-weight:700;}
.divider{height:1px;background:linear-gradient(90deg,transparent,rgba(212,175,55,0.5),transparent);margin:2px 0;}
.stat-box{background:linear-gradient(135deg,#1b5e20,#2e7d32);border-radius:8px;padding:6px;text-align:center;}
.stat-num{font-size:20px;font-weight:800;color:#d4af37;line-height:1;}
.stat-label{font-size:7.5px;color:rgba(255,255,255,0.8);margin-top:1px;}
.right-panel{flex:1;padding:8px 10px 6px;overflow:hidden;}
.juz-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;height:100%;}
.footer{background:linear-gradient(135deg,#1b5e20 0%,#2e7d32 50%,#1b5e20 100%);padding:5px 24px;display:flex;align-items:center;justify-content:space-between;border-top:3px solid #d4af37;flex-shrink:0;position:relative;z-index:1;}
.watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:'Amiri',serif;font-size:150px;color:rgba(27,94,32,0.04);pointer-events:none;z-index:0;white-space:nowrap;}
.action-bar{position:fixed;bottom:0;left:0;right:0;background:#1b5e20;padding:7px 20px;display:flex;gap:10px;justify-content:center;z-index:100;border-top:2px solid #d4af37;}
@media print{.action-bar{display:none!important;}body{background:white;}}
</style></head>
<body>
<div class="passport">
  <div class="watermark">﷽</div>
  <div class="banner">
    ${mosqueLogoHtml}
    <div class="banner-center">
      <div class="banner-title">جواز سفر القرآن الكريم</div>
      <div class="banner-subtitle">HOLY QURAN MEMORIZATION PASSPORT</div>
      <div class="banner-name">${escapeHtml(data.studentName)}</div>
      <div class="banner-mosque">${escapeHtml(data.mosqueName)}</div>
    </div>
    <div style="width:58px;text-align:center;">
      <div style="font-family:'Amiri',serif;font-size:30px;color:#d4af37;line-height:1;">☾</div>
      <div style="font-size:8px;color:rgba(255,255,255,0.6);margin-top:2px;">سِرَاجُ الْقُرْآنِ</div>
    </div>
  </div>
  <div class="body">
    <div class="left-panel">
      <div><div class="info-label">الاسم الكامل</div><div class="info-value" style="font-size:10.5px;">${escapeHtml(data.studentName)}</div></div>
      ${data.studentAge ? `<div><div class="info-label">العمر</div><div class="info-value">${data.studentAge} سنة</div></div>` : ""}
      ${data.joinedAt ? `<div><div class="info-label">تاريخ الانضمام</div><div class="info-value" style="font-size:9px;">${formatDateAr(data.joinedAt)}</div></div>` : ""}
      <div class="divider"></div>
      <div class="stat-box"><div class="stat-num">${completedJuz}</div><div class="stat-label">جزء محفوظ كاملاً</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
        <div style="background:#e8f5e9;border-radius:5px;padding:4px;text-align:center;"><div style="font-size:12px;font-weight:800;color:#1b5e20;">${completedJuz}</div><div style="font-size:7px;color:#388e3c;">مكتمل</div></div>
        <div style="background:#fffde7;border-radius:5px;padding:4px;text-align:center;"><div style="font-size:12px;font-weight:800;color:#f59e0b;">${inProgressJuz}</div><div style="font-size:7px;color:#f59e0b;">جارٍ</div></div>
      </div>
      <div><div class="info-label">الآيات المحفوظة</div><div class="info-value" style="font-size:9px;">${data.totalMemorizedVerses.toLocaleString("ar")} / ${data.totalVerses.toLocaleString("ar")}</div></div>
      <div style="background:linear-gradient(135deg,#fff9c4,#fffde7);border:1px solid #f59e0b;border-radius:6px;padding:5px;text-align:center;">
        <div style="font-size:19px;font-weight:800;color:#f59e0b;">${data.totalCompletionPercent}%</div>
        <div style="font-size:7px;color:#92400e;">نسبة الإتمام الكلية</div>
      </div>
      <div class="divider"></div>
      <div style="font-size:7.5px;color:#888;font-weight:500;margin-bottom:2px;">دليل الألوان:</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;">
        <div style="display:flex;align-items:center;gap:3px;"><div style="width:8px;height:8px;border-radius:2px;background:#f5f5f5;border:1px solid #e0e0e0;"></div><span style="font-size:6.5px;color:#888;">لم يبدأ</span></div>
        <div style="display:flex;align-items:center;gap:3px;"><div style="width:8px;height:8px;border-radius:2px;background:#fffde7;border:1px solid #f59e0b;"></div><span style="font-size:6.5px;color:#888;">قيد الحفظ</span></div>
        <div style="display:flex;align-items:center;gap:3px;"><div style="width:8px;height:8px;border-radius:2px;background:#e8f5e9;border:1px solid #2e7d32;"></div><span style="font-size:6.5px;color:#888;">محفوظ</span></div>
        <div style="display:flex;align-items:center;gap:3px;"><div style="width:8px;height:8px;border-radius:2px;background:#e3f2fd;border:1px solid #1565c0;"></div><span style="font-size:6.5px;color:#888;">مُتقَن</span></div>
      </div>
    </div>
    <div class="right-panel">
      <div class="juz-grid">${juzCells}</div>
    </div>
  </div>
  <div class="footer">
    <div style="text-align:center;min-width:70px;"><div style="width:60px;border-bottom:1.5px solid rgba(212,175,55,0.6);margin:0 auto 3px;"></div><div style="font-size:8px;color:rgba(255,255,255,0.6);">توقيع المسؤول</div></div>
    <div style="flex:1;margin:0 16px;"><div style="font-size:7.5px;color:rgba(255,255,255,0.65);margin-bottom:2px;">التقدم الكلي — ${data.totalCompletionPercent}%</div><div style="height:5px;background:rgba(255,255,255,0.2);border-radius:3px;overflow:hidden;"><div style="height:100%;background:linear-gradient(90deg,#d4af37,#f9d856);border-radius:3px;width:${data.totalCompletionPercent}%;"></div></div></div>
    <div style="width:44px;height:44px;border:2px solid #d4af37;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-direction:column;"><div style="font-size:6.5px;color:#d4af37;font-weight:700;text-align:center;line-height:1.2;">ختم<br/>سِرَاجُ الْقُرْآنِ</div></div>
    <div style="text-align:center;margin-right:8px;"><div style="font-size:8.5px;color:#d4af37;font-weight:700;">${hijriDate}</div><div style="font-size:7.5px;color:rgba(255,255,255,0.6);margin-top:1px;">${gregorianDate}</div></div>
  </div>
</div>
<div class="action-bar">
  <button onclick="window.print()" style="background:#d4af37;color:#1b5e20;border:none;padding:7px 22px;border-radius:20px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:700;cursor:pointer;">🖨️ طباعة / حفظ PDF</button>
  <button onclick="(function(){try{window.close();}catch(e){alert('أغلق النافذة يدوياً')}})()" style="background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3);padding:7px 18px;border-radius:20px;font-family:Tajawal,sans-serif;font-size:13px;cursor:pointer;">✕ إغلاق</button>
</div>
</body></html>`;

  const blob = new Blob([html], { type: "text/html; charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    // fallback: فتح في نفس النافذة إذا كان popup محظوراً
    window.location.href = url;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { toHijri } from "./utils";

/**
 * Professional Arabic PDF Generator
 *
 * Strategy: Render HTML in a hidden iframe with Arabic fonts loaded,
 * capture via html2canvas (browser renders Arabic perfectly),
 * then place high-quality images into jsPDF with smart pagination.
 */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ─── HTML Templates ───────────────────────────────────────────

function reportTemplate(config: {
  title: string;
  mosqueName?: string;
  stats?: { label: string; value: string | number }[];
  sections?: { title?: string; headers: string[]; rows: (string | number)[][] }[];
  text?: string;
}): string {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, "0");
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const hijri = toHijri(now);
  const dateStr = `${d}/${m}/${y}` + (hijri ? ` | ${hijri} هـ` : "");

  const statsHtml = config.stats?.length
    ? `<div class="sg">${config.stats.map(s => `<div class="sc"><div class="sv">${esc(String(s.value))}</div><div class="sl">${esc(s.label)}</div></div>`).join("")}</div>`
    : "";

  let sectionsHtml = "";
  if (config.sections) {
    for (const sec of config.sections) {
      if (sec.title) sectionsHtml += `<div class="st">${esc(sec.title)}</div>`;
      sectionsHtml += `<table><thead><tr>${sec.headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>`;
      for (const row of sec.rows) {
        sectionsHtml += `<tr>${row.map(c => `<td>${esc(String(c ?? ""))}</td>`).join("")}</tr>`;
      }
      sectionsHtml += `</tbody></table>`;
    }
  }

  const textHtml = config.text ? `<p class="bt">${esc(config.text)}</p>` : "";

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Cairo','Segoe UI',Tahoma,sans-serif;direction:rtl;color:#1a1a2e;background:#fff;padding:28px 32px;width:794px;font-size:15px;line-height:1.6}
.hd{text-align:center;padding-bottom:16px;border-bottom:3px solid #16213e;margin-bottom:20px}
.hd .lg{font-size:36px;font-weight:800;color:#16213e;letter-spacing:1px}
.hd .sub{font-size:15px;color:#555;margin-top:4px}
.hd .tt{font-size:24px;font-weight:700;color:#0f3460;margin-top:10px}
.hd .dt{font-size:13px;color:#888;margin-top:6px}
.sg{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}
.sc{border:1.5px solid #d0d5dd;border-radius:10px;padding:14px 8px;text-align:center;background:#f8f9fa}
.sv{font-size:28px;font-weight:800;color:#16213e}
.sl{font-size:13px;color:#555;margin-top:4px;font-weight:600}
.st{font-size:20px;font-weight:700;color:#0f3460;margin:20px 0 10px;padding-bottom:6px;border-bottom:2.5px solid #e0e0e0}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:14px}
th{background:#16213e;color:#fff;padding:10px 10px;text-align:right;font-weight:700;font-size:14px}
td{padding:9px 10px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px}
tr:nth-child(even){background:#f9fafb}
tr:hover{background:#f0f4f8}
.bt{font-size:15px;line-height:2;color:#333;margin-top:20px}
.ft{text-align:center;margin-top:30px;padding-top:14px;border-top:2.5px solid #16213e}
.ft .wq{font-size:14px;font-weight:700;color:#16213e}
.ft .dv{font-size:11px;color:#888;margin-top:3px}
</style></head><body>
<div class="hd">
  <div class="lg">${esc(config.mosqueName || "مُتْقِن")}</div>
  <div class="sub">نظام إدارة حلقات القرآن الكريم</div>
  <div class="tt">${esc(config.title)}</div>
  <div class="dt">${dateStr}</div>
</div>
${statsHtml}${sectionsHtml}${textHtml}
<div class="ft"><div class="wq">النظام وقف لله تعالى</div><div class="dv">برمجة وتطوير أحمد خالد الزبيدي</div></div>
</body></html>`;
}

function certificateTemplate(config: {
  studentName: string;
  courseName: string;
  mosqueName: string;
  certificateNumber?: string;
  graduationGrade?: string;
  issuedAt: string | Date;
}): string {
  const dt = new Date(config.issuedAt);
  const greg = `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
  const hijri = toHijri(dt) + " هـ";

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1122px;height:794px;padding:30px 40px;font-family:'Cairo',sans-serif;direction:rtl;background:linear-gradient(135deg,#fefefe,#f8f4e8);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;position:relative;border:4px solid #16213e}
.ib{position:absolute;inset:8px;border:2px solid #c9a84c;pointer-events:none}
.cn{position:absolute;top:16px;right:20px;font-size:11px;color:#bbb}
.bsm{font-size:18px;color:#c9a84c;letter-spacing:3px;margin-bottom:12px;font-family:'Cairo',sans-serif}
.ct{font-size:42px;font-weight:700;color:#16213e;font-family:'Cairo',sans-serif}
.gl{width:140px;height:3px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);margin:8px auto 12px}
.mn{font-size:16px;color:#888;margin-bottom:18px}
.pre{font-size:16px;color:#666;margin-bottom:6px}
.sn{font-size:40px;font-weight:700;color:#16213e;border-bottom:3px solid #c9a84c;padding-bottom:8px;display:inline-block;min-width:200px;margin-bottom:12px;font-family:'Cairo',sans-serif}
.cd{font-size:15px;color:#555;margin-bottom:4px}
.cnm{font-size:26px;font-weight:700;color:#0f3460;margin-bottom:8px}
.gr{font-size:18px;color:#16213e;margin-bottom:16px}
.gr strong{color:#c9a84c;font-size:26px}
.bot{display:flex;justify-content:space-between;width:100%;margin-top:20px;padding-top:14px;border-top:2px solid #e8e0cc;align-items:flex-end}
.stp{text-align:center;min-width:110px}
.stp-c{width:56px;height:56px;border:2px solid #ccc;border-radius:50%;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#bbb}
.stp-l{font-size:12px;color:#888}
.dts{text-align:center}
.dts .h{font-size:14px;color:#888}
.dts .g{font-size:12px;color:#aaa;margin-top:2px}
.sig{text-align:center;min-width:110px}
.sig-l{width:110px;border-bottom:2px solid #999;margin:20px auto 8px}
.sig-t{font-size:12px;color:#888}
</style></head><body>
<div class="ib"></div>
${config.certificateNumber ? `<div class="cn">رقم: ${esc(config.certificateNumber)}</div>` : ""}
<div class="bsm">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
<div class="ct">شهادة إتمام</div>
<div class="gl"></div>
<div class="mn">${esc(config.mosqueName || "مُتْقِن")}</div>
<div class="pre">يشهد بأن</div>
<div class="sn">${esc(config.studentName)}</div>
<div class="cd">قد أتمّ بنجاح متطلبات الدورة التعليمية</div>
<div class="cnm">${esc(config.courseName)}</div>
${config.graduationGrade ? `<div class="gr">بتقدير: <strong>${esc(config.graduationGrade)}</strong></div>` : ""}
<div class="bot">
  <div class="stp"><div class="stp-c">الختم</div><div class="stp-l">ختم المركز</div></div>
  <div class="dts"><div class="h">${hijri}</div><div class="g">${greg}</div></div>
  <div class="sig"><div class="sig-l"></div><div class="sig-t">توقيع المسؤول</div></div>
</div>
</body></html>`;
}

// ─── Core: HTML → Canvas → PDF ────────────────────────────────

async function renderHtmlToPdf(
  html: string,
  opts: {
    orientation?: "portrait" | "landscape";
    format?: "a4" | "a5";
    filename: string;
    scale?: number;
  },
) {
  // 1. Extract body content from full HTML and inject into a hidden div
  //    on the MAIN page — uses the already-loaded Cairo font (no iframe needed)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/g);
  const bodyContent = bodyMatch?.[1] || html;

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
  document.body.appendChild(container);

  // Create shadow-like isolation with a wrapper
  const wrapper = document.createElement("div");
  const w = opts.orientation === "landscape" ? 1122 : 794;
  wrapper.style.cssText = `width:${w}px;background:#fff;font-family:'Cairo','Segoe UI',Tahoma,sans-serif;direction:rtl;`;

  // Inject styles
  if (styleMatch) {
    // Skip the @font-face style block (not needed, main page has Cairo)
    const styles = styleMatch
      .map(s => s.replace(/<\/?style>/g, ""))
      .filter(s => !s.includes("@font-face"))
      .join("\n");
    const styleEl = document.createElement("style");
    styleEl.textContent = styles;
    wrapper.appendChild(styleEl);
  }

  wrapper.innerHTML += bodyContent;
  container.appendChild(wrapper);

  // 2. Wait for layout to settle
  await new Promise((r) => setTimeout(r, 200));

  // 3. Capture with html-to-image (SVG-based — preserves Arabic text perfectly)
  const scale = opts.scale || 3;
  const dataUrl = await toPng(wrapper, {
    pixelRatio: scale,
    backgroundColor: "#ffffff",
    cacheBust: true,
  });

  // Convert dataUrl to Image for dimensions
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });
  const canvas = { width: img.naturalWidth, height: img.naturalHeight };

  // 4. Create PDF with proper pagination
  const orient = opts.orientation || "portrait";
  const pdf = new jsPDF({ orientation: orient, unit: "mm", format: opts.format || "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 5;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;

  if (imgH <= pageH - margin * 2) {
    // Single page
    pdf.addImage(dataUrl, "PNG", margin, margin, imgW, imgH);
  } else {
    // Multi-page: slice using an offscreen canvas
    const srcPageH = (canvas.width * (pageH - margin * 2)) / imgW;
    const totalPages = Math.ceil(canvas.height / srcPageH);

    for (let p = 0; p < totalPages; p++) {
      if (p > 0) pdf.addPage();
      const sliceH = Math.min(srcPageH, canvas.height - p * srcPageH);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceH;
      const ctx = pageCanvas.getContext("2d")!;
      ctx.drawImage(img, 0, p * srcPageH, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      const sliceData = pageCanvas.toDataURL("image/png");
      const drawH = (sliceH * imgW) / canvas.width;
      pdf.addImage(sliceData, "PNG", margin, margin, imgW, drawH);
    }
  }

  pdf.save(opts.filename);

  // Cleanup
  document.body.removeChild(container);
}

// ─── Public API ───────────────────────────────────────────────

export async function generateReportPdf(config: {
  title: string;
  mosqueName?: string;
  orientation?: "portrait" | "landscape";
  format?: "a4" | "a5";
  stats?: { label: string; value: string | number }[];
  sections?: { title?: string; headers: string[]; rows: (string | number)[][] }[];
  text?: string;
}) {
  const html = reportTemplate(config);
  await renderHtmlToPdf(html, {
    orientation: config.orientation,
    format: config.format,
    filename: `report_${new Date().toISOString().split("T")[0]}.pdf`,
  });
}

export async function generateCertificatePdf(config: {
  studentName: string;
  courseName: string;
  mosqueName: string;
  certificateNumber?: string;
  graduationGrade?: string;
  issuedAt: string | Date;
}) {
  const html = certificateTemplate(config);
  await renderHtmlToPdf(html, {
    orientation: "landscape",
    filename: `certificate_${config.studentName.replace(/\s+/g, "_")}.pdf`,
  });
}

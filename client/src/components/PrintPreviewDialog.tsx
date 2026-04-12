import { useRef, useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer, Download, X, Loader2 } from "lucide-react";
import { usePrintPreviewInternal } from "@/lib/print-context";
import { useAuth } from "@/lib/auth-context";

// Re-export for convenience
export { PrintPreviewProvider, usePrintPreview } from "@/lib/print-context";
export type { PrintPreviewOptions } from "@/lib/print-context";

type PageConfig = "a4-portrait" | "a4-landscape" | "a5-portrait" | "a5-landscape";

const PAGE_SIZES: Record<PageConfig, { label: string; widthPx: number; cssSize: string }> = {
  "a4-portrait":  { label: "A4 عمودي",  widthPx: 794,  cssSize: "A4 portrait" },
  "a4-landscape": { label: "A4 أفقي",   widthPx: 1122, cssSize: "A4 landscape" },
  "a5-portrait":  { label: "A5 عمودي",  widthPx: 559,  cssSize: "A5 portrait" },
  "a5-landscape": { label: "A5 أفقي",   widthPx: 794,  cssSize: "A5 landscape" },
};

function getToday(): string {
  return new Date().toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
}

/* ── CSS ── */
const PRINT_CSS = `
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
  direction: rtl; color: #1a1a2e; background: white;
  font-size: 13px; line-height: 1.7;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
  padding: 0; margin: 0;
}
.page-content { padding: 24px 32px; margin: 0 auto; }
.report-header { text-align: center; padding: 20px 0 16px; border-bottom: 3px solid #16213e; margin-bottom: 20px; }
.header-row { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 8px; }
.header-logo { width: 56px; height: 56px; object-fit: contain; border-radius: 8px; }
.header-text { text-align: right; }
.org-name { font-size: 26px; font-weight: 800; color: #16213e; line-height: 1.3; }
.system-subtitle { font-size: 13px; color: #5a6a80; font-weight: 500; }
.report-title { font-size: 20px; font-weight: 700; color: #0f3460; margin-top: 10px; }
.report-date { font-size: 12px; color: #888; margin-top: 4px; }
.report-footer { text-align: center; padding: 14px 0; border-top: 2px solid #16213e; margin-top: 24px; font-size: 11px; color: #5a6a80; }
.footer-row { display: flex; align-items: center; justify-content: center; gap: 10px; }
.footer-sep { color: #ccc; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12.5px; }
thead th { background: #16213e; color: white; padding: 10px 12px; text-align: right; font-weight: 700; font-size: 12px; white-space: nowrap; }
thead th:first-child { border-radius: 0 8px 0 0; }
thead th:last-child { border-radius: 8px 0 0 0; }
tbody td { padding: 8px 12px; border-bottom: 1px solid #e8ecf1; text-align: right; vertical-align: middle; }
tbody tr:nth-child(even) { background: #f8f9fc; }
.stats-row, .stat-cards { display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; justify-content: center; }
.stat-card { background: linear-gradient(135deg, #f0f4ff 0%, #e8ecf8 100%); border: 1px solid #d5dced; border-radius: 10px; padding: 14px 20px; min-width: 130px; text-align: center; flex: 1; }
.stat-card .stat-value { font-size: 24px; font-weight: 800; color: #16213e; }
.stat-card .stat-label { font-size: 11px; color: #5a6a80; font-weight: 600; margin-top: 2px; }
.section-title, h2, h3 { font-size: 16px; font-weight: 700; color: #16213e; margin: 18px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #e0e5ee; }
h3 { font-size: 14px; border-bottom: 1px solid #e8ecf1; }
.badge, .tag { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; }
.badge-success, .tag-success { background: #d4edda; color: #155724; }
.badge-warning, .tag-warning { background: #fff3cd; color: #856404; }
.badge-danger, .tag-danger { background: #f8d7da; color: #721c24; }
.badge-info, .tag-info { background: #d1ecf1; color: #0c5460; }
strong { font-weight: 700; }
.text-muted { color: #888; }
`;

function buildPrintPageCss(cssSize: string): string {
  return `@media print {
  @page { size: ${cssSize}; margin: 12mm 10mm; }
  html, body { font-size: 11.5px; }
  .page-content { padding: 0; max-width: none; }
  table { page-break-inside: auto; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .page-break { page-break-before: always; }
  .no-print { display: none !important; }
}`;
}

function writeToIframe(
  iframe: HTMLIFrameElement,
  contentHtml: string,
  title: string,
  pageConfig: PageConfig,
  mosqueName: string,
  issuedBy: string,
  mosqueImage?: string,
  showHeader = true,
  showFooter = true,
) {
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  const size = PAGE_SIZES[pageConfig];
  const today = getToday();

  const headerHtml = showHeader
    ? `<div class="report-header">
        <div class="header-row">
          <img src="${mosqueImage || "/logo.png"}" alt="" class="header-logo" onerror="this.style.display='none'" />
          <div class="header-text">
            <div class="org-name">${mosqueName}</div>
            <div class="system-subtitle">نظام إدارة حلقات القرآن الكريم</div>
          </div>
        </div>
        <div class="report-title">${title}</div>
        <div class="report-date">${today} — ${new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</div>
      </div>` : "";

  const footerHtml = showFooter
    ? `<div class="report-footer"><div class="footer-row">
        <span>أصدره: ${issuedBy}</span><span class="footer-sep">|</span>
        <span>النظام وقف لله تعالى</span><span class="footer-sep">|</span>
        <span>برمجة وتطوير أحمد خالد الزبيدي</span>
      </div></div>` : "";

  const isCertificate = !showHeader && !showFooter;
  doc.open();
  if (isCertificate) {
    // الشهادات: صفحة نظيفة بدون أي padding أو constraints
    doc.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700;800&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #f5f5f5; direction: rtl; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.cert-wrapper { display: flex; justify-content: center; align-items: flex-start; padding: 10px; }
@media print {
  @page { size: ${size.cssSize}; margin: 0; }
  html, body { background: white; }
  .cert-wrapper { padding: 0; }
}
</style></head><body>
<div class="cert-wrapper">${contentHtml}</div>
</body></html>`);
  } else {
    doc.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>${PRINT_CSS}
.page-content { max-width: ${size.widthPx}px; }
${buildPrintPageCss(size.cssSize)}
</style></head><body>
<div class="page-content">
  ${headerHtml}
  <div class="report-body">${contentHtml}</div>
  ${footerHtml}
</div></body></html>`);
  }
  doc.close();
}

export function PrintPreviewDialog() {
  const { isOpen, options, closePrintPreview, setPageConfig } = usePrintPreviewInternal();
  const { user } = useAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pageConfigKey, setPageConfigKey] = useState<PageConfig>("a4-portrait");
  const [savingPdf, setSavingPdf] = useState(false);
  const [iframeMounted, setIframeMounted] = useState(false);

  // اسم المسجد + اسم المستخدم
  const mosqueName = options?.mosqueName || user?.mosqueName || "مُتْقِن";
  const issuedBy = user?.name || user?.username || "—";

  useEffect(() => {
    if (options) {
      setPageConfigKey(`${options.format || "a4"}-${options.orientation || "portrait"}` as PageConfig);
    }
  }, [options]);

  // Callback ref: يُستدعى فوراً عند ربط/فصل الـ iframe من DOM
  const iframeCallbackRef = useCallback((node: HTMLIFrameElement | null) => {
    iframeRef.current = node;
    setIframeMounted(!!node);
  }, []);

  // كتابة المحتوى فور جاهزية الـ iframe
  useEffect(() => {
    if (!isOpen || !options || !iframeMounted) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    writeToIframe(
      iframe, options.contentHtml, options.title, pageConfigKey,
      mosqueName, issuedBy, options.mosqueImage,
      options.showHeader !== false, options.showFooter !== false,
    );
  }, [isOpen, options, pageConfigKey, mosqueName, iframeMounted]);

  const handlePrint = useCallback(() => {
    iframeRef.current?.contentWindow?.print();
  }, []);

  // حفظ PDF حقيقي — يأخذ HTML الكامل من الـ iframe ويحوله لملف PDF
  const handleSavePdf = useCallback(async () => {
    if (!options) return;
    const iframe = iframeRef.current;
    const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;
    if (!iframeDoc) return;

    // قراءة الاتجاه والحجم من الحالة الحالية (التي يختارها المستخدم) بدل القيم الأصلية
    const [currentFormat, currentOrientation] = pageConfigKey.split("-") as ["a4" | "a5", "portrait" | "landscape"];

    setSavingPdf(true);
    try {
      const fullHtml = iframeDoc.documentElement.outerHTML;
      const { renderHtmlToPdf } = await import("@/lib/pdf-generator");
      await renderHtmlToPdf(
        `<!DOCTYPE html>${fullHtml}`,
        {
          orientation: currentOrientation,
          format: currentFormat,
          filename: `${options.title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`,
        },
      );
    } catch {
      // fallback: طباعة المتصفح كـ PDF
      iframe?.contentWindow?.print();
    } finally {
      setSavingPdf(false);
    }
  }, [options, pageConfigKey]);

  const handlePageConfigChange = useCallback(
    (value: string) => {
      const key = value as PageConfig;
      setPageConfigKey(key);
      const [format, orientation] = key.split("-") as ["a4" | "a5", "portrait" | "landscape"];
      setPageConfig({ format, orientation });
    },
    [setPageConfig],
  );

  if (!options) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closePrintPreview()}>
      <DialogContent
        className="max-w-none w-screen h-screen m-0 p-0 rounded-none border-none flex flex-col bg-gray-100"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{options.title} - معاينة الطباعة</DialogTitle>

        {/* ─── Toolbar ─── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#16213e] text-white shrink-0 gap-3">
          <h2 className="text-sm font-bold truncate">{options.title}</h2>

          <div className="flex items-center gap-2">
            <Select value={pageConfigKey} onValueChange={handlePageConfigChange}>
              <SelectTrigger className="h-8 w-[130px] bg-white/10 border-white/20 text-white text-xs [&>svg]:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAGE_SIZES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost" size="sm"
              className="text-white hover:bg-white/15 gap-1.5 border-white/20 border"
              onClick={handleSavePdf}
              disabled={savingPdf}
            >
              {savingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span className="hidden sm:inline">حفظ كـ PDF</span>
            </Button>

            <Button
              variant="ghost" size="sm"
              className="text-white hover:bg-white/15 gap-1.5 border-white/20 border"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">طباعة</span>
            </Button>
          </div>

          <Button
            variant="ghost" size="icon"
            className="text-white hover:bg-white/15 h-8 w-8 shrink-0"
            onClick={closePrintPreview}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* ─── Preview ─── */}
        <div className="flex-1 overflow-auto bg-gray-200 flex justify-center py-6 px-4">
          <div
            className="bg-white shadow-2xl rounded-sm overflow-hidden"
            style={{ width: `min(100%, ${PAGE_SIZES[pageConfigKey].widthPx}px)` }}
          >
            <iframe
              ref={iframeCallbackRef}
              className="w-full border-0"
              style={{ minHeight: "1100px", height: "100%" }}
              title="معاينة الطباعة"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

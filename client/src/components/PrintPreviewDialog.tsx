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

// Re-export for convenience
export { PrintPreviewProvider, usePrintPreview } from "@/lib/print-context";
export type { PrintPreviewOptions } from "@/lib/print-context";

type PageConfig = "a4-portrait" | "a4-landscape" | "a5-portrait" | "a5-landscape";

const PAGE_SIZES: Record<PageConfig, { label: string; width: string; height: string; cssSize: string }> = {
  "a4-portrait":  { label: "A4 عمودي",  width: "210mm", height: "297mm", cssSize: "A4 portrait" },
  "a4-landscape": { label: "A4 أفقي",   width: "297mm", height: "210mm", cssSize: "A4 landscape" },
  "a5-portrait":  { label: "A5 عمودي",  width: "148mm", height: "210mm", cssSize: "A5 portrait" },
  "a5-landscape": { label: "A5 أفقي",   width: "210mm", height: "148mm", cssSize: "A5 landscape" },
};

function getToday(): string {
  return new Date().toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildIframeHtml(
  contentHtml: string,
  title: string,
  pageConfig: PageConfig,
  options: {
    showHeader: boolean;
    showFooter: boolean;
    mosqueName?: string;
    mosqueImage?: string;
  }
): string {
  const size = PAGE_SIZES[pageConfig];
  const today = getToday();
  const logoSrc = options.mosqueImage || "/logo.png";
  const orgName = options.mosqueName || "مُتْقِن";

  const headerHtml = options.showHeader
    ? `<div class="report-header">
        <div class="header-row">
          <img src="${logoSrc}" alt="الشعار" class="header-logo" onerror="this.style.display='none'" />
          <div class="header-text">
            <div class="org-name">${orgName}</div>
            <div class="system-subtitle">نظام إدارة حلقات القرآن الكريم</div>
          </div>
        </div>
        <div class="report-title">${title}</div>
        <div class="report-date">${today}</div>
      </div>`
    : "";

  const footerHtml = options.showFooter
    ? `<div class="report-footer">
        <div class="footer-row">
          <span>النظام وقف لله تعالى</span>
          <span class="footer-sep">|</span>
          <span>برمجة وتطوير أحمد خالد الزبيدي</span>
        </div>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} - مُتْقِن</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
    direction: rtl;
    color: #1a1a2e;
    background: white;
    font-size: 13px;
    line-height: 1.7;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    padding: 0;
    margin: 0;
  }

  .page-content {
    padding: 24px 32px;
    max-width: ${size.width};
    margin: 0 auto;
  }

  /* --- Header --- */
  .report-header {
    text-align: center;
    padding: 20px 0 16px;
    border-bottom: 3px solid #16213e;
    margin-bottom: 20px;
  }
  .header-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    margin-bottom: 8px;
  }
  .header-logo {
    width: 56px;
    height: 56px;
    object-fit: contain;
    border-radius: 8px;
  }
  .header-text {
    text-align: right;
  }
  .org-name {
    font-size: 26px;
    font-weight: 800;
    color: #16213e;
    line-height: 1.3;
  }
  .system-subtitle {
    font-size: 13px;
    color: #5a6a80;
    font-weight: 500;
  }
  .report-title {
    font-size: 20px;
    font-weight: 700;
    color: #0f3460;
    margin-top: 10px;
  }
  .report-date {
    font-size: 12px;
    color: #888;
    margin-top: 4px;
  }

  /* --- Footer --- */
  .report-footer {
    text-align: center;
    padding: 14px 0;
    border-top: 2px solid #16213e;
    margin-top: 24px;
    font-size: 11px;
    color: #5a6a80;
  }
  .footer-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  .footer-sep {
    color: #ccc;
  }

  /* --- Tables --- */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 12.5px;
  }
  thead th {
    background: #16213e;
    color: white;
    padding: 10px 12px;
    text-align: right;
    font-weight: 700;
    font-size: 12px;
    white-space: nowrap;
  }
  thead th:first-child {
    border-radius: 0 8px 0 0;
  }
  thead th:last-child {
    border-radius: 8px 0 0 0;
  }
  tbody td {
    padding: 8px 12px;
    border-bottom: 1px solid #e8ecf1;
    text-align: right;
    vertical-align: middle;
  }
  tbody tr:nth-child(even) {
    background: #f8f9fc;
  }
  tbody tr:hover {
    background: #eef1f8;
  }

  /* --- Stat Cards --- */
  .stats-row, .stat-cards {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin: 16px 0;
    justify-content: center;
  }
  .stat-card {
    background: linear-gradient(135deg, #f0f4ff 0%, #e8ecf8 100%);
    border: 1px solid #d5dced;
    border-radius: 10px;
    padding: 14px 20px;
    min-width: 130px;
    text-align: center;
    flex: 1;
  }
  .stat-card .stat-value {
    font-size: 24px;
    font-weight: 800;
    color: #16213e;
  }
  .stat-card .stat-label {
    font-size: 11px;
    color: #5a6a80;
    font-weight: 600;
    margin-top: 2px;
  }

  /* --- Sections --- */
  .section-title, h2, h3 {
    font-size: 16px;
    font-weight: 700;
    color: #16213e;
    margin: 18px 0 10px;
    padding-bottom: 6px;
    border-bottom: 2px solid #e0e5ee;
  }

  h3 {
    font-size: 14px;
    border-bottom: 1px solid #e8ecf1;
  }

  /* --- Badges --- */
  .badge, .tag {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
  }
  .badge-success, .tag-success {
    background: #d4edda;
    color: #155724;
  }
  .badge-warning, .tag-warning {
    background: #fff3cd;
    color: #856404;
  }
  .badge-danger, .tag-danger {
    background: #f8d7da;
    color: #721c24;
  }
  .badge-info, .tag-info {
    background: #d1ecf1;
    color: #0c5460;
  }

  /* --- Miscellaneous --- */
  .text-center { text-align: center; }
  .text-bold, strong { font-weight: 700; }
  .text-muted { color: #888; }
  .mt-2 { margin-top: 8px; }
  .mt-4 { margin-top: 16px; }
  .mb-2 { margin-bottom: 8px; }
  .mb-4 { margin-bottom: 16px; }

  .no-data {
    text-align: center;
    padding: 32px;
    color: #999;
    font-size: 14px;
  }

  /* --- Print Rules --- */
  @media print {
    @page {
      size: ${size.cssSize};
      margin: 12mm 10mm;
    }
    html, body {
      font-size: 11.5px;
    }
    .page-content {
      padding: 0;
      max-width: none;
    }
    .report-header {
      position: running(header);
    }
    .report-footer {
      position: running(footer);
    }
    table { page-break-inside: auto; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    .page-break {
      page-break-before: always;
    }
    .no-print {
      display: none !important;
    }
  }

  /* Font loading indicator */
  .font-loading {
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .font-loaded {
    opacity: 1;
  }
</style>
</head>
<body>
  <div class="page-content font-loading" id="print-root">
    ${headerHtml}
    <div class="report-body">
      ${contentHtml}
    </div>
    ${footerHtml}
  </div>
  <script>
    // Wait for Cairo font to load then reveal content
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function() {
        document.getElementById('print-root').classList.remove('font-loading');
        document.getElementById('print-root').classList.add('font-loaded');
        window.__FONTS_LOADED__ = true;
      });
    } else {
      // Fallback for older browsers
      setTimeout(function() {
        document.getElementById('print-root').classList.remove('font-loading');
        document.getElementById('print-root').classList.add('font-loaded');
        window.__FONTS_LOADED__ = true;
      }, 1000);
    }
  </script>
</body>
</html>`;
}

export function PrintPreviewDialog() {
  const { isOpen, options, closePrintPreview, setPageConfig } = usePrintPreviewInternal();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [pageConfigKey, setPageConfigKey] = useState<PageConfig>("a4-portrait");

  // Sync page config key from options
  useEffect(() => {
    if (options) {
      const key = `${options.format || "a4"}-${options.orientation || "portrait"}` as PageConfig;
      setPageConfigKey(key);
    }
  }, [options]);

  // Reset loading when content changes
  useEffect(() => {
    if (isOpen && options) {
      setLoading(true);
    }
  }, [isOpen, options?.contentHtml]);

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Poll for fonts loaded inside iframe
    const check = () => {
      try {
        const win = iframe.contentWindow as any;
        if (win?.__FONTS_LOADED__) {
          setLoading(false);
          return;
        }
      } catch {
        // cross-origin guard
      }
      setTimeout(check, 100);
    };
    // Start checking after a brief delay
    setTimeout(check, 200);

    // Fallback: max wait 3 seconds
    setTimeout(() => setLoading(false), 3000);
  }, []);

  const handlePrint = useCallback(() => {
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      iframe.contentWindow.print();
    }
  }, []);

  const handleSavePdf = useCallback(() => {
    // Trigger print dialog which allows "Save as PDF" in modern browsers
    handlePrint();
  }, [handlePrint]);

  const handlePageConfigChange = useCallback(
    (value: string) => {
      const key = value as PageConfig;
      setPageConfigKey(key);
      const [format, orientation] = key.split("-") as ["a4" | "a5", "portrait" | "landscape"];
      setPageConfig({ format, orientation });
    },
    [setPageConfig]
  );

  if (!options) return null;

  const iframeSrcDoc = buildIframeHtml(options.contentHtml, options.title, pageConfigKey, {
    showHeader: options.showHeader !== false,
    showFooter: options.showFooter !== false,
    mosqueName: options.mosqueName,
    mosqueImage: options.mosqueImage,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closePrintPreview()}>
      <DialogContent
        className="max-w-none w-screen h-screen m-0 p-0 rounded-none border-none flex flex-col bg-gray-100"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Hidden accessible title */}
        <DialogTitle className="sr-only">{options.title} - معاينة الطباعة</DialogTitle>

        {/* --- Toolbar --- */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#16213e] text-white shrink-0 gap-3">
          {/* Right side: title */}
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-sm font-bold truncate">{options.title}</h2>
          </div>

          {/* Center: actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/15 gap-1.5 border-white/20 border"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">طباعة</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/15 gap-1.5 border-white/20 border"
              onClick={handleSavePdf}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">حفظ كـ PDF</span>
            </Button>

            <Select value={pageConfigKey} onValueChange={handlePageConfigChange}>
              <SelectTrigger className="h-8 w-[130px] bg-white/10 border-white/20 text-white text-xs [&>svg]:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAGE_SIZES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Left side: close */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/15 h-8 w-8 shrink-0"
            onClick={closePrintPreview}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* --- Preview Area --- */}
        <div className="flex-1 overflow-auto relative bg-gray-200 flex justify-center py-6 px-4">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/80 z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#16213e]" />
                <span className="text-sm text-gray-600 font-medium">جارٍ تحميل المعاينة...</span>
              </div>
            </div>
          )}
          <div
            className="bg-white shadow-2xl rounded-sm"
            style={{
              width: `min(100%, ${PAGE_SIZES[pageConfigKey].width})`,
              minHeight: PAGE_SIZES[pageConfigKey].height,
            }}
          >
            <iframe
              ref={iframeRef}
              srcDoc={iframeSrcDoc}
              className="w-full h-full border-0"
              style={{ minHeight: PAGE_SIZES[pageConfigKey].height }}
              title="معاينة الطباعة"
              onLoad={handleIframeLoad}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

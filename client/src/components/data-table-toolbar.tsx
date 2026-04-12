import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { exportJsonToExcel, readExcelFile } from "@/lib/excel-utils";
import { Search, Download, Upload, Printer, FileSpreadsheet, Loader2 } from "lucide-react";

export interface ColumnDef {
  /** Arabic label — used as Excel header */
  label: string;
  /** Data object field name */
  field: string;
}

export interface DataTableToolbarProps {
  /** Rows to export / print (already filtered) */
  data: Record<string, any>[];
  /** Column definitions — maps data fields to Arabic labels */
  columns: ColumnDef[];
  /** Entity name in Arabic (e.g. "الطلاب") — shown in badge and file names */
  entityName: string;
  /** Base filename without extension (e.g. "students") */
  filename: string;

  // ─── Search ───────────────────────────────────────────────
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;

  // ─── Count override ───────────────────────────────────────
  count?: number;

  // ─── Import ───────────────────────────────────────────────
  /** POST endpoint that accepts { rows: [...Arabic-keyed objects...] } */
  importEndpoint?: string;
  onImportSuccess?: () => void;
  /** Columns for the template download (if different from export columns) */
  importColumns?: ColumnDef[];

  // ─── Overrides ────────────────────────────────────────────
  /** Override default Excel export */
  onExport?: () => void | Promise<void>;
  /** Override default HTML print */
  onPrint?: () => void;

  // ─── Print meta ───────────────────────────────────────────
  printTitle?: string;
  printSubtitle?: string;

  // ─── Visibility flags ─────────────────────────────────────
  showExport?: boolean;
  showImport?: boolean;
  showPrint?: boolean;
  /** Show "قالب" template download button when import is enabled */
  showTemplate?: boolean;

  // ─── Extra content (filters, selects…) ───────────────────
  children?: React.ReactNode;
}

export function DataTableToolbar({
  data,
  columns,
  entityName,
  filename,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  count,
  importEndpoint,
  onImportSuccess,
  importColumns,
  onExport,
  onPrint,
  printTitle,
  printSubtitle,
  showExport = true,
  showImport = true,
  showPrint = true,
  showTemplate = true,
  children,
}: DataTableToolbarProps) {
  const { toast } = useToast();
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const displayCount = count ?? data.length;

  // ─── Export ───────────────────────────────────────────────
  const handleExport = async () => {
    if (onExport) { await onExport(); return; }
    if (data.length === 0) {
      toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
      return;
    }
    const rows = data.map(item => {
      const row: Record<string, any> = {};
      columns.forEach(col => { row[col.label] = item[col.field] ?? ""; });
      return row;
    });
    const date = new Date().toISOString().split("T")[0];
    await exportJsonToExcel(rows, entityName, `${filename}-${date}.xlsx`);
  };

  // ─── Template download ────────────────────────────────────
  const handleDownloadTemplate = async () => {
    const templateCols = importColumns ?? columns;
    const emptyRow: Record<string, any> = {};
    templateCols.forEach(col => { emptyRow[col.label] = ""; });
    await exportJsonToExcel([emptyRow], `قالب ${entityName}`, `قالب-${filename}.xlsx`);
    toast({
      title: "تم تحميل القالب",
      description: "أضف بياناتك في الصفوف ثم استوردها",
      className: "bg-blue-50 border-blue-200 text-blue-800",
    });
  };

  // ─── Print ────────────────────────────────────────────────
  const handlePrint = () => {
    if (onPrint) { onPrint(); return; }
    if (data.length === 0) return;
    const headers = columns.map(col => `<th>${col.label}</th>`).join("");
    const rows = data.map(item =>
      `<tr>${columns.map(col => `<td>${item[col.field] ?? ""}</td>`).join("")}</tr>`
    ).join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">
      <title>${printTitle || entityName}</title>
      <style>
        body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;padding:24px;direction:rtl;color:#1a1a2e}
        h2{text-align:center;color:#1a3a6b;font-size:20px;margin-bottom:4px}
        .sub{text-align:center;color:#555;font-size:12px;margin-bottom:18px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{background:#1a3a6b;color:#fff;padding:8px 10px;text-align:right;font-weight:600}
        td{padding:7px 10px;border-bottom:1px solid #eee}
        tr:nth-child(even) td{background:#f7f9ff}
        .footer{text-align:center;margin-top:16px;color:#aaa;font-size:11px;border-top:1px solid #eee;padding-top:10px}
        @media print{@page{margin:1.5cm}}
      </style></head><body>
      <h2>${printTitle || entityName}</h2>
      <p class="sub">${printSubtitle || `الإجمالي: ${displayCount} ${entityName} — ${new Date().toLocaleDateString("ar-SA")}`}</p>
      <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">سِرَاجُ الْقُرْآنِ — ${new Date().toLocaleDateString("ar-SA")}</div>
      <script>window.onload=()=>{window.print();window.close();}<\/script>
    </body></html>`);
    win.document.close();
  };

  // ─── Import ───────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importEndpoint) return;
    setImporting(true);
    try {
      const rows = await readExcelFile(file);
      const res = await fetch(importEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rows }),
      });
      if (res.ok) {
        const result = await res.json();
        const success = result.success ?? result.imported ?? 0;
        const failed = result.failed ?? result.errors ?? 0;
        toast({
          title: "نتيجة الاستيراد",
          description: `تم استيراد ${success} سجل بنجاح${failed > 0 ? ` — فشل ${failed}` : ""}`,
          className: failed === 0 ? "bg-green-50 border-green-200 text-green-800" : undefined,
          variant: failed > 0 && success === 0 ? "destructive" : undefined,
        });
        if (success > 0 && onImportSuccess) onImportSuccess();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "خطأ في الاستيراد", description: err.message || "فشل في الاستيراد", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في قراءة الملف", variant: "destructive" });
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onSearchChange && (
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder || `ابحث في ${entityName}...`}
            value={searchValue ?? ""}
            onChange={e => onSearchChange(e.target.value)}
            className="pr-9"
          />
        </div>
      )}

      <Badge variant="outline" className="text-muted-foreground whitespace-nowrap">
        {displayCount} {entityName}
      </Badge>

      {children}

      <div className="flex items-center gap-1.5 mr-auto">
        {showExport && (
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={handleExport} disabled={data.length === 0}>
            <Download className="w-3.5 h-3.5" />
            تصدير
          </Button>
        )}
        {showTemplate && importEndpoint && (
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="w-3.5 h-3.5" />
            قالب
          </Button>
        )}
        {showImport && importEndpoint && (
          <>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            <Button
              size="sm" variant="outline" className="gap-1.5 h-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              استيراد
            </Button>
          </>
        )}
        {showPrint && (
          <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={handlePrint} disabled={data.length === 0}>
            <Printer className="w-3.5 h-3.5" />
            طباعة
          </Button>
        )}
      </div>
    </div>
  );
}

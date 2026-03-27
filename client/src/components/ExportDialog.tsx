import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileSpreadsheet, FileText, Eye } from "lucide-react";
import { exportJsonToExcel } from "@/lib/excel-utils";

interface ExportField {
  key: string;
  label: string;
  defaultChecked?: boolean;
}

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  fields: ExportField[];
  data: Record<string, unknown>[];
  filename?: string;
  sheetName?: string;
}

export function ExportDialog({
  open,
  onOpenChange,
  title = "تصدير البيانات",
  fields,
  data,
  filename = "export.xlsx",
  sheetName = "Sheet1",
}: ExportDialogProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    () => new Set(fields.filter(f => f.defaultChecked !== false).map(f => f.key))
  );
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [showPreview, setShowPreview] = useState(false);

  const toggleField = (key: string) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedFields.size === fields.length) {
      setSelectedFields(new Set());
    } else {
      setSelectedFields(new Set(fields.map(f => f.key)));
    }
  };

  const activeFields = useMemo(() => fields.filter(f => selectedFields.has(f.key)), [fields, selectedFields]);

  const previewData = useMemo(() => {
    return data.slice(0, 5).map(row => {
      const out: Record<string, unknown> = {};
      for (const f of activeFields) {
        out[f.label] = row[f.key] ?? "";
      }
      return out;
    });
  }, [data, activeFields]);

  const handleExport = async () => {
    const exportData = data.map(row => {
      const out: Record<string, unknown> = {};
      for (const f of activeFields) {
        out[f.label] = row[f.key] ?? "";
      }
      return out;
    });

    if (format === "csv") {
      const headers = activeFields.map(f => f.label);
      const csvRows = [headers.join(",")];
      for (const row of exportData) {
        csvRows.push(headers.map(h => {
          const val = String(row[h] ?? "");
          return val.includes(",") || val.includes('"') || val.includes("\n")
            ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(","));
      }
      const bom = "\uFEFF";
      const blob = new Blob([bom + csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.replace(".xlsx", ".csv");
      a.click();
      URL.revokeObjectURL(url);
    } else {
      await exportJsonToExcel(exportData, sheetName, filename);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Field Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">اختر الحقول للتصدير</Label>
              <Button variant="ghost" size="sm" onClick={toggleAll} className="text-xs">
                {selectedFields.size === fields.length ? "إلغاء الكل" : "تحديد الكل"}
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg border bg-muted/30">
              {fields.map(f => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={selectedFields.has(f.key)}
                    onCheckedChange={() => toggleField(f.key)}
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>

          {/* Format Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">صيغة الملف</Label>
            <div className="flex gap-2">
              <Button
                variant={format === "xlsx" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("xlsx")}
                className="gap-1"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel (.xlsx)
              </Button>
              <Button
                variant={format === "csv" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("csv")}
                className="gap-1"
              >
                <FileText className="w-4 h-4" />
                CSV (.csv)
              </Button>
            </div>
          </div>

          {/* Preview Toggle */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-1 text-xs"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? "إخفاء المعاينة" : `معاينة أول ${Math.min(5, data.length)} صفوف`}
            </Button>

            {showPreview && activeFields.length > 0 && (
              <div className="mt-2 rounded-lg border overflow-x-auto max-h-52">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {activeFields.map(f => (
                        <TableHead key={f.key} className="text-xs whitespace-nowrap">{f.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, i) => (
                      <TableRow key={i}>
                        {activeFields.map(f => (
                          <TableCell key={f.key} className="text-xs whitespace-nowrap">
                            {String(row[f.label] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Summary & Export */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              {data.length} سجل · {selectedFields.size} حقل
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
              <Button
                onClick={handleExport}
                disabled={selectedFields.size === 0}
                className="gap-1"
              >
                <Download className="w-4 h-4" />
                تصدير
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

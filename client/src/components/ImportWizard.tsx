import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload, FileSpreadsheet, ArrowRight, ArrowLeft, CheckCircle, XCircle,
  AlertTriangle, Loader2, UploadCloud, Download,
} from "lucide-react";
import { readExcelFile, exportJsonToExcel } from "@/lib/excel-utils";

type DuplicateAction = "skip" | "update" | "add";

interface FieldMapping {
  fileColumn: string;
  systemField: string;
}

interface ImportField {
  key: string;
  label: string;
  required?: boolean;
}

interface DuplicateRecord {
  row: Record<string, string>;
  matchedBy: string;
  existingId?: string;
  action: DuplicateAction;
}

interface ImportResult {
  row: Record<string, string>;
  status: "success" | "error";
  message?: string;
}

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  fields: ImportField[];
  /** Check duplicates against existing data; returns array of {matchedBy, existingId} or empty if no match */
  checkDuplicate?: (row: Record<string, string>, mappings: FieldMapping[]) => Promise<{ matchedBy: string; existingId?: string } | null>;
  /** Create a new record */
  onCreateRecord: (row: Record<string, string>, mappings: FieldMapping[]) => Promise<void>;
  /** Update an existing record */
  onUpdateRecord?: (existingId: string, row: Record<string, string>, mappings: FieldMapping[]) => Promise<void>;
  onComplete?: () => void;
}

type Step = "upload" | "preview" | "duplicates" | "confirm" | "results";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "رفع الملف" },
  { key: "preview", label: "معاينة وربط" },
  { key: "duplicates", label: "فحص التكرار" },
  { key: "confirm", label: "تأكيد" },
  { key: "results", label: "النتائج" },
];

export function ImportWizard({
  open,
  onOpenChange,
  title = "استيراد البيانات",
  fields,
  checkDuplicate,
  onCreateRecord,
  onUpdateRecord,
  onComplete,
}: ImportWizardProps) {
  const [step, setStep] = useState<Step>("upload");
  const [fileData, setFileData] = useState<Record<string, string>[]>([]);
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateRecord[]>([]);
  const [newRecords, setNewRecords] = useState<Record<string, string>[]>([]);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setStep("upload");
    setFileData([]);
    setFileColumns([]);
    setMappings([]);
    setDuplicates([]);
    setNewRecords([]);
    setResults([]);
    setProcessing(false);
    setProgress(0);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  // Step 1: File upload
  const handleFile = async (file: File) => {
    try {
      const rows = await readExcelFile(file);
      if (rows.length === 0) return;
      const cols = Object.keys(rows[0]);
      setFileData(rows);
      setFileColumns(cols);

      // Auto-map columns by matching labels
      const autoMappings: FieldMapping[] = fields.map(f => {
        const match = cols.find(c =>
          c === f.label || c === f.key ||
          c.trim().toLowerCase() === f.label.trim().toLowerCase()
        );
        return { fileColumn: match || "", systemField: f.key };
      });
      setMappings(autoMappings);
      setStep("preview");
    } catch {
      // error handled by caller
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // Step 2: Column mapping
  const updateMapping = (systemField: string, fileColumn: string) => {
    setMappings(prev => prev.map(m =>
      m.systemField === systemField ? { ...m, fileColumn } : m
    ));
  };

  const getMappedValue = (row: Record<string, string>, systemField: string): string => {
    const mapping = mappings.find(m => m.systemField === systemField);
    if (!mapping?.fileColumn) return "";
    return row[mapping.fileColumn] || "";
  };

  // Step 3: Duplicate check
  const runDuplicateCheck = async () => {
    setProcessing(true);
    const dups: DuplicateRecord[] = [];
    const newRecs: Record<string, string>[] = [];

    for (let i = 0; i < fileData.length; i++) {
      const row = fileData[i];
      setProgress(Math.round(((i + 1) / fileData.length) * 100));

      if (checkDuplicate) {
        const match = await checkDuplicate(row, mappings);
        if (match) {
          dups.push({ row, matchedBy: match.matchedBy, existingId: match.existingId, action: "skip" });
          continue;
        }
      }
      newRecs.push(row);
    }

    setDuplicates(dups);
    setNewRecords(newRecs);
    setProcessing(false);
    setStep("duplicates");
  };

  // Step 4: Summary
  const summary = useMemo(() => {
    const toCreate = newRecords.length + duplicates.filter(d => d.action === "add").length;
    const toUpdate = duplicates.filter(d => d.action === "update").length;
    const toSkip = duplicates.filter(d => d.action === "skip").length;
    return { toCreate, toUpdate, toSkip, total: fileData.length };
  }, [newRecords, duplicates, fileData]);

  // Step 5: Execute import
  const executeImport = async () => {
    setProcessing(true);
    setStep("results");
    const allResults: ImportResult[] = [];
    const totalOps = summary.toCreate + summary.toUpdate;
    let done = 0;

    // New records
    for (const row of newRecords) {
      try {
        await onCreateRecord(row, mappings);
        allResults.push({ row, status: "success" });
      } catch (e) {
        allResults.push({ row, status: "error", message: e instanceof Error ? e.message : "خطأ" });
      }
      done++;
      setProgress(Math.round((done / totalOps) * 100));
    }

    // Duplicates with action
    for (const dup of duplicates) {
      if (dup.action === "skip") continue;
      try {
        if (dup.action === "update" && onUpdateRecord && dup.existingId) {
          await onUpdateRecord(dup.existingId, dup.row, mappings);
        } else {
          await onCreateRecord(dup.row, mappings);
        }
        allResults.push({ row: dup.row, status: "success" });
      } catch (e) {
        allResults.push({ row: dup.row, status: "error", message: e instanceof Error ? e.message : "خطأ" });
      }
      done++;
      setProgress(Math.round((done / totalOps) * 100));
    }

    setResults(allResults);
    setProcessing(false);
    onComplete?.();
  };

  const exportErrors = () => {
    const errors = results.filter(r => r.status === "error");
    if (errors.length === 0) return;
    const data = errors.map(e => ({
      ...e.row,
      "سبب الخطأ": e.message || "غير معروف",
    }));
    exportJsonToExcel(data, "Errors", "import_errors.xlsx");
  };

  const stepIndex = STEPS.findIndex(s => s.key === step);
  const requiredMapped = fields.filter(f => f.required).every(f =>
    mappings.find(m => m.systemField === f.key)?.fileColumn
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center gap-1 mb-4">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 flex-1">
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${
                i < stepIndex ? "bg-green-500 text-white" :
                i === stepIndex ? "bg-primary text-primary-foreground" :
                "bg-muted text-muted-foreground"
              }`}>
                {i < stepIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs truncate ${i === stepIndex ? "font-medium" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <UploadCloud className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">اسحب الملف وأفلته هنا</p>
            <p className="text-sm text-muted-foreground mb-4">أو اختر ملف Excel (.xlsx, .xls) أو CSV</p>
            <label>
              <Button variant="outline" className="gap-2" asChild>
                <span>
                  <FileSpreadsheet className="w-4 h-4" />
                  اختيار ملف
                </span>
              </Button>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>
          </div>
        )}

        {/* Step 2: Preview & Column Mapping */}
        {step === "preview" && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              تم قراءة <strong>{fileData.length}</strong> سجل. اربط الأعمدة بالحقول المطلوبة.
            </div>

            {/* Column Mapping */}
            <div className="space-y-2">
              {fields.map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <Label className="w-36 text-sm shrink-0">
                    {f.label}
                    {f.required && <span className="text-destructive mr-1">*</span>}
                  </Label>
                  <ArrowLeft className="w-4 h-4 shrink-0 text-muted-foreground" />
                  <Select
                    value={mappings.find(m => m.systemField === f.key)?.fileColumn || "_none"}
                    onValueChange={(v) => updateMapping(f.key, v === "_none" ? "" : v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="اختر عمود من الملف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— لا يوجد —</SelectItem>
                      {fileColumns.map(col => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview Table */}
            <div className="rounded-lg border overflow-x-auto max-h-48">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-8">#</TableHead>
                    {fields.filter(f => mappings.find(m => m.systemField === f.key)?.fileColumn).map(f => (
                      <TableHead key={f.key} className="text-xs whitespace-nowrap">{f.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fileData.slice(0, 5).map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      {fields.filter(f => mappings.find(m => m.systemField === f.key)?.fileColumn).map(f => (
                        <TableCell key={f.key} className="text-xs whitespace-nowrap">
                          {getMappedValue(row, f.key) || <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")} className="gap-1">
                <ArrowRight className="w-4 h-4" />
                رجوع
              </Button>
              <Button
                onClick={runDuplicateCheck}
                disabled={!requiredMapped || processing}
                className="gap-1"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
                فحص التكرار
              </Button>
            </div>

            {processing && (
              <div className="space-y-1">
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">جاري الفحص... {progress}%</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Duplicate Check Results */}
        {step === "duplicates" && (
          <div className="space-y-4">
            {duplicates.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                <p className="text-lg font-medium">لا توجد تكرارات</p>
                <p className="text-sm text-muted-foreground">جميع السجلات ({newRecords.length}) جديدة</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span className="text-sm">تم العثور على <strong>{duplicates.length}</strong> سجل مكرر. اختر الإجراء لكل منها.</span>
                </div>

                <div className="rounded-lg border overflow-x-auto max-h-60">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">السجل</TableHead>
                        <TableHead className="text-xs">سبب التكرار</TableHead>
                        <TableHead className="text-xs w-40">الإجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {duplicates.map((dup, i) => {
                        const nameField = fields[0];
                        const name = nameField ? getMappedValue(dup.row, nameField.key) : `سجل ${i + 1}`;
                        return (
                          <TableRow key={i}>
                            <TableCell className="text-xs">{name}</TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="outline" className="text-xs">{dup.matchedBy}</Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={dup.action}
                                onValueChange={(v: DuplicateAction) => {
                                  setDuplicates(prev => prev.map((d, idx) =>
                                    idx === i ? { ...d, action: v } : d
                                  ));
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="skip">تخطي</SelectItem>
                                  {onUpdateRecord && <SelectItem value="update">تحديث</SelectItem>}
                                  <SelectItem value="add">إضافة كجديد</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => {
                    setDuplicates(prev => prev.map(d => ({ ...d, action: "skip" as const })));
                  }}>تخطي الكل</Button>
                  {onUpdateRecord && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      setDuplicates(prev => prev.map(d => ({ ...d, action: "update" as const })));
                    }}>تحديث الكل</Button>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("preview")} className="gap-1">
                <ArrowRight className="w-4 h-4" />
                رجوع
              </Button>
              <Button onClick={() => setStep("confirm")} className="gap-1">
                <ArrowLeft className="w-4 h-4" />
                متابعة
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-lg font-medium mb-4">ملخص عملية الاستيراد</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{summary.toCreate}</div>
                  <div className="text-sm text-green-600">إضافة جديد</div>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{summary.toUpdate}</div>
                  <div className="text-sm text-blue-600">تحديث</div>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-2xl font-bold text-gray-700">{summary.toSkip}</div>
                  <div className="text-sm text-gray-600">تخطي</div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("duplicates")} className="gap-1">
                <ArrowRight className="w-4 h-4" />
                رجوع
              </Button>
              <Button
                onClick={executeImport}
                disabled={summary.toCreate + summary.toUpdate === 0}
                className="gap-1"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                بدء الاستيراد
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Results */}
        {step === "results" && (
          <div className="space-y-4">
            {processing ? (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">جاري الاستيراد...</p>
                <Progress value={progress} className="h-2 mt-4 max-w-xs mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">{progress}%</p>
              </div>
            ) : (
              <>
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                  <p className="text-lg font-medium">اكتملت عملية الاستيراد</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center">
                    <div className="text-2xl font-bold text-green-700">
                      {results.filter(r => r.status === "success").length}
                    </div>
                    <div className="text-sm text-green-600">نجاح</div>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-center">
                    <div className="text-2xl font-bold text-red-700">
                      {results.filter(r => r.status === "error").length}
                    </div>
                    <div className="text-sm text-red-600">فشل</div>
                  </div>
                </div>

                {/* Error details */}
                {results.some(r => r.status === "error") && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">تفاصيل الأخطاء</Label>
                      <Button variant="ghost" size="sm" onClick={exportErrors} className="gap-1 text-xs">
                        <Download className="w-3 h-3" />
                        تصدير الأخطاء
                      </Button>
                    </div>
                    <div className="rounded-lg border overflow-y-auto max-h-40">
                      {results.filter(r => r.status === "error").map((r, i) => {
                        const nameField = fields[0];
                        const name = nameField ? getMappedValue(r.row, nameField.key) : `سجل ${i + 1}`;
                        return (
                          <div key={i} className="flex items-center gap-2 px-3 py-2 border-b last:border-0 text-xs">
                            <XCircle className="w-4 h-4 text-destructive shrink-0" />
                            <span>{name}</span>
                            <span className="text-muted-foreground">— {r.message}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => handleClose(false)}>إغلاق</Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

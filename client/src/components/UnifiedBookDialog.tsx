import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Upload, FileText, Link as LinkIcon, Loader2, UploadCloud,
  Trash2, FileType, BookOpen, Star, Save, Plus,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BookDialogSection {
  id: number;
  name: string;
}

export interface BookDialogBranch {
  id: number;
  section_id: number;
  name: string;
}

export interface BookDialogInitialValues {
  id?: number;
  title?: string;
  author?: string | null;
  description?: string | null;
  pages?: number | null;
  url?: string | null;
  sectionId?: number | null;
  branchId?: number | null;
  featured?: boolean;
  isPdf?: boolean;
  pdfStorageKey?: string | null;
  fileKey?: string | null;
  fileSize?: number | null;
  fileMime?: string | null;
  fileName?: string | null;
}

export interface BookDialogSubmitPayload {
  title: string;
  author: string | null;
  description: string | null;
  pages: number | null;
  url: string | null;
  sectionId: number;
  branchId: number | null;
  featured: boolean;
  isPdf: boolean;
  pdfStorageKey: string | null;
  fileKey: string | null;
  fileSize: number | null;
  fileMime: string | null;
  fileName: string | null;
}

export interface UnifiedBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: BookDialogSection[];
  branches: BookDialogBranch[];
  initialValues?: BookDialogInitialValues | null;
  defaultSectionId?: number | null;
  defaultBranchId?: number | null;
  saving?: boolean;
  mosqueId?: string | null;
  onSubmit: (payload: BookDialogSubmitPayload) => Promise<void> | void;
}

// ─── File size formatter ────────────────────────────────────────────────────

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Component ──────────────────────────────────────────────────────────────

type SourceTab = "file" | "url" | "none";

export function UnifiedBookDialog({
  open,
  onOpenChange,
  sections,
  branches,
  initialValues,
  defaultSectionId,
  defaultBranchId,
  saving = false,
  mosqueId,
  onSubmit,
}: UnifiedBookDialogProps) {
  const isEditing = !!initialValues?.id;

  // ── Metadata state
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [pages, setPages] = useState<string>("");
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [featured, setFeatured] = useState(false);

  // ── Source state
  const [sourceTab, setSourceTab] = useState<SourceTab>("file");
  const [url, setUrl] = useState("");

  // MinIO cloud file (new default)
  const [fileKey, setFileKey] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [fileMime, setFileMime] = useState<string | null>(null);

  // Legacy browser-local PDF (kept for backward compat)
  const [legacyPdfKey, setLegacyPdfKey] = useState<string | null>(null);
  const [legacyIsPdf, setLegacyIsPdf] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // ── Reset / hydrate when opening
  useEffect(() => {
    if (!open) return;
    if (initialValues) {
      setTitle(initialValues.title || "");
      setAuthor(initialValues.author || "");
      setDescription(initialValues.description || "");
      setPages(initialValues.pages ? String(initialValues.pages) : "");
      setSectionId(initialValues.sectionId ?? defaultSectionId ?? null);
      setBranchId(initialValues.branchId ?? defaultBranchId ?? null);
      setFeatured(!!initialValues.featured);
      setUrl(initialValues.url || "");
      setFileKey(initialValues.fileKey || null);
      setFileName(initialValues.fileName || null);
      setFileSize(initialValues.fileSize ?? null);
      setFileMime(initialValues.fileMime || null);
      setLegacyPdfKey(initialValues.pdfStorageKey || null);
      setLegacyIsPdf(!!initialValues.isPdf);

      // pick default tab based on what's present
      if (initialValues.fileKey || initialValues.pdfStorageKey) setSourceTab("file");
      else if (initialValues.url) setSourceTab("url");
      else setSourceTab("file");
    } else {
      setTitle("");
      setAuthor("");
      setDescription("");
      setPages("");
      setSectionId(defaultSectionId ?? null);
      setBranchId(defaultBranchId ?? null);
      setFeatured(false);
      setUrl("");
      setFileKey(null);
      setFileName(null);
      setFileSize(null);
      setFileMime(null);
      setLegacyPdfKey(null);
      setLegacyIsPdf(false);
      setSourceTab("file");
    }
    setUploading(false);
    setUploadProgress(0);
    setUploadError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues?.id]);

  // When section changes, reset branch if branch belongs to a different section
  useEffect(() => {
    if (branchId != null) {
      const b = branches.find((x) => x.id === branchId);
      if (!b || (sectionId != null && b.section_id !== sectionId)) {
        setBranchId(null);
      }
    }
  }, [sectionId, branchId, branches]);

  const availableBranches = sections.length === 0
    ? []
    : branches.filter((b) => sectionId != null && b.section_id === sectionId);

  // ── Upload handler (MinIO)
  const uploadFileToCloud = useCallback(async (file: File) => {
    setUploadError(null);
    setUploading(true);
    setUploadProgress(10);

    try {
      const fd = new FormData();
      fd.append("file", file);
      if (mosqueId) fd.append("mosqueId", mosqueId);

      // Use XHR for progress
      const res: { fileKey: string; fileSize: number; fileMime: string; fileName: string } =
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const urlEndpoint = mosqueId
            ? `/api/library/books/upload-file?mosqueId=${encodeURIComponent(mosqueId)}`
            : "/api/library/books/upload-file";
          xhr.open("POST", urlEndpoint);
          xhr.withCredentials = true;
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 90) + 5;
              setUploadProgress(pct);
            }
          };
          xhr.onload = () => {
            setUploadProgress(100);
            try {
              const data = JSON.parse(xhr.responseText || "{}");
              if (xhr.status >= 200 && xhr.status < 300) resolve(data);
              else reject(new Error(data.message || "فشل رفع الملف"));
            } catch {
              reject(new Error("استجابة غير صالحة من الخادم"));
            }
          };
          xhr.onerror = () => reject(new Error("تعذّر الاتصال بالخادم"));
          xhr.send(fd);
        });

      setFileKey(res.fileKey);
      setFileName(res.fileName);
      setFileSize(res.fileSize);
      setFileMime(res.fileMime);

      // Auto-fill title from filename if empty
      if (!title) {
        const nameNoExt = (res.fileName || file.name).replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setTitle(nameNoExt);
      }

      // Clear legacy PDF if user re-uploaded
      setLegacyPdfKey(null);
      setLegacyIsPdf(false);
    } catch (e) {
      setUploadError((e as Error).message || "فشل رفع الملف");
    } finally {
      setUploading(false);
    }
  }, [mosqueId, title]);

  const clearFile = () => {
    setFileKey(null);
    setFileName(null);
    setFileSize(null);
    setFileMime(null);
    setLegacyPdfKey(null);
    setLegacyIsPdf(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFileToCloud(file);
  }, [uploadFileToCloud]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFileToCloud(file);
  };

  // ── Validation
  const titleOk = title.trim().length > 0;
  const sectionOk = sectionId != null;
  const hasSomeSource = sourceTab === "none"
    || (sourceTab === "file" && (!!fileKey || !!legacyPdfKey))
    || (sourceTab === "url" && url.trim().length > 0)
    || isEditing; // when editing we don't force a source change

  const canSubmit = titleOk && sectionOk && hasSomeSource && !uploading && !saving;

  const handleSubmit = async () => {
    if (!canSubmit || sectionId == null) return;

    const payload: BookDialogSubmitPayload = {
      title: title.trim(),
      author: author.trim() || null,
      description: description.trim() || null,
      pages: pages ? Number(pages) : null,
      url: sourceTab === "url" ? (url.trim() || null) : (isEditing ? (url.trim() || null) : null),
      sectionId,
      branchId: branchId ?? null,
      featured,
      isPdf: legacyIsPdf,
      pdfStorageKey: legacyPdfKey,
      fileKey: sourceTab === "file" ? fileKey : (isEditing ? fileKey : null),
      fileSize: sourceTab === "file" ? fileSize : (isEditing ? fileSize : null),
      fileMime: sourceTab === "file" ? fileMime : (isEditing ? fileMime : null),
      fileName: sourceTab === "file" ? fileName : (isEditing ? fileName : null),
    };

    await onSubmit(payload);
  };

  const hasFile = !!fileKey || !!legacyPdfKey;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="sm:max-w-2xl max-h-[92vh] overflow-y-auto"
        data-testid="unified-book-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5 text-primary" />
            {isEditing ? "تعديل الكتاب" : "إضافة كتاب"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "عدّل بيانات الكتاب أو استبدل مصدره"
              : "أضف كتاباً جديداً برفع ملف، رابط خارجي، أو بيانات فقط"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Metadata ───────────────────────────────────── */}
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <h3 className="text-sm font-semibold text-muted-foreground">بيانات الكتاب</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>عنوان الكتاب *</Label>
                <Input
                  placeholder="أدخل عنوان الكتاب"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-book-title"
                />
              </div>
              <div className="space-y-1">
                <Label>المؤلف</Label>
                <Input
                  placeholder="اسم المؤلف (اختياري)"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  data-testid="input-book-author"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>الوصف</Label>
              <Textarea
                placeholder="وصف مختصر للكتاب (اختياري)"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>القسم *</Label>
                <Select
                  value={sectionId != null ? String(sectionId) : ""}
                  onValueChange={(v) => setSectionId(v ? Number(v) : null)}
                >
                  <SelectTrigger data-testid="select-book-section">
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>الفرع</Label>
                <Select
                  value={branchId != null ? String(branchId) : "none"}
                  onValueChange={(v) => setBranchId(v === "none" ? null : Number(v))}
                  disabled={availableBranches.length === 0}
                >
                  <SelectTrigger data-testid="select-book-branch">
                    <SelectValue placeholder={availableBranches.length === 0 ? "لا توجد فروع" : "بدون فرع"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون فرع</SelectItem>
                    {availableBranches.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>عدد الصفحات</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Switch
                id="unified-book-featured"
                checked={featured}
                onCheckedChange={setFeatured}
              />
              <Label htmlFor="unified-book-featured" className="flex items-center gap-1 cursor-pointer">
                <Star className={`h-4 w-4 ${featured ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground"}`} />
                كتاب مميز (يظهر في الصفحة الرئيسية)
              </Label>
            </div>
          </div>

          {/* ── Source selection ───────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">مصدر الكتاب</h3>

            <Tabs value={sourceTab} onValueChange={(v) => setSourceTab(v as SourceTab)}>
              <TabsList className="w-full">
                <TabsTrigger value="file" className="flex-1 gap-1" data-testid="tab-source-file">
                  <Upload className="h-4 w-4" />
                  رفع ملف
                </TabsTrigger>
                <TabsTrigger value="url" className="flex-1 gap-1" data-testid="tab-source-url">
                  <LinkIcon className="h-4 w-4" />
                  رابط خارجي
                </TabsTrigger>
                <TabsTrigger value="none" className="flex-1 gap-1" data-testid="tab-source-none">
                  <FileText className="h-4 w-4" />
                  بيانات فقط
                </TabsTrigger>
              </TabsList>

              {/* File tab */}
              <TabsContent value="file" className="mt-3 space-y-2">
                {uploading ? (
                  <div className="rounded-lg border p-6 text-center space-y-3">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                    <p className="text-sm font-medium">جاري رفع الملف إلى السحابة...</p>
                    <Progress value={uploadProgress} className="h-2 max-w-xs mx-auto" />
                    <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
                  </div>
                ) : hasFile ? (
                  <div className="flex items-center justify-between rounded-lg border bg-green-50 p-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileType className="h-5 w-5 text-red-600 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-green-900 truncate">
                          {fileName || legacyPdfKey || "ملف"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {fileSize != null && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white">
                              {formatBytes(fileSize)}
                            </Badge>
                          )}
                          {fileKey && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white border-blue-200 text-blue-700">
                              سحابي
                            </Badge>
                          )}
                          {legacyPdfKey && !fileKey && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white border-amber-200 text-amber-700">
                              محلي (متصفح فقط)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFile}
                      className="text-destructive hover:text-destructive"
                      data-testid="btn-clear-file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <UploadCloud className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium mb-1">اسحب الملف وأفلته هنا</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      PDF، Word (.docx)، أو نص (.txt) — حتى 100 ميجا
                    </p>
                    <label>
                      <Button variant="outline" size="sm" asChild>
                        <span className="cursor-pointer">اختيار ملف</span>
                      </Button>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        className="hidden"
                        onChange={handleFileInput}
                        data-testid="input-book-file"
                      />
                    </label>
                  </div>
                )}

                {uploadError && (
                  <div className="text-xs text-destructive px-2">{uploadError}</div>
                )}
              </TabsContent>

              {/* URL tab */}
              <TabsContent value="url" className="mt-3 space-y-2">
                <div className="space-y-1">
                  <Label>رابط الكتاب</Label>
                  <Input
                    placeholder="https://example.com/book.pdf"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    dir="ltr"
                    data-testid="input-book-url"
                  />
                  <p className="text-xs text-muted-foreground">
                    يفتح هذا الرابط في تبويب جديد عند النقر على زر "فتح"
                  </p>
                </div>
              </TabsContent>

              {/* Metadata-only tab */}
              <TabsContent value="none" className="mt-3">
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  سيُحفظ الكتاب بالبيانات فقط. يمكنك إضافة ملف أو رابط لاحقاً من خلال "تعديل".
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || uploading}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="gap-1"
            data-testid="btn-save-book"
          >
            {(saving || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
            {!saving && !uploading && (isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
            {isEditing ? "حفظ التغييرات" : "إضافة الكتاب"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

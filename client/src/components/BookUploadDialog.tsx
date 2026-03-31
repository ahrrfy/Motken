import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Upload, FileText, BookOpen, Loader2, Eye, ChevronDown,
  ChevronUp, Trash2, Edit, UploadCloud,
} from "lucide-react";

interface ChapterData {
  title: string;
  content: string;
}

interface BookUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
  onSubmit: (book: {
    title: string;
    author: string;
    category: string;
    description: string;
    content: string;
    chapters: ChapterData[];
  }) => void;
}

export function BookUploadDialog({
  open,
  onOpenChange,
  categories,
  onSubmit,
}: BookUploadDialogProps) {
  const [step, setStep] = useState<"input" | "preview">("input");
  const [inputMode, setInputMode] = useState<"text" | "file">("file");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [textContent, setTextContent] = useState("");
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [editingChapter, setEditingChapter] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = () => {
    setStep("input");
    setInputMode("file");
    setTitle("");
    setAuthor("");
    setCategory("");
    setDescription("");
    setTextContent("");
    setChapters([]);
    setExtracting(false);
    setExtractProgress(0);
    setFileName("");
    setEditingChapter(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  // Extract text from PDF using pdfjs-dist
  const extractFromPdf = async (file: File): Promise<string> => {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).href;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    let fullText = "";

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += pageText + "\n\n---PAGE_BREAK---\n\n";
      setExtractProgress(Math.round((i / totalPages) * 100));
    }

    return fullText;
  };

  // Extract text from Word using mammoth
  const extractFromWord = async (file: File): Promise<string> => {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    setExtractProgress(100);
    return result.value;
  };

  // Auto-split text into chapters
  const splitIntoChapters = (text: string): ChapterData[] => {
    // Try to detect chapter markers
    const chapterPatterns = [
      /^(الفصل|الباب|المبحث|القسم)\s+(الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d+)\s*[:\-]?\s*(.*)/gm,
      /^(الفصل|الباب|المبحث|القسم)\s+(\d+)\s*[:\-]?\s*(.*)/gm,
      /^#{1,3}\s+(.+)/gm, // Markdown headings
      /---PAGE_BREAK---/g,
    ];

    // Try chapter pattern detection
    const matches: { index: number; title: string }[] = [];
    for (const pattern of chapterPatterns.slice(0, 2)) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        matches.push({ index: match.index, title: match[0].trim() });
      }
      if (matches.length >= 2) break;
    }

    if (matches.length >= 2) {
      // Split by detected chapter headings
      const result: ChapterData[] = [];
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
        const content = text.slice(start, end).trim();
        result.push({
          title: matches[i].title.slice(0, 100),
          content: content,
        });
      }

      // Add any text before the first chapter as introduction
      if (matches[0].index > 100) {
        result.unshift({
          title: "المقدمة",
          content: text.slice(0, matches[0].index).trim(),
        });
      }

      return result;
    }

    // Fallback: split by page breaks or by size
    const pageBreaks = text.split("---PAGE_BREAK---").filter(t => t.trim());
    if (pageBreaks.length > 1) {
      // Group every ~5 pages into a chapter
      const pagesPerChapter = 5;
      const result: ChapterData[] = [];
      for (let i = 0; i < pageBreaks.length; i += pagesPerChapter) {
        const chunk = pageBreaks.slice(i, i + pagesPerChapter).join("\n\n");
        result.push({
          title: `الجزء ${result.length + 1}`,
          content: chunk.trim(),
        });
      }
      return result;
    }

    // Fallback: split by character count (~2000 chars per chapter)
    const chunkSize = 2000;
    const result: ChapterData[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      // Try to break at a paragraph boundary
      let end = Math.min(i + chunkSize, text.length);
      if (end < text.length) {
        const nextParagraph = text.indexOf("\n\n", end - 200);
        if (nextParagraph > 0 && nextParagraph < end + 200) {
          end = nextParagraph;
        }
      }
      result.push({
        title: `الجزء ${result.length + 1}`,
        content: text.slice(i, end).trim(),
      });
      i = end - chunkSize + (end - i); // Adjust for the actual break point
    }

    // Simpler fallback
    if (result.length === 0) {
      const parts = text.match(/.{1,2000}/gs) || [text];
      return parts.map((p, i) => ({
        title: `الجزء ${i + 1}`,
        content: p.trim(),
      }));
    }

    return result;
  };

  const handleFileUpload = async (file: File) => {
    setFileName(file.name);
    setExtracting(true);
    setExtractProgress(0);

    try {
      let text: string;
      if (file.name.endsWith(".pdf")) {
        text = await extractFromPdf(file);
      } else if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
        text = await extractFromWord(file);
      } else if (file.name.endsWith(".txt")) {
        text = await file.text();
        setExtractProgress(100);
      } else {
        throw new Error("صيغة غير مدعومة. استخدم PDF أو Word أو TXT");
      }

      // Clean up text
      text = text.replace(/---PAGE_BREAK---/g, "\n\n").replace(/\s{3,}/g, "\n\n").trim();
      setTextContent(text);

      // Auto-split into chapters
      const autoChapters = splitIntoChapters(text);
      setChapters(autoChapters);

      // Auto-fill title from filename if empty
      if (!title) {
        const nameNoExt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        setTitle(nameNoExt);
      }

      // Auto-generate description
      if (!description) {
        setDescription(text.slice(0, 150).replace(/\n/g, " ") + "...");
      }

    } catch (err) {
      alert(err instanceof Error ? err.message : "فشل في استخراج النص");
    } finally {
      setExtracting(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [title, description]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleTextSubmit = () => {
    if (!textContent.trim()) return;
    const autoChapters = splitIntoChapters(textContent);
    setChapters(autoChapters);
    if (!description) {
      setDescription(textContent.slice(0, 150).replace(/\n/g, " ") + "...");
    }
  };

  const moveToPreview = () => {
    if (!title.trim() || !author.trim() || !category) return;
    if (chapters.length === 0 && textContent.trim()) {
      handleTextSubmit();
    }
    setStep("preview");
  };

  const handleFinalSubmit = () => {
    onSubmit({
      title: title.trim(),
      author: author.trim(),
      category,
      description: description.trim() || title.trim(),
      content: textContent,
      chapters: chapters.length > 0 ? chapters : [{ title: "المحتوى", content: textContent }],
    });
    handleClose(false);
  };

  const removeChapter = (idx: number) => {
    setChapters(prev => prev.filter((_, i) => i !== idx));
  };

  const updateChapterTitle = (idx: number, newTitle: string) => {
    setChapters(prev => prev.map((ch, i) => i === idx ? { ...ch, title: newTitle } : ch));
  };

  const totalChars = chapters.reduce((sum, ch) => sum + ch.content.length, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            إضافة كتاب جديد
          </DialogTitle>
          <DialogDescription>أضف كتاباً عبر رفع ملف PDF/Word أو إدخال النص مباشرة</DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-4 py-2">
            {/* Book Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>عنوان الكتاب *</Label>
                <Input
                  placeholder="أدخل عنوان الكتاب"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  data-testid="input-upload-title"
                />
              </div>
              <div className="space-y-1">
                <Label>اسم المؤلف *</Label>
                <Input
                  placeholder="أدخل اسم المؤلف"
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  data-testid="input-upload-author"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>التصنيف *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-upload-category">
                    <SelectValue placeholder="اختر التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>وصف مختصر</Label>
                <Input
                  placeholder="وصف الكتاب (اختياري)"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Input Mode Tabs */}
            <Tabs value={inputMode} onValueChange={v => setInputMode(v as "text" | "file")}>
              <TabsList className="w-full">
                <TabsTrigger value="file" className="flex-1 gap-1">
                  <Upload className="w-4 h-4" />
                  رفع ملف
                </TabsTrigger>
                <TabsTrigger value="text" className="flex-1 gap-1">
                  <FileText className="w-4 h-4" />
                  إدخال نص
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="mt-3">
                {extracting ? (
                  <div className="text-center py-6 space-y-3">
                    <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary" />
                    <p className="font-medium">جاري استخراج النص من {fileName}...</p>
                    <Progress value={extractProgress} className="h-2 max-w-xs mx-auto" />
                    <p className="text-sm text-muted-foreground">{extractProgress}%</p>
                  </div>
                ) : textContent ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-700">{fileName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {textContent.length.toLocaleString()} حرف
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {chapters.length} فصل
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => { setTextContent(""); setChapters([]); setFileName(""); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                    }`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <UploadCloud className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium mb-1">اسحب الملف وأفلته هنا</p>
                    <p className="text-xs text-muted-foreground mb-3">PDF, Word (.docx), أو نص (.txt)</p>
                    <label>
                      <Button variant="outline" size="sm" asChild>
                        <span>اختيار ملف</span>
                      </Button>
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
                        className="hidden"
                        onChange={handleFileInput}
                      />
                    </label>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="text" className="mt-3">
                <Textarea
                  placeholder="الصق نص الكتاب هنا..."
                  value={textContent}
                  onChange={e => setTextContent(e.target.value)}
                  className="min-h-[200px] font-serif leading-relaxed"
                  dir="rtl"
                  data-testid="input-upload-content"
                />
                {textContent.length > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {textContent.length.toLocaleString()} حرف • ~{Math.ceil(textContent.length / 2000)} صفحة
                    </p>
                    <Button variant="ghost" size="sm" onClick={handleTextSubmit} className="text-xs">
                      تقسيم لفصول
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => handleClose(false)}>إلغاء</Button>
              <Button
                onClick={moveToPreview}
                disabled={!title.trim() || !author.trim() || !category || (!textContent.trim() && chapters.length === 0)}
                className="gap-1"
              >
                <Eye className="w-4 h-4" />
                معاينة
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 py-2">
            {/* Book Summary */}
            <div className="p-4 rounded-lg bg-muted/50 border space-y-1">
              <h3 className="font-bold text-lg font-serif">{title}</h3>
              <p className="text-sm text-muted-foreground">{author} • {category}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{chapters.length} فصل</Badge>
                <Badge variant="outline">{totalChars.toLocaleString()} حرف</Badge>
                <Badge variant="outline">~{Math.ceil(totalChars / 2000)} صفحة</Badge>
              </div>
            </div>

            {/* Chapter List */}
            <div>
              <Label className="text-sm font-medium mb-2 block">جدول المحتويات</Label>
              <div className="space-y-1 max-h-60 overflow-y-auto rounded-lg border p-2">
                {chapters.map((ch, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 group">
                    <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                    {editingChapter === i ? (
                      <Input
                        value={ch.title}
                        onChange={e => updateChapterTitle(i, e.target.value)}
                        onBlur={() => setEditingChapter(null)}
                        onKeyDown={e => { if (e.key === "Enter") setEditingChapter(null); }}
                        className="h-7 text-sm flex-1"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm flex-1 truncate">{ch.title}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{ch.content.length.toLocaleString()} حرف</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingChapter(i)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      {chapters.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeChapter(i)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chapter Preview */}
            {chapters.length > 0 && (
              <div>
                <Label className="text-sm font-medium mb-2 block">معاينة المحتوى (الفصل الأول)</Label>
                <div className="p-3 rounded-lg border bg-white max-h-32 overflow-y-auto text-sm font-serif leading-relaxed text-right" dir="rtl">
                  {chapters[0].content.slice(0, 500)}
                  {chapters[0].content.length > 500 && "..."}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep("input")}>رجوع</Button>
              <Button
                onClick={handleFinalSubmit}
                style={{ background: "linear-gradient(90deg, #1a5e3a, #2d7a4f)", color: "white" }}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                إضافة الكتاب
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useCallback } from "react";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Book, Search, BookOpen, ArrowRight, Plus, Pencil, Trash2,
  FolderOpen, ChevronLeft, Star, ExternalLink, FileText,
  Library, Layers, BookCopy, Loader2, Building2, AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { UnifiedBookDialog, type BookDialogSubmitPayload } from "@/components/UnifiedBookDialog";
import { PdfViewer } from "@/components/PdfViewer";
import { deletePdf } from "@/lib/pdf-storage";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Section {
  id: number;
  mosque_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  branches_count: number;
  books_count: number;
}

interface Branch {
  id: number;
  section_id: number;
  mosque_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  books_count: number;
}

interface BookItem {
  id: number;
  section_id: number;
  branch_id: number | null;
  mosque_id: string;
  title: string;
  author: string | null;
  description: string | null;
  pages: number | null;
  url: string | null;
  pdf_storage_key: string | null;
  is_pdf: boolean;
  featured: boolean;
  cover_image: string | null;
  file_key: string | null;
  file_size: number | null;
  file_mime: string | null;
  file_name: string | null;
  created_by: string;
  added_by_role: string | null;
  created_at: string;
}

// ─── Icon mapping ────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, React.ReactNode> = {
  book: <Book className="h-6 w-6" />,
  bookOpen: <BookOpen className="h-6 w-6" />,
  library: <Library className="h-6 w-6" />,
  layers: <Layers className="h-6 w-6" />,
  bookCopy: <BookCopy className="h-6 w-6" />,
  folder: <FolderOpen className="h-6 w-6" />,
  star: <Star className="h-6 w-6" />,
  fileText: <FileText className="h-6 w-6" />,
};

function getSectionIcon(icon: string | null) {
  if (icon && SECTION_ICONS[icon]) return SECTION_ICONS[icon];
  return <Book className="h-6 w-6" />;
}

const ICON_OPTIONS = [
  { value: "book", label: "كتاب" },
  { value: "bookOpen", label: "كتاب مفتوح" },
  { value: "library", label: "مكتبة" },
  { value: "layers", label: "طبقات" },
  { value: "bookCopy", label: "نسخ" },
  { value: "folder", label: "مجلد" },
  { value: "star", label: "نجمة" },
  { value: "fileText", label: "ملف نصي" },
];

// ─── API helpers ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.message || "حدث خطأ", res.status, data.code);
  }
  return res.json();
}

// Append mosqueId query param if provided (admins only — servers for non-admins ignore it)
function withMosque(url: string, mosqueId: string | null | undefined): string {
  if (!mosqueId) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}mosqueId=${encodeURIComponent(mosqueId)}`;
}

interface MosqueOption {
  id: string;
  name: string;
  isActive?: boolean;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function LibraryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin" || user?.role === "supervisor";
  const isSuperAdmin = user?.role === "admin";

  // Navigation state
  const [currentSection, setCurrentSection] = useState<Section | null>(null);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);

  // Mosque selection (admins can switch; others use their own)
  const [mosques, setMosques] = useState<MosqueOption[]>([]);
  const [selectedMosqueId, setSelectedMosqueId] = useState<string>(user?.mosqueId || "");
  const [mosquesLoading, setMosquesLoading] = useState(true);

  // Data state
  const [sections, setSections] = useState<Section[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [books, setBooks] = useState<BookItem[]>([]);
  const [featuredBooks, setFeaturedBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [booksLoading, setBooksLoading] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookItem[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Dialogs
  const [sectionDialog, setSectionDialog] = useState(false);
  const [branchDialog, setBranchDialog] = useState(false);
  const [bookDialog, setBookDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    type: "section" | "branch" | "book";
    id: number;
    name: string;
  } | null>(null);

  // Edit state
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editingBook, setEditingBook] = useState<BookItem | null>(null);

  // Form state (sections + branches only — book form lives in UnifiedBookDialog)
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIcon, setFormIcon] = useState("book");
  const [formBranchSectionId, setFormBranchSectionId] = useState<number | null>(null);

  // PDF viewer
  const [pdfViewer, setPdfViewer] = useState<{
    key: string;
    title: string;
    author: string;
    pages?: number;
  } | null>(null);

  // Saving state
  const [saving, setSaving] = useState(false);

  // ─── Data fetching ──────────────────────────────────────────────────────

  const fetchMosques = useCallback(async () => {
    setMosquesLoading(true);
    try {
      const res = await fetch("/api/mosques", { credentials: "include" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      const arr: MosqueOption[] = Array.isArray(data) ? data : [data];
      const active = arr.filter((m) => m && m.id && m.isActive !== false);
      setMosques(active);

      // Auto-select:
      // - admin with one mosque → pick it
      // - admin with multiple → require explicit choice
      // - non-admin → always their own mosqueId (server enforces)
      if (isSuperAdmin) {
        if (active.length === 1) {
          setSelectedMosqueId(active[0].id);
        } else if (active.length > 1 && !selectedMosqueId) {
          // stay empty until user picks
        }
      } else if (user?.mosqueId) {
        setSelectedMosqueId(user.mosqueId);
      }
    } catch {
      setMosques([]);
    } finally {
      setMosquesLoading(false);
    }
  }, [isSuperAdmin, user?.mosqueId, selectedMosqueId]);

  const fetchSections = useCallback(async () => {
    if (!selectedMosqueId && !isSuperAdmin && !user?.mosqueId) {
      setSections([]);
      return;
    }
    if (isSuperAdmin && !selectedMosqueId) {
      setSections([]);
      return;
    }
    try {
      const data = await apiFetch<Section[]>(withMosque("/api/library/sections", selectedMosqueId));
      setSections(data);
    } catch (e) {
      const err = e as ApiError;
      if (err.code === "MISSING_MOSQUE_ASSOCIATION") {
        setSections([]);
        return;
      }
      toast({ title: "خطأ", description: err.message || "فشل في تحميل الأقسام", variant: "destructive" });
    }
  }, [toast, selectedMosqueId, isSuperAdmin, user?.mosqueId]);

  const fetchFeaturedBooks = useCallback(async () => {
    if (isSuperAdmin && !selectedMosqueId) {
      setFeaturedBooks([]);
      return;
    }
    if (!selectedMosqueId && !user?.mosqueId) {
      setFeaturedBooks([]);
      return;
    }
    try {
      const data = await apiFetch<BookItem[]>(withMosque("/api/library/books", selectedMosqueId));
      setFeaturedBooks(data.filter((b) => b.featured));
    } catch {
      // silent
    }
  }, [selectedMosqueId, isSuperAdmin, user?.mosqueId]);

  const fetchBranches = useCallback(async (sectionId: number) => {
    setBooksLoading(true);
    try {
      const [branchData, bookData] = await Promise.all([
        apiFetch<Branch[]>(withMosque(`/api/library/branches/${sectionId}`, selectedMosqueId)),
        apiFetch<BookItem[]>(withMosque(`/api/library/books?sectionId=${sectionId}`, selectedMosqueId)),
      ]);
      setBranches(branchData);
      setBooks(bookData);
    } catch (e) {
      toast({ title: "خطأ", description: (e as Error).message || "فشل في تحميل البيانات", variant: "destructive" });
    } finally {
      setBooksLoading(false);
    }
  }, [toast, selectedMosqueId]);

  const fetchBranchBooks = useCallback(async (branchId: number) => {
    setBooksLoading(true);
    try {
      const data = await apiFetch<BookItem[]>(withMosque(`/api/library/books?branchId=${branchId}`, selectedMosqueId));
      setBooks(data);
    } catch (e) {
      toast({ title: "خطأ", description: (e as Error).message || "فشل في تحميل الكتب", variant: "destructive" });
    } finally {
      setBooksLoading(false);
    }
  }, [toast, selectedMosqueId]);

  // Initial mosque load
  useEffect(() => {
    fetchMosques();
  }, [fetchMosques]);

  // Load library content whenever the selected mosque changes
  useEffect(() => {
    const hasMosque = isSuperAdmin ? !!selectedMosqueId : !!(selectedMosqueId || user?.mosqueId);
    if (!hasMosque) {
      setLoading(false);
      setSections([]);
      setFeaturedBooks([]);
      return;
    }
    setLoading(true);
    // Reset navigation when switching mosque
    setCurrentSection(null);
    setCurrentBranch(null);
    setBranches([]);
    setBooks([]);
    setSearchResults(null);
    Promise.all([fetchSections(), fetchFeaturedBooks()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMosqueId]);

  // ─── Navigation ─────────────────────────────────────────────────────────

  const navigateToSection = (section: Section) => {
    setCurrentSection(section);
    setCurrentBranch(null);
    setSearchResults(null);
    setSearchQuery("");
    fetchBranches(section.id);
  };

  const navigateToBranch = (branch: Branch) => {
    setCurrentBranch(branch);
    setSearchResults(null);
    setSearchQuery("");
    fetchBranchBooks(branch.id);
  };

  const navigateBack = () => {
    if (currentBranch) {
      setCurrentBranch(null);
      if (currentSection) fetchBranches(currentSection.id);
    } else {
      setCurrentSection(null);
      setBranches([]);
      setBooks([]);
    }
    setSearchResults(null);
    setSearchQuery("");
  };

  const navigateHome = () => {
    setCurrentSection(null);
    setCurrentBranch(null);
    setBranches([]);
    setBooks([]);
    setSearchResults(null);
    setSearchQuery("");
  };

  // ─── Search ─────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const data = await apiFetch<BookItem[]>(
        withMosque(`/api/library/books?search=${encodeURIComponent(q)}`, selectedMosqueId),
      );
      setSearchResults(data);
    } catch {
      toast({ title: "خطأ", description: "فشل في البحث", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  }, [searchQuery, toast, selectedMosqueId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) handleSearch();
      else setSearchResults(null);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // ─── CRUD: Sections ─────────────────────────────────────────────────────

  const openSectionDialog = (section?: Section) => {
    if (section) {
      setEditingSection(section);
      setFormName(section.name);
      setFormDescription(section.description || "");
      setFormIcon(section.icon || "book");
    } else {
      setEditingSection(null);
      setFormName("");
      setFormDescription("");
      setFormIcon("book");
    }
    setSectionDialog(true);
  };

  const effectiveMosqueId = selectedMosqueId || user?.mosqueId || "";

  const handleMosqueAssociationError = (err: ApiError): boolean => {
    if (err.code !== "MISSING_MOSQUE_ASSOCIATION") return false;
    toast({
      title: isSuperAdmin ? "اختر مسجداً" : "حساب غير مرتبط بمسجد",
      description: err.message,
      variant: "destructive",
    });
    return true;
  };

  const saveSection = async () => {
    if (!formName.trim()) {
      toast({ title: "خطأ", description: "اسم القسم مطلوب", variant: "destructive" });
      return;
    }
    if (!effectiveMosqueId) {
      toast({
        title: isSuperAdmin ? "اختر مسجداً" : "حساب غير مرتبط بمسجد",
        description: isSuperAdmin
          ? "يرجى اختيار مسجد أولاً من أعلى الصفحة."
          : "لا يوجد مسجد مرتبط بحسابك. يرجى التواصل مع إدارة النظام.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      if (editingSection) {
        await apiFetch(`/api/library/sections/${editingSection.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: formName,
            description: formDescription || null,
            icon: formIcon,
            mosqueId: effectiveMosqueId,
          }),
        });
        toast({ title: "تم التحديث", description: "تم تحديث القسم بنجاح" });
      } else {
        await apiFetch("/api/library/sections", {
          method: "POST",
          body: JSON.stringify({
            name: formName,
            description: formDescription || null,
            icon: formIcon,
            mosqueId: effectiveMosqueId,
          }),
        });
        toast({ title: "تمت الإضافة", description: "تم إنشاء القسم بنجاح" });
      }
      setSectionDialog(false);
      await fetchSections();
    } catch (e) {
      const err = e as ApiError;
      if (handleMosqueAssociationError(err)) return;
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ─── CRUD: Branches ─────────────────────────────────────────────────────

  const openBranchDialog = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormName(branch.name);
      setFormDescription(branch.description || "");
      setFormBranchSectionId(branch.section_id);
    } else {
      setEditingBranch(null);
      setFormName("");
      setFormDescription("");
      setFormBranchSectionId(currentSection?.id || null);
    }
    setBranchDialog(true);
  };

  const saveBranch = async () => {
    if (!formName.trim()) {
      toast({ title: "خطأ", description: "اسم الفرع مطلوب", variant: "destructive" });
      return;
    }
    const sectionId = formBranchSectionId || currentSection?.id;
    if (!sectionId) {
      toast({ title: "خطأ", description: "يجب تحديد القسم", variant: "destructive" });
      return;
    }
    if (!effectiveMosqueId) {
      toast({
        title: isSuperAdmin ? "اختر مسجداً" : "حساب غير مرتبط بمسجد",
        description: isSuperAdmin
          ? "يرجى اختيار مسجد أولاً من أعلى الصفحة."
          : "لا يوجد مسجد مرتبط بحسابك.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      if (editingBranch) {
        await apiFetch(`/api/library/branches/${editingBranch.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: formName,
            description: formDescription || null,
            mosqueId: effectiveMosqueId,
          }),
        });
        toast({ title: "تم التحديث", description: "تم تحديث الفرع بنجاح" });
      } else {
        await apiFetch("/api/library/branches", {
          method: "POST",
          body: JSON.stringify({
            sectionId,
            name: formName,
            description: formDescription || null,
            mosqueId: effectiveMosqueId,
          }),
        });
        toast({ title: "تمت الإضافة", description: "تم إنشاء الفرع بنجاح" });
      }
      setBranchDialog(false);
      if (currentSection) await fetchBranches(currentSection.id);
    } catch (e) {
      const err = e as ApiError;
      if (handleMosqueAssociationError(err)) return;
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ─── CRUD: Books (unified) ──────────────────────────────────────────────

  const openBookDialog = (book?: BookItem) => {
    setEditingBook(book || null);
    setBookDialog(true);
  };

  const saveUnifiedBook = async (payload: BookDialogSubmitPayload) => {
    if (!effectiveMosqueId) {
      toast({
        title: isSuperAdmin ? "اختر مسجداً" : "حساب غير مرتبط بمسجد",
        description: isSuperAdmin
          ? "يرجى اختيار مسجد أولاً من أعلى الصفحة."
          : "لا يوجد مسجد مرتبط بحسابك.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const body = { ...payload, mosqueId: effectiveMosqueId };
      if (editingBook) {
        await apiFetch(`/api/library/books/${editingBook.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        toast({ title: "تم التحديث", description: "تم تحديث الكتاب بنجاح" });
      } else {
        await apiFetch("/api/library/books", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast({ title: "تمت الإضافة", description: "تم إضافة الكتاب بنجاح" });
      }
      setBookDialog(false);
      setEditingBook(null);
      if (currentBranch) {
        await fetchBranchBooks(currentBranch.id);
      } else if (currentSection) {
        await fetchBranches(currentSection.id);
      }
      await fetchFeaturedBooks();
    } catch (e) {
      const err = e as ApiError;
      if (handleMosqueAssociationError(err)) return;
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete handler ─────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    setSaving(true);
    try {
      const pathSegment = deleteDialog.type === "section" ? "sections" : deleteDialog.type === "branch" ? "branches" : "books";
      await apiFetch(
        withMosque(`/api/library/${pathSegment}/${deleteDialog.id}`, selectedMosqueId),
        { method: "DELETE" },
      );
      toast({ title: "تم الحذف", description: `تم حذف ${deleteDialog.name} بنجاح` });
      setDeleteDialog(null);

      // Refresh
      if (deleteDialog.type === "section") {
        await fetchSections();
        if (currentSection?.id === deleteDialog.id) navigateHome();
      } else if (deleteDialog.type === "branch") {
        if (currentSection) await fetchBranches(currentSection.id);
        if (currentBranch?.id === deleteDialog.id) {
          setCurrentBranch(null);
        }
      } else {
        if (currentBranch) await fetchBranchBooks(currentBranch.id);
        else if (currentSection) await fetchBranches(currentSection.id);
        await fetchFeaturedBooks();
      }
    } catch (e) {
      const err = e as ApiError;
      if (handleMosqueAssociationError(err)) return;
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete book ────────────────────────────────────────────────────────

  const handleDeleteBook = (book: BookItem) => {
    setDeleteDialog({ type: "book", id: book.id, name: book.title });
  };

  // ─── Render helpers ─────────────────────────────────────────────────────

  const displayBooks = searchResults ?? books;
  const directBooks = currentBranch
    ? displayBooks
    : displayBooks.filter((b) => !b.branch_id);
  const branchBooks = currentBranch ? [] : displayBooks.filter((b) => b.branch_id);

  // ─── Breadcrumb ─────────────────────────────────────────────────────────

  function Breadcrumb() {
    return (
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4 flex-wrap">
        <button
          onClick={navigateHome}
          className={`hover:text-primary transition-colors ${!currentSection ? "text-primary font-bold" : ""}`}
        >
          المكتبة الإسلامية
        </button>
        {currentSection && (
          <>
            <ChevronLeft className="h-4 w-4" />
            <button
              onClick={() => {
                setCurrentBranch(null);
                fetchBranches(currentSection.id);
              }}
              className={`hover:text-primary transition-colors ${!currentBranch ? "text-primary font-bold" : ""}`}
            >
              {currentSection.name}
            </button>
          </>
        )}
        {currentBranch && (
          <>
            <ChevronLeft className="h-4 w-4" />
            <span className="text-primary font-bold">{currentBranch.name}</span>
          </>
        )}
      </nav>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  if (pdfViewer) {
    return (
      <PdfViewer
        pdfStorageKey={pdfViewer.key}
        bookTitle={pdfViewer.title}
        bookAuthor={pdfViewer.author}
        totalPages={pdfViewer.pages}
        onClose={() => setPdfViewer(null)}
      />
    );
  }

  const noMosqueForNonAdmin = !isSuperAdmin && !user?.mosqueId && !mosquesLoading;
  const adminNeedsMosquePick = isSuperAdmin && !selectedMosqueId && !mosquesLoading;
  const canManage = isAdmin && !!effectiveMosqueId;
  const manageDisabledReason = isSuperAdmin
    ? "اختر مسجداً أولاً من أعلى الصفحة"
    : "لا يوجد مسجد مرتبط بحسابك";

  return (
    <div dir="rtl" className="min-h-screen bg-background p-4 md:p-6 max-w-7xl mx-auto">
      {/* Mosque selector (admins only) */}
      {isSuperAdmin && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-card rounded-lg border p-3" data-testid="library-mosque-selector">
          <Label className="font-semibold flex items-center gap-2 shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
            إدارة مكتبة مسجد:
          </Label>
          {mosquesLoading ? (
            <Skeleton className="h-10 w-full sm:max-w-md" />
          ) : mosques.length === 0 ? (
            <span className="text-sm text-muted-foreground">لا توجد مساجد نشطة</span>
          ) : (
            <Select value={selectedMosqueId} onValueChange={setSelectedMosqueId}>
              <SelectTrigger className="sm:max-w-md" data-testid="select-mosque">
                <SelectValue placeholder="اختر مسجداً لإدارة مكتبته..." />
              </SelectTrigger>
              <SelectContent>
                {mosques.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {currentSection && (
            <Button variant="ghost" size="icon" onClick={navigateBack}>
              <ArrowRight className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center gap-2">
              <Library className="h-7 w-7" />
              المكتبة الإسلامية
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              تصفح الكتب والمراجع الشرعية
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            {!currentSection && (
              <Button
                size="sm"
                onClick={() => openSectionDialog()}
                disabled={!canManage}
                title={!canManage ? manageDisabledReason : undefined}
                data-testid="btn-new-section"
              >
                <Plus className="h-4 w-4 ml-1" />
                قسم جديد
              </Button>
            )}
            {currentSection && !currentBranch && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openBranchDialog()}
                disabled={!canManage}
                title={!canManage ? manageDisabledReason : undefined}
              >
                <Plus className="h-4 w-4 ml-1" />
                فرع جديد
              </Button>
            )}
            {currentSection && (
              <Button
                size="sm"
                onClick={() => openBookDialog()}
                disabled={!canManage}
                title={!canManage ? manageDisabledReason : undefined}
                data-testid="btn-new-book"
              >
                <Plus className="h-4 w-4 ml-1" />
                إضافة كتاب
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Empty states (blocking) */}
      {noMosqueForNonAdmin && (
        <Card className="p-8 text-center" data-testid="library-no-mosque-empty">
          <AlertCircle className="h-14 w-14 mx-auto mb-4 text-destructive opacity-70" />
          <h2 className="text-lg font-bold mb-2">حسابك غير مرتبط بمسجد</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            لا يمكن عرض مكتبة أو إنشاء محتوى قبل ربط حسابك بمسجد. يرجى التواصل مع إدارة النظام لإكمال ربط حسابك.
          </p>
        </Card>
      )}

      {adminNeedsMosquePick && (
        <Card className="p-8 text-center" data-testid="library-admin-pick-mosque">
          <Building2 className="h-14 w-14 mx-auto mb-4 text-primary opacity-70" />
          <h2 className="text-lg font-bold mb-2">اختر مسجداً لإدارة مكتبته</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            يرجى اختيار مسجد من القائمة أعلى الصفحة لعرض أقسامه وكتبه وإدارتها.
          </p>
        </Card>
      )}

      {!noMosqueForNonAdmin && !adminNeedsMosquePick && <Breadcrumb />}

      {/* Search bar */}
      {!noMosqueForNonAdmin && !adminNeedsMosquePick && (
      <div className="relative mb-6 max-w-lg">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ابحث في جميع الكتب..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
        {searching && <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
      </div>
      )}

      {/* Everything below only shows when we have a working mosque context */}
      {!noMosqueForNonAdmin && !adminNeedsMosquePick && (
      <>

      {/* Search results */}
      {searchResults !== null && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">
              نتائج البحث ({searchResults.length})
            </h2>
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setSearchResults(null); }}>
              مسح البحث
            </Button>
          </div>
          {searchResults.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد نتائج للبحث</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  isAdmin={isAdmin}
                  onEdit={() => openBookDialog(book)}
                  onDelete={() => handleDeleteBook(book)}
                  onViewPdf={() =>
                    setPdfViewer({
                      key: book.pdf_storage_key!,
                      title: book.title,
                      author: book.author || "",
                      pages: book.pages || undefined,
                    })
                  }
                  sections={sections}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-6 w-3/4 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      )}

      {/* Main content (only when not showing search results) */}
      {!loading && searchResults === null && (
        <>
          {/* Featured books (only on home) */}
          {!currentSection && featuredBooks.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                كتب مميزة
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {featuredBooks.slice(0, 8).map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    isAdmin={isAdmin}
                    onEdit={() => openBookDialog(book)}
                    onDelete={() => handleDeleteBook(book)}
                    onViewPdf={() =>
                      setPdfViewer({
                        key: book.pdf_storage_key!,
                        title: book.title,
                        author: book.author || "",
                        pages: book.pages || undefined,
                      })
                    }
                    sections={sections}
                    compact
                  />
                ))}
              </div>
            </div>
          )}

          {/* Sections grid (home view) */}
          {!currentSection && (
            <div>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Layers className="h-5 w-5" />
                أقسام المكتبة
              </h2>
              {sections.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground">
                  <Library className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg mb-2">لا توجد أقسام بعد</p>
                  {isAdmin && (
                    <Button className="mt-4" onClick={() => openSectionDialog()}>
                      <Plus className="h-4 w-4 ml-1" />
                      إنشاء أول قسم
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sections.map((section) => (
                    <Card
                      key={section.id}
                      className="cursor-pointer hover:shadow-md transition-shadow group"
                      onClick={() => navigateToSection(section)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-lg">
                              {getSectionIcon(section.icon)}
                            </div>
                            <CardTitle className="text-lg">{section.name}</CardTitle>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSectionDialog(section);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteDialog({ type: "section", id: section.id, name: section.name });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {section.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {section.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FolderOpen className="h-3.5 w-3.5" />
                            {section.branches_count} فرع
                          </span>
                          <span className="flex items-center gap-1">
                            <Book className="h-3.5 w-3.5" />
                            {section.books_count} كتاب
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section detail view */}
          {currentSection && !currentBranch && (
            <div>
              {booksLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-3" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </Card>
                  ))}
                </div>
              ) : (
                <>
                  {/* Branches */}
                  {branches.length > 0 && (
                    <div className="mb-6">
                      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                        <FolderOpen className="h-5 w-5" />
                        فروع القسم
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {branches.map((branch) => (
                          <Card
                            key={branch.id}
                            className="cursor-pointer hover:shadow-md transition-shadow group"
                            onClick={() => navigateToBranch(branch)}
                          >
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FolderOpen className="h-5 w-5 text-primary" />
                                <div>
                                  <p className="font-semibold">{branch.name}</p>
                                  {branch.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {branch.description}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {branch.books_count} كتاب
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {isAdmin && (
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openBranchDialog(branch);
                                      }}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteDialog({ type: "branch", id: branch.id, name: branch.name });
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                )}
                                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Direct books (not in a branch) */}
                  {directBooks.length > 0 && (
                    <div>
                      <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                        <Book className="h-5 w-5" />
                        {branches.length > 0 ? "كتب القسم العامة" : "كتب القسم"}
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {directBooks.map((book) => (
                          <BookCard
                            key={book.id}
                            book={book}
                            isAdmin={isAdmin}
                            onEdit={() => openBookDialog(book)}
                            onDelete={() => handleDeleteBook(book)}
                            onViewPdf={() =>
                              setPdfViewer({
                                key: book.pdf_storage_key!,
                                title: book.title,
                                author: book.author || "",
                                pages: book.pages || undefined,
                              })
                            }
                            sections={sections}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {branches.length === 0 && directBooks.length === 0 && (
                    <Card className="p-12 text-center text-muted-foreground">
                      <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg mb-2">هذا القسم فارغ</p>
                      {isAdmin && (
                        <div className="flex gap-2 justify-center mt-4">
                          <Button variant="outline" onClick={() => openBranchDialog()}>
                            <Plus className="h-4 w-4 ml-1" />
                            إضافة فرع
                          </Button>
                          <Button onClick={() => openBookDialog()}>
                            <Plus className="h-4 w-4 ml-1" />
                            إضافة كتاب
                          </Button>
                        </div>
                      )}
                    </Card>
                  )}
                </>
              )}
            </div>
          )}

          {/* Branch detail view */}
          {currentBranch && (
            <div>
              {booksLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-3" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </Card>
                  ))}
                </div>
              ) : displayBooks.length === 0 ? (
                <Card className="p-12 text-center text-muted-foreground">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg mb-2">لا توجد كتب في هذا الفرع</p>
                  {isAdmin && (
                    <Button className="mt-4" onClick={() => openBookDialog()}>
                      <Plus className="h-4 w-4 ml-1" />
                      إضافة كتاب
                    </Button>
                  )}
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayBooks.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      isAdmin={isAdmin}
                      onEdit={() => openBookDialog(book)}
                      onDelete={() => handleDeleteBook(book)}
                      onViewPdf={() =>
                        setPdfViewer({
                          key: book.pdf_storage_key!,
                          title: book.title,
                          author: book.author || "",
                          pages: book.pages || undefined,
                        })
                      }
                      sections={sections}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      </>
      )}

      {/* ─── Section Dialog ─────────────────────────────────────────────── */}
      <Dialog open={sectionDialog} onOpenChange={setSectionDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSection ? "تعديل القسم" : "قسم جديد"}</DialogTitle>
            <DialogDescription>
              {editingSection ? "عدّل بيانات القسم" : "أنشئ قسماً جديداً في المكتبة"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم القسم *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="مثال: القرآن الكريم وعلومه" />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="وصف مختصر للقسم" rows={2} />
            </div>
            <div>
              <Label>الأيقونة</Label>
              <Select value={formIcon} onValueChange={setFormIcon}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        {getSectionIcon(opt.value)}
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSectionDialog(false)}>إلغاء</Button>
            <Button onClick={saveSection} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 ml-1 animate-spin" />}
              {editingSection ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Branch Dialog ──────────────────────────────────────────────── */}
      <Dialog open={branchDialog} onOpenChange={setBranchDialog}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBranch ? "تعديل الفرع" : "فرع جديد"}</DialogTitle>
            <DialogDescription>
              {editingBranch ? "عدّل بيانات الفرع" : "أنشئ فرعاً جديداً داخل القسم"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>اسم الفرع *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="مثال: التفسير" />
            </div>
            <div>
              <Label>الوصف</Label>
              <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="وصف مختصر للفرع" rows={2} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBranchDialog(false)}>إلغاء</Button>
            <Button onClick={saveBranch} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 ml-1 animate-spin" />}
              {editingBranch ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Unified Book Dialog (create + edit + file upload in one) ──── */}
      <UnifiedBookDialog
        open={bookDialog}
        onOpenChange={setBookDialog}
        sections={sections}
        branches={branches}
        defaultSectionId={currentSection?.id ?? null}
        defaultBranchId={currentBranch?.id ?? null}
        mosqueId={effectiveMosqueId || null}
        saving={saving}
        initialValues={editingBook ? {
          id: editingBook.id,
          title: editingBook.title,
          author: editingBook.author,
          description: editingBook.description,
          pages: editingBook.pages,
          url: editingBook.url,
          sectionId: editingBook.section_id,
          branchId: editingBook.branch_id,
          featured: editingBook.featured,
          isPdf: editingBook.is_pdf,
          pdfStorageKey: editingBook.pdf_storage_key,
          fileKey: editingBook.file_key,
          fileSize: editingBook.file_size,
          fileMime: editingBook.file_mime,
          fileName: editingBook.file_name,
        } : null}
        onSubmit={saveUnifiedBook}
      />

      {/* ─── Delete Confirmation Dialog ─────────────────────────────────── */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent dir="rtl" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف "{deleteDialog?.name}"؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 ml-1 animate-spin" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── BookCard Component ──────────────────────────────────────────────────────

function BookCard({
  book,
  isAdmin,
  onEdit,
  onDelete,
  onViewPdf,
  sections,
  compact,
}: {
  book: BookItem;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onViewPdf: () => void;
  sections: Section[];
  compact?: boolean;
}) {
  const sectionName = sections.find((s) => s.id === book.section_id)?.name;

  return (
    <Card className="group hover:shadow-md transition-shadow flex flex-col">
      <CardHeader className={compact ? "pb-1 pt-3 px-3" : "pb-2"}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className={`${compact ? "text-sm" : "text-base"} line-clamp-2`}>
              {book.title}
            </CardTitle>
            {book.author && (
              <CardDescription className="mt-1 line-clamp-1">{book.author}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {book.featured && (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            )}
            {book.is_pdf && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">PDF</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {!compact && book.description && (
        <CardContent className="py-0">
          <p className="text-sm text-muted-foreground line-clamp-2">{book.description}</p>
        </CardContent>
      )}

      <CardFooter className={`mt-auto ${compact ? "px-3 pb-3 pt-2" : "pt-3"} flex flex-col gap-2`}>
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {book.pages && (
              <span>{book.pages} صفحة</span>
            )}
            {sectionName && !compact && (
              <Badge variant="outline" className="text-[10px]">{sectionName}</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between w-full gap-1">
          <div className="flex gap-1">
            {book.is_pdf && book.pdf_storage_key && (
              <Button size="sm" variant="default" className="h-7 text-xs" onClick={onViewPdf}>
                <BookOpen className="h-3.5 w-3.5 ml-1" />
                قراءة
              </Button>
            )}
            {book.url && (
              <Button
                size="sm"
                variant={book.is_pdf ? "outline" : "default"}
                className="h-7 text-xs"
                onClick={() => window.open(book.url!, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5 ml-1" />
                فتح
              </Button>
            )}
          </div>

          {isAdmin && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

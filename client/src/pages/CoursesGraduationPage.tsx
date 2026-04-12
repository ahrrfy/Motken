import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { BookOpen, GraduationCap, Award, Shield, Globe, CheckCircle, Phone, Loader2, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateAr } from "@/lib/utils";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import CoursesPage from "./CoursesPage";
import GraduationPage from "./GraduationPage";
import CertificatesPage from "./CertificatesPage";

const GRADE_LABELS: Record<string, string> = {
  excellent: "ممتاز",
  very_good: "جيد جداً",
  good: "جيد",
  acceptable: "مقبول",
};

const CATEGORY_LABELS: Record<string, string> = {
  memorization: "حفظ القرآن",
  tajweed: "التجويد",
  tafseer: "التفسير",
  seerah: "السيرة النبوية",
  other: "أخرى",
};

function ExternalParticipantsArchive() {
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [graduationFilter, setGraduationFilter] = useState("all");

  const fetchParticipants = () => {
    setLoading(true);
    fetch("/api/external-participants", { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then(d => setParticipants(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchParticipants(); }, []);

  const filtered = useMemo(() => {
    return participants.filter(p => {
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!p.name?.toLowerCase().includes(q) && !p.phone?.includes(q) && !p.course_title?.toLowerCase().includes(q)) return false;
      }
      if (graduationFilter === "graduated" && !p.graduated) return false;
      if (graduationFilter === "active" && p.graduated) return false;
      return true;
    });
  }, [participants, search, graduationFilter]);

  const exportData = filtered.map(p => ({
    ...p,
    categoryLabel: CATEGORY_LABELS[p.course_category] || p.course_category || "",
    statusLabel: p.graduated ? "متخرج" : "في الدورة",
    gradeLabel: p.graduated && p.graduation_grade ? (GRADE_LABELS[p.graduation_grade] || p.graduation_grade) : "",
    graduatedAtLabel: p.graduated && p.graduated_at ? formatDateAr(p.graduated_at) : "",
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary ml-2" />
        <span>جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DataTableToolbar
        data={exportData}
        columns={[
          { label: "الاسم", field: "name" },
          { label: "الجوال", field: "phone" },
          { label: "العمر", field: "age" },
          { label: "اسم الدورة", field: "course_title" },
          { label: "التصنيف", field: "categoryLabel" },
          { label: "الحالة", field: "statusLabel" },
          { label: "التقدير", field: "gradeLabel" },
          { label: "تاريخ التخرج", field: "graduatedAtLabel" },
          { label: "رقم الشهادة", field: "certificate_number" },
        ]}
        importColumns={[
          { label: "الاسم", field: "name" },
          { label: "الجوال", field: "phone" },
          { label: "العمر", field: "age" },
          { label: "اسم الدورة", field: "courseTitle" },
          { label: "ملاحظات", field: "notes" },
        ]}
        entityName="المشاركون الخارجيون"
        filename="external-participants"
        importEndpoint="/api/external-participants/bulk-import"
        onImportSuccess={fetchParticipants}
        printTitle="أرشيف المشاركين الخارجيين"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="ابحث بالاسم أو الجوال أو الدورة..."
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-40">
          <Select value={graduationFilter} onValueChange={setGraduationFilter}>
            <SelectTrigger data-testid="select-graduation-filter"><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الحالة - الكل</SelectItem>
              <SelectItem value="active">في الدورة</SelectItem>
              <SelectItem value="graduated">متخرج</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {graduationFilter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setGraduationFilter("all")} className="gap-1 text-destructive hover:text-destructive">
            <X className="w-4 h-4" /> مسح
          </Button>
        )}
        <span className="text-xs text-muted-foreground">عرض {filtered.length} من {participants.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">لا يوجد مشاركون خارجيون</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            يمكنك إضافتهم من داخل صفحة الدورات أو استيرادهم من ملف Excel
            <br />
            <span className="font-mono text-[11px]">أعمدة الاستيراد: الاسم | الجوال | العمر | اسم الدورة | ملاحظات</span>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p: any) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold shrink-0">
                      {p.name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      {p.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />{p.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  {p.graduated ? (
                    <Badge className="bg-green-100 text-green-700 border-none text-xs gap-1 shrink-0">
                      <CheckCircle className="w-3 h-3" />
                      متخرج
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs shrink-0">في الدورة</Badge>
                  )}
                </div>

                <div className="border-t pt-2 space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>الدورة:</span>
                    <span className="font-medium text-foreground truncate max-w-[60%] text-left">{p.course_title}</span>
                  </div>
                  {p.course_category && (
                    <div className="flex justify-between">
                      <span>التصنيف:</span>
                      <span>{CATEGORY_LABELS[p.course_category] || p.course_category}</span>
                    </div>
                  )}
                  {p.age && (
                    <div className="flex justify-between">
                      <span>العمر:</span>
                      <span>{p.age} سنة</span>
                    </div>
                  )}
                  {p.graduated && p.graduation_grade && (
                    <div className="flex justify-between">
                      <span>التقدير:</span>
                      <span className="text-amber-600 font-medium">{GRADE_LABELS[p.graduation_grade] || p.graduation_grade}</span>
                    </div>
                  )}
                  {p.graduated && p.graduated_at && (
                    <div className="flex justify-between">
                      <span>تاريخ التخرج:</span>
                      <span>{formatDateAr(p.graduated_at)}</span>
                    </div>
                  )}
                  {p.certificate_number && (
                    <div className="flex justify-between">
                      <span>رقم الشهادة:</span>
                      <span className="font-mono text-[10px] truncate">{p.certificate_number}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CoursesGraduationPage() {
  const { user } = useAuth();
  const [location] = useLocation();

  const initialTab = useMemo(() => {
    if (location === "/graduation") return "graduation";
    if (location === "/certificates") return "certificates";
    return "courses";
  }, []);

  const [activeTab, setActiveTab] = useState(initialTab);

  const isStudent = user?.role === "student";
  const canManageGraduation = user?.role === "admin" || user?.role === "supervisor" || user?.role === "teacher";

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6 page-transition" dir="rtl">
      <div className="flex items-center gap-3">
        <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-courses-graduation">
            الدورات والتخرج
          </h1>
          <p className="text-muted-foreground text-sm">
            {isStudent ? "دوراتي وشهاداتي" : "إدارة الدورات والتخرج والشهادات"}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList data-testid="tabs-list-unified" className="flex-wrap h-auto gap-1">
          <TabsTrigger value="courses" data-testid="tab-courses" className="gap-1">
            <BookOpen className="w-4 h-4" />
            الدورات
          </TabsTrigger>
          {canManageGraduation && (
          <TabsTrigger value="graduation" data-testid="tab-graduation" className="gap-1">
            <GraduationCap className="w-4 h-4" />
            التخرج
          </TabsTrigger>
          )}
          <TabsTrigger value="certificates" data-testid="tab-certificates" className="gap-1">
            <Award className="w-4 h-4" />
            الشهادات
          </TabsTrigger>
          <TabsTrigger value="verify" data-testid="tab-verify" className="gap-1">
            <Shield className="w-4 h-4" />
            التحقق
          </TabsTrigger>
          {canManageGraduation && (
          <TabsTrigger value="external-archive" data-testid="tab-external-archive" className="gap-1">
            <Globe className="w-4 h-4" />
            أرشيف الخارجيين
          </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="courses" className="mt-4">
          <CoursesPage embedded />
        </TabsContent>

        {canManageGraduation && (
        <TabsContent value="graduation" className="mt-4">
          <GraduationPage embedded />
        </TabsContent>
        )}

        <TabsContent value="certificates" className="mt-4">
          <CertificatesPage embedded defaultTab="list" />
        </TabsContent>

        <TabsContent value="verify" className="mt-4">
          <CertificatesPage embedded defaultTab="verify" />
        </TabsContent>

        {canManageGraduation && (
        <TabsContent value="external-archive" className="mt-4">
          <ExternalParticipantsArchive />
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

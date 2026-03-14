import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { formatDateAr } from "@/lib/utils";
import {
  Loader2, Search, Printer, Award, FileText, CheckCircle2, Shield, X, Eye
} from "lucide-react";
import { CERTIFICATE_TEMPLATES, printCertificate, type CertificateData, type TemplateInfo } from "@/lib/certificate-templates";

interface CertificateRecord {
  id: string;
  courseId?: string;
  graduateId?: string;
  studentId: string;
  issuedBy: string;
  mosqueId?: string;
  certificateNumber: string;
  certificateType: string;
  templateId?: string;
  title?: string;
  notes?: string;
  graduationGrade?: string;
  issuedAt: string;
  createdAt: string;
  studentName?: string;
  courseName?: string;
  issuerName?: string;
  mosqueName?: string;
  totalJuz?: number;
  recitationStyle?: string;
  ijazahTeacher?: string;
}

export default function CertificatesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [verifyNumber, setVerifyNumber] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);

  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<CertificateRecord | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("classic-gold");

  const fetchCertificates = async () => {
    try {
      const res = await fetch("/api/certificates/all", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCertificates(data);
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل الشهادات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCertificates(); }, []);

  const handleVerify = async () => {
    if (!verifyNumber.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال رقم الشهادة", variant: "destructive" });
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`/api/certificates/verify/${encodeURIComponent(verifyNumber.trim())}`, { credentials: "include" });
      const data = await res.json();
      setVerifyResult(data);
    } catch {
      setVerifyResult({ valid: false, message: "خطأ في الاتصال" });
    } finally {
      setVerifying(false);
    }
  };

  const handlePrint = (cert: CertificateRecord, templateId: string) => {
    const certData: CertificateData = {
      certificateNumber: cert.certificateNumber,
      studentName: cert.studentName || "",
      title: cert.title || (cert.certificateType === "graduation" ? "شهادة إتمام حفظ القرآن الكريم" : `شهادة إتمام دورة: ${cert.courseName || ""}`),
      mosqueName: cert.mosqueName || "",
      grade: cert.graduationGrade,
      issuedAt: cert.issuedAt,
      issuerName: cert.issuerName,
      certificateType: cert.certificateType || "course",
      totalJuz: cert.totalJuz,
      recitationStyle: cert.recitationStyle,
      ijazahTeacher: cert.ijazahTeacher,
    };
    printCertificate(certData, templateId);
  };

  const openPreview = (cert: CertificateRecord) => {
    setSelectedCert(cert);
    setSelectedTemplate(cert.templateId || "classic-gold");
    setPreviewDialogOpen(true);
  };

  const filteredCerts = certificates.filter(c => {
    if (filterType !== "all" && c.certificateType !== filterType) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (c.studentName || "").toLowerCase().includes(term)
        || (c.certificateNumber || "").toLowerCase().includes(term)
        || (c.courseName || "").toLowerCase().includes(term)
        || (c.title || "").toLowerCase().includes(term);
    }
    return true;
  });

  const totalCerts = certificates.length;
  const courseCerts = certificates.filter(c => c.certificateType === "course").length;
  const gradCerts = certificates.filter(c => c.certificateType === "graduation").length;

  const typeLabel = (type: string) => {
    if (type === "graduation") return "تخرج / حفظ";
    if (type === "course") return "دورة";
    return type;
  };

  const typeBadgeColor = (type: string) => {
    if (type === "graduation") return "bg-green-100 text-green-800 border-green-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = { children: "أطفال", youth: "شباب", adult: "كبار", formal: "رسمي", teacher: "أساتذة" };
    return map[cat] || cat;
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title">
            الشهادات
          </h1>
          <p className="text-muted-foreground text-sm">جميع الشهادات الصادرة - دورات وتخرج</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card data-testid="card-stat-total">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الشهادات</p>
                <p className="text-2xl font-bold" data-testid="text-total-certs">{totalCerts}</p>
              </div>
              <Award className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-courses">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">شهادات الدورات</p>
                <p className="text-2xl font-bold" data-testid="text-course-certs">{courseCerts}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-graduation">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">شهادات التخرج والحفظ</p>
                <p className="text-2xl font-bold" data-testid="text-grad-certs">{gradCerts}</p>
              </div>
              <Shield className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="list" data-testid="tab-list">قائمة الشهادات</TabsTrigger>
          <TabsTrigger value="verify" data-testid="tab-verify">التحقق من شهادة</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو رقم الشهادة أو الدورة..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pr-9"
                data-testid="input-search-certs"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-44" data-testid="select-filter-type">
                <SelectValue placeholder="النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="course">شهادات الدورات</SelectItem>
                <SelectItem value="graduation">شهادات التخرج</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="shadow-md">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12" data-testid="status-loading">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
                </div>
              ) : !filteredCerts.length ? (
                <div className="text-center py-12 text-muted-foreground" data-testid="text-no-certs">
                  <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد شهادات {filterType !== "all" ? "من هذا النوع" : ""}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="table-certificates">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الطالب</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">العنوان</TableHead>
                        <TableHead className="text-right">التقدير</TableHead>
                        <TableHead className="text-right">رقم الشهادة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCerts.map(cert => (
                        <TableRow key={cert.id} data-testid={`row-cert-${cert.id}`}>
                          <TableCell className="font-medium" data-testid={`text-student-${cert.id}`}>
                            {cert.studentName || cert.studentId}
                          </TableCell>
                          <TableCell>
                            <Badge className={typeBadgeColor(cert.certificateType)} data-testid={`badge-type-${cert.id}`}>
                              {typeLabel(cert.certificateType)}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" data-testid={`text-title-${cert.id}`}>
                            {cert.title || cert.courseName || "—"}
                          </TableCell>
                          <TableCell data-testid={`text-grade-${cert.id}`}>
                            {cert.graduationGrade ? (
                              <Badge variant="secondary">{cert.graduationGrade === "excellent" ? "ممتاز" : cert.graduationGrade === "very_good" ? "جيد جداً" : cert.graduationGrade === "good" ? "جيد" : cert.graduationGrade === "acceptable" ? "مقبول" : cert.graduationGrade}</Badge>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs" data-testid={`text-number-${cert.id}`}>
                            {cert.certificateNumber}
                          </TableCell>
                          <TableCell data-testid={`text-date-${cert.id}`}>
                            {formatDateAr(cert.issuedAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => openPreview(cert)}
                                data-testid={`button-preview-${cert.id}`}
                              >
                                <Eye className="w-4 h-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handlePrint(cert, cert.templateId || "classic-gold")}
                                data-testid={`button-print-${cert.id}`}
                              >
                                <Printer className="w-4 h-4 text-green-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verify" className="space-y-4">
          <Card className="shadow-md max-w-lg mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                التحقق من صحة شهادة
              </CardTitle>
              <CardDescription>أدخل رقم الشهادة للتحقق من صحتها</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="مثال: MTQ-CERT-..."
                  value={verifyNumber}
                  onChange={e => setVerifyNumber(e.target.value)}
                  className="flex-1"
                  data-testid="input-verify-number"
                />
                <Button onClick={handleVerify} disabled={verifying} data-testid="button-verify">
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 ml-1" />}
                  تحقق
                </Button>
              </div>

              {verifyResult && (
                <div className={`p-4 rounded-lg border ${verifyResult.valid ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`} data-testid="verify-result">
                  {verifyResult.valid ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-bold">شهادة صحيحة ومعتمدة</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">الطالب: </span><strong>{verifyResult.studentName}</strong></div>
                        <div><span className="text-muted-foreground">المُصدر: </span><strong>{verifyResult.issuerName}</strong></div>
                        {verifyResult.courseName && <div><span className="text-muted-foreground">الدورة: </span><strong>{verifyResult.courseName}</strong></div>}
                        {verifyResult.graduationGrade && <div><span className="text-muted-foreground">التقدير: </span><strong>{verifyResult.graduationGrade}</strong></div>}
                        <div><span className="text-muted-foreground">التاريخ: </span><strong>{formatDateAr(verifyResult.issuedAt)}</strong></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-700">
                      <X className="w-5 h-5" />
                      <span className="font-bold">{verifyResult.message || "الشهادة غير موجودة"}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-primary" />
              طباعة الشهادة - اختيار القالب
            </DialogTitle>
          </DialogHeader>
          {selectedCert && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">الطالب: </span><strong>{selectedCert.studentName}</strong></div>
                  <div><span className="text-muted-foreground">النوع: </span><Badge className={typeBadgeColor(selectedCert.certificateType)}>{typeLabel(selectedCert.certificateType)}</Badge></div>
                  <div><span className="text-muted-foreground">الرقم: </span><span className="font-mono text-xs">{selectedCert.certificateNumber}</span></div>
                  {selectedCert.graduationGrade && <div><span className="text-muted-foreground">التقدير: </span><strong>{selectedCert.graduationGrade}</strong></div>}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold">اختر قالب الشهادة</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CERTIFICATE_TEMPLATES.map(tmpl => (
                    <div
                      key={tmpl.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedTemplate === tmpl.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-gray-200 hover:border-primary/50 hover:bg-muted/30"}`}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      data-testid={`template-${tmpl.id}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{tmpl.preview}</span>
                        <div>
                          <div className="font-medium text-sm">{tmpl.name}</div>
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{getCategoryLabel(tmpl.category)}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  handlePrint(selectedCert, selectedTemplate);
                  setPreviewDialogOpen(false);
                }}
                data-testid="button-confirm-print"
              >
                <Printer className="w-4 h-4 ml-2" />
                طباعة بالقالب المختار
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

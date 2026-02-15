import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  BookOpen,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Printer,
  Loader2,
  Filter,
  BarChart3,
  Building2,
  UserCheck,
  UserX,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { saveAs } from "file-saver";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#6366f1"];

interface StatsData {
  totalStudents?: number;
  totalTeachers?: number;
  totalSupervisors?: number;
  totalMosques?: number;
  totalAssignments?: number;
  completedAssignments?: number;
  pendingAssignments?: number;
  activeStudents?: number;
  inactiveStudents?: number;
  users?: any[];
  assignments?: any[];
}

interface Mosque {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  name: string;
  role: string;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsData>({});
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedMosque, setSelectedMosque] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "admin";
  const isSupervisor = user?.role === "supervisor";
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";

  useEffect(() => {
    if (isAdmin) {
      fetch("/api/mosques", { credentials: "include" })
        .then((r) => r.json())
        .then(setMosques)
        .catch(() => {});
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin || isSupervisor) {
      const url = isAdmin
        ? "/api/users?role=teacher"
        : "/api/users?role=teacher";
      fetch(url, { credentials: "include" })
        .then((r) => r.json())
        .then(setTeachers)
        .catch(() => {});
    }
  }, [isAdmin, isSupervisor]);

  useEffect(() => {
    if (isStudent) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedMosque) params.set("mosqueId", selectedMosque);
    if (selectedTeacher) params.set("teacherId", selectedTeacher);
    const qs = params.toString();
    fetch(`/api/stats${qs ? `?${qs}` : ""}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedMosque, selectedTeacher, isStudent]);

  if (isStudent) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]" data-testid="access-denied">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <ShieldCheck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">غير مصرح بالوصول</h2>
            <p className="text-muted-foreground">
              ليس لديك صلاحية للوصول إلى صفحة التقارير
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cancelledAssignments =
    (stats.totalAssignments || 0) -
    (stats.completedAssignments || 0) -
    (stats.pendingAssignments || 0);

  const pieData = [
    { name: "مكتملة", value: stats.completedAssignments || 0 },
    { name: "معلقة", value: stats.pendingAssignments || 0 },
    { name: "ملغاة", value: cancelledAssignments > 0 ? cancelledAssignments : 0 },
  ].filter((d) => d.value > 0);

  const barData = [
    { name: "نشط", count: stats.activeStudents || 0 },
    { name: "غير نشط", count: stats.inactiveStudents || 0 },
  ];

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const statsSheet = [
      ["الإحصائية", "القيمة"],
      ["إجمالي الطلاب", stats.totalStudents || 0],
      ["إجمالي الأساتذة", stats.totalTeachers || 0],
      ...(isAdmin ? [["إجمالي المشرفين", stats.totalSupervisors || 0]] : []),
      ...(isAdmin ? [["إجمالي المساجد", stats.totalMosques || 0]] : []),
      ["إجمالي الواجبات", stats.totalAssignments || 0],
      ["الواجبات المكتملة", stats.completedAssignments || 0],
      ["الواجبات المعلقة", stats.pendingAssignments || 0],
      ["الطلاب النشطين", stats.activeStudents || 0],
      ["الطلاب غير النشطين", stats.inactiveStudents || 0],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(statsSheet);
    XLSX.utils.book_append_sheet(wb, ws1, "Statistics");

    if (stats.users && stats.users.length > 0) {
      const usersData = stats.users.map((u: any) => ({
        Name: u.name,
        Role: u.role,
        Username: u.username,
        Active: u.isActive ? "Yes" : "No",
        Phone: u.phone || "",
        Email: u.email || "",
      }));
      const ws2 = XLSX.utils.json_to_sheet(usersData);
      XLSX.utils.book_append_sheet(wb, ws2, "Users");
    }

    XLSX.writeFile(wb, "report.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Reports & Statistics", 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, 22, {
      align: "center",
    });

    const statsRows = [
      ["Total Students", String(stats.totalStudents || 0)],
      ["Total Teachers", String(stats.totalTeachers || 0)],
      ...(isAdmin
        ? [["Total Supervisors", String(stats.totalSupervisors || 0)]]
        : []),
      ...(isAdmin
        ? [["Total Mosques", String(stats.totalMosques || 0)]]
        : []),
      ["Total Assignments", String(stats.totalAssignments || 0)],
      ["Completed", String(stats.completedAssignments || 0)],
      ["Pending", String(stats.pendingAssignments || 0)],
      ["Active Students", String(stats.activeStudents || 0)],
      ["Inactive Students", String(stats.inactiveStudents || 0)],
    ];

    (doc as any).autoTable({
      head: [["Metric", "Value"]],
      body: statsRows,
      startY: 30,
      theme: "grid",
    });

    if (stats.users && stats.users.length > 0) {
      const usersRows = stats.users.map((u: any) => [
        u.name,
        u.role,
        u.username,
        u.isActive ? "Active" : "Inactive",
        u.phone || "-",
      ]);

      (doc as any).autoTable({
        head: [["Name", "Role", "Username", "Status", "Phone"]],
        body: usersRows,
        startY: (doc as any).lastAutoTable.finalY + 10,
        theme: "grid",
      });
    }

    doc.save("report.pdf");
  };

  const exportWord = () => {
    const statsHtml = `
      <tr><td>إجمالي الطلاب</td><td>${stats.totalStudents || 0}</td></tr>
      <tr><td>إجمالي الأساتذة</td><td>${stats.totalTeachers || 0}</td></tr>
      ${isAdmin ? `<tr><td>إجمالي المشرفين</td><td>${stats.totalSupervisors || 0}</td></tr>` : ""}
      ${isAdmin ? `<tr><td>إجمالي المساجد</td><td>${stats.totalMosques || 0}</td></tr>` : ""}
      <tr><td>إجمالي الواجبات</td><td>${stats.totalAssignments || 0}</td></tr>
      <tr><td>الواجبات المكتملة</td><td>${stats.completedAssignments || 0}</td></tr>
      <tr><td>الواجبات المعلقة</td><td>${stats.pendingAssignments || 0}</td></tr>
      <tr><td>الطلاب النشطين</td><td>${stats.activeStudents || 0}</td></tr>
      <tr><td>الطلاب غير النشطين</td><td>${stats.inactiveStudents || 0}</td></tr>
    `;

    let usersHtml = "";
    if (stats.users && stats.users.length > 0) {
      usersHtml = `
        <h2>قائمة المستخدمين</h2>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;width:100%">
          <tr style="background:#f0f0f0"><th>الاسم</th><th>الدور</th><th>اسم المستخدم</th><th>الحالة</th><th>الهاتف</th></tr>
          ${stats.users
            .map(
              (u: any) => `
            <tr>
              <td>${u.name}</td>
              <td>${u.role}</td>
              <td>${u.username}</td>
              <td>${u.isActive ? "نشط" : "غير نشط"}</td>
              <td>${u.phone || "-"}</td>
            </tr>`
            )
            .join("")}
        </table>
      `;
    }

    const html = `
      <html dir="rtl">
      <head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;direction:rtl}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px;text-align:right}th{background:#f0f0f0}</style></head>
      <body>
        <h1>التقارير والإحصائيات</h1>
        <p>تاريخ التقرير: ${new Date().toLocaleDateString("ar")}</p>
        <h2>الإحصائيات</h2>
        <table border="1" cellpadding="5" cellspacing="0">
          <tr style="background:#f0f0f0"><th>الإحصائية</th><th>القيمة</th></tr>
          ${statsHtml}
        </table>
        ${usersHtml}
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + html], { type: "application/msword" });
    saveAs(blob, "report.doc");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6" data-testid="reports-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary" data-testid="reports-title">
            التقارير والإحصائيات
          </h1>
          <p className="text-muted-foreground">تحليل شامل لأداء الحلقات والطلاب</p>
        </div>
      </div>

      {(isAdmin || isSupervisor) && (
        <div className="flex flex-wrap items-center gap-3" data-testid="filters-row">
          <Filter className="h-5 w-5 text-muted-foreground" />
          {isAdmin && (
            <Select value={selectedMosque} onValueChange={(val) => { setSelectedMosque(val === "all" ? "" : val); }} data-testid="filter-mosque">
              <SelectTrigger className="w-[200px]" data-testid="select-mosque-trigger">
                <SelectValue placeholder="جميع المساجد" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المساجد</SelectItem>
                {mosques.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={selectedTeacher} onValueChange={(val) => { setSelectedTeacher(val === "all" ? "" : val); }} data-testid="filter-teacher">
            <SelectTrigger className="w-[200px]" data-testid="select-teacher-trigger">
              <SelectValue placeholder="جميع الأساتذة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأساتذة</SelectItem>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex flex-wrap gap-2" data-testid="export-buttons">
        <Button variant="outline" onClick={exportExcel} data-testid="button-export-excel">
          <Download className="h-4 w-4 ml-2" />
          تصدير Excel
        </Button>
        <Button variant="outline" onClick={exportPDF} data-testid="button-export-pdf">
          <FileText className="h-4 w-4 ml-2" />
          تصدير PDF
        </Button>
        <Button variant="outline" onClick={exportWord} data-testid="button-export-word">
          <FileText className="h-4 w-4 ml-2" />
          تصدير Word
        </Button>
        <Button variant="outline" onClick={handlePrint} data-testid="button-print">
          <Printer className="h-4 w-4 ml-2" />
          طباعة
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20" data-testid="loading-spinner">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-cards">
            <Card data-testid="card-total-students">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
                <Users className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="value-total-students">
                  {stats.totalStudents || 0}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-total-teachers">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الأساتذة</CardTitle>
                <BookOpen className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="value-total-teachers">
                  {stats.totalTeachers || 0}
                </div>
              </CardContent>
            </Card>

            {isAdmin && (
              <Card data-testid="card-total-supervisors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي المشرفين</CardTitle>
                  <ShieldCheck className="h-5 w-5 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="value-total-supervisors">
                    {stats.totalSupervisors || 0}
                  </div>
                </CardContent>
              </Card>
            )}

            {isAdmin && (
              <Card data-testid="card-total-mosques">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">إجمالي المساجد</CardTitle>
                  <Building2 className="h-5 w-5 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" data-testid="value-total-mosques">
                    {stats.totalMosques || 0}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card data-testid="card-total-assignments">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الواجبات</CardTitle>
                <BarChart3 className="h-5 w-5 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="value-total-assignments">
                  {stats.totalAssignments || 0}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-completed-assignments">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">الواجبات المكتملة</CardTitle>
                <CheckCircle className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="value-completed-assignments">
                  {stats.completedAssignments || 0}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-pending-assignments">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">الواجبات المعلقة</CardTitle>
                <Clock className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" data-testid="value-pending-assignments">
                  {stats.pendingAssignments || 0}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-active-students">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">الطلاب النشطين</CardTitle>
                <UserCheck className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold" data-testid="value-active-students">
                    {stats.activeStudents || 0}
                  </span>
                  <Badge variant="secondary" data-testid="badge-inactive-students">
                    <UserX className="h-3 w-3 ml-1" />
                    {stats.inactiveStudents || 0} غير نشط
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="charts-grid">
            <Card data-testid="chart-assignments-status">
              <CardHeader>
                <CardTitle>حالة الواجبات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          fill="#8884d8"
                          paddingAngle={5}
                          dataKey="value"
                          label
                        >
                          {pieData.map((_entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground" data-testid="no-assignments-data">
                      لا توجد بيانات واجبات
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="chart-students-status">
              <CardHeader>
                <CardTitle>حالة الطلاب</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip cursor={{ fill: "transparent" }} />
                      <Bar
                        dataKey="count"
                        name="عدد الطلاب"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      >
                        {barData.map((_entry, index) => (
                          <Cell
                            key={`bar-${index}`}
                            fill={index === 0 ? "#22c55e" : "#ef4444"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {stats.users && stats.users.length > 0 && (
            <Card data-testid="users-table-card">
              <CardHeader>
                <CardTitle>قائمة المستخدمين</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="users-table">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-right font-medium">الاسم</th>
                        <th className="p-3 text-right font-medium">الدور</th>
                        <th className="p-3 text-right font-medium">اسم المستخدم</th>
                        <th className="p-3 text-right font-medium">الحالة</th>
                        <th className="p-3 text-right font-medium">الهاتف</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.users.map((u: any, i: number) => (
                        <tr key={u.id || i} className="border-b" data-testid={`row-user-${u.id || i}`}>
                          <td className="p-3">{u.name}</td>
                          <td className="p-3">
                            <Badge variant="outline">{u.role}</Badge>
                          </td>
                          <td className="p-3">{u.username}</td>
                          <td className="p-3">
                            <Badge variant={u.isActive ? "default" : "secondary"}>
                              {u.isActive ? "نشط" : "غير نشط"}
                            </Badge>
                          </td>
                          <td className="p-3">{u.phone || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

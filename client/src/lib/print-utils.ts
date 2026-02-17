export function openPrintWindow(title: string, contentHtml: string, options?: { landscape?: boolean }) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const pageSize = options?.landscape ? 'landscape' : 'portrait';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${title} - مُتْقِن</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Tajawal', 'Segoe UI', Tahoma, sans-serif;
          direction: rtl;
          padding: 20px;
          color: #1a1a2e;
          background: white;
        }

        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 3px solid #16213e;
          margin-bottom: 20px;
        }
        .header .logo {
          font-size: 32px;
          font-weight: 700;
          color: #16213e;
          margin-bottom: 4px;
        }
        .header .subtitle {
          font-size: 14px;
          color: #666;
        }
        .header .report-title {
          font-size: 22px;
          font-weight: 700;
          color: #0f3460;
          margin-top: 10px;
        }
        .header .date {
          font-size: 12px;
          color: #888;
          margin-top: 5px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin: 20px 0;
        }
        .stat-card {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 12px;
          text-align: center;
          background: #f8f9fa;
        }
        .stat-card .value {
          font-size: 24px;
          font-weight: 700;
          color: #16213e;
        }
        .stat-card .label {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 13px;
        }
        table th {
          background: #16213e;
          color: white;
          padding: 10px 8px;
          text-align: right;
          font-weight: 500;
        }
        table td {
          padding: 8px;
          border-bottom: 1px solid #eee;
        }
        table tr:nth-child(even) {
          background: #f8f9fa;
        }
        table tr:hover {
          background: #e8f4f8;
        }

        .section-title {
          font-size: 18px;
          font-weight: 700;
          color: #0f3460;
          margin: 20px 0 10px;
          padding-bottom: 5px;
          border-bottom: 2px solid #e0e0e0;
        }

        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 15px;
          border-top: 2px solid #16213e;
          font-size: 11px;
          color: #888;
        }
        .footer .waqf {
          font-weight: 700;
          color: #16213e;
          margin-bottom: 3px;
        }

        .actions-bar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #16213e;
          color: white;
          padding: 10px 20px;
          display: flex;
          gap: 10px;
          justify-content: center;
          z-index: 1000;
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .actions-bar button {
          padding: 8px 20px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-family: 'Tajawal', sans-serif;
          font-size: 14px;
          font-weight: 500;
        }
        .btn-print {
          background: #e94560;
          color: white;
        }
        .btn-save {
          background: #0f3460;
          color: white;
        }
        .btn-close {
          background: #555;
          color: white;
        }

        .content-area {
          margin-top: 60px;
        }

        @media print {
          .actions-bar { display: none !important; }
          .content-area { margin-top: 0; }
          body { padding: 10px; }
          @page {
            size: ${pageSize};
            margin: 15mm;
          }
        }
      </style>
    </head>
    <body>
      <div class="actions-bar">
        <button class="btn-print" onclick="window.print()">🖨️ طباعة مباشرة</button>
        <button class="btn-save" onclick="window.print()">📥 حفظ كـ PDF</button>
        <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
      </div>
      <div class="content-area">
        <div class="header">
          <div class="logo"><img src="/logo.png" style="width:60px;height:60px;border-radius:12px;" alt="مُتْقِن" /><br/>مُتْقِن</div>
          <div class="subtitle">نظام إدارة حلقات القرآن الكريم</div>
          <div class="report-title">${title}</div>
          <div class="date">${(() => { const d = new Date(); const day = String(d.getDate()).padStart(2, "0"); const month = String(d.getMonth() + 1).padStart(2, "0"); const year = d.getFullYear(); return day + "/" + month + "/" + year; })()}</div>
        </div>
        ${contentHtml}
        <div class="footer">
          <div class="waqf">النظام وقف لله تعالى</div>
          <div>برمجة وتطوير أحمد خالد الزبيدي</div>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
}

export function generateStatsHtml(stats: Record<string, any>, isAdmin: boolean): string {
  const items = [
    { label: "إجمالي الطلاب", value: stats.totalStudents || 0 },
    { label: "إجمالي الأساتذة", value: stats.totalTeachers || 0 },
    ...(isAdmin ? [{ label: "إجمالي المشرفين", value: stats.totalSupervisors || 0 }] : []),
    ...(isAdmin ? [{ label: "إجمالي المساجد", value: stats.totalMosques || 0 }] : []),
    { label: "إجمالي الواجبات", value: stats.totalAssignments || 0 },
    { label: "المكتملة", value: stats.completedAssignments || 0 },
    { label: "المعلقة", value: stats.pendingAssignments || 0 },
    { label: "طلاب نشطين", value: stats.activeStudents || 0 },
    { label: "طلاب غير نشطين", value: stats.inactiveStudents || 0 },
    { label: "ذوي الاحتياجات الخاصة", value: stats.specialNeedsStudents || 0 },
    { label: "الأيتام", value: stats.orphanStudents || 0 },
  ];

  return `
    <div class="stats-grid">
      ${items.map(i => `<div class="stat-card"><div class="value">${i.value}</div><div class="label">${i.label}</div></div>`).join("")}
    </div>
  `;
}

export function generateUsersTableHtml(users: any[]): string {
  if (!users || users.length === 0) return "";
  const roleMap: Record<string, string> = { admin: "مدير", supervisor: "مشرف", teacher: "أستاذ", student: "طالب" };
  return `
    <h3 class="section-title">قائمة المستخدمين</h3>
    <table>
      <thead>
        <tr><th>#</th><th>الاسم</th><th>الدور</th><th>اسم المستخدم</th><th>الحالة</th><th>الهاتف</th></tr>
      </thead>
      <tbody>
        ${users.map((u: any, i: number) => `
          <tr>
            <td>${i + 1}</td>
            <td>${u.name}</td>
            <td>${roleMap[u.role] || u.role}</td>
            <td>${u.username}</td>
            <td>${u.isActive ? "نشط" : "غير نشط"}</td>
            <td>${u.phone || "—"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

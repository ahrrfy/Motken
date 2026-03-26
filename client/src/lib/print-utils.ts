import { formatDateAr, toHijri } from "./utils";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function openPrintWindow(title: string, contentHtml: string, options?: { landscape?: boolean; mosqueName?: string; mosqueImage?: string }) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const pageSize = options?.landscape ? 'landscape' : 'portrait';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${escapeHtml(title)} - مُتْقِن</title>
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
        <button class="btn-print" id="btnPrint">🖨️ طباعة مباشرة</button>
        <button class="btn-save" id="btnSave">📥 حفظ كـ PDF</button>
        <select id="selectSize" style="padding:6px 12px;border-radius:6px;border:1px solid #ccc;font-family:inherit;font-size:13px;">
          <option value="A4 portrait">A4 عمودي</option>
          <option value="A4 landscape">A4 أفقي</option>
          <option value="A5 portrait">A5 عمودي</option>
          <option value="A5 landscape">A5 أفقي</option>
        </select>
        <button class="btn-close" id="btnClose">✕ إغلاق</button>
      </div>
      <div class="content-area">
        <div class="header">
          <div class="logo" style="display:flex;align-items:center;justify-content:center;gap:12px;">
            ${options?.mosqueImage ? `<img src="${escapeHtml(options.mosqueImage)}" style="width:50px;height:50px;border-radius:12px;object-fit:cover;" alt="شعار المركز" />` : ""}
            <img src="/logo.png" style="width:60px;height:60px;border-radius:12px;" alt="مُتْقِن" />
          </div>
          <div style="font-size:32px;font-weight:700;color:#16213e;margin:4px 0;">${escapeHtml(options?.mosqueName || "مُتْقِن")}</div>
          <div class="subtitle">نظام إدارة حلقات القرآن الكريم</div>
          <div class="report-title">${escapeHtml(title)}</div>
          <div class="date">${(() => { const d = new Date(); const day = String(d.getDate()).padStart(2, "0"); const month = String(d.getMonth() + 1).padStart(2, "0"); const year = d.getFullYear(); return day + "/" + month + "/" + year; })()}</div>
        </div>
        ${contentHtml}
        <div class="footer">
          <div class="waqf">النظام وقف لله تعالى</div>
          <div>برمجة وتطوير أحمد خالد الزبيدي</div>
        </div>
      </div>
      <script>
        document.getElementById('btnPrint').addEventListener('click', function() { window.print(); });
        document.getElementById('btnSave').addEventListener('click', function() { window.print(); });
        document.getElementById('btnClose').addEventListener('click', function() { window.close(); });
        document.getElementById('selectSize').addEventListener('change', function() {
          var style = document.getElementById('pageStyle');
          if (!style) { style = document.createElement('style'); style.id = 'pageStyle'; document.head.appendChild(style); }
          style.textContent = '@media print { @page { size: ' + this.value + '; margin: 15mm; } }';
        });
        // Set initial page size
        var initStyle = document.createElement('style');
        initStyle.id = 'pageStyle';
        initStyle.textContent = '@media print { @page { size: ${pageSize === 'landscape' ? 'A4 landscape' : 'A4 portrait'}; margin: 15mm; } }';
        document.head.appendChild(initStyle);
        document.getElementById('selectSize').value = '${pageSize === 'landscape' ? 'A4 landscape' : 'A4 portrait'}';
      </script>
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
  if (!users || users.length === 0) return "<p>لا يوجد بيانات</p>";
  return `
    <table style="width:100%;border-collapse:collapse;margin-top:20px;">
      <thead>
        <tr style="background:#f0f0f0;">
          <th style="border:1px solid #ccc;padding:8px;text-align:right;">#</th>
          <th style="border:1px solid #ccc;padding:8px;text-align:right;">الاسم</th>
          <th style="border:1px solid #ccc;padding:8px;text-align:right;">الدور</th>
          <th style="border:1px solid #ccc;padding:8px;text-align:right;">المستوى</th>
          <th style="border:1px solid #ccc;padding:8px;text-align:right;">الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${users.map((u, i) => `
          <tr>
            <td style="border:1px solid #ccc;padding:8px;">${i + 1}</td>
            <td style="border:1px solid #ccc;padding:8px;">${escapeHtml(u.name || "")}</td>
            <td style="border:1px solid #ccc;padding:8px;">${escapeHtml(u.role || "")}</td>
            <td style="border:1px solid #ccc;padding:8px;">${escapeHtml(String(u.level || ""))}</td>
            <td style="border:1px solid #ccc;padding:8px;">${u.isActive ? "نشط" : "غير نشط"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

export function generateSemesterReportHtml(student: any, grades: any[], mosqueName: string): string {
  const avgGrade = grades.length > 0 
    ? Math.round(grades.reduce((sum, g) => sum + (g.grade || 0), 0) / grades.length) 
    : 0;

  return `
    <div style="padding: 20px;">
      <h3 style="text-align: center; color: #16213e; margin-bottom: 30px;">تقرير الدرجات الفصلي</h3>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
        <div><strong>اسم الطالب:</strong> ${escapeHtml(student.name || "")}</div>
        <div><strong>المركز:</strong> ${escapeHtml(mosqueName || "")}</div>
        <div><strong>المستوى:</strong> ${escapeHtml(String(student.level || "—"))}</div>
        <div><strong>المعدل العام:</strong> ${avgGrade}%</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>السورة</th>
            <th>من آية</th>
            <th>إلى آية</th>
            <th>الدرجة</th>
          </tr>
        </thead>
        <tbody>
          ${grades.map(g => `
            <tr>
              <td>${formatDateAr(g.createdAt)}</td>
              <td>${escapeHtml(g.surahName || "")}</td>
              <td>${g.fromVerse}</td>
              <td>${g.toVerse}</td>
              <td style="font-weight: bold; color: ${g.grade >= 90 ? '#059669' : g.grade >= 75 ? '#2563eb' : '#dc2626'}">${g.grade}%</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; text-align: center;">
        <div>
          <p>ختم المشرف</p>
          <div style="margin-top: 40px; border-bottom: 1px dashed #ccc; width: 150px; margin-left: auto; margin-right: auto;"></div>
        </div>
        <div>
          <p>توقيع المدرس</p>
          <div style="margin-top: 40px; border-bottom: 1px dashed #ccc; width: 150px; margin-left: auto; margin-right: auto;"></div>
        </div>
      </div>
    </div>
  `;
}

export function generateAnnualSummaryHtml(stats: any, topStudents: any[], mosqueName: string): string {
  return `
    <div style="padding: 20px;">
      <h3 style="text-align: center; color: #16213e; margin-bottom: 30px;">التقرير السنوي للمركز</h3>
      
      <div class="stats-grid">
        <div class="stat-card"><div class="value">${stats.totalStudents || 0}</div><div class="label">إجمالي الطلاب</div></div>
        <div class="stat-card"><div class="value">${stats.completedAssignments || 0}</div><div class="label">تسميعات مكتملة</div></div>
        <div class="stat-card"><div class="value">${stats.totalTeachers || 0}</div><div class="label">عدد المعلمين</div></div>
        <div class="stat-card"><div class="value">${stats.activeStudents || 0}</div><div class="label">طلاب نشطين</div></div>
      </div>

      <h4 class="section-title">أوائل الطلبة</h4>
      <table>
        <thead>
          <tr>
            <th>الترتيب</th>
            <th>اسم الطالب</th>
            <th>إجمالي النقاط</th>
          </tr>
        </thead>
        <tbody>
          ${topStudents.map((s, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(s.userName || s.name || "")}</td>
              <td>${s.totalPoints || s.points}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="margin-top: 40px; line-height: 1.8;">
        <p>الحمد لله الذي بنعمته تتم الصالحات، يسرنا في <strong>${escapeHtml(mosqueName || "")}</strong> أن نضع بين أيديكم هذا التقرير الذي يبرز جهود أبنائنا وبناتنا في حفظ كتاب الله تعالى خلال العام المنصرم.</p>
      </div>
    </div>
  `;
}

export function generateCertificateHtml(cert: any, studentName: string, courseName: string, mosqueName: string): string {
  const d = new Date(cert.issuedAt);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const gregorianDate = `${day}/${month}/${year}`;
  const hijriDate = toHijri(d) + " هـ";
  return `
    <div style="padding:40px 50px;border:3px solid #16213e;background:linear-gradient(135deg,#fefefe 0%,#f8f4e8 100%);position:relative;min-height:600px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:'Tajawal',sans-serif;">
      <div style="position:absolute;inset:8px;border:2px solid #c9a84c;pointer-events:none;"></div>
      <div style="position:absolute;top:20px;right:24px;font-size:14px;color:#aaa;">رقم: ${escapeHtml(cert.certificateNumber || "")}</div>
      
      <div style="font-size:22px;color:#c9a84c;letter-spacing:3px;margin-bottom:16px;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
      <h1 style="font-size:44px;color:#16213e;margin-bottom:8px;font-family:'Scheherazade New','Amiri',serif;">شهادة إتمام</h1>
      <div style="width:160px;height:3px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);margin:0 auto 14px;"></div>
      <h2 style="font-size:20px;color:#888;margin-bottom:24px;font-weight:400;">${escapeHtml(mosqueName || "مُتْقِن")}</h2>

      <p style="font-size:20px;color:#666;margin-bottom:10px;">يشهد بأن</p>
      <h3 style="font-size:46px;color:#16213e;margin-bottom:16px;border-bottom:3px solid #c9a84c;padding-bottom:10px;display:inline-block;min-width:300px;font-family:'Scheherazade New','Amiri',serif;">${escapeHtml(studentName || "")}</h3>
      
      <p style="font-size:20px;color:#555;margin-bottom:8px;">قد أتمّ بنجاح متطلبات الدورة التعليمية</p>
      <h4 style="font-size:30px;color:#0f3460;margin-bottom:14px;">${escapeHtml(courseName || "")}</h4>
      
      ${cert.graduationGrade ? `<p style="font-size:22px;color:#16213e;margin-bottom:20px;">بتقدير: <strong style="color:#c9a84c;font-size:28px;">${escapeHtml(cert.graduationGrade)}</strong></p>` : ""}

      <div style="display:flex;justify-content:space-between;width:100%;margin-top:30px;padding-top:20px;border-top:2px solid #e8e0cc;">
        <div style="text-align:center;min-width:140px;">
          <div style="width:70px;height:70px;border:2px solid #ccc;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:13px;color:#bbb;">الختم</div>
          <p style="font-size:14px;color:#888;">ختم المركز</p>
        </div>
        <div style="text-align:center;">
          <p style="font-size:16px;color:#888;margin-bottom:4px;">${hijriDate}</p>
          <p style="font-size:14px;color:#aaa;">${gregorianDate}</p>
        </div>
        <div style="text-align:center;min-width:140px;">
          <div style="width:140px;border-bottom:2px solid #999;margin:24px auto 10px;"></div>
          <p style="font-size:15px;color:#888;">توقيع المسؤول</p>
        </div>
      </div>
    </div>
  `;
}

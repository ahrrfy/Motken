import { escapeHtml } from "@/lib/html-utils";

export interface CertificateData {
  certificateNumber: string;
  studentName: string;
  title: string;
  mosqueName: string;
  grade?: string;
  issuedAt: string;
  issuerName?: string;
  certificateType: string;
  totalJuz?: number;
  recitationStyle?: string;
  ijazahTeacher?: string;
  courseName?: string;
  courseStartDate?: string;
  courseEndDate?: string;
  courseStartDay?: string;
  courseEndDay?: string;
  examJuzRange?: string;
  studentGender?: "male" | "female";
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: "children" | "youth" | "adult" | "formal" | "teacher" | "feminine" | "islamic";
  preview: string;
}

export const CERTIFICATE_TEMPLATES: TemplateInfo[] = [
  { id: "classic-gold", name: "الكلاسيكي الذهبي", description: "تصميم رسمي كلاسيكي بإطار ذهبي وزخارف إسلامية", category: "adult", preview: "🏛️" },
  { id: "royal-blue", name: "الملكي الأزرق", description: "تصميم ملكي أنيق بدرجات الأزرق مع أرابيسك", category: "formal", preview: "👑" },
  { id: "emerald-mosque", name: "الزمردي", description: "تصميم أخضر زمردي مع زخارف القباب والمآذن", category: "adult", preview: "🕌" },
  { id: "kids-rainbow", name: "قوس قزح للأطفال", description: "تصميم مرح وملون للأطفال الصغار مع نجوم ونقوش", category: "children", preview: "🌈" },
  { id: "kids-stars", name: "نجوم الحفاظ الصغار", description: "تصميم بالنجوم والهلال للأطفال والبنات الصغار", category: "children", preview: "⭐" },
  { id: "youth-modern", name: "الشبابي العصري", description: "تصميم عصري أنيق يناسب الشباب والصبيان", category: "youth", preview: "🎓" },
  { id: "calligraphy", name: "الخط العربي", description: "تصميم فخم يركز على جماليات الخط العربي", category: "formal", preview: "✒️" },
  { id: "teacher-honor", name: "تكريم الأساتذة", description: "تصميم خاص لتكريم الأساتذة والمعلمين", category: "teacher", preview: "📚" },
  { id: "abbasid-geometric", name: "العباسي الهندسي", description: "زخارف هندسية عباسية بنجوم ثمانية وألوان ذهبية", category: "islamic", preview: "🕋" },
  { id: "andalusian-arch", name: "الأندلسي", description: "أقواس أندلسية مع زخارف نباتية وألوان زمردية", category: "islamic", preview: "🌿" },
  { id: "umayyad-vine", name: "الأموي", description: "زخارف نباتية أموية بألوان ذهبية وبنية دافئة", category: "islamic", preview: "🌾" },
  { id: "feminine-rose", name: "الوردي النسائي", description: "تصميم ناعم بالألوان الوردية مع زخارف نباتية للطالبات", category: "feminine", preview: "🌸" },
  { id: "feminine-lavender", name: "اللافندر النسائي", description: "تصميم أنيق بألوان اللافندر والكريمي للنساء", category: "feminine", preview: "💜" },
];

export function getTemplatesByCategory(category?: string): TemplateInfo[] {
  if (!category || category === "all") return CERTIFICATE_TEMPLATES;
  return CERTIFICATE_TEMPLATES.filter(t => t.category === category);
}

function gradeArabic(grade?: string): string {
  if (!grade) return "";
  const map: Record<string, string> = { excellent: "ممتاز", very_good: "جيد جداً", good: "جيد", acceptable: "مقبول" };
  return map[grade] || grade;
}

function recitationArabic(style?: string): string {
  if (!style) return "";
  const map: Record<string, string> = { hafs: "حفص عن عاصم", warsh: "ورش عن نافع", qaloon: "قالون عن نافع" };
  return map[style] || style;
}

function commonStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700;800&family=Scheherazade+New:wght@400;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f0f0f0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    @page { size: 297mm 210mm landscape; margin: 0; }
    @media print {
      body { background: white; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .cert-page { box-shadow: none !important; }
    }
  `;
}

function wrapInPage(content: string, extraStyles: string = ""): string {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>شهادة - سِرَاجُ الْقُرْآنِ</title><style>${commonStyles()}${extraStyles}</style></head><body>${content}</body></html>`;
}

function formatDates(issuedAt: string): { gregorian: string; hijri: string } {
  const d = new Date(issuedAt);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const gregorian = `${day}/${month}/${year}`;
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "numeric", year: "numeric" }).formatToParts(d);
    const hDay = (parts.find(p => p.type === "day")?.value || "").padStart(2, "0");
    const hMonth = (parts.find(p => p.type === "month")?.value || "").padStart(2, "0");
    const hYear = parts.find(p => p.type === "year")?.value || "";
    return { gregorian, hijri: `${hDay}/${hMonth}/${hYear} هـ` };
  } catch {
    return { gregorian, hijri: "" };
  }
}

function genderText(gender?: "male" | "female"): { student: string; verb: string; pronoun: string } {
  if (gender === "female") return { student: "الطالبة", verb: "حضرت", pronoun: "إياها" };
  return { student: "الطالب", verb: "حضر", pronoun: "إياه" };
}

function buildBodyText(data: CertificateData): string {
  const g = genderText(data.studentGender);
  if (data.certificateType === "graduation") {
    let text = `قد أتمّ بتوفيق الله تعالى حفظ <strong>${data.totalJuz || 30} جزءاً</strong> من القرآن الكريم`;
    if (data.recitationStyle) text += ` برواية <strong>${recitationArabic(data.recitationStyle)}</strong>`;
    return text;
  }
  if (data.certificateType === "exam") {
    let text = `قد اجتاز الاختبار الحضوري`;
    if (data.examJuzRange) text += ` بالأجزاء <strong>(${data.examJuzRange})</strong>`;
    if (data.grade) text += ` وحصل على تقييم <strong>${gradeArabic(data.grade)}</strong>`;
    return text;
  }
  // شهادة حضور دورة
  let text = `قد ${g.verb} دورة <strong>${data.courseName || data.title || ""}</strong>`;
  if (data.courseStartDate) {
    text += ` وقد بدأت`;
    if (data.courseStartDay) text += ` يوم ${data.courseStartDay}`;
    text += ` بتاريخ ${data.courseStartDate}`;
  }
  if (data.courseEndDate) {
    text += ` وانتهت`;
    if (data.courseEndDay) text += ` يوم ${data.courseEndDay}`;
    text += ` بتاريخ ${data.courseEndDate}`;
  }
  return text;
}

function footerSection(opts: {
  hijri: string; gregorian: string; issuerName?: string;
  stampColor: string; lineColor: string; textColor: string; dateColor: string; subDateColor: string;
  stampBg?: string; stampLabel?: string; stampEmoji?: string;
}): string {
  const e = escapeHtml;
  return `
    <div style="text-align:center;padding:0 25mm 4mm;font-size:16px;color:${opts.textColor};font-family:'Amiri',serif;font-style:italic;">
      نسأل الله أن يوفقنا وإياه لخدمة دينه وكتابه
    </div>
    <div style="padding:0 25mm 18mm;display:flex;justify-content:space-between;align-items:flex-end;">
      <div style="text-align:center;min-width:140px;">
        <div style="width:75px;height:75px;border:2px solid ${opts.stampColor};border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;${opts.stampBg ? `background:${opts.stampBg};` : ""}font-size:22px;">${opts.stampEmoji || ""}</div>
        <div style="font-size:14px;color:${opts.textColor};font-family:'Tajawal',sans-serif;">${opts.stampLabel || "ختم المركز"}</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:16px;color:${opts.dateColor};margin-bottom:4px;font-family:'Tajawal',sans-serif;font-weight:500;">${opts.hijri}</div>
        <div style="font-size:14px;color:${opts.subDateColor};font-family:'Tajawal',sans-serif;">${opts.gregorian}</div>
      </div>
      <div style="text-align:center;min-width:140px;">
        <div style="width:140px;border-bottom:2px solid ${opts.lineColor};margin:0 auto 10px;"></div>
        <div style="font-size:15px;color:${opts.textColor};font-family:'Tajawal',sans-serif;font-weight:500;">${opts.issuerName ? e(opts.issuerName) : "توقيع المسؤول"}</div>
      </div>
    </div>`;
}

export function generateCertificateHtmlByTemplate(data: CertificateData, templateId: string): string {
  switch (templateId) {
    case "classic-gold": return classicGoldTemplate(data);
    case "royal-blue": return royalBlueTemplate(data);
    case "emerald-mosque": return emeraldMosqueTemplate(data);
    case "kids-rainbow": return kidsRainbowTemplate(data);
    case "kids-stars": return kidsStarsTemplate(data);
    case "youth-modern": return youthModernTemplate(data);
    case "calligraphy": return calligraphyTemplate(data);
    case "teacher-honor": return teacherHonorTemplate(data);
    case "abbasid-geometric": return abbasidTemplate(data);
    case "andalusian-arch": return andalusianTemplate(data);
    case "umayyad-vine": return umayyadTemplate(data);
    case "feminine-rose": return feminineRoseTemplate(data);
    case "feminine-lavender": return feminineLavenderTemplate(data);
    default: return classicGoldTemplate(data);
  }
}

function classicGoldTemplate(data: CertificateData): string {
  const e = escapeHtml;
  const { gregorian, hijri } = formatDates(data.issuedAt);
  const gradeText = gradeArabic(data.grade);
  const titleText = data.title || (data.certificateType === "graduation" ? "شهادة إتمام حفظ القرآن الكريم" : "شهادة إتمام دورة");

  return wrapInPage(`
    <div class="cert-page" style="width:297mm;height:210mm;position:relative;background:linear-gradient(135deg,#fefcf3 0%,#fff9e6 50%,#fefcf3 100%);overflow:hidden;font-family:'Amiri','Tajawal',serif;display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
      <div style="position:absolute;inset:7mm;border:3px solid #c9a84c;pointer-events:none;"></div>
      <div style="position:absolute;inset:10mm;border:1.5px solid #c9a84c;pointer-events:none;"></div>
      <div style="position:absolute;inset:12mm;border:0.5px solid #dbb85c;pointer-events:none;"></div>
      <div style="position:absolute;inset:12mm;background:repeating-linear-gradient(45deg,transparent,transparent 35px,rgba(201,168,76,0.03) 35px,rgba(201,168,76,0.03) 70px);pointer-events:none;"></div>

      <div style="position:absolute;top:9mm;left:50%;transform:translateX(-50%);">
        <svg width="80" height="35" viewBox="0 0 80 35"><path d="M40 0 C30 10,10 14,0 18 C10 22,30 28,40 35 C50 28,70 22,80 18 C70 14,50 10,40 0Z" fill="none" stroke="#c9a84c" stroke-width="1"/></svg>
      </div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:18mm 25mm 8mm;text-align:center;">
        <div style="position:absolute;top:15mm;right:18mm;font-size:13px;color:#aaa;font-family:'Tajawal',sans-serif;">رقم: ${e(data.certificateNumber)}</div>
        
        <div style="font-size:20px;color:#c9a84c;letter-spacing:3px;margin-bottom:6mm;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        
        <div style="font-size:42px;font-weight:700;color:#1a3a2a;margin-bottom:4mm;font-family:'Scheherazade New','Amiri',serif;line-height:1.3;">${e(titleText)}</div>
        <div style="width:180px;height:3px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);margin:0 auto 6mm;"></div>
        
        <div style="font-size:20px;color:#666;margin-bottom:5mm;">تشهد إدارة <strong style="color:#1a3a2a;">${e(data.mosqueName)}</strong> بأن ${genderText(data.studentGender).student}</div>
        
        <div style="font-size:50px;font-weight:700;color:#1a3a2a;padding:3mm 25mm;border-bottom:3px solid #c9a84c;display:inline-block;font-family:'Scheherazade New','Amiri',serif;margin-bottom:6mm;">
          ${e(data.studentName)}
        </div>

        <div style="font-size:21px;color:#444;line-height:2;margin-bottom:4mm;">
          ${buildBodyText(data)}
        </div>
        
        ${gradeText ? `<div style="font-size:22px;color:#1a3a2a;margin-bottom:3mm;">بتقدير: <strong style="color:#c9a84c;font-size:28px;">${gradeText}</strong></div>` : ""}
        ${data.ijazahTeacher ? `<div style="font-size:19px;color:#666;">على يد الشيخ: <strong>${e(data.ijazahTeacher)}</strong></div>` : ""}
      </div>

      ${footerSection({ hijri, gregorian, issuerName: data.issuerName, stampColor: "#c9a84c", lineColor: "#c9a84c", textColor: "#888", dateColor: "#777", subDateColor: "#999" })}
    </div>
  `);
}

function royalBlueTemplate(data: CertificateData): string {
  const e = escapeHtml;
  const { gregorian, hijri } = formatDates(data.issuedAt);
  const gradeText = gradeArabic(data.grade);
  const titleText = data.title || (data.certificateType === "graduation" ? "شهادة إتمام حفظ القرآن الكريم" : "شهادة إتمام دورة");

  return wrapInPage(`
    <div class="cert-page" style="width:297mm;height:210mm;position:relative;background:linear-gradient(180deg,#f0f4ff 0%,#ffffff 40%,#f0f4ff 100%);overflow:hidden;font-family:'Tajawal',sans-serif;display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
      <div style="position:absolute;top:0;left:0;right:0;height:18mm;background:linear-gradient(135deg,#1e3a5f 0%,#2c5aa0 50%,#1e3a5f 100%);"></div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:16mm;background:linear-gradient(135deg,#1e3a5f 0%,#2c5aa0 50%,#1e3a5f 100%);"></div>
      <div style="position:absolute;top:18mm;left:6mm;right:6mm;bottom:16mm;border:2px solid #2c5aa0;border-radius:4px;pointer-events:none;"></div>
      <div style="position:absolute;top:20mm;left:8mm;right:8mm;bottom:18mm;border:1px solid rgba(44,90,160,0.3);border-radius:2px;pointer-events:none;"></div>

      <div style="position:absolute;top:4mm;left:0;right:0;text-align:center;color:#c9a84c;font-size:20px;font-family:'Scheherazade New',serif;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
      <div style="position:absolute;top:19mm;right:16mm;font-size:13px;color:#999;z-index:2;">${e(data.certificateNumber)}</div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:26mm 25mm 10mm;text-align:center;">
        <div style="display:inline-block;background:linear-gradient(135deg,#1e3a5f,#2c5aa0);color:white;padding:3mm 18mm;border-radius:6px;font-size:16px;letter-spacing:3px;margin-bottom:5mm;font-weight:500;">شهادة تقدير</div>
        <div style="font-size:40px;font-weight:800;color:#1e3a5f;margin-bottom:4mm;">${e(titleText)}</div>
        <div style="width:120px;height:4px;background:linear-gradient(90deg,#2c5aa0,#c9a84c,#2c5aa0);margin:0 auto 6mm;border-radius:2px;"></div>
        
        <div style="font-size:20px;color:#555;margin-bottom:5mm;">يتشرف <strong style="color:#1e3a5f;">${e(data.mosqueName)}</strong> بمنح هذه الشهادة إلى</div>
        <div style="font-size:48px;font-weight:700;color:#1e3a5f;font-family:'Scheherazade New','Amiri',serif;border-bottom:3px double #2c5aa0;display:inline-block;padding:0 25mm 4mm;margin-bottom:6mm;">
          ${e(data.studentName)}
        </div>

        <div style="font-size:20px;color:#444;line-height:2;margin-bottom:4mm;">
          ${buildBodyText(data)}
        </div>
        ${gradeText ? `<div style="margin-bottom:3mm;"><span style="background:linear-gradient(135deg,#1e3a5f,#2c5aa0);color:white;padding:3mm 16mm;border-radius:25px;font-size:22px;font-weight:600;">${gradeText}</span></div>` : ""}
        ${data.ijazahTeacher ? `<div style="font-size:18px;color:#666;">على يد الشيخ: <strong>${e(data.ijazahTeacher)}</strong></div>` : ""}
      </div>

      ${footerSection({ hijri, gregorian, issuerName: data.issuerName, stampColor: "#2c5aa0", lineColor: "#2c5aa0", textColor: "#777", dateColor: "#777", subDateColor: "#999" })}
    </div>
  `);
}

function emeraldMosqueTemplate(data: CertificateData): string {
  const e = escapeHtml;
  const { gregorian, hijri } = formatDates(data.issuedAt);
  const gradeText = gradeArabic(data.grade);
  const titleText = data.title || (data.certificateType === "graduation" ? "شهادة إتمام حفظ القرآن الكريم" : "شهادة إتمام دورة");

  return wrapInPage(`
    <div class="cert-page" style="width:297mm;height:210mm;position:relative;background:linear-gradient(180deg,#f0faf5 0%,#ffffff 50%,#f0faf5 100%);overflow:hidden;font-family:'Amiri',serif;display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
      <div style="position:absolute;inset:6mm;border:3px solid #0d6b4e;border-radius:8px;pointer-events:none;"></div>
      <div style="position:absolute;inset:9mm;border:1px solid rgba(13,107,78,0.3);pointer-events:none;"></div>
      
      <div style="position:absolute;top:6mm;left:50%;transform:translateX(-50%);">
        <svg width="60" height="40" viewBox="0 0 60 40" style="margin:0 auto;">
          <path d="M30 3 C30 3,20 13,20 23 C20 33,25 37,30 39 C35 37,40 33,40 23 C40 13,30 3,30 3Z" fill="none" stroke="#0d6b4e" stroke-width="1.5" opacity="0.4"/>
          <path d="M30 0 L32 7 L30 5 L28 7Z" fill="#c9a84c" opacity="0.6"/>
        </svg>
      </div>

      <div style="position:absolute;top:13mm;right:16mm;font-size:13px;color:#999;font-family:'Tajawal',sans-serif;">${e(data.certificateNumber)}</div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:22mm 25mm 8mm;text-align:center;">
        <div style="font-size:20px;color:#0d6b4e;letter-spacing:2px;margin-bottom:4mm;font-family:'Scheherazade New',serif;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size:40px;font-weight:700;color:#0d6b4e;margin-bottom:3mm;">${e(titleText)}</div>
        <div style="width:200px;height:3px;background:linear-gradient(90deg,transparent,#0d6b4e,#c9a84c,#0d6b4e,transparent);margin:0 auto 5mm;"></div>
        
        <div style="font-size:19px;color:#555;margin-bottom:3mm;font-family:'Tajawal',sans-serif;">${e(data.mosqueName)}</div>
        <div style="font-size:19px;color:#666;margin-bottom:5mm;font-family:'Tajawal',sans-serif;">تشهد إدارة <strong>${e(data.mosqueName)}</strong> بأن ${genderText(data.studentGender).student}</div>
        
        <div style="font-size:50px;font-weight:700;color:#0d6b4e;font-family:'Scheherazade New',serif;position:relative;display:inline-block;padding:0 25mm 4mm;margin-bottom:6mm;">
          ${e(data.studentName)}
          <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);"></div>
        </div>

        <div style="font-size:20px;color:#444;line-height:2.2;margin-bottom:4mm;font-family:'Tajawal',sans-serif;">
          ${buildBodyText(data)}
        </div>
        ${gradeText ? `<div style="font-size:22px;margin-bottom:3mm;font-family:'Tajawal',sans-serif;">بتقدير: <strong style="color:#0d6b4e;font-size:28px;">${gradeText}</strong></div>` : ""}
        ${data.ijazahTeacher ? `<div style="font-size:18px;color:#666;font-family:'Tajawal',sans-serif;">الشيخ المجيز: <strong>${e(data.ijazahTeacher)}</strong></div>` : ""}
      </div>

      ${footerSection({ hijri, gregorian, issuerName: data.issuerName, stampColor: "#0d6b4e", lineColor: "#0d6b4e", textColor: "#777", dateColor: "#777", subDateColor: "#999" })}
    </div>
  `);
}

function kidsRainbowTemplate(data: CertificateData): string {
  const e = escapeHtml;
  const { gregorian, hijri } = formatDates(data.issuedAt);
  const gradeText = gradeArabic(data.grade);
  const titleText = data.title || (data.certificateType === "graduation" ? "شهادة إتمام حفظ القرآن الكريم" : "شهادة إتمام دورة");

  return wrapInPage(`
    <div class="cert-page" style="width:297mm;height:210mm;position:relative;background:linear-gradient(135deg,#fff5f5 0%,#fff8e1 25%,#f0fff4 50%,#ebf8ff 75%,#faf5ff 100%);overflow:hidden;font-family:'Tajawal',sans-serif;display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
      <div style="position:absolute;top:0;left:0;right:0;height:8mm;background:linear-gradient(90deg,#ff6b6b,#feca57,#48dbfb,#ff9ff3,#54a0ff,#5f27cd);opacity:0.7;"></div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:8mm;background:linear-gradient(90deg,#5f27cd,#54a0ff,#ff9ff3,#48dbfb,#feca57,#ff6b6b);opacity:0.7;"></div>
      <div style="position:absolute;inset:10mm;border:3px dashed #feca57;border-radius:20px;pointer-events:none;"></div>

      <div style="position:absolute;top:12mm;left:16mm;font-size:34px;">⭐</div>
      <div style="position:absolute;top:12mm;right:16mm;font-size:34px;">🌙</div>
      <div style="position:absolute;bottom:14mm;left:16mm;font-size:30px;">🌟</div>
      <div style="position:absolute;bottom:14mm;right:16mm;font-size:30px;">🎉</div>
      <div style="position:absolute;top:50%;left:13mm;font-size:28px;transform:translateY(-50%);">📖</div>
      <div style="position:absolute;top:50%;right:13mm;font-size:28px;transform:translateY(-50%);">🏆</div>

      <div style="position:absolute;top:15mm;right:22mm;font-size:12px;color:#bbb;">${e(data.certificateNumber)}</div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:16mm 35mm 8mm;text-align:center;">
        <div style="font-size:17px;color:#8854d0;margin-bottom:3mm;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size:42px;font-weight:800;background:linear-gradient(135deg,#ff6b6b,#feca57,#48dbfb);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:3mm;">🎊 شهادة تميّز 🎊</div>
        <div style="font-size:22px;color:#8854d0;font-weight:700;margin-bottom:4mm;">${e(titleText)}</div>
        
        <div style="font-size:19px;color:#666;margin-bottom:4mm;">${e(data.mosqueName)} يقدم هذه الشهادة إلى</div>
        
        <div style="display:inline-block;background:linear-gradient(135deg,#feca57,#ff9ff3);padding:4mm 22mm;border-radius:18px;margin-bottom:5mm;">
          <div style="font-size:44px;font-weight:800;color:#2d3436;">${e(data.studentName)}</div>
        </div>

        <div style="font-size:20px;color:#555;line-height:2;margin-bottom:4mm;">
          ${data.certificateType === "graduation"
            ? `لإتمامه حفظ <strong style="color:#e17055;">${data.totalJuz || 30} جزءاً</strong> من القرآن الكريم 🌟`
            : `لإتمامه الدورة بنجاح وتميّز! 🌟`}
          ${data.recitationStyle ? `<br/>برواية <strong style="color:#e17055;">${recitationArabic(data.recitationStyle)}</strong>` : ""}
        </div>
        ${gradeText ? `<div style="margin-bottom:3mm;"><span style="background:linear-gradient(135deg,#48dbfb,#0abde3);color:white;padding:3mm 16mm;border-radius:25px;font-size:24px;font-weight:700;">${gradeText} ⭐</span></div>` : ""}
        ${data.ijazahTeacher ? `<div style="font-size:17px;color:#666;">على يد الشيخ: <strong>${e(data.ijazahTeacher)}</strong></div>` : ""}
      </div>

      ${footerSection({ hijri, gregorian, issuerName: data.issuerName, stampColor: "#feca57", lineColor: "#ff9ff3", textColor: "#888", dateColor: "#888", subDateColor: "#aaa", stampEmoji: "⭐" })}
    </div>
  `);
}

function kidsStarsTemplate(data: CertificateData): string {
  const e = escapeHtml;
  const { gregorian, hijri } = formatDates(data.issuedAt);
  const gradeText = gradeArabic(data.grade);
  const titleText = data.title || (data.certificateType === "graduation" ? "شهادة إتمام حفظ القرآن الكريم" : "شهادة إتمام دورة");

  return wrapInPage(`
    <div class="cert-page" style="width:297mm;height:210mm;position:relative;background:linear-gradient(180deg,#1a1a3e 0%,#16213e 30%,#0f3460 100%);overflow:hidden;font-family:'Tajawal',sans-serif;color:white;display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,0.3);">
      <div style="position:absolute;inset:8mm;border:2px solid rgba(201,168,76,0.4);border-radius:12px;pointer-events:none;"></div>
      
      <div style="position:absolute;top:14mm;left:18mm;font-size:18px;opacity:0.5;">✨</div>
      <div style="position:absolute;top:22mm;right:28mm;font-size:14px;opacity:0.4;">⭐</div>
      <div style="position:absolute;top:38mm;left:38mm;font-size:12px;opacity:0.3;">✦</div>
      <div style="position:absolute;bottom:28mm;right:23mm;font-size:16px;opacity:0.4;">🌙</div>
      <div style="position:absolute;bottom:45mm;left:23mm;font-size:14px;opacity:0.3;">⭐</div>

      <div style="position:absolute;top:13mm;right:18mm;font-size:12px;color:rgba(201,168,76,0.4);">${e(data.certificateNumber)}</div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:16mm 30mm 8mm;text-align:center;">
        <div style="font-size:26px;margin-bottom:3mm;">🌙</div>
        <div style="font-size:18px;color:#c9a84c;letter-spacing:2px;margin-bottom:4mm;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size:38px;font-weight:700;color:#c9a84c;margin-bottom:3mm;font-family:'Scheherazade New',serif;">شهادة نجم من نجوم القرآن</div>
        <div style="font-size:18px;color:rgba(255,255,255,0.6);margin-bottom:5mm;">${e(titleText)}</div>
        
        <div style="font-size:18px;color:rgba(255,255,255,0.7);margin-bottom:4mm;">${e(data.mosqueName)}</div>
        
        <div style="font-size:48px;font-weight:800;color:white;margin-bottom:6mm;text-shadow:0 0 20px rgba(201,168,76,0.3);">
          ⭐ ${e(data.studentName)} ⭐
        </div>

        <div style="font-size:20px;color:rgba(255,255,255,0.8);line-height:2;margin-bottom:4mm;">
          ${data.certificateType === "graduation"
            ? `أتمّ حفظ <strong style="color:#c9a84c;">${data.totalJuz || 30} جزءاً</strong> من القرآن الكريم`
            : `أتمّ الدورة بنجاح وتميّز`}
          ${data.recitationStyle ? `<br/>برواية <strong style="color:#c9a84c;">${recitationArabic(data.recitationStyle)}</strong>` : ""}
        </div>
        ${gradeText ? `<div style="margin-bottom:3mm;"><span style="background:rgba(201,168,76,0.2);border:2px solid #c9a84c;color:#c9a84c;padding:3mm 16mm;border-radius:25px;font-size:24px;font-weight:600;">${gradeText}</span></div>` : ""}
        ${data.ijazahTeacher ? `<div style="font-size:17px;color:rgba(255,255,255,0.6);">على يد الشيخ: <strong style="color:#c9a84c;">${e(data.ijazahTeacher)}</strong></div>` : ""}
      </div>

      ${footerSection({ hijri, gregorian, issuerName: data.issuerName, stampColor: "rgba(201,168,76,0.4)", lineColor: "rgba(201,168,76,0.5)", textColor: "rgba(255,255,255,0.5)", dateColor: "rgba(201,168,76,0.6)", subDateColor: "rgba(201,168,76,0.4)", stampEmoji: "🌙" })}
    </div>
  `);
}

function youthModernTemplate(data: CertificateData): string {
  const e = escapeHtml;
  const { gregorian, hijri } = formatDates(data.issuedAt);
  const gradeText = gradeArabic(data.grade);
  const titleText = data.title || (data.certificateType === "graduation" ? "شهادة إتمام حفظ القرآن الكريم" : "شهادة إتمام دورة");

  return wrapInPage(`
    <div class="cert-page" style="width:297mm;height:210mm;position:relative;background:#ffffff;overflow:hidden;font-family:'Tajawal',sans-serif;display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
      <div style="position:absolute;top:0;left:0;width:45%;height:100%;background:linear-gradient(180deg,#667eea 0%,#764ba2 100%);clip-path:polygon(0 0,100% 0,70% 100%,0 100%);"></div>
      <div style="position:absolute;top:0;left:0;width:45%;height:100%;background:linear-gradient(180deg,rgba(102,126,234,0.08) 0%,rgba(118,75,162,0.08) 100%);clip-path:polygon(0 0,102% 0,72% 100%,0 100%);"></div>

      <div style="position:absolute;top:20mm;left:22mm;text-align:center;color:white;z-index:1;">
        <div style="font-size:60px;margin-bottom:5mm;">🎓</div>
        <div style="font-size:18px;font-weight:300;opacity:0.9;">شهادة</div>
        <div style="font-size:24px;font-weight:700;">إنجاز</div>
      </div>

      <div style="position:absolute;top:15mm;right:18mm;font-size:13px;color:#999;">${e(data.certificateNumber)}</div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:20mm 25mm 10mm 95mm;text-align:right;">
        <div style="font-size:17px;color:#667eea;letter-spacing:3px;margin-bottom:5mm;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size:36px;font-weight:800;color:#2d3436;margin-bottom:4mm;line-height:1.3;">${e(titleText)}</div>
        <div style="width:80px;height:5px;background:linear-gradient(90deg,#667eea,#764ba2);border-radius:3px;margin-bottom:5mm;margin-right:0;"></div>
        <div style="font-size:18px;color:#636e72;margin-bottom:3mm;">${e(data.mosqueName)}</div>
        <div style="font-size:18px;color:#636e72;margin-bottom:5mm;">تشهد إدارة <strong>${e(data.mosqueName)}</strong> بأن ${genderText(data.studentGender).student}</div>
        
        <div style="font-size:42px;font-weight:800;color:#2d3436;margin-bottom:5mm;border-bottom:4px solid #667eea;display:inline-block;padding-bottom:4mm;align-self:flex-start;">${e(data.studentName)}</div>
        
        <div style="font-size:19px;color:#636e72;line-height:2;margin-bottom:4mm;">
          ${buildBodyText(data)}
        </div>
        ${gradeText ? `<div style="margin-bottom:4mm;"><span style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:3mm 14mm;border-radius:8px;font-size:22px;font-weight:700;">${gradeText}</span></div>` : ""}
        ${data.ijazahTeacher ? `<div style="font-size:17px;color:#636e72;margin-bottom:3mm;">على يد الشيخ: <strong>${e(data.ijazahTeacher)}</strong></div>` : ""}
      </div>

      <div style="padding:0 25mm 16mm 95mm;display:flex;justify-content:space-between;align-items:flex-end;">
        <div style="text-align:center;min-width:120px;">
          <div style="width:130px;border-bottom:2px solid #ddd;margin:0 auto 8px;"></div>
          <div style="font-size:15px;color:#999;">${data.issuerName ? e(data.issuerName) : "توقيع المسؤول"}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:15px;color:#999;margin-bottom:3px;">${hijri}</div>
          <div style="font-size:14px;color:#bbb;">${gregorian}</div>
        </div>
      </div>
    </div>
  `);
}

function calligraphyTemplate(data: CertificateData): string {
  const e = escapeHtml;
  const { gregorian, hijri } = formatDates(data.issuedAt);
  const gradeText = gradeArabic(data.grade);
  const titleText = data.title || (data.certificateType === "graduation" ? "شهادة إتمام حفظ القرآن الكريم" : "شهادة إتمام دورة");

  return wrapInPage(`
    <div class="cert-page" style="width:297mm;height:210mm;position:relative;background:#faf8f0;overflow:hidden;font-family:'Scheherazade New','Amiri',serif;display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
      <div style="position:absolute;inset:6mm;border:4px double #8B7355;pointer-events:none;"></div>
      <div style="position:absolute;inset:10mm;border:1px solid rgba(139,115,85,0.3);pointer-events:none;"></div>
      
      <div style="position:absolute;top:6mm;left:50%;transform:translateX(-50%);">
        <svg width="100" height="25" viewBox="0 0 100 25"><path d="M0 12 Q25 0,50 12 Q75 25,100 12" fill="none" stroke="#8B7355" stroke-width="1.5" opacity="0.5"/><path d="M0 12 Q25 25,50 12 Q75 0,100 12" fill="none" stroke="#8B7355" stroke-width="1.5" opacity="0.5"/></svg>
      </div>

      <div style="position:absolute;top:14mm;right:18mm;font-size:12px;color:#bbb;font-family:'Tajawal',sans-serif;">${e(data.certificateNumber)}</div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:16mm 30mm 8mm;text-align:center;">
        <div style="font-size:24px;color:#8B7355;margin-bottom:3mm;letter-spacing:2px;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size:17px;color:#999;margin-bottom:5mm;">﴿ وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ ﴾</div>
        
        <div style="font-size:44px;font-weight:700;color:#4a3728;margin-bottom:3mm;">${e(titleText)}</div>
        <div style="width:250px;height:2px;background:linear-gradient(90deg,transparent,#8B7355,transparent);margin:0 auto 5mm;"></div>
        
        <div style="font-size:18px;color:#666;margin-bottom:3mm;font-family:'Tajawal',sans-serif;">${e(data.mosqueName)}</div>
        <div style="font-size:18px;color:#888;margin-bottom:5mm;font-family:'Tajawal',sans-serif;">يزفّ البشرى بأن</div>
        
        <div style="font-size:52px;font-weight:700;color:#4a3728;margin-bottom:3mm;letter-spacing:2px;">
          ${e(data.studentName)}
        </div>
        <div style="width:300px;height:3px;background:linear-gradient(90deg,transparent,#c9a84c,#8B7355,#c9a84c,transparent);margin:0 auto 6mm;"></div>

        <div style="font-size:21px;color:#555;line-height:2.2;max-width:600px;margin-bottom:4mm;font-family:'Tajawal',sans-serif;">
          ${data.certificateType === "graduation"
            ? `قد منّ الله عليه بإتمام حفظ <strong style="color:#4a3728;">${data.totalJuz || 30} جزءاً</strong> من كتاب الله العزيز${data.recitationStyle ? `<br/>برواية <strong style="color:#4a3728;">${recitationArabic(data.recitationStyle)}</strong>` : ""}`
            : `قد وفّقه الله لإتمام الدورة على أكمل وجه`}
        </div>
        ${gradeText ? `<div style="font-size:24px;color:#4a3728;margin-bottom:3mm;font-family:'Tajawal',sans-serif;">التقدير: <strong style="font-size:30px;color:#8B7355;">${gradeText}</strong></div>` : ""}
        ${data.ijazahTeacher ? `<div style="font-size:18px;color:#888;font-family:'Tajawal',sans-serif;">بإشراف وتعليم الشيخ: <strong style="color:#4a3728;">${e(data.ijazahTeacher)}</strong></div>` : ""}
      </div>

      ${footerSection({ hijri, gregorian, issuerName: data.issuerName, stampColor: "#ccc", lineColor: "#8B7355", textColor: "#999", dateColor: "#888", subDateColor: "#aaa" })}
    </div>
  `);
}

function teacherHonorTemplate(data: CertificateData): string {
  const e = escapeHtml;
  const { gregorian, hijri } = formatDates(data.issuedAt);
  const gradeText = gradeArabic(data.grade);
  const titleText = data.title || (data.certificateType === "graduation" ? "شهادة إتمام حفظ القرآن الكريم" : "شهادة تكريم");

  return wrapInPage(`
    <div class="cert-page" style="width:297mm;height:210mm;position:relative;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);overflow:hidden;font-family:'Amiri',serif;color:#e8d5b7;display:flex;flex-direction:column;box-shadow:0 4px 20px rgba(0,0,0,0.3);">
      <div style="position:absolute;inset:8mm;border:2px solid #c9a84c;pointer-events:none;"></div>
      <div style="position:absolute;inset:10mm;border:1px solid rgba(201,168,76,0.3);pointer-events:none;"></div>
      
      <div style="position:absolute;top:8mm;left:50%;transform:translateX(-50%);">
        <svg width="120" height="16" viewBox="0 0 120 16"><path d="M0 8 L18 8 L28 2 L38 8 L48 8 L60 4 L72 8 L82 8 L92 2 L102 8 L120 8" fill="none" stroke="#c9a84c" stroke-width="1" opacity="0.5"/></svg>
      </div>
      <div style="position:absolute;bottom:8mm;left:50%;transform:translateX(-50%) rotate(180deg);">
        <svg width="120" height="16" viewBox="0 0 120 16"><path d="M0 8 L18 8 L28 2 L38 8 L48 8 L60 4 L72 8 L82 8 L92 2 L102 8 L120 8" fill="none" stroke="#c9a84c" stroke-width="1" opacity="0.5"/></svg>
      </div>

      <div style="position:absolute;top:14mm;right:18mm;font-size:12px;color:rgba(201,168,76,0.4);font-family:'Tajawal',sans-serif;">${e(data.certificateNumber)}</div>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:16mm 28mm 8mm;text-align:center;">
        <div style="font-size:20px;color:#c9a84c;letter-spacing:3px;margin-bottom:3mm;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size:17px;color:rgba(232,213,183,0.5);margin-bottom:5mm;">﴿ وَقُلْ رَبِّ زِدْنِي عِلْمًا ﴾</div>
        
        <div style="font-size:42px;font-weight:700;color:#c9a84c;margin-bottom:3mm;font-family:'Scheherazade New',serif;">${e(titleText)}</div>
        <div style="width:150px;height:3px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);margin:0 auto 5mm;"></div>
        
        <div style="font-size:18px;color:rgba(232,213,183,0.6);margin-bottom:3mm;font-family:'Tajawal',sans-serif;">${e(data.mosqueName)}</div>
        <div style="font-size:19px;color:rgba(232,213,183,0.7);margin-bottom:5mm;font-family:'Tajawal',sans-serif;">يتقدم بخالص الشكر والتقدير إلى</div>
        
        <div style="font-size:50px;font-weight:700;color:#c9a84c;margin-bottom:4mm;font-family:'Scheherazade New',serif;text-shadow:0 0 30px rgba(201,168,76,0.2);">
          ${e(data.studentName)}
        </div>
        <div style="width:250px;height:2px;background:linear-gradient(90deg,transparent,#c9a84c,transparent);margin:0 auto 6mm;"></div>

        <div style="font-size:20px;color:rgba(232,213,183,0.8);line-height:2;max-width:600px;margin-bottom:4mm;font-family:'Tajawal',sans-serif;">
          ${data.certificateType === "graduation"
            ? `تقديراً لجهوده في حفظ <strong style="color:#c9a84c;">${data.totalJuz || 30} جزءاً</strong> من كتاب الله${data.recitationStyle ? ` برواية <strong style="color:#c9a84c;">${recitationArabic(data.recitationStyle)}</strong>` : ""}`
            : `تقديراً لإسهامه المتميز في إتمام متطلبات الدورة`}
        </div>
        ${gradeText ? `<div style="margin-bottom:3mm;"><span style="border:2px solid #c9a84c;color:#c9a84c;padding:3mm 18mm;font-size:24px;font-family:'Tajawal',sans-serif;font-weight:600;">${gradeText}</span></div>` : ""}
        ${data.ijazahTeacher ? `<div style="font-size:17px;color:rgba(232,213,183,0.6);font-family:'Tajawal',sans-serif;">على يد الشيخ: <strong style="color:#c9a84c;">${e(data.ijazahTeacher)}</strong></div>` : ""}
      </div>

      ${footerSection({ hijri, gregorian, issuerName: data.issuerName, stampColor: "rgba(201,168,76,0.4)", lineColor: "rgba(201,168,76,0.5)", textColor: "rgba(201,168,76,0.5)", dateColor: "rgba(201,168,76,0.6)", subDateColor: "rgba(201,168,76,0.4)" })}
    </div>
  `);
}

// ─── قوالب إسلامية ──────────────────────────────────────────────────────────

function abbasidTemplate(data: CertificateData): string {
  const e = escapeHtml;
  const { gregorian, hijri } = formatDates(data.issuedAt);
  const gradeText = gradeArabic(data.grade);
  const titleText = data.title || (data.certificateType === "graduation" ? "شهادة إتمام حفظ القرآن الكريم" : "شهادة إتمام دورة");
  const g = genderText(data.studentGender);
  const starPattern = `<svg width="50" height="50" viewBox="0 0 50 50" style="position:absolute;opacity:0.06;"><polygon points="25,2 31,18 49,18 35,28 39,46 25,36 11,46 15,28 1,18 19,18" fill="#c9a84c"/></svg>`;
  return wrapInPage(`
    <div class="cert-page" style="width:297mm;height:210mm;position:relative;background:linear-gradient(135deg,#f8f0e0 0%,#f0e6d0 100%);overflow:hidden;font-family:'Amiri',serif;display:flex;flex-direction:column;">
      <div style="position:absolute;inset:6mm;border:4px double #8b6914;pointer-events:none;"></div>
      <div style="position:absolute;inset:10mm;border:1px solid rgba(139,105,20,0.3);pointer-events:none;"></div>
      <div style="position:absolute;top:12mm;left:12mm;">${starPattern}</div>
      <div style="position:absolute;top:12mm;right:12mm;">${starPattern}</div>
      <div style="position:absolute;bottom:12mm;left:12mm;">${starPattern}</div>
      <div style="position:absolute;bottom:12mm;right:12mm;">${starPattern}</div>
      <div style="position:absolute;top:14mm;right:18mm;font-size:11px;color:rgba(139,105,20,0.4);font-family:'Tajawal',sans-serif;">${e(data.certificateNumber)}</div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:14mm 24mm 6mm;text-align:center;">
        <div style="font-size:20px;color:#8b6914;letter-spacing:2px;margin-bottom:4mm;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size:44px;font-weight:700;color:#5a3e0a;margin-bottom:3mm;font-family:'Scheherazade New',serif;">${e(titleText)}</div>
        <div style="width:200px;height:3px;background:linear-gradient(90deg,transparent,#8b6914,transparent);margin:0 auto 5mm;"></div>
        <div style="font-size:20px;color:#666;margin-bottom:5mm;">تشهد إدارة <strong style="color:#5a3e0a;">${e(data.mosqueName)}</strong> بأن ${g.student}</div>
        <div style="font-size:48px;font-weight:700;color:#5a3e0a;margin-bottom:4mm;font-family:'Scheherazade New',serif;">${e(data.studentName)}</div>
        <div style="width:250px;height:2px;background:linear-gradient(90deg,transparent,#8b6914,transparent);margin:0 auto 5mm;"></div>
        <div style="font-size:21px;color:#555;line-height:2;max-width:600px;margin-bottom:3mm;">${buildBodyText(data)}</div>
        ${gradeText ? `<div style="font-size:24px;color:#5a3e0a;margin-bottom:3mm;">بتقدير: <strong style="color:#8b6914;">${gradeText}</strong></div>` : ""}
      </div>
      ${footerSection({ hijri, gregorian, issuerName: data.issuerName, stampColor: "#8b6914", lineColor: "#8b6914", textColor: "#888", dateColor: "#777", subDateColor: "#999" })}
    </div>
  `);
}

function andalusianTemplate(data: CertificateData): string {
  const e = escapeHtml;
  const { gregorian, hijri } = formatDates(data.issuedAt);
  const gradeText = gradeArabic(data.grade);
  const titleText = data.title || (data.certificateType === "graduation" ? "شهادة إتمام حفظ القرآن الكريم" : "شهادة إتمام دورة");
  const g = genderText(data.studentGender);
  return wrapInPage(`
    <div class="cert-page" style="width:297mm;height:210mm;position:relative;background:linear-gradient(135deg,#f0f7f0 0%,#e8f5e8 50%,#f0f7f0 100%);overflow:hidden;font-family:'Amiri',serif;display:flex;flex-direction:column;">
      <div style="position:absolute;inset:6mm;border:3px solid #1a5e3a;border-radius:8px;pointer-events:none;"></div>
      <div style="position:absolute;inset:9mm;border:1px solid rgba(26,94,58,0.2);border-radius:4px;pointer-events:none;"></div>
      <div style="position:absolute;top:6mm;left:50%;transform:translateX(-50%);width:180px;text-align:center;font-size:28px;color:rgba(26,94,58,0.12);">❁ ❁ ❁</div>
      <div style="position:absolute;bottom:6mm;left:50%;transform:translateX(-50%);width:180px;text-align:center;font-size:28px;color:rgba(26,94,58,0.12);">❁ ❁ ❁</div>
      <div style="position:absolute;top:14mm;right:18mm;font-size:11px;color:rgba(26,94,58,0.35);font-family:'Tajawal',sans-serif;">${e(data.certificateNumber)}</div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:14mm 24mm 6mm;text-align:center;">
        <div style="font-size:20px;color:#1a5e3a;letter-spacing:2px;margin-bottom:4mm;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size:44px;font-weight:700;color:#1a5e3a;margin-bottom:3mm;font-family:'Scheherazade New',serif;">${e(titleText)}</div>
        <div style="width:200px;height:3px;background:linear-gradient(90deg,transparent,#1a5e3a,transparent);margin:0 auto 5mm;"></div>
        <div style="font-size:20px;color:#555;margin-bottom:5mm;">تشهد إدارة <strong style="color:#1a5e3a;">${e(data.mosqueName)}</strong> بأن ${g.student}</div>
        <div style="font-size:48px;font-weight:700;color:#1a5e3a;margin-bottom:4mm;font-family:'Scheherazade New',serif;">${e(data.studentName)}</div>
        <div style="width:250px;height:2px;background:linear-gradient(90deg,transparent,#2e7d32,transparent);margin:0 auto 5mm;"></div>
        <div style="font-size:21px;color:#444;line-height:2;max-width:600px;margin-bottom:3mm;">${buildBodyText(data)}</div>
        ${gradeText ? `<div style="font-size:24px;color:#1a5e3a;margin-bottom:3mm;">بتقدير: <strong>${gradeText}</strong></div>` : ""}
      </div>
      ${footerSection({ hijri, gregorian, issuerName: data.issuerName, stampColor: "#1a5e3a", lineColor: "#2e7d32", textColor: "#888", dateColor: "#1a5e3a", subDateColor: "#666" })}
    </div>
  `);
}

function umayyadTemplate(data: CertificateData): string {
  const e = escapeHtml;
  const { gregorian, hijri } = formatDates(data.issuedAt);
  const gradeText = gradeArabic(data.grade);
  const titleText = data.title || (data.certificateType === "graduation" ? "شهادة إتمام حفظ القرآن الكريم" : "شهادة إتمام دورة");
  const g = genderText(data.studentGender);
  return wrapInPage(`
    <div class="cert-page" style="width:297mm;height:210mm;position:relative;background:linear-gradient(135deg,#faf5eb 0%,#f5ead5 100%);overflow:hidden;font-family:'Amiri',serif;display:flex;flex-direction:column;">
      <div style="position:absolute;inset:6mm;border:3px solid #8b6508;pointer-events:none;"></div>
      <div style="position:absolute;inset:9mm;border:1px solid rgba(139,101,8,0.2);pointer-events:none;"></div>
      <div style="position:absolute;top:7mm;left:7mm;right:7mm;height:12mm;background:repeating-linear-gradient(90deg,transparent,transparent 14px,rgba(139,101,8,0.06) 14px,rgba(139,101,8,0.06) 15px);pointer-events:none;"></div>
      <div style="position:absolute;top:14mm;right:18mm;font-size:11px;color:rgba(139,101,8,0.35);font-family:'Tajawal',sans-serif;">${e(data.certificateNumber)}</div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:14mm 24mm 6mm;text-align:center;">
        <div style="font-size:20px;color:#8b6508;letter-spacing:2px;margin-bottom:4mm;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size:44px;font-weight:700;color:#5a4204;margin-bottom:3mm;font-family:'Scheherazade New',serif;">${e(titleText)}</div>
        <div style="width:200px;height:3px;background:linear-gradient(90deg,transparent,#8b6508,transparent);margin:0 auto 5mm;"></div>
        <div style="font-size:20px;color:#666;margin-bottom:5mm;">تشهد إدارة <strong style="color:#5a4204;">${e(data.mosqueName)}</strong> بأن ${g.student}</div>
        <div style="font-size:48px;font-weight:700;color:#5a4204;margin-bottom:4mm;font-family:'Scheherazade New',serif;">${e(data.studentName)}</div>
        <div style="width:250px;height:2px;background:linear-gradient(90deg,transparent,#8b6508,transparent);margin:0 auto 5mm;"></div>
        <div style="font-size:21px;color:#555;line-height:2;max-width:600px;margin-bottom:3mm;">${buildBodyText(data)}</div>
        ${gradeText ? `<div style="font-size:24px;color:#5a4204;margin-bottom:3mm;">بتقدير: <strong style="color:#8b6508;">${gradeText}</strong></div>` : ""}
      </div>
      ${footerSection({ hijri, gregorian, issuerName: data.issuerName, stampColor: "#8b6508", lineColor: "#8b6508", textColor: "#888", dateColor: "#8b6508", subDateColor: "#999" })}
    </div>
  `);
}

// ─── قوالب نسائية ──────────────────────────────────────────────────────────

function feminineRoseTemplate(data: CertificateData): string {
  const e = escapeHtml;
  const { gregorian, hijri } = formatDates(data.issuedAt);
  const gradeText = gradeArabic(data.grade);
  const titleText = data.title || (data.certificateType === "graduation" ? "شهادة إتمام حفظ القرآن الكريم" : "شهادة إتمام دورة");
  return wrapInPage(`
    <div class="cert-page" style="width:297mm;height:210mm;position:relative;background:linear-gradient(135deg,#fff5f7 0%,#fce4ec 50%,#fff5f7 100%);overflow:hidden;font-family:'Amiri',serif;display:flex;flex-direction:column;">
      <div style="position:absolute;inset:6mm;border:2px solid #e91e63;border-radius:12px;pointer-events:none;"></div>
      <div style="position:absolute;inset:9mm;border:1px solid rgba(233,30,99,0.15);border-radius:8px;pointer-events:none;"></div>
      <div style="position:absolute;top:5mm;left:50%;transform:translateX(-50%);font-size:24px;color:rgba(233,30,99,0.15);letter-spacing:12px;">✿ ✿ ✿ ✿ ✿ ✿ ✿</div>
      <div style="position:absolute;bottom:5mm;left:50%;transform:translateX(-50%);font-size:24px;color:rgba(233,30,99,0.15);letter-spacing:12px;">✿ ✿ ✿ ✿ ✿ ✿ ✿</div>
      <div style="position:absolute;top:14mm;right:18mm;font-size:11px;color:rgba(233,30,99,0.3);font-family:'Tajawal',sans-serif;">${e(data.certificateNumber)}</div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:14mm 24mm 6mm;text-align:center;">
        <div style="font-size:20px;color:#c2185b;letter-spacing:2px;margin-bottom:4mm;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size:42px;font-weight:700;color:#880e4f;margin-bottom:3mm;font-family:'Scheherazade New',serif;">${e(titleText)}</div>
        <div style="width:200px;height:3px;background:linear-gradient(90deg,transparent,#e91e63,transparent);margin:0 auto 5mm;"></div>
        <div style="font-size:20px;color:#777;margin-bottom:5mm;">تشهد إدارة <strong style="color:#880e4f;">${e(data.mosqueName)}</strong> بأن الطالبة</div>
        <div style="font-size:48px;font-weight:700;color:#880e4f;margin-bottom:4mm;font-family:'Scheherazade New',serif;">${e(data.studentName)}</div>
        <div style="width:250px;height:2px;background:linear-gradient(90deg,transparent,#e91e63,transparent);margin:0 auto 5mm;"></div>
        <div style="font-size:21px;color:#555;line-height:2;max-width:600px;margin-bottom:3mm;">${buildBodyText(data)}</div>
        ${gradeText ? `<div style="font-size:24px;color:#880e4f;margin-bottom:3mm;">بتقدير: <strong style="color:#c2185b;">${gradeText}</strong></div>` : ""}
      </div>
      ${footerSection({ hijri, gregorian, issuerName: data.issuerName, stampColor: "#e91e63", lineColor: "#e91e63", textColor: "#999", dateColor: "#c2185b", subDateColor: "#999" })}
    </div>
  `);
}

function feminineLavenderTemplate(data: CertificateData): string {
  const e = escapeHtml;
  const { gregorian, hijri } = formatDates(data.issuedAt);
  const gradeText = gradeArabic(data.grade);
  const titleText = data.title || (data.certificateType === "graduation" ? "شهادة إتمام حفظ القرآن الكريم" : "شهادة إتمام دورة");
  return wrapInPage(`
    <div class="cert-page" style="width:297mm;height:210mm;position:relative;background:linear-gradient(135deg,#f3e5f5 0%,#ede7f6 50%,#f3e5f5 100%);overflow:hidden;font-family:'Amiri',serif;display:flex;flex-direction:column;">
      <div style="position:absolute;inset:6mm;border:2px solid #7b1fa2;border-radius:10px;pointer-events:none;"></div>
      <div style="position:absolute;inset:9mm;border:1px solid rgba(123,31,162,0.15);border-radius:6px;pointer-events:none;"></div>
      <div style="position:absolute;top:14mm;right:18mm;font-size:11px;color:rgba(123,31,162,0.3);font-family:'Tajawal',sans-serif;">${e(data.certificateNumber)}</div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:14mm 24mm 6mm;text-align:center;">
        <div style="font-size:20px;color:#7b1fa2;letter-spacing:2px;margin-bottom:4mm;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size:42px;font-weight:700;color:#4a148c;margin-bottom:3mm;font-family:'Scheherazade New',serif;">${e(titleText)}</div>
        <div style="width:200px;height:3px;background:linear-gradient(90deg,transparent,#7b1fa2,transparent);margin:0 auto 5mm;"></div>
        <div style="font-size:20px;color:#777;margin-bottom:5mm;">تشهد إدارة <strong style="color:#4a148c;">${e(data.mosqueName)}</strong> بأن الطالبة</div>
        <div style="font-size:48px;font-weight:700;color:#4a148c;margin-bottom:4mm;font-family:'Scheherazade New',serif;">${e(data.studentName)}</div>
        <div style="width:250px;height:2px;background:linear-gradient(90deg,transparent,#9c27b0,transparent);margin:0 auto 5mm;"></div>
        <div style="font-size:21px;color:#555;line-height:2;max-width:600px;margin-bottom:3mm;">${buildBodyText(data)}</div>
        ${gradeText ? `<div style="font-size:24px;color:#4a148c;margin-bottom:3mm;">بتقدير: <strong style="color:#7b1fa2;">${gradeText}</strong></div>` : ""}
      </div>
      ${footerSection({ hijri, gregorian, issuerName: data.issuerName, stampColor: "#7b1fa2", lineColor: "#9c27b0", textColor: "#999", dateColor: "#7b1fa2", subDateColor: "#999" })}
    </div>
  `);
}

/**
 * @deprecated Use generateCertificateHtmlByTemplate() + usePrintPreview() instead.
 */
export function printCertificate(data: CertificateData, templateId: string): void {
  console.warn("[certificate-templates] printCertificate is deprecated. Use generateCertificateHtmlByTemplate() + usePrintPreview() instead.");
  const html = generateCertificateHtmlByTemplate(data, templateId);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 600);
}

/**
 * Returns the full certificate HTML string for use with usePrintPreview().
 * Extracts the inner content (body) from the full HTML document template.
 */
export function getCertificateContentHtml(data: CertificateData, templateId: string): string {
  return generateCertificateHtmlByTemplate(data, templateId);
}

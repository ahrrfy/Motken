function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

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
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  category: "children" | "youth" | "adult" | "formal" | "teacher";
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
];

export function getTemplatesByCategory(category?: string): TemplateInfo[] {
  if (!category || category === "all") return CERTIFICATE_TEMPLATES;
  return CERTIFICATE_TEMPLATES.filter(t => t.category === category);
}

function generateIslamicPattern(color: string, opacity: string = "0.06"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><path d="M30 0L35 15L50 15L38 24L42 40L30 30L18 40L22 24L10 15L25 15Z" fill="${color}" opacity="${opacity}"/></svg>`;
}

export function generateCertificateHtmlByTemplate(data: CertificateData, templateId: string): string {
  const e = escapeHtml;
  const issuedDate = new Date(data.issuedAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  const hijriDate = new Date(data.issuedAt).toLocaleDateString("ar-SA-u-ca-islamic", { year: "numeric", month: "long", day: "numeric" });
  const certType = data.certificateType === "graduation" ? "شهادة إتمام حفظ القرآن الكريم" : `شهادة إتمام دورة`;
  const titleText = data.title || certType;

  switch (templateId) {
    case "classic-gold":
      return classicGoldTemplate(data, e, issuedDate, hijriDate, titleText);
    case "royal-blue":
      return royalBlueTemplate(data, e, issuedDate, hijriDate, titleText);
    case "emerald-mosque":
      return emeraldMosqueTemplate(data, e, issuedDate, hijriDate, titleText);
    case "kids-rainbow":
      return kidsRainbowTemplate(data, e, issuedDate, hijriDate, titleText);
    case "kids-stars":
      return kidsStarsTemplate(data, e, issuedDate, hijriDate, titleText);
    case "youth-modern":
      return youthModernTemplate(data, e, issuedDate, hijriDate, titleText);
    case "calligraphy":
      return calligraphyTemplate(data, e, issuedDate, hijriDate, titleText);
    case "teacher-honor":
      return teacherHonorTemplate(data, e, issuedDate, hijriDate, titleText);
    default:
      return classicGoldTemplate(data, e, issuedDate, hijriDate, titleText);
  }
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
    body { background: white; }
    @page { size: landscape; margin: 0; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .cert-container { page-break-inside: avoid; }
    }
  `;
}

function wrapInPage(content: string): string {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>شهادة - مُتْقِن</title><style>${commonStyles()}</style></head><body>${content}</body></html>`;
}

function classicGoldTemplate(data: CertificateData, e: (s: string) => string, issuedDate: string, hijriDate: string, titleText: string): string {
  const gradeText = gradeArabic(data.grade);
  return wrapInPage(`
    <div class="cert-container" style="width: 297mm; height: 210mm; position: relative; background: linear-gradient(135deg, #fefcf3 0%, #fff9e6 50%, #fefcf3 100%); overflow: hidden; font-family: 'Amiri', 'Tajawal', serif;">
      <div style="position: absolute; inset: 8mm; border: 3px solid #c9a84c;"></div>
      <div style="position: absolute; inset: 11mm; border: 1.5px solid #c9a84c;"></div>
      <div style="position: absolute; inset: 13mm; border: 0.5px solid #dbb85c;"></div>
      
      <div style="position: absolute; top: 12mm; left: 12mm; right: 12mm; bottom: 12mm; background: repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(201,168,76,0.03) 35px, rgba(201,168,76,0.03) 70px);"></div>

      <div style="position: absolute; top: 10mm; left: 0; right: 0; display: flex; justify-content: center;">
        <svg width="80" height="40" viewBox="0 0 80 40"><path d="M40 0 C30 10, 10 15, 0 20 C10 25, 30 30, 40 40 C50 30, 70 25, 80 20 C70 15, 50 10, 40 0Z" fill="none" stroke="#c9a84c" stroke-width="1"/></svg>
      </div>

      <div style="position: absolute; top: 16mm; right: 18mm; font-size: 9px; color: #999;">رقم: ${e(data.certificateNumber)}</div>

      <div style="text-align: center; padding-top: 22mm;">
        <div style="font-size: 14px; color: #c9a84c; letter-spacing: 3px; margin-bottom: 3mm;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size: 32px; font-weight: 700; color: #1a3a2a; margin-bottom: 2mm; font-family: 'Scheherazade New', 'Amiri', serif;">${e(titleText)}</div>
        <div style="width: 120px; height: 2px; background: linear-gradient(90deg, transparent, #c9a84c, transparent); margin: 0 auto 4mm;"></div>
        <div style="font-size: 13px; color: #666; margin-bottom: 3mm;">يتشرف <strong style="color: #1a3a2a;">${e(data.mosqueName)}</strong> بأن يشهد بأن</div>
        
        <div style="font-size: 36px; font-weight: 700; color: #1a3a2a; margin: 4mm 0; padding: 3mm 20mm; border-bottom: 2px solid #c9a84c; display: inline-block; font-family: 'Scheherazade New', 'Amiri', serif;">
          ${e(data.studentName)}
        </div>

        <div style="font-size: 15px; color: #444; margin-top: 4mm; line-height: 2;">
          ${data.certificateType === "graduation" 
            ? `قد أتمّ بتوفيق الله تعالى حفظ <strong>${data.totalJuz || 30} جزءاً</strong> من القرآن الكريم${data.recitationStyle ? ` برواية <strong>${recitationArabic(data.recitationStyle)}</strong>` : ""}` 
            : `قد أتمّ بنجاح متطلبات الدورة بتوفيق الله تعالى`}
        </div>
        ${gradeText ? `<div style="font-size: 16px; color: #1a3a2a; margin-top: 3mm;">بتقدير: <strong style="color: #c9a84c; font-size: 20px;">${gradeText}</strong></div>` : ""}
        ${data.ijazahTeacher ? `<div style="font-size: 13px; color: #666; margin-top: 2mm;">على يد الشيخ: <strong>${e(data.ijazahTeacher)}</strong></div>` : ""}
      </div>

      <div style="position: absolute; bottom: 18mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="text-align: center; min-width: 120px;">
          <div style="width: 60px; height: 60px; border: 1.5px solid #ddd; border-radius: 50%; margin: 0 auto 5px; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 10px;">الختم</div>
          <div style="font-size: 10px; color: #888;">ختم المركز</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 10px; color: #888;">${hijriDate}</div>
          <div style="font-size: 10px; color: #aaa;">${issuedDate}</div>
        </div>
        <div style="text-align: center; min-width: 120px;">
          <div style="width: 100px; border-bottom: 1px solid #999; margin: 0 auto 8px;"></div>
          <div style="font-size: 10px; color: #888;">${data.issuerName ? e(data.issuerName) : "توقيع المسؤول"}</div>
        </div>
      </div>
    </div>
  `);
}

function royalBlueTemplate(data: CertificateData, e: (s: string) => string, issuedDate: string, hijriDate: string, titleText: string): string {
  const gradeText = gradeArabic(data.grade);
  return wrapInPage(`
    <div class="cert-container" style="width: 297mm; height: 210mm; position: relative; background: linear-gradient(180deg, #f0f4ff 0%, #ffffff 40%, #f0f4ff 100%); overflow: hidden; font-family: 'Tajawal', sans-serif;">
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 18mm; background: linear-gradient(135deg, #1e3a5f 0%, #2c5aa0 50%, #1e3a5f 100%);"></div>
      <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 12mm; background: linear-gradient(135deg, #1e3a5f 0%, #2c5aa0 50%, #1e3a5f 100%);"></div>
      
      <div style="position: absolute; top: 18mm; left: 6mm; right: 6mm; bottom: 12mm; border: 2px solid #2c5aa0; border-radius: 4px;"></div>
      <div style="position: absolute; top: 20mm; left: 8mm; right: 8mm; bottom: 14mm; border: 1px solid rgba(44,90,160,0.3); border-radius: 2px;"></div>

      <div style="position: absolute; top: 4mm; left: 0; right: 0; text-align: center; color: #c9a84c; font-size: 16px; font-family: 'Scheherazade New', serif;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
      <div style="position: absolute; top: 17mm; right: 18mm; font-size: 9px; color: #999; z-index: 2;">${e(data.certificateNumber)}</div>

      <div style="text-align: center; padding-top: 28mm;">
        <div style="display: inline-block; background: linear-gradient(135deg, #1e3a5f, #2c5aa0); color: white; padding: 3mm 15mm; border-radius: 4px; font-size: 10px; letter-spacing: 2px; margin-bottom: 3mm;">شهادة تقدير</div>
        <div style="font-size: 28px; font-weight: 800; color: #1e3a5f; margin-bottom: 2mm;">${e(titleText)}</div>
        <div style="width: 80px; height: 3px; background: linear-gradient(90deg, #2c5aa0, #c9a84c, #2c5aa0); margin: 0 auto 4mm; border-radius: 2px;"></div>
        
        <div style="font-size: 14px; color: #555; margin-bottom: 3mm;">يتشرف <strong style="color: #1e3a5f;">${e(data.mosqueName)}</strong> بمنح هذه الشهادة إلى</div>
        <div style="font-size: 34px; font-weight: 700; color: #1e3a5f; margin: 4mm 0; font-family: 'Scheherazade New', 'Amiri', serif; border-bottom: 3px double #2c5aa0; display: inline-block; padding: 0 20mm 2mm;">
          ${e(data.studentName)}
        </div>

        <div style="font-size: 14px; color: #444; margin-top: 3mm; line-height: 2;">
          ${data.certificateType === "graduation"
            ? `وذلك لإتمامه حفظ <strong>${data.totalJuz || 30} جزءاً</strong> من القرآن الكريم${data.recitationStyle ? ` برواية <strong>${recitationArabic(data.recitationStyle)}</strong>` : ""}`
            : `وذلك لإتمامه متطلبات الدورة بنجاح`}
        </div>
        ${gradeText ? `<div style="font-size: 15px; margin-top: 2mm;"><span style="background: linear-gradient(135deg, #1e3a5f, #2c5aa0); color: white; padding: 2mm 8mm; border-radius: 20px; font-size: 14px;">${gradeText}</span></div>` : ""}
        ${data.ijazahTeacher ? `<div style="font-size: 12px; color: #666; margin-top: 2mm;">على يد الشيخ: <strong>${e(data.ijazahTeacher)}</strong></div>` : ""}
      </div>

      <div style="position: absolute; bottom: 18mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="text-align: center; min-width: 100px;">
          <div style="width: 55px; height: 55px; border: 1.5px solid #2c5aa0; border-radius: 50%; margin: 0 auto 5px; opacity: 0.4;"></div>
          <div style="font-size: 9px; color: #888;">ختم المركز</div>
        </div>
        <div style="text-align: center; font-size: 10px; color: #888;">${hijriDate}<br/><span style="color: #aaa;">${issuedDate}</span></div>
        <div style="text-align: center; min-width: 100px;">
          <div style="width: 90px; border-bottom: 1px solid #2c5aa0; margin: 0 auto 8px;"></div>
          <div style="font-size: 9px; color: #888;">${data.issuerName ? e(data.issuerName) : "توقيع المسؤول"}</div>
        </div>
      </div>
    </div>
  `);
}

function emeraldMosqueTemplate(data: CertificateData, e: (s: string) => string, issuedDate: string, hijriDate: string, titleText: string): string {
  const gradeText = gradeArabic(data.grade);
  return wrapInPage(`
    <div class="cert-container" style="width: 297mm; height: 210mm; position: relative; background: linear-gradient(180deg, #f0faf5 0%, #ffffff 50%, #f0faf5 100%); overflow: hidden; font-family: 'Amiri', serif;">
      <div style="position: absolute; inset: 6mm; border: 3px solid #0d6b4e; border-radius: 8px;"></div>
      <div style="position: absolute; inset: 9mm; border: 1px solid rgba(13,107,78,0.3);"></div>
      
      <div style="position: absolute; top: 6mm; left: 50%; transform: translateX(-50%); width: 80mm; text-align: center;">
        <svg width="60" height="45" viewBox="0 0 60 45" style="margin: 0 auto;">
          <path d="M30 5 C30 5, 20 15, 20 25 C20 35, 25 40, 30 42 C35 40, 40 35, 40 25 C40 15, 30 5, 30 5Z" fill="none" stroke="#0d6b4e" stroke-width="1.5" opacity="0.4"/>
          <path d="M30 0 L32 8 L30 6 L28 8Z" fill="#c9a84c" opacity="0.6"/>
          <line x1="15" y1="25" x2="45" y2="25" stroke="#0d6b4e" stroke-width="0.5" opacity="0.3"/>
        </svg>
      </div>

      <div style="position: absolute; top: 14mm; right: 16mm; font-size: 9px; color: #999;">${e(data.certificateNumber)}</div>

      <div style="text-align: center; padding-top: 26mm;">
        <div style="font-size: 15px; color: #0d6b4e; letter-spacing: 2px; margin-bottom: 3mm; font-family: 'Scheherazade New', serif;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size: 30px; font-weight: 700; color: #0d6b4e; margin-bottom: 1mm;">${e(titleText)}</div>
        <div style="width: 150px; height: 2px; background: linear-gradient(90deg, transparent, #0d6b4e, #c9a84c, #0d6b4e, transparent); margin: 0 auto 4mm;"></div>
        
        <div style="font-size: 13px; color: #555; margin-bottom: 2mm;">${e(data.mosqueName)}</div>
        <div style="font-size: 13px; color: #666; margin-bottom: 3mm;">يشهد بأن الطالب / الطالبة</div>
        
        <div style="font-size: 36px; font-weight: 700; color: #0d6b4e; margin: 3mm 0 4mm; font-family: 'Scheherazade New', serif; position: relative; display: inline-block; padding: 0 25mm;">
          ${e(data.studentName)}
          <div style="position: absolute; bottom: -2mm; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #c9a84c, transparent);"></div>
        </div>

        <div style="font-size: 14px; color: #444; margin-top: 4mm; line-height: 2.2;">
          ${data.certificateType === "graduation"
            ? `قد أتمّ بحمد الله وتوفيقه حفظ <strong style="color: #0d6b4e;">${data.totalJuz || 30} جزءاً</strong> من القرآن الكريم${data.recitationStyle ? `<br/>برواية <strong style="color: #0d6b4e;">${recitationArabic(data.recitationStyle)}</strong>` : ""}`
            : `قد أنهى بنجاح جميع متطلبات الدورة`}
        </div>
        ${gradeText ? `<div style="margin-top: 3mm; font-size: 16px;">بتقدير: <strong style="color: #0d6b4e; font-size: 20px;">${gradeText}</strong></div>` : ""}
        ${data.ijazahTeacher ? `<div style="font-size: 12px; color: #666; margin-top: 2mm;">الشيخ المجيز: <strong>${e(data.ijazahTeacher)}</strong></div>` : ""}
      </div>

      <div style="position: absolute; bottom: 16mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="text-align: center;"><div style="width: 55px; height: 55px; border: 1.5px solid #0d6b4e; border-radius: 50%; margin: 0 auto 5px; opacity: 0.3;"></div><div style="font-size: 9px; color: #888;">الختم</div></div>
        <div style="text-align: center; font-size: 10px; color: #888;">${hijriDate}<br/><span style="color: #aaa;">${issuedDate}</span></div>
        <div style="text-align: center;"><div style="width: 90px; border-bottom: 1px solid #0d6b4e; margin: 0 auto 8px;"></div><div style="font-size: 9px; color: #888;">${data.issuerName ? e(data.issuerName) : "التوقيع"}</div></div>
      </div>
    </div>
  `);
}

function kidsRainbowTemplate(data: CertificateData, e: (s: string) => string, issuedDate: string, hijriDate: string, titleText: string): string {
  const gradeText = gradeArabic(data.grade);
  return wrapInPage(`
    <div class="cert-container" style="width: 297mm; height: 210mm; position: relative; background: linear-gradient(135deg, #fff5f5 0%, #fff8e1 25%, #f0fff4 50%, #ebf8ff 75%, #faf5ff 100%); overflow: hidden; font-family: 'Tajawal', sans-serif;">
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 10mm; background: linear-gradient(90deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3, #54a0ff, #5f27cd); opacity: 0.7;"></div>
      <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 10mm; background: linear-gradient(90deg, #5f27cd, #54a0ff, #ff9ff3, #48dbfb, #feca57, #ff6b6b); opacity: 0.7;"></div>
      
      <div style="position: absolute; inset: 12mm; border: 3px dashed #feca57; border-radius: 20px;"></div>

      <div style="position: absolute; top: 12mm; left: 15mm; font-size: 30px;">⭐</div>
      <div style="position: absolute; top: 12mm; right: 15mm; font-size: 30px;">🌙</div>
      <div style="position: absolute; bottom: 14mm; left: 15mm; font-size: 28px;">🌟</div>
      <div style="position: absolute; bottom: 14mm; right: 15mm; font-size: 28px;">🎉</div>
      <div style="position: absolute; top: 50%; left: 12mm; font-size: 24px; transform: translateY(-50%);">📖</div>
      <div style="position: absolute; top: 50%; right: 12mm; font-size: 24px; transform: translateY(-50%);">🏆</div>

      <div style="text-align: center; padding-top: 20mm;">
        <div style="font-size: 13px; color: #8854d0; margin-bottom: 2mm;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size: 34px; font-weight: 800; background: linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1mm;">🎊 شهادة تميّز 🎊</div>
        <div style="font-size: 16px; color: #8854d0; font-weight: 700; margin-bottom: 4mm;">${e(titleText)}</div>
        
        <div style="font-size: 13px; color: #666; margin-bottom: 2mm;">${e(data.mosqueName)} يقدم هذه الشهادة إلى</div>
        
        <div style="display: inline-block; background: linear-gradient(135deg, #feca57, #ff9ff3); padding: 3mm 15mm; border-radius: 15px; margin: 3mm 0;">
          <div style="font-size: 32px; font-weight: 800; color: #2d3436;">${e(data.studentName)}</div>
        </div>

        <div style="font-size: 14px; color: #555; margin-top: 4mm; line-height: 2;">
          ${data.certificateType === "graduation"
            ? `لإتمامه حفظ <strong style="color: #e17055;">${data.totalJuz || 30} جزءاً</strong> من القرآن الكريم 🌟`
            : `لإتمامه الدورة بنجاح وتميّز! 🌟`}
        </div>
        ${gradeText ? `<div style="margin-top: 2mm;"><span style="background: linear-gradient(135deg, #48dbfb, #0abde3); color: white; padding: 2mm 10mm; border-radius: 20px; font-size: 16px; font-weight: 700;">${gradeText} ⭐</span></div>` : ""}
      </div>

      <div style="position: absolute; bottom: 18mm; left: 30mm; right: 30mm; display: flex; justify-content: space-between; align-items: flex-end; font-size: 10px; color: #888;">
        <div style="text-align: center;"><div style="font-size: 9px;">الختم</div></div>
        <div style="text-align: center;">${hijriDate}</div>
        <div style="text-align: center;">${data.issuerName ? e(data.issuerName) : "التوقيع"}</div>
      </div>
      <div style="position: absolute; top: 16mm; right: 20mm; font-size: 8px; color: #bbb;">${e(data.certificateNumber)}</div>
    </div>
  `);
}

function kidsStarsTemplate(data: CertificateData, e: (s: string) => string, issuedDate: string, hijriDate: string, titleText: string): string {
  const gradeText = gradeArabic(data.grade);
  return wrapInPage(`
    <div class="cert-container" style="width: 297mm; height: 210mm; position: relative; background: linear-gradient(180deg, #1a1a3e 0%, #16213e 30%, #0f3460 100%); overflow: hidden; font-family: 'Tajawal', sans-serif; color: white;">
      <div style="position: absolute; inset: 8mm; border: 2px solid rgba(201,168,76,0.4); border-radius: 12px;"></div>
      
      <div style="position: absolute; top: 15mm; left: 20mm; font-size: 14px; opacity: 0.5;">✨</div>
      <div style="position: absolute; top: 25mm; right: 30mm; font-size: 10px; opacity: 0.4;">⭐</div>
      <div style="position: absolute; top: 40mm; left: 40mm; font-size: 8px; opacity: 0.3;">✦</div>
      <div style="position: absolute; bottom: 30mm; right: 25mm; font-size: 12px; opacity: 0.4;">🌙</div>
      <div style="position: absolute; bottom: 50mm; left: 25mm; font-size: 10px; opacity: 0.3;">⭐</div>
      <div style="position: absolute; top: 30mm; left: 60mm; font-size: 6px; opacity: 0.2;">✦</div>
      <div style="position: absolute; bottom: 40mm; right: 60mm; font-size: 8px; opacity: 0.25;">✨</div>

      <div style="text-align: center; padding-top: 22mm;">
        <div style="font-size: 22px; margin-bottom: 2mm;">🌙</div>
        <div style="font-size: 13px; color: #c9a84c; letter-spacing: 2px; margin-bottom: 3mm;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size: 30px; font-weight: 700; color: #c9a84c; margin-bottom: 1mm; font-family: 'Scheherazade New', serif;">شهادة نجم من نجوم القرآن</div>
        <div style="font-size: 14px; color: rgba(255,255,255,0.6); margin-bottom: 3mm;">${e(titleText)}</div>
        
        <div style="font-size: 12px; color: rgba(255,255,255,0.7); margin-bottom: 2mm;">${e(data.mosqueName)}</div>
        
        <div style="font-size: 36px; font-weight: 800; color: white; margin: 4mm 0; text-shadow: 0 0 20px rgba(201,168,76,0.3);">
          ⭐ ${e(data.studentName)} ⭐
        </div>

        <div style="font-size: 14px; color: rgba(255,255,255,0.8); margin-top: 3mm; line-height: 2;">
          ${data.certificateType === "graduation"
            ? `أتمّ حفظ <strong style="color: #c9a84c;">${data.totalJuz || 30} جزءاً</strong> من القرآن الكريم`
            : `أتمّ الدورة بنجاح وتميّز`}
        </div>
        ${gradeText ? `<div style="margin-top: 3mm;"><span style="background: rgba(201,168,76,0.2); border: 1px solid #c9a84c; color: #c9a84c; padding: 2mm 10mm; border-radius: 20px; font-size: 16px;">${gradeText}</span></div>` : ""}
      </div>

      <div style="position: absolute; bottom: 16mm; left: 25mm; right: 25mm; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="text-align: center; font-size: 9px; color: rgba(255,255,255,0.5);">الختم</div>
        <div style="text-align: center; font-size: 9px; color: rgba(255,255,255,0.5);">${hijriDate}</div>
        <div style="text-align: center; font-size: 9px; color: rgba(255,255,255,0.5);">${data.issuerName ? e(data.issuerName) : "التوقيع"}</div>
      </div>
      <div style="position: absolute; top: 13mm; right: 16mm; font-size: 8px; color: rgba(255,255,255,0.3);">${e(data.certificateNumber)}</div>
    </div>
  `);
}

function youthModernTemplate(data: CertificateData, e: (s: string) => string, issuedDate: string, hijriDate: string, titleText: string): string {
  const gradeText = gradeArabic(data.grade);
  return wrapInPage(`
    <div class="cert-container" style="width: 297mm; height: 210mm; position: relative; background: #ffffff; overflow: hidden; font-family: 'Tajawal', sans-serif;">
      <div style="position: absolute; top: 0; right: 0; width: 120mm; height: 100%; background: linear-gradient(180deg, #667eea 0%, #764ba2 100%); clip-path: polygon(30% 0, 100% 0, 100% 100%, 0% 100%);"></div>
      <div style="position: absolute; top: 0; right: 0; width: 120mm; height: 100%; background: linear-gradient(180deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%); clip-path: polygon(28% 0, 98% 0, 98% 100%, 0% 100%);"></div>
      
      <div style="position: absolute; top: 15mm; left: 15mm; right: 130mm;">
        <div style="font-size: 12px; color: #667eea; letter-spacing: 3px; margin-bottom: 5mm;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size: 10px; color: #999; margin-bottom: 3mm;">${e(data.certificateNumber)}</div>
        <div style="font-size: 28px; font-weight: 800; color: #2d3436; margin-bottom: 3mm; line-height: 1.3;">${e(titleText)}</div>
        <div style="width: 60px; height: 4px; background: linear-gradient(90deg, #667eea, #764ba2); border-radius: 2px; margin-bottom: 5mm;"></div>
        <div style="font-size: 12px; color: #636e72; margin-bottom: 2mm;">${e(data.mosqueName)}</div>
        <div style="font-size: 12px; color: #636e72; margin-bottom: 5mm;">يشهد بأن</div>
        
        <div style="font-size: 30px; font-weight: 800; color: #2d3436; margin-bottom: 4mm;">${e(data.studentName)}</div>
        
        <div style="font-size: 13px; color: #636e72; line-height: 2; margin-bottom: 3mm;">
          ${data.certificateType === "graduation"
            ? `أتمّ حفظ <strong style="color: #667eea;">${data.totalJuz || 30} جزءاً</strong> من القرآن الكريم${data.recitationStyle ? ` برواية <strong>${recitationArabic(data.recitationStyle)}</strong>` : ""}`
            : `أتمّ متطلبات الدورة بنجاح`}
        </div>
        ${gradeText ? `<div style="display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 2mm 8mm; border-radius: 6px; font-size: 14px; font-weight: 700;">${gradeText}</div>` : ""}
      </div>

      <div style="position: absolute; top: 50%; right: 30mm; transform: translateY(-50%); text-align: center; color: white;">
        <div style="font-size: 60px; margin-bottom: 3mm;">🎓</div>
        <div style="font-size: 14px; font-weight: 300; opacity: 0.9;">شهادة</div>
        <div style="font-size: 18px; font-weight: 700;">إنجاز</div>
      </div>

      <div style="position: absolute; bottom: 15mm; left: 15mm; right: 130mm; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #999;">
        <div><div style="width: 80px; border-bottom: 1px solid #ddd; margin-bottom: 4px;"></div>${data.issuerName ? e(data.issuerName) : "التوقيع"}</div>
        <div>${hijriDate}</div>
      </div>
    </div>
  `);
}

function calligraphyTemplate(data: CertificateData, e: (s: string) => string, issuedDate: string, hijriDate: string, titleText: string): string {
  const gradeText = gradeArabic(data.grade);
  return wrapInPage(`
    <div class="cert-container" style="width: 297mm; height: 210mm; position: relative; background: #faf8f0; overflow: hidden; font-family: 'Scheherazade New', 'Amiri', serif;">
      <div style="position: absolute; inset: 6mm; border: 4px double #8B7355;"></div>
      <div style="position: absolute; inset: 10mm; border: 1px solid rgba(139,115,85,0.3);"></div>
      
      <div style="position: absolute; top: 6mm; left: 50%; transform: translateX(-50%);">
        <svg width="100" height="30" viewBox="0 0 100 30"><path d="M0 15 Q25 0, 50 15 Q75 30, 100 15" fill="none" stroke="#8B7355" stroke-width="1.5" opacity="0.5"/><path d="M0 15 Q25 30, 50 15 Q75 0, 100 15" fill="none" stroke="#8B7355" stroke-width="1.5" opacity="0.5"/></svg>
      </div>

      <div style="position: absolute; top: 14mm; right: 16mm; font-size: 8px; color: #bbb;">${e(data.certificateNumber)}</div>

      <div style="text-align: center; padding-top: 20mm;">
        <div style="font-size: 20px; color: #8B7355; margin-bottom: 4mm; letter-spacing: 2px;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size: 14px; color: #999; margin-bottom: 1mm;">﴿ وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ ﴾</div>
        
        <div style="font-size: 36px; font-weight: 700; color: #4a3728; margin: 5mm 0 2mm;">${e(titleText)}</div>
        <div style="width: 200px; height: 1px; background: linear-gradient(90deg, transparent, #8B7355, transparent); margin: 0 auto 3mm;"></div>
        
        <div style="font-size: 14px; color: #666; margin-bottom: 2mm;">${e(data.mosqueName)}</div>
        <div style="font-size: 13px; color: #888; margin-bottom: 4mm;">يزفّ البشرى بأن</div>
        
        <div style="font-size: 42px; font-weight: 700; color: #4a3728; margin: 3mm 0; letter-spacing: 2px;">
          ${e(data.studentName)}
        </div>
        <div style="width: 250px; height: 2px; background: linear-gradient(90deg, transparent, #c9a84c, #8B7355, #c9a84c, transparent); margin: 0 auto 4mm;"></div>

        <div style="font-size: 16px; color: #555; line-height: 2.2; max-width: 500px; margin: 0 auto;">
          ${data.certificateType === "graduation"
            ? `قد منّ الله عليه بإتمام حفظ <strong style="color: #4a3728;">${data.totalJuz || 30} جزءاً</strong> من كتاب الله العزيز${data.recitationStyle ? `<br/>برواية <strong style="color: #4a3728;">${recitationArabic(data.recitationStyle)}</strong>` : ""}`
            : `قد وفّقه الله لإتمام الدورة على أكمل وجه`}
        </div>
        ${gradeText ? `<div style="font-size: 18px; color: #4a3728; margin-top: 3mm;">التقدير: <strong style="font-size: 22px; color: #8B7355;">${gradeText}</strong></div>` : ""}
        ${data.ijazahTeacher ? `<div style="font-size: 13px; color: #888; margin-top: 2mm;">بإشراف وتعليم الشيخ: <strong style="color: #4a3728;">${e(data.ijazahTeacher)}</strong></div>` : ""}
      </div>

      <div style="position: absolute; bottom: 15mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="text-align: center;"><div style="width: 55px; height: 55px; border: 1px solid #ccc; border-radius: 50%; margin: 0 auto 5px; opacity: 0.4;"></div><div style="font-size: 9px; color: #aaa;">الختم</div></div>
        <div style="text-align: center; font-size: 10px; color: #999;">${hijriDate}<br/><span style="font-size: 9px; color: #bbb;">${issuedDate}</span></div>
        <div style="text-align: center;"><div style="width: 90px; border-bottom: 1px solid #8B7355; margin: 0 auto 8px;"></div><div style="font-size: 9px; color: #aaa;">${data.issuerName ? e(data.issuerName) : "التوقيع"}</div></div>
      </div>
    </div>
  `);
}

function teacherHonorTemplate(data: CertificateData, e: (s: string) => string, issuedDate: string, hijriDate: string, titleText: string): string {
  const gradeText = gradeArabic(data.grade);
  return wrapInPage(`
    <div class="cert-container" style="width: 297mm; height: 210mm; position: relative; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); overflow: hidden; font-family: 'Amiri', serif; color: #e8d5b7;">
      <div style="position: absolute; inset: 8mm; border: 2px solid #c9a84c;"></div>
      <div style="position: absolute; inset: 10mm; border: 1px solid rgba(201,168,76,0.3);"></div>
      
      <div style="position: absolute; top: 8mm; left: 50%; transform: translateX(-50%);">
        <svg width="120" height="20" viewBox="0 0 120 20"><path d="M0 10 L20 10 L30 2 L40 10 L50 10 L60 5 L70 10 L80 10 L90 2 L100 10 L120 10" fill="none" stroke="#c9a84c" stroke-width="1" opacity="0.5"/></svg>
      </div>
      <div style="position: absolute; bottom: 8mm; left: 50%; transform: translateX(-50%) rotate(180deg);">
        <svg width="120" height="20" viewBox="0 0 120 20"><path d="M0 10 L20 10 L30 2 L40 10 L50 10 L60 5 L70 10 L80 10 L90 2 L100 10 L120 10" fill="none" stroke="#c9a84c" stroke-width="1" opacity="0.5"/></svg>
      </div>

      <div style="position: absolute; top: 14mm; right: 16mm; font-size: 8px; color: rgba(201,168,76,0.4);">${e(data.certificateNumber)}</div>

      <div style="text-align: center; padding-top: 20mm;">
        <div style="font-size: 14px; color: #c9a84c; letter-spacing: 3px; margin-bottom: 3mm;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
        <div style="font-size: 12px; color: rgba(232,213,183,0.5); margin-bottom: 3mm;">﴿ وَقُلْ رَبِّ زِدْنِي عِلْمًا ﴾</div>
        
        <div style="font-size: 32px; font-weight: 700; color: #c9a84c; margin-bottom: 2mm; font-family: 'Scheherazade New', serif;">${e(titleText)}</div>
        <div style="width: 100px; height: 2px; background: linear-gradient(90deg, transparent, #c9a84c, transparent); margin: 0 auto 4mm;"></div>
        
        <div style="font-size: 12px; color: rgba(232,213,183,0.6); margin-bottom: 2mm;">${e(data.mosqueName)}</div>
        <div style="font-size: 13px; color: rgba(232,213,183,0.7); margin-bottom: 3mm;">يتقدم بخالص الشكر والتقدير إلى</div>
        
        <div style="font-size: 38px; font-weight: 700; color: #c9a84c; margin: 4mm 0; font-family: 'Scheherazade New', serif; text-shadow: 0 0 30px rgba(201,168,76,0.2);">
          ${e(data.studentName)}
        </div>
        <div style="width: 200px; height: 1px; background: linear-gradient(90deg, transparent, #c9a84c, transparent); margin: 0 auto 4mm;"></div>

        <div style="font-size: 14px; color: rgba(232,213,183,0.8); line-height: 2; max-width: 500px; margin: 0 auto;">
          ${data.certificateType === "graduation"
            ? `تقديراً لجهوده في حفظ <strong style="color: #c9a84c;">${data.totalJuz || 30} جزءاً</strong> من كتاب الله${data.recitationStyle ? ` برواية <strong style="color: #c9a84c;">${recitationArabic(data.recitationStyle)}</strong>` : ""}`
            : `تقديراً لإسهامه المتميز في إتمام متطلبات الدورة`}
        </div>
        ${gradeText ? `<div style="margin-top: 3mm;"><span style="border: 1px solid #c9a84c; color: #c9a84c; padding: 2mm 12mm; font-size: 16px;">${gradeText}</span></div>` : ""}
      </div>

      <div style="position: absolute; bottom: 16mm; left: 22mm; right: 22mm; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="text-align: center;"><div style="width: 55px; height: 55px; border: 1px solid rgba(201,168,76,0.3); border-radius: 50%; margin: 0 auto 5px;"></div><div style="font-size: 9px; color: rgba(201,168,76,0.4);">الختم</div></div>
        <div style="text-align: center; font-size: 10px; color: rgba(201,168,76,0.5);">${hijriDate}<br/><span style="font-size: 9px;">${issuedDate}</span></div>
        <div style="text-align: center;"><div style="width: 90px; border-bottom: 1px solid rgba(201,168,76,0.5); margin: 0 auto 8px;"></div><div style="font-size: 9px; color: rgba(201,168,76,0.4);">${data.issuerName ? e(data.issuerName) : "التوقيع"}</div></div>
      </div>
    </div>
  `);
}

export function printCertificate(data: CertificateData, templateId: string): void {
  const html = generateCertificateHtmlByTemplate(data, templateId);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

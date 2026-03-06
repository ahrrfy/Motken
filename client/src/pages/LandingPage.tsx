import { useState } from "react";
import { BookOpen, Users, BarChart3, Shield, Star, MessageCircle, ChevronDown, ChevronUp, Smartphone, CheckCircle2, Globe, Heart, ArrowLeft } from "lucide-react";

const features = [
  { icon: BookOpen, title: "تتبع الحفظ آية بآية", desc: "تابع تقدم كل طالب في حفظ القرآن الكريم بدقة عالية مع تقارير مفصلة" },
  { icon: Users, title: "إدارة الحلقات والطلاب", desc: "أدر حلقاتك وطلابك بسهولة — الحضور والغياب والواجبات والدرجات" },
  { icon: BarChart3, title: "تقارير لأولياء الأمور", desc: "أرسل تقارير دورية لأولياء الأمور بضغطة واحدة عبر واتساب" },
  { icon: Shield, title: "حماية وخصوصية", desc: "بيانات كل مسجد معزولة تماماً — لا يمكن لأحد الاطلاع على بيانات غيره" },
  { icon: Star, title: "نقاط وشارات تحفيزية", desc: "حفّز طلابك بنظام نقاط وشارات تلقائية عند إتمام الحفظ والمراجعة" },
  { icon: Smartphone, title: "يعمل على الجوال", desc: "لا تحتاج تطبيق — يعمل مباشرة من المتصفح على أي جهاز" },
];

const faqs = [
  { q: "هل النظام مجاني؟", a: "نعم، النظام وقف لله تعالى ومجاني بالكامل بدون أي رسوم أو اشتراكات." },
  { q: "هل أحتاج خبرة تقنية؟", a: "لا أبداً، النظام مصمم ليكون سهل الاستخدام لأي شخص. إذا تستخدم واتساب، تقدر تستخدم مُتْقِن." },
  { q: "كيف أسجّل مسجدي/مركزي؟", a: "اضغط على 'سجّل مسجدك/مركزك' واملأ النموذج البسيط وسيتم تفعيل حسابك." },
  { q: "هل يعمل على الجوال؟", a: "نعم، يعمل على أي جهاز — جوال، تابلت، أو كمبيوتر — بدون تحميل أي تطبيق." },
  { q: "هل بيانات مسجدنا آمنة؟", a: "بالتأكيد. بيانات كل مسجد معزولة تماماً ومشفرة. لا يمكن لأي مسجد آخر الاطلاع عليها." },
  { q: "كم عدد الطلاب المسموح؟", a: "لا يوجد حد أقصى. يمكنك إضافة عدد غير محدود من الطلاب والمعلمين." },
];

const steps = [
  { num: "١", title: "سجّل مسجدك/مركزك", desc: "املأ نموذج بسيط باسم المسجد/المركز واسمك ورقم هاتفك" },
  { num: "٢", title: "أضف طلابك", desc: "أضف أسماء الطلاب والمعلمين بسهولة من لوحة التحكم" },
  { num: "٣", title: "تابع التقدم", desc: "تابع حفظ كل طالب وأرسل التقارير لأولياء الأمور" },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const ref = new URLSearchParams(window.location.search).get("ref");

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="مُتْقِن" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg text-[#16213e] font-serif">مُتْقِن</span>
          </div>
          <div className="flex items-center gap-2">
            <a href="/welcome" className="text-sm text-gray-600 hover:text-emerald-700 px-3 py-1.5" data-testid="link-home">الرئيسية</a>
            <a href="/login" className="text-sm text-gray-600 hover:text-emerald-700 px-3 py-1.5" data-testid="link-login">دخول</a>
            <a href="#register" className="text-sm bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors" data-testid="link-register-top">ابدأ مجاناً</a>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-gradient-to-b from-[#0f3460] via-[#16213e] to-[#1a1a2e] text-white">
        <div className="absolute inset-0 opacity-[0.05]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M30 0L60 30L30 60L0 30Z" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="30" cy="30" r="10" fill="none" stroke="white" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-pattern)" />
          </svg>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 border border-white/20">
            <Heart className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-200">وقف لله تعالى — مجاني بالكامل</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold font-serif leading-tight mb-6" data-testid="text-hero-title">
            تابع طلابك في حفظ القرآن
            <br />
            <span className="text-emerald-400">بسهولة تامة</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            نظام مُتْقِن يساعدك في إدارة حلقات تحفيظ القرآن الكريم
            <br className="hidden sm:block" />
            بدون تعقيد — يعمل على الجوال مباشرة
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="#register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-emerald-600/30"
              data-testid="link-register-hero"
            >
              سجّل مسجدك/مركزك مجاناً
              <ArrowLeft className="w-5 h-5" />
            </a>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3.5 rounded-xl font-semibold transition-colors border border-white/20"
              data-testid="link-features"
            >
              تعرّف على المميزات
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#16213e] font-serif" data-testid="text-features-title">كل ما تحتاجه لإدارة حلقتك</h2>
            <p className="text-gray-500 mt-3 text-lg">أدوات بسيطة وفعّالة لخدمة كتاب الله</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all" data-testid={`card-feature-${i}`}>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-emerald-700" />
                </div>
                <h3 className="text-lg font-bold text-[#16213e] mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#16213e] font-serif">ابدأ في ٣ خطوات فقط</h2>
            <p className="text-gray-500 mt-3 text-lg">بسيط وسريع — لا تحتاج أي خبرة تقنية</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {steps.map((s, i) => (
              <div key={i} className="text-center" data-testid={`step-${i}`}>
                <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg shadow-emerald-600/20">
                  {s.num}
                </div>
                <h3 className="text-lg font-bold text-[#16213e] mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-16 sm:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#16213e] font-serif" data-testid="text-faq-title">أسئلة شائعة</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="border border-gray-200 rounded-xl overflow-hidden" data-testid={`faq-${i}`}>
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-right hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  data-testid={`btn-faq-${i}`}
                >
                  <span className="font-semibold text-[#16213e]">{f.q}</span>
                  {openFaq === i ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-gray-600 text-sm leading-relaxed border-t border-gray-100 pt-3">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="register" className="py-16 sm:py-20 bg-gradient-to-b from-[#0f3460] to-[#16213e] text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold font-serif mb-4" data-testid="text-register-title">سجّل مسجدك/مركزك الآن</h2>
          <p className="text-gray-300 mb-8 text-lg">مجاني بالكامل — ابدأ بإدارة حلقتك خلال دقائق</p>
          <a
            href={`/register-mosque${ref ? `?ref=${ref}` : ""}`}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg shadow-emerald-600/30"
            data-testid="link-register-mosque"
          >
            <CheckCircle2 className="w-6 h-6" />
            سجّل مسجدك/مركزك مجاناً
          </a>
          <p className="text-gray-400 text-sm mt-6">لديك حساب بالفعل؟ <a href="/login" className="text-emerald-400 hover:underline" data-testid="link-login-bottom">سجّل دخولك</a></p>
        </div>
      </section>

      <section className="py-10 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-gray-400 text-sm mb-2">شارك النظام مع مساجد أخرى</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                const url = `${window.location.origin}/welcome`;
                const text = `السلام عليكم 🕌\n\nاكتشفت نظام *مُتْقِن* لإدارة حلقات القرآن الكريم — مجاني تماماً ووقف لله تعالى.\n\n✅ تتبع الحفظ آية بآية\n✅ تقارير لأولياء الأمور\n✅ يعمل على الجوال\n\n🔗 ${url}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
              }}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              data-testid="btn-share-whatsapp"
            >
              <MessageCircle className="w-4 h-4" />
              شارك عبر واتساب
            </button>
            <button
              onClick={() => {
                const url = `${window.location.origin}/welcome`;
                navigator.clipboard?.writeText(url);
              }}
              className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              data-testid="btn-copy-link"
            >
              <Globe className="w-4 h-4" />
              نسخ الرابط
            </button>
          </div>
        </div>
      </section>

      <footer className="py-6 bg-[#16213e] text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo.png" alt="مُتْقِن" className="w-6 h-6 rounded" />
            <span className="text-white font-serif font-bold">مُتْقِن</span>
          </div>
          <p className="text-gray-400 text-sm">وقف لله تعالى — لإدارة حلقات القرآن الكريم</p>
          <p className="text-gray-500 text-xs mt-2">© {new Date().getFullYear()} جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}

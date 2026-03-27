import { useState, useEffect, useRef } from "react";
import {
  BookOpen, Users, BarChart3, Shield, Star, MessageCircle, ChevronDown, ChevronUp,
  Smartphone, CheckCircle2, Globe, Heart, ArrowLeft, Mic, Award, BookMarked,
  Trophy, Bell, Calendar, Zap, XCircle, Sparkles, Quote
} from "lucide-react";

const features = [
  { icon: BookOpen, title: "تتبع الحفظ آية بآية", desc: "تابع تقدم كل طالب في حفظ القرآن الكريم بدقة عالية مع شجرة حفظ مرئية", color: "emerald" },
  { icon: Users, title: "إدارة الحلقات والطلاب", desc: "أدر حلقاتك وطلابك بسهولة — الحضور والغياب والواجبات والدرجات", color: "blue" },
  { icon: Mic, title: "التسميع الصوتي", desc: "يسجّل الطالب تلاوته صوتياً ويستمع المعلم ويقيّم — مع تحكم بسرعة التشغيل", color: "violet", isNew: true },
  { icon: BarChart3, title: "تقارير لأولياء الأمور", desc: "أرسل تقارير دورية لأولياء الأمور بضغطة واحدة عبر واتساب", color: "amber" },
  { icon: Award, title: "شهادات احترافية", desc: "٨ قوالب شهادات إسلامية فاخرة — تُصدر تلقائياً عند التخرج وتُطبع مباشرة", color: "yellow", isNew: true },
  { icon: Shield, title: "حماية وخصوصية", desc: "بيانات كل مسجد معزولة تماماً ومشفرة — لا يمكن لأحد الاطلاع على بيانات غيره", color: "red" },
  { icon: Star, title: "نقاط وشارات تحفيزية", desc: "حفّز طلابك بنظام نقاط وشارات تلقائية عند إتمام الحفظ والمراجعة", color: "orange" },
  { icon: Trophy, title: "مسابقات قرآنية", desc: "نظّم مسابقات بين الطلاب مع لوحة متصدرين ونتائج مباشرة", color: "indigo" },
  { icon: BookMarked, title: "المكتبة الإسلامية", desc: "مكتبة إسلامية مدمجة فيها أكثر من ٥٠ كتاباً — تعمل بدون إنترنت", color: "teal" },
  { icon: Calendar, title: "جدول الحلقات", desc: "جدول أسبوعي مرئي مع كشف التعارضات وطباعة الجدول", color: "cyan" },
  { icon: Bell, title: "تنبيهات ذكية", desc: "تنبيهات تلقائية للغياب المتكرر وانخفاض الأداء مع إجراء سريع", color: "pink" },
  { icon: Smartphone, title: "يعمل على الجوال", desc: "لا تحتاج تطبيق — يعمل مباشرة من المتصفح على أي جهاز", color: "slate" },
];

const featureColorMap: Record<string, { bg: string; text: string }> = {
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700" },
  blue: { bg: "bg-blue-100", text: "text-blue-700" },
  violet: { bg: "bg-violet-100", text: "text-violet-700" },
  amber: { bg: "bg-amber-100", text: "text-amber-700" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-700" },
  red: { bg: "bg-red-100", text: "text-red-700" },
  orange: { bg: "bg-orange-100", text: "text-orange-700" },
  indigo: { bg: "bg-indigo-100", text: "text-indigo-700" },
  teal: { bg: "bg-teal-100", text: "text-teal-700" },
  cyan: { bg: "bg-cyan-100", text: "text-cyan-700" },
  pink: { bg: "bg-pink-100", text: "text-pink-700" },
  slate: { bg: "bg-slate-100", text: "text-slate-700" },
};

const faqs = [
  { q: "هل النظام مجاني؟", a: "نعم، النظام وقف لله تعالى ومجاني بالكامل بدون أي رسوم أو اشتراكات — الآن ودائماً بإذن الله." },
  { q: "هل أحتاج خبرة تقنية؟", a: "لا أبداً، النظام مصمم ليكون سهل الاستخدام لأي شخص. إذا تستخدم واتساب، تقدر تستخدم مُتْقِن." },
  { q: "كيف أسجّل مسجدي/مركزي؟", a: "اضغط على 'سجّل مسجدك/مركزك' واملأ النموذج البسيط وسيتم تفعيل حسابك خلال دقائق." },
  { q: "هل يعمل على الجوال؟", a: "نعم، يعمل على أي جهاز — جوال، تابلت، أو كمبيوتر — بدون تحميل أي تطبيق." },
  { q: "هل بيانات مسجدنا آمنة؟", a: "بالتأكيد. بيانات كل مسجد معزولة تماماً ومشفرة. لا يمكن لأي مسجد آخر الاطلاع عليها." },
  { q: "كم عدد الطلاب المسموح؟", a: "لا يوجد حد أقصى. يمكنك إضافة عدد غير محدود من الطلاب والمعلمين والحلقات." },
  { q: "هل يدعم أكثر من معلم في المسجد الواحد؟", a: "نعم، يمكنك إضافة عدد غير محدود من المعلمين مع تحديد المستويات التي يُشرف عليها كل معلم." },
  { q: "هل يوجد تطبيق جوال؟", a: "النظام مصمم كتطبيق ويب متجاوب يعمل على الجوال كأنه تطبيق أصلي — يمكنك إضافته للشاشة الرئيسية." },
];

const steps = [
  { num: "١", title: "سجّل مسجدك/مركزك", desc: "املأ نموذج بسيط باسم المسجد واسمك ورقم هاتفك — خلال دقيقة واحدة" },
  { num: "٢", title: "أضف المعلمين والطلاب", desc: "أضف فريقك بسهولة أو استورد القائمة من ملف Excel جاهز" },
  { num: "٣", title: "تابع التقدم", desc: "تابع حفظ كل طالب وأرسل التقارير لأولياء الأمور وأصدر الشهادات" },
];

const defaultTestimonials = [
  { name: "أبو عبدالرحمن", role: "مشرف حلقات — الأنبار", text: "النظام وفّر علينا ساعات من العمل اليدوي. أصبحنا نتابع ٦ حلقات و٩٠ طالباً من مكان واحد.", rating: 5 },
  { name: "الشيخ ياسين", role: "معلم قرآن — الموصل", text: "ميزة التسميع الصوتي ممتازة — الطالب يسجّل من البيت وأنا أقيّم في وقتي. سهّلت العمل كثيراً.", rating: 5 },
  { name: "أم أحمد", role: "ولية أمر — الفلوجة", text: "أتابع تقدم ابني في الحفظ أولاً بأول. التقارير واضحة وتصلني عبر واتساب. جزاكم الله خيراً.", rating: 5 },
  { name: "أبو مصطفى", role: "مدير مركز تحفيظ — سامراء", text: "جرّبنا عدة أنظمة قبلها كلها معقدة أو مدفوعة. مُتْقِن سهل ومجاني والدعم سريع.", rating: 5 },
];

const whyUs = [
  { icon: Heart, title: "وقف لله تعالى", desc: "مجاني بالكامل — بدون رسوم أو اشتراكات أو إعلانات" },
  { icon: Zap, title: "سهل وسريع", desc: "لا تحتاج خبرة تقنية — ابدأ خلال دقائق معدودة" },
  { icon: XCircle, title: "بدون تطبيق", desc: "يعمل من المتصفح مباشرة — لا تحميل ولا تحديثات" },
  { icon: Shield, title: "خصوصية تامة", desc: "بيانات كل مسجد معزولة ومشفرة بالكامل" },
  { icon: Sparkles, title: "تحديثات مستمرة", desc: "ميزات جديدة تُضاف باستمرار بناءً على طلبات المستخدمين" },
  { icon: Globe, title: "يعمل عالمياً", desc: "مصمم ليعمل لأي مسجد أو مركز في أي دولة" },
];

const latestUpdates = [
  { title: "التسميع الصوتي", desc: "يسجّل الطالب تلاوته صوتياً والمعلم يستمع ويقيّم مع تحكم بالسرعة", icon: Mic, color: "violet" },
  { title: "شهادات التخرج", desc: "٨ قوالب شهادات إسلامية فاخرة تُصدر تلقائياً عند إتمام الحفظ", icon: Award, color: "yellow" },
  { title: "تقارير أولياء الأمور", desc: "تقارير محسّنة مع رسوم بيانية ومقارنة بمتوسط المسجد", icon: BarChart3, color: "blue" },
  { title: "التنبيهات الذكية", desc: "اكتشاف أنماط الغياب وإجراءات سريعة بضغطة واحدة", icon: Bell, color: "pink" },
];

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const duration = 2000;
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCurrent(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="text-3xl sm:text-4xl font-bold text-white font-mono tabular-nums" dir="ltr" data-testid="animated-counter">
      {suffix}{current.toLocaleString("ar-SA")}
    </div>
  );
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [stats, setStats] = useState({ mosques: 0, students: 0, teachers: 0, completedAssignments: 0 });
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [testimonials, setTestimonials] = useState(defaultTestimonials);

  const refParam = new URLSearchParams(window.location.search).get("ref");

  useEffect(() => {
    fetch("/api/public-stats").then(r => r.json()).then(setStats).catch(() => {});
    fetch("/api/public-testimonials").then(r => r.json()).then((data: any[]) => {
      if (data && data.length > 0) setTestimonials(data);
    }).catch(() => {});
  }, []);

  const visibleFeatures = showAllFeatures ? features : features.slice(0, 6);

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="مُتْقِن" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg text-[#16213e] font-serif">مُتْقِن</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#features" className="hidden sm:inline text-sm text-gray-600 hover:text-emerald-700 px-3 py-1.5" data-testid="link-nav-features">المميزات</a>
            <a href="#testimonials" className="hidden sm:inline text-sm text-gray-600 hover:text-emerald-700 px-3 py-1.5" data-testid="link-nav-testimonials">آراء المستخدمين</a>
            <a href="/login" className="text-sm bg-red-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors" data-testid="link-login">دخول</a>
            <a href="#register" className="text-sm bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors" data-testid="link-register-top">ابدأ مجاناً</a>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden bg-gradient-to-b from-[#0f3460] via-[#16213e] to-[#1a1a2e] text-white">
        <div className="absolute inset-0 opacity-[0.04]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M40 0L80 40L40 80L0 40Z" fill="none" stroke="white" strokeWidth="0.5" />
                <circle cx="40" cy="40" r="15" fill="none" stroke="white" strokeWidth="0.3" />
                <circle cx="40" cy="40" r="5" fill="none" stroke="white" strokeWidth="0.2" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-pattern)" />
          </svg>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-10 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 border border-white/20 animate-pulse">
            <Heart className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-200">وقف لله تعالى — مجاني بالكامل</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold font-serif leading-tight mb-6" data-testid="text-hero-title">
            أدِر حلقات القرآن الكريم
            <br />
            <span className="bg-gradient-to-l from-emerald-300 to-emerald-500 bg-clip-text text-transparent">بسهولة واحترافية</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
            نظام مُتْقِن — الحل الشامل لإدارة حلقات تحفيظ القرآن الكريم
            <br className="hidden sm:block" />
            للمساجد والمراكز حول العالم — يعمل على الجوال مباشرة
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <a
              href="#register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-[1.02]"
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

        {(stats.mosques + stats.students + stats.teachers + stats.completedAssignments) >= 10 && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 relative z-10">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
              {[
                { label: "مسجد ومركز", value: stats.mosques, icon: "🕌" },
                { label: "طالب وطالبة", value: stats.students, icon: "👨‍🎓" },
                { label: "معلم ومعلمة", value: stats.teachers, icon: "👨‍🏫" },
                { label: "تسميع مكتمل", value: stats.completedAssignments, icon: "✅" },
              ].map((s, i) => (
                <div key={i} className="text-center bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10" data-testid={`stat-card-${i}`}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <AnimatedCounter target={s.value} suffix="+" />
                  <p className="text-xs sm:text-sm text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section id="updates" className="py-14 sm:py-16 bg-gradient-to-b from-emerald-50/80 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 mb-4 text-sm font-semibold">
              <Sparkles className="w-4 h-4" />
              جديد
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#16213e] font-serif" data-testid="text-updates-title">آخر التحديثات</h2>
            <p className="text-gray-500 mt-2">نطوّر النظام باستمرار بناءً على احتياجاتكم</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {latestUpdates.map((u, i) => {
              const colors = featureColorMap[u.color] || featureColorMap.emerald;
              return (
                <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5" data-testid={`update-card-${i}`}>
                  <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center mb-3`}>
                    <u.icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <h3 className="font-bold text-[#16213e] mb-1.5">{u.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{u.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#16213e] font-serif" data-testid="text-features-title">كل ما تحتاجه لإدارة حلقتك</h2>
            <p className="text-gray-500 mt-3 text-lg">أكثر من ١٢ أداة متكاملة لخدمة كتاب الله</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleFeatures.map((f, i) => {
              const colors = featureColorMap[f.color] || featureColorMap.emerald;
              return (
                <div key={i} className="relative bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all group" data-testid={`card-feature-${i}`}>
                  {f.isNew && (
                    <span className="absolute top-3 left-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">جديد</span>
                  )}
                  <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <f.icon className={`w-6 h-6 ${colors.text}`} />
                  </div>
                  <h3 className="text-lg font-bold text-[#16213e] mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
          {!showAllFeatures && (
            <div className="text-center mt-8">
              <button
                onClick={() => setShowAllFeatures(true)}
                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold text-sm transition-colors"
                data-testid="btn-show-all-features"
              >
                عرض جميع المميزات ({features.length})
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
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
                <div className="relative">
                  <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg shadow-emerald-600/20">
                    {s.num}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="hidden sm:block absolute top-8 left-0 w-full border-t-2 border-dashed border-emerald-200 -translate-x-1/2" style={{ width: "calc(100% - 4rem)", right: "-50%" }} />
                  )}
                </div>
                <h3 className="text-lg font-bold text-[#16213e] mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-[#0f3460]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-serif">لماذا مُتْقِن؟</h2>
            <p className="text-gray-400 mt-3 text-lg">ما يميّزنا عن غيرنا</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {whyUs.map((w, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-white/10 transition-all" data-testid={`why-card-${i}`}>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-3">
                  <w.icon className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-white font-bold mb-1.5">{w.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-16 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#16213e] font-serif" data-testid="text-testimonials-title">ماذا يقول مستخدمونا</h2>
            <p className="text-gray-500 mt-3 text-lg">آراء حقيقية من مشرفين ومعلمين وأولياء أمور</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100 relative" data-testid={`testimonial-${i}`}>
                <Quote className="w-8 h-8 text-emerald-100 absolute top-4 left-4" />
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-4 relative z-10">"{t.text}"</p>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <span className="text-emerald-700 font-bold text-sm">{t.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-bold text-[#16213e] text-sm">{t.name}</p>
                      <p className="text-gray-500 text-xs">{t.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-16 sm:py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#16213e] font-serif" data-testid="text-faq-title">أسئلة شائعة</h2>
            <p className="text-gray-500 mt-3">إجابات على أكثر الأسئلة تكراراً</p>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white" data-testid={`faq-${i}`}>
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-right hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  data-testid={`btn-faq-${i}`}
                >
                  <span className="font-semibold text-[#16213e]">{f.q}</span>
                  {openFaq === i ? <ChevronUp className="w-5 h-5 text-emerald-500 shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />}
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

      <section id="register" className="py-16 sm:py-20 bg-gradient-to-b from-[#0f3460] to-[#16213e] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="cta-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cta-pattern)" />
          </svg>
        </div>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl font-bold font-serif mb-4" data-testid="text-register-title">ابدأ رحلتك مع مُتْقِن اليوم</h2>
          <p className="text-gray-300 mb-8 text-lg leading-relaxed">
            انضم لمئات المساجد والمراكز التي تستخدم مُتْقِن
            <br />
            مجاني بالكامل — سجّل خلال دقيقة واحدة
          </p>
          <a
            href={`/register-mosque${refParam ? `?ref=${refParam}` : ""}`}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 hover:scale-[1.02]"
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
          <p className="text-gray-400 text-sm mb-3">ساهم في نشر الخير — شارك النظام مع مساجد أخرى</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                const url = `${window.location.origin}/welcome`;
                const text = `السلام عليكم 🕌\n\nاكتشفت نظام *مُتْقِن* لإدارة حلقات القرآن الكريم — مجاني تماماً ووقف لله تعالى.\n\n✅ تتبع الحفظ آية بآية\n✅ تسميع صوتي عن بُعد\n✅ شهادات تخرج احترافية\n✅ تقارير لأولياء الأمور\n✅ يعمل على الجوال\n\n🔗 ${url}`;
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

      <footer className="py-8 bg-[#16213e]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <img src="/logo.png" alt="مُتْقِن" className="w-7 h-7 rounded" />
            <span className="text-white font-serif font-bold text-lg">مُتْقِن</span>
          </div>
          <p className="text-gray-400 text-sm mb-1">وقف لله تعالى — لإدارة حلقات القرآن الكريم</p>
          <p className="text-gray-500 text-xs">© {new Date().getFullYear()} جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}

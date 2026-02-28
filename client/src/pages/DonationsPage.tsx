import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, BookOpen, Users, Star } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

export default function DonationsPage() {
  const { language } = useTheme();
  const isEn = language === "en";

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-6 max-w-4xl mx-auto" data-testid="page-donations">
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
          <Heart className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-title">
          {isEn ? "Support & Contribution" : "الدعم والمساهمة"}
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          {isEn
            ? "This system is a Waqf (endowment) for the sake of Allah. It is completely free for all Islamic centers and mosques."
            : "هذا النظام وقف لله تعالى. مجاني بالكامل لجميع المراكز الإسلامية والمساجد."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="text-center border-primary/20">
          <CardHeader className="pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-emerald-600" />
            </div>
            <CardTitle className="text-base mt-2">{isEn ? "Teach Quran" : "علّم القرآن"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "The best of you are those who learn the Quran and teach it."
                : "خيركم من تعلم القرآن وعلمه - رواه البخاري"}
            </p>
          </CardContent>
        </Card>

        <Card className="text-center border-primary/20">
          <CardHeader className="pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-base mt-2">{isEn ? "Spread Knowledge" : "انشر العلم"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "Share this system with other mosques and Islamic centers to benefit more students."
                : "شارك النظام مع مساجد ومراكز أخرى لتعم الفائدة على المزيد من الطلاب."}
            </p>
          </CardContent>
        </Card>

        <Card className="text-center border-primary/20">
          <CardHeader className="pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Star className="w-6 h-6 text-amber-600" />
            </div>
            <CardTitle className="text-base mt-2">{isEn ? "Pray for Us" : "ادعُ لنا"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {isEn
                ? "Your prayers are the greatest support for the continuation and development of this project."
                : "دعاؤكم أعظم دعم لاستمرار وتطوير هذا المشروع."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <p className="text-sm font-semibold text-primary">
              {isEn ? "Developer" : "المطور"}
            </p>
            <p className="text-base font-bold">
              {isEn ? "Ahmed Khaled Al-Zubaidi" : "أحمد خالد الزبيدي"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isEn
                ? "This system was built with love for the Quran and its students. May Allah accept it."
                : "بُني هذا النظام حباً في القرآن وأهله. تقبل الله منّا ومنكم."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

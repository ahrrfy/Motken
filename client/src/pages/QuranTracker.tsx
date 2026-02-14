import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Circle, Play, BookOpen } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const surahs = [
  { id: 1, name: "الفاتحة", verses: 7 },
  { id: 2, name: "البقرة", verses: 286 },
  { id: 3, name: "آل عمران", verses: 200 },
  { id: 114, name: "الناس", verses: 6 },
];

export default function QuranTracker() {
  const { user } = useAuth();
  const [selectedSurah, setSelectedSurah] = useState("1");
  const [activeTab, setActiveTab] = useState("memorization");

  // Mock data for tracking
  const [progress, setProgress] = useState(65);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">المصحف والحفظ</h1>
          <p className="text-muted-foreground">تابع تقدم حفظك وتلاوتك اليومية</p>
        </div>
        
        <div className="flex items-center gap-2">
           <Select value={selectedSurah} onValueChange={setSelectedSurah}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="اختر السورة" />
            </SelectTrigger>
            <SelectContent>
              {surahs.map(s => (
                <SelectItem key={s.id} value={s.id.toString()}>{s.id}. {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Quran View */}
        <Card className="lg:col-span-2 shadow-lg border-primary/20">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <div className="flex justify-between items-center">
              <CardTitle className="font-serif text-2xl text-primary">سورة الفاتحة</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline"><Play className="w-4 h-4 ml-2" /> استماع</Button>
                <Button size="sm" variant="secondary"><BookOpen className="w-4 h-4 ml-2" /> التفسير</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="text-center space-y-8 font-serif text-3xl leading-loose" dir="rtl">
              <p className="text-primary/80">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>
              <p>
                ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ (1) ٱلرَّحْمَٰنِ ٱلرَّحِيمِ (2) مَٰلِكِ يَوْمِ ٱلدِّينِ (3)
                إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ (4) ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ (5)
                صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ (6)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">تقدم الحفظ اليومي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm mb-1">
                <span>المطلوب: 5 صفحات</span>
                <span>تم إنجاز: 3 صفحات</span>
              </div>
              <Progress value={60} className="h-3" />
              
              <div className="mt-6 space-y-2">
                <h4 className="font-bold text-sm text-muted-foreground mb-2">الآيات المطلوبة لليوم:</h4>
                <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg border border-secondary-foreground/10">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm">سورة البقرة (1-10)</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg border border-secondary-foreground/10 opacity-60">
                  <Circle className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">سورة البقرة (11-20)</span>
                </div>
              </div>

              <Button className="w-full mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
                تسجيل التسميع
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إحصائيات الطالب</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                 <div className="flex justify-between items-center pb-2 border-b">
                   <span className="text-muted-foreground">عدد الأجزاء المحفوظة</span>
                   <span className="font-bold text-lg">5</span>
                 </div>
                 <div className="flex justify-between items-center pb-2 border-b">
                   <span className="text-muted-foreground">آخر تسميع</span>
                   <span className="font-bold">أمس</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <span className="text-muted-foreground">التقييم العام</span>
                   <span className="font-bold text-primary">ممتاز</span>
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

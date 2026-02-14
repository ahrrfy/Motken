import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Circle, Play, BookOpen, RefreshCw, Bookmark } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

// Mock Data for Surah Al-Fatiha and first few verses of Al-Baqarah
const quranData = {
  1: {
    name: "الفاتحة",
    verses: [
      { id: 1, text: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", status: "memorized", tafsir: "البدء بذكر الله تعالى، وطلب العون منه." },
      { id: 2, text: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ", status: "memorized", tafsir: "الثناء على الله بصفاته التي كلُّها أوصاف كمال، وبنعمه الظاهرة والباطنة." },
      { id: 3, text: "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", status: "memorized", tafsir: "صفتان لله تعالى، تدلان على عظيم رحمته." },
      { id: 4, text: "مَٰلِكِ يَوْمِ ٱلدِّينِ", status: "review", tafsir: "أي: يوم الجزاء والحساب." },
      { id: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", status: "new", tafsir: "نخصك وحدك بالعبادة، ونستعين بك وحدك في جميع أمورنا." },
      { id: 6, text: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ", status: "new", tafsir: "دلنا وأرشدنا، ووفقنا للصراط المستقيم." },
      { id: 7, text: "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ", status: "new", tafsir: "طريق الذين مننت عليهم بالهداية." }
    ]
  }
};

type VerseStatus = "memorized" | "review" | "new";

export default function QuranTracker() {
  const { user } = useAuth();
  const [selectedSurah, setSelectedSurah] = useState("1");
  const [verses, setVerses] = useState(quranData[1].verses);
  const [selectedVerse, setSelectedVerse] = useState<any>(null);
  const [showTafsir, setShowTafsir] = useState(false);

  const handleVerseClick = (verse: any) => {
    setSelectedVerse(verse);
    setShowTafsir(true);
  };

  const updateVerseStatus = (id: number, status: VerseStatus) => {
    setVerses(verses.map(v => v.id === id ? { ...v, status } : v));
    setShowTafsir(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "memorized": return "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200";
      case "review": return "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200";
      case "new": return "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100";
      default: return "";
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif text-primary">المصحف التفاعلي</h1>
          <p className="text-muted-foreground">تتبع حفظك آية بآية مع التفسير المباشر</p>
        </div>
        
        <div className="flex items-center gap-2">
           <Select value={selectedSurah} onValueChange={setSelectedSurah}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="اختر السورة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1. الفاتحة</SelectItem>
              <SelectItem value="2">2. البقرة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Quran View */}
        <Card className="lg:col-span-3 shadow-lg border-primary/20 bg-[#fffdf5]">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <div className="flex justify-between items-center">
              <CardTitle className="font-serif text-2xl text-primary flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                سورة الفاتحة
              </CardTitle>
              <div className="flex gap-2">
                <div className="flex gap-2 text-xs items-center ml-4">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> تم الحفظ</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500"></span> مراجعة</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-300"></span> جديد</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 min-h-[500px]">
            <div className="space-y-6 font-serif text-3xl leading-[2.5]" dir="rtl">
              {verses.map((verse) => (
                <span 
                  key={verse.id}
                  onClick={() => handleVerseClick(verse)}
                  className={cn(
                    "inline cursor-pointer px-1 rounded transition-colors duration-200 border-b-2 border-transparent",
                    verse.status === "memorized" ? "text-emerald-900 bg-emerald-50/50 hover:bg-emerald-100" :
                    verse.status === "review" ? "text-amber-900 bg-amber-50/50 hover:bg-amber-100" :
                    "hover:bg-slate-100"
                  )}
                >
                  {verse.text} 
                  <span className="inline-flex items-center justify-center w-8 h-8 mr-1 text-sm border border-primary/30 rounded-full text-primary/70 font-sans number-font bg-white">
                    {verse.id}
                  </span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                ورد اليوم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white rounded-lg shadow-sm border">
                <p className="text-sm text-muted-foreground mb-1">المراجعة:</p>
                <p className="font-bold text-lg text-amber-700">سورة الفاتحة</p>
                <div className="mt-2 flex gap-1">
                   <Badge variant="outline" className="text-xs">مراجعة قريبة</Badge>
                </div>
              </div>
              
              <div className="p-4 bg-white rounded-lg shadow-sm border">
                <p className="text-sm text-muted-foreground mb-1">الحفظ الجديد:</p>
                <p className="font-bold text-lg text-emerald-700">سورة البقرة (1-5)</p>
              </div>

              <Button className="w-full mt-4" size="lg">
                بدء التسميع
              </Button>
            </CardContent>
          </Card>

          <Card>
             <CardHeader>
              <CardTitle className="text-lg">إحصائيات السورة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                   <span>نسبة الحفظ</span>
                   <span>45%</span>
                 </div>
                 <Progress value={45} className="h-2" />
               </div>
               
               <div className="grid grid-cols-2 gap-2 text-center text-sm">
                 <div className="p-2 bg-emerald-50 rounded text-emerald-700">
                   <span className="block font-bold text-lg">3</span>
                   آيات محفوظة
                 </div>
                 <div className="p-2 bg-amber-50 rounded text-amber-700">
                   <span className="block font-bold text-lg">1</span>
                   تحتاج مراجعة
                 </div>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tafsir & Action Modal */}
      <Dialog open={showTafsir} onOpenChange={setShowTafsir}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl border-b pb-2 flex justify-between items-center">
              <span>تفسير الآية {selectedVerse?.id}</span>
              <Badge variant="outline">{selectedSurah === "1" ? "سورة الفاتحة" : ""}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
             <div className="p-4 bg-secondary/30 rounded-lg text-lg font-serif text-center leading-relaxed">
               {selectedVerse?.text}
             </div>
             
             <div className="space-y-2">
               <h4 className="font-bold flex items-center gap-2">
                 <BookOpen className="w-4 h-4 text-primary" />
                 التفسير الميسر:
               </h4>
               <p className="text-muted-foreground leading-relaxed">
                 {selectedVerse?.tafsir}
               </p>
             </div>

             <div className="space-y-2">
               <h4 className="font-bold flex items-center gap-2">
                 <Bookmark className="w-4 h-4 text-primary" />
                 تحديث حالة الحفظ:
               </h4>
               <div className="grid grid-cols-3 gap-2">
                 <Button 
                    variant={selectedVerse?.status === "memorized" ? "default" : "outline"}
                    className={selectedVerse?.status === "memorized" ? "bg-emerald-600 hover:bg-emerald-700" : "hover:bg-emerald-50 text-emerald-700 border-emerald-200"}
                    onClick={() => updateVerseStatus(selectedVerse.id, "memorized")}
                 >
                   <CheckCircle className="w-4 h-4 ml-2" />
                   تم الحفظ
                 </Button>
                 <Button 
                    variant={selectedVerse?.status === "review" ? "default" : "outline"}
                    className={selectedVerse?.status === "review" ? "bg-amber-500 hover:bg-amber-600" : "hover:bg-amber-50 text-amber-700 border-amber-200"}
                    onClick={() => updateVerseStatus(selectedVerse.id, "review")}
                 >
                   <RefreshCw className="w-4 h-4 ml-2" />
                   مراجعة
                 </Button>
                 <Button 
                    variant={selectedVerse?.status === "new" ? "default" : "outline"}
                    onClick={() => updateVerseStatus(selectedVerse.id, "new")}
                 >
                   جديد
                 </Button>
               </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

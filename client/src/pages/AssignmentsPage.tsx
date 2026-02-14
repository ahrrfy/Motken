import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { CalendarIcon, Clock, CheckCircle2, User, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const students = [
  { id: "1", name: "أحمد محمد" },
  { id: "2", name: "يوسف علي" },
  { id: "3", name: "عمر خالد" },
];

const surahs = [
  { id: "1", name: "الفاتحة", verses: 7 },
  { id: "2", name: "البقرة", verses: 286 },
  { id: "3", name: "آل عمران", verses: 200 },
];

export default function AssignmentsPage() {
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedSurah, setSelectedSurah] = useState("");
  const [fromVerse, setFromVerse] = useState("");
  const [toVerse, setToVerse] = useState("");
  const [time, setTime] = useState("");

  const handleAssign = () => {
    if (!selectedStudent || !date || !time || !selectedSurah) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى تعبئة جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "تم تحديد الواجب بنجاح",
      description: `تم إرسال إشعار للطالب ${students.find(s => s.id === selectedStudent)?.name} بموعد التسميع`,
      className: "bg-green-50 border-green-200 text-green-800"
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-serif text-primary">إدارة واجبات الطلاب</h1>
        <p className="text-muted-foreground">تحديد مقرر الحفظ ومواعيد التسميع للحلقات</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assignment Form */}
        <Card className="border-t-4 border-t-primary shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              تحديد واجب جديد
            </CardTitle>
            <CardDescription>اختر الطالب وحدد الآيات والموعد</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>الطالب</Label>
              <Select onValueChange={setSelectedStudent}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="اختر الطالب" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>السورة</Label>
                <Select onValueChange={setSelectedSurah}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="اختر السورة" />
                  </SelectTrigger>
                  <SelectContent>
                    {surahs.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>من الآية</Label>
                <Input type="number" placeholder="1" value={fromVerse} onChange={e => setFromVerse(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>إلى الآية</Label>
                <Input type="number" placeholder="10" value={toVerse} onChange={e => setToVerse(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 flex flex-col">
                <Label className="mb-2">تاريخ التسميع</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-right font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      {date ? format(date, "PPP", { locale: ar }) : <span>اختر التاريخ</span>}
                      <CalendarIcon className="mr-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label>وقت التسميع</Label>
                <div className="relative">
                  <Input 
                    type="time" 
                    value={time} 
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full"
                  />
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <Button onClick={handleAssign} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-11 mt-4">
              <CheckCircle2 className="w-5 h-5 ml-2" />
              تأكيد وإرسال للطالب
            </Button>
          </CardContent>
        </Card>

        {/* Recent Assignments Preview */}
        <div className="space-y-6">
          <Card className="bg-muted/30 border-none">
            <CardHeader>
              <CardTitle className="text-lg">واجبات قادمة (اليوم)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { student: "عمر خالد", task: "سورة البقرة (20-30)", time: "04:30 م", status: "pending" },
                { student: "يوسف علي", task: "سورة آل عمران (1-10)", time: "05:00 م", status: "done" },
              ].map((task, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{task.student}</p>
                      <p className="text-xs text-muted-foreground">{task.task}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1 text-sm font-bold text-primary mb-1">
                      <Clock className="w-3 h-3" />
                      {task.time}
                    </div>
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full",
                      task.status === "done" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {task.status === "done" ? "تم التسميع" : "انتظار"}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-blue-50/50 border-blue-100">
            <CardContent className="p-4 flex gap-3">
              <div className="p-2 bg-blue-100 rounded-full h-fit text-blue-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-blue-900 text-sm">تذكير تلقائي</h4>
                <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">
                  سيقوم النظام بإرسال إشعار تلقائي للطالب قبل موعد التسميع بـ 15 دقيقة لتذكيره بالاستعداد.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

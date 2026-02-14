import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const demoUsers = [
  { id: "1", name: "عمر خالد", role: "طالب", avatar: "https://i.pravatar.cc/150?u=student" },
  { id: "2", name: "الشيخ أحمد", role: "أستاذ", avatar: "https://i.pravatar.cc/150?u=teacher" },
  { id: "3", name: "د. عبد الله", role: "مدير", avatar: "https://i.pravatar.cc/150?u=admin" },
];

export default function IDCardsPage() {
  const componentRef = useRef<HTMLDivElement>(null);
  const [selectedIdx, setSelectedIdx] = useState("0");

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "ID Card",
  });

  const user = demoUsers[parseInt(selectedIdx)];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-idcards-title">بطاقات الهوية</h1>
          <p className="text-muted-foreground">طباعة بطاقات التعريف والـ QR Code</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
          <Select value={selectedIdx} onValueChange={setSelectedIdx}>
            <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-user-idcard">
              <SelectValue placeholder="اختر المستخدم" />
            </SelectTrigger>
            <SelectContent>
              {demoUsers.map((u, i) => (
                <SelectItem key={i} value={String(i)}>{u.name} ({u.role})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => handlePrint()} className="bg-primary hover:bg-primary/90" data-testid="button-print-idcard">
            <Printer className="w-4 h-4 ml-2" />
            طباعة الهوية
          </Button>
        </div>
      </div>

      <div className="flex justify-center py-6 md:py-10 bg-muted/20 rounded-xl px-4">
        <div ref={componentRef} className="bg-white w-[300px] sm:w-[350px] h-[480px] sm:h-[550px] rounded-2xl shadow-xl overflow-hidden relative border border-gray-200 print:shadow-none print:border-none">
          <div className="h-32 bg-primary relative overflow-hidden">
             <div className="absolute inset-0 opacity-20 bg-[url('/images/pattern-bg.png')] bg-cover"></div>
             <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
               <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2 backdrop-blur-sm">
                 <span className="font-bold text-xl">ح</span>
               </div>
               <h2 className="font-serif text-xl font-bold">منصة الحفاظ</h2>
               <p className="text-xs opacity-80">للتعليم القرآني</p>
             </div>
          </div>

          <div className="absolute top-24 left-1/2 -translate-x-1/2">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100">
              <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="mt-20 px-6 text-center space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">{user.name}</h3>
              <p className="text-primary font-medium">{user.role}</p>
            </div>

            <div className="space-y-2 text-sm text-gray-500">
              <p>رقم الهوية: STD-2026-{String(parseInt(user.id) * 1234).padStart(4, '0')}</p>
              <p>تاريخ الانضمام: 2026/01/15</p>
              <p>المسجد: جامع النور - بغداد</p>
            </div>

            <div className="pt-6 flex justify-center">
              <div className="p-2 bg-white border rounded-lg shadow-sm">
                <QRCodeSVG value={`https://alhuffaz.app/user/${user.id}`} size={100} />
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">امسح الرمز لعرض الملف الشخصي</p>
          </div>

          <div className="absolute bottom-0 w-full h-3 bg-accent"></div>
        </div>
      </div>
    </div>
  );
}

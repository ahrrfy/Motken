import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, ShieldCheck, ShieldAlert, Loader2, Scan } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function QRScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<"none" | "success" | "decrypting">("none");
  const [decryptedData, setDecryptedData] = useState<any>(null);

  const startScan = () => {
    setScanning(true);
    setScanResult("none");
    setDecryptedData(null);
    
    // Simulate scan delay
    setTimeout(() => {
      setScanning(false);
      setScanResult("decrypting");
      
      // Simulate Decryption Process (AES-256 simulation)
      setTimeout(() => {
        setScanResult("success");
        setDecryptedData({
          name: "عمر خالد",
          id: "STD-2024-8842",
          role: "طالب",
          status: "active",
          mosque: "جامع النور الكبير",
          last_active: "قبل 5 دقائق",
          security_hash: "a4f...92x (Verified)"
        });
      }, 1500);
    }, 2000);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 space-y-8 bg-islamic-pattern">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold font-serif text-primary">التحقق الأمني (QR)</h1>
        <p className="text-muted-foreground">نظام مسح وفك تشفير الهويات الآمن</p>
      </div>

      <div className="relative w-full max-w-md">
        {/* Scanner Window */}
        <div className="relative aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl border-8 border-white ring-1 ring-gray-200">
          
          {/* Camera Simulation */}
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
             {!scanning && scanResult === "none" && (
               <div className="text-center space-y-4">
                 <QrCode className="w-20 h-20 text-white/20 mx-auto" />
                 <p className="text-white/50 text-sm">اضغط على زر المسح للبدء</p>
               </div>
             )}
             
             {scanning && (
               <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&q=80')] bg-cover opacity-50 grayscale"
                />
                <motion.div 
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-green-500/80 shadow-[0_0_15px_rgba(34,197,94,0.8)] z-10"
                />
                <div className="absolute inset-0 border-2 border-green-500/30 m-12 rounded-lg flex items-center justify-center">
                   <span className="text-green-500 font-mono text-xs animate-pulse">جاري البحث...</span>
                </div>
               </>
             )}

             {scanResult === "decrypting" && (
                <div className="text-center space-y-4 z-20">
                  <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto" />
                  <p className="text-emerald-400 font-mono text-sm">AES-256 Decryption...</p>
                  <div className="font-mono text-[10px] text-green-900/50 break-all px-8">
                     7d9s8f7d9s8f7d9s8f7d9s8f...
                  </div>
                </div>
             )}

             {scanResult === "success" && (
                <div className="absolute inset-0 bg-emerald-900/90 flex flex-col items-center justify-center text-white p-6">
                   <ShieldCheck className="w-20 h-20 text-emerald-400 mb-4" />
                   <h2 className="text-2xl font-bold mb-2">تم التحقق بنجاح</h2>
                   <p className="opacity-70 text-sm">الهوية سليمة وموثقة</p>
                </div>
             )}
          </div>
        </div>

        {/* Action Button */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
           <Button 
             size="lg" 
             className="rounded-full w-16 h-16 shadow-lg bg-primary hover:bg-primary/90 border-4 border-white"
             onClick={startScan}
             disabled={scanning}
           >
             <Scan className="w-6 h-6" />
           </Button>
        </div>
      </div>

      {/* Result Card */}
      <AnimatePresence>
        {scanResult === "success" && decryptedData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full max-w-md"
          >
            <Card className="border-t-4 border-t-emerald-500">
              <CardContent className="p-6 space-y-4">
                 <div className="flex items-start justify-between">
                   <div>
                     <h3 className="text-xl font-bold">{decryptedData.name}</h3>
                     <p className="text-muted-foreground text-sm">{decryptedData.role} • {decryptedData.mosque}</p>
                   </div>
                   <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">نشط</Badge>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4 py-4 border-t border-b text-sm">
                   <div>
                     <p className="text-muted-foreground">رقم المعرف</p>
                     <p className="font-mono font-bold">{decryptedData.id}</p>
                   </div>
                   <div>
                     <p className="text-muted-foreground">آخر ظهور</p>
                     <p className="font-bold">{decryptedData.last_active}</p>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted p-2 rounded">
                   <ShieldCheck className="w-3 h-3 text-emerald-600" />
                   <span>Security Hash: {decryptedData.security_hash}</span>
                 </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

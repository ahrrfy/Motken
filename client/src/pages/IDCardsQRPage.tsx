import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/lib/theme-context";
import IDCardsPage from "@/pages/IDCardsPage";
import QRScannerPage from "@/pages/QRScannerPage";

export default function IDCardsQRPage() {
  const { language } = useTheme();
  const isEn = language === "en";

  return (
    <div dir="rtl" data-testid="page-id-cards-qr">
      <Tabs defaultValue="id-cards" className="w-full">
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4 md:pt-6">
          <TabsList data-testid="tabs-id-cards-qr">
            <TabsTrigger value="id-cards" className="flex-1 sm:flex-none gap-2" data-testid="tab-id-cards">
              {isEn ? "ID Cards" : "بطاقات الهوية"}
            </TabsTrigger>
            <TabsTrigger value="qr-scanner" className="flex-1 sm:flex-none gap-2" data-testid="tab-qr-scanner">
              {isEn ? "QR Scan & Verify" : "التحقق ومسح QR"}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="id-cards" className="mt-0" data-testid="tab-content-id-cards">
          <IDCardsPage />
        </TabsContent>
        <TabsContent value="qr-scanner" className="mt-0" data-testid="tab-content-qr-scanner">
          <QRScannerPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}

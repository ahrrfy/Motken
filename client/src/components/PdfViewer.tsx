import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { getPdf } from "@/lib/pdf-storage";

interface PdfViewerProps {
  pdfStorageKey: string;
  bookTitle: string;
  bookAuthor: string;
  totalPages?: number;
  onClose: () => void;
}

export function PdfViewer({ pdfStorageKey, bookTitle, bookAuthor, onClose }: PdfViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const data = await getPdf(pdfStorageKey);
        if (!data) {
          if (!cancelled) setError("لم يتم العثور على ملف PDF. قد يكون محذوفاً.");
          return;
        }
        const blob = new Blob([data], { type: "application/pdf" });
        url = URL.createObjectURL(blob);
        if (!cancelled) setBlobUrl(url);
      } catch {
        if (!cancelled) setError("فشل في تحميل ملف PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [pdfStorageKey]);

  // Keyboard: Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-gray-700">{error}</h2>
          <Button onClick={onClose} variant="outline">العودة للمكتبة</Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 animate-spin text-[#1a5e3a] mx-auto" />
          <h2 className="text-lg font-bold text-gray-700">جاري تحميل الكتاب...</h2>
          <p className="text-sm text-gray-500">{bookTitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" dir="rtl">
      {/* Toolbar */}
      <div className="shrink-0">
        <div
          className="px-3 py-2 flex items-center justify-between gap-2"
          style={{ background: "linear-gradient(90deg, #1a5e3a 0%, #2d7a4f 50%, #1a5e3a 100%)" }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20 gap-1 text-xs sm:text-sm"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden sm:inline">العودة للمكتبة</span>
            <span className="sm:hidden">رجوع</span>
          </Button>
          <div className="text-center flex-1 min-w-0">
            <h1 className="text-white font-serif text-sm sm:text-base font-bold truncate">{bookTitle}</h1>
            <p className="text-white/70 text-xs truncate">{bookAuthor}</p>
          </div>
          <div className="w-20" />
        </div>
        <div className="h-1" style={{ background: "repeating-linear-gradient(90deg, #c8a45e 0px, #c8a45e 8px, transparent 8px, transparent 16px, #e8c96e 16px, #e8c96e 24px, transparent 24px, transparent 32px)" }} />
      </div>

      {/* PDF — native browser viewer via iframe */}
      {blobUrl && (
        <object
          data={`${blobUrl}#view=FitH`}
          type="application/pdf"
          className="flex-1 w-full"
        >
          <embed
            src={`${blobUrl}#view=FitH`}
            type="application/pdf"
            className="w-full h-full"
          />
        </object>
      )}
    </div>
  );
}

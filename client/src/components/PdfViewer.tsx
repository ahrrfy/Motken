import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
  Maximize, Loader2, AlertCircle,
} from "lucide-react";
import { getPdf } from "@/lib/pdf-storage";

interface PdfViewerProps {
  pdfStorageKey: string;
  bookTitle: string;
  bookAuthor: string;
  totalPages?: number;
  onClose: () => void;
}

export function PdfViewer({ pdfStorageKey, bookTitle, bookAuthor, totalPages: initialPages, onClose }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialPages || 0);
  const [scale, setScale] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF from IndexedDB
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getPdf(pdfStorageKey);
        if (!data) {
          setError("لم يتم العثور على ملف PDF. قد يكون محذوفاً.");
          setLoading(false);
          return;
        }

        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).href;

        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (!cancelled) {
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError("فشل في تحميل ملف PDF");
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [pdfStorageKey]);

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

    // Cancel any in-progress render
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch {}
      renderTaskRef.current = null;
    }

    setRendering(true);
    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Calculate scale
      let renderScale = scale;
      if (fitWidth) {
        const containerWidth = containerRef.current.clientWidth - 32; // padding
        const baseViewport = page.getViewport({ scale: 1 });
        renderScale = containerWidth / baseViewport.width;
        setScale(renderScale);
      }

      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: renderScale });

      canvas.width = viewport.width * dpr;
      canvas.height = viewport.height * dpr;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderTask = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (err: any) {
      if (err?.name !== "RenderingCancelledException") {
        console.error("PDF render error:", err);
      }
    } finally {
      setRendering(false);
    }
  }, [pdfDoc, currentPage, scale, fitWidth]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Recalculate on resize when fitWidth is on
  useEffect(() => {
    if (!fitWidth) return;
    const handleResize = () => renderPage();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fitWidth, renderPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // RTL: Right = previous, Left = next
      if (e.key === "ArrowRight") {
        setCurrentPage(p => Math.max(1, p - 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentPage(p => Math.min(totalPages, p + 1));
      } else if (e.key === "+" || e.key === "=") {
        setFitWidth(false);
        setScale(s => Math.min(3, s + 0.2));
      } else if (e.key === "-") {
        setFitWidth(false);
        setScale(s => Math.max(0.5, s - 0.2));
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [totalPages, onClose]);

  const goNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));
  const goPrevPage = () => setCurrentPage(p => Math.max(1, p - 1));

  const zoomIn = () => {
    setFitWidth(false);
    setScale(s => Math.min(3, s + 0.25));
  };
  const zoomOut = () => {
    setFitWidth(false);
    setScale(s => Math.max(0.5, s - 0.25));
  };
  const toggleFitWidth = () => setFitWidth(f => !f);

  const progress = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
          <h2 className="text-xl font-bold text-gray-700">{error}</h2>
          <Button onClick={onClose} variant="outline">العودة للمكتبة</Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 animate-spin text-[#1a5e3a] mx-auto" />
          <h2 className="text-lg font-bold text-gray-700">جاري تحميل الكتاب...</h2>
          <p className="text-sm text-gray-500">{bookTitle}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" dir="rtl">
      {/* Top toolbar */}
      <div className="sticky top-0 z-10 border-b" style={{ borderColor: "#c8a45e" }}>
        <div className="h-1 bg-gray-200">
          <div className="h-full transition-all duration-300" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #c8a45e, #e8c96e)" }} />
        </div>
        <div
          className="px-2 sm:px-4 py-2 flex items-center justify-between gap-2"
          style={{ background: "linear-gradient(90deg, #1a5e3a 0%, #2d7a4f 50%, #1a5e3a 100%)" }}
        >
          {/* Right: back button */}
          <div className="flex items-center gap-2">
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
          </div>

          {/* Center: title */}
          <div className="text-center flex-1 min-w-0">
            <h1 className="text-white font-serif text-sm sm:text-lg font-bold truncate">{bookTitle}</h1>
            <p className="text-white/70 text-xs truncate">{bookAuthor}</p>
          </div>

          {/* Left: controls */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={zoomOut} className="text-white hover:bg-white/20 px-1.5" title="تصغير">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-white text-xs min-w-[3rem] text-center hidden sm:inline">
              {Math.round(scale * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={zoomIn} className="text-white hover:bg-white/20 px-1.5" title="تكبير">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFitWidth}
              className={`text-white hover:bg-white/20 px-1.5 ${fitWidth ? "bg-white/20" : ""}`}
              title="ملاءمة العرض"
            >
              <Maximize className="w-4 h-4" />
            </Button>
            <Badge className="bg-white/20 text-white border-0 text-xs hidden sm:flex">
              {currentPage} / {totalPages}
            </Badge>
          </div>
        </div>
        <div className="h-1" style={{ background: "repeating-linear-gradient(90deg, #c8a45e 0px, #c8a45e 8px, transparent 8px, transparent 16px, #e8c96e 16px, #e8c96e 24px, transparent 24px, transparent 32px)" }} />
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 overflow-auto flex justify-center py-4 px-2 sm:px-4">
        <div className="relative">
          {rendering && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
              <Loader2 className="w-8 h-8 animate-spin text-[#1a5e3a]" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="shadow-lg rounded"
            style={{ background: "#fff" }}
          />
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="sticky bottom-0 border-t bg-white/95 backdrop-blur-sm py-2 px-4" style={{ borderColor: "#d4c5a0" }}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={goPrevPage}
            disabled={currentPage <= 1}
            className="gap-1"
          >
            <ChevronRight className="w-4 h-4" />
            <span className="hidden sm:inline">السابقة</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              صفحة {currentPage} من {totalPages}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goNextPage}
            disabled={currentPage >= totalPages}
            className="gap-1"
          >
            <span className="hidden sm:inline">التالية</span>
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

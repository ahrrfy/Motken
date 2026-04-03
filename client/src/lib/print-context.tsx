import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface PrintPreviewOptions {
  title: string;
  contentHtml: string;
  orientation?: "portrait" | "landscape";
  format?: "a4" | "a5";
  mosqueName?: string;
  mosqueImage?: string;
  showHeader?: boolean;
  showFooter?: boolean;
}

interface PrintPreviewContextType {
  isOpen: boolean;
  options: PrintPreviewOptions | null;
  openPrintPreview: (options: PrintPreviewOptions) => void;
  closePrintPreview: () => void;
  setPageConfig: (config: { orientation: "portrait" | "landscape"; format: "a4" | "a5" }) => void;
}

const PrintPreviewContext = createContext<PrintPreviewContextType | null>(null);

export function PrintPreviewProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<PrintPreviewOptions | null>(null);

  const openPrintPreview = useCallback((opts: PrintPreviewOptions) => {
    setOptions({
      showHeader: true,
      showFooter: true,
      orientation: "portrait",
      format: "a4",
      ...opts,
    });
    setIsOpen(true);
  }, []);

  const closePrintPreview = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
  }, []);

  const setPageConfig = useCallback((config: { orientation: "portrait" | "landscape"; format: "a4" | "a5" }) => {
    setOptions((prev) => prev ? { ...prev, ...config } : prev);
  }, []);

  return (
    <PrintPreviewContext.Provider value={{ isOpen, options, openPrintPreview, closePrintPreview, setPageConfig }}>
      {children}
    </PrintPreviewContext.Provider>
  );
}

export function usePrintPreview() {
  const context = useContext(PrintPreviewContext);
  if (!context) {
    throw new Error("usePrintPreview must be used within a PrintPreviewProvider");
  }
  return {
    openPrintPreview: context.openPrintPreview,
    closePrintPreview: context.closePrintPreview,
  };
}

export function usePrintPreviewInternal() {
  const context = useContext(PrintPreviewContext);
  if (!context) {
    throw new Error("usePrintPreviewInternal must be used within a PrintPreviewProvider");
  }
  return context;
}

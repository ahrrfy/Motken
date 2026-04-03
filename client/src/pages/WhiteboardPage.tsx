import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  Pen, Eraser, Type, Square, Circle, Trash2, Download, Undo2, Redo2,
  MousePointer, Save, BookOpen, Image as ImageIcon
} from "lucide-react";
import * as fabric from "fabric";

const COLORS = [
  "#8b5cf6", "#3b82f6", "#000000", "#1a1a1a", "#404040", "#666666",
  "#ef4444", "#ec4899", "#f59e0b", "#10b981", "#14b8a6", "#6366f1",
  "#f97316", "#8b4513",
];

const BRUSH_SIZES = [2, 4, 6, 8, 12, 16];

const QURAN_VERSES = [
  "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
  "الرَّحْمَٰنِ الرَّحِيمِ",
  "مَالِكِ يَوْمِ الدِّينِ",
  "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
  "قُلْ هُوَ اللَّهُ أَحَدٌ",
  "اللَّهُ الصَّمَدُ",
  "لَمْ يَلِدْ وَلَمْ يُولَدْ",
];

const TAJWEED_MARKS = [
  { label: "إدغام", color: "#10b981", symbol: "◯" },
  { label: "إخفاء", color: "#3b82f6", symbol: "△" },
  { label: "إقلاب", color: "#8b5cf6", symbol: "□" },
  { label: "مد لازم", color: "#ef4444", symbol: "—" },
  { label: "مد عارض", color: "#f59e0b", symbol: "~" },
  { label: "غنة", color: "#ec4899", symbol: "∩" },
  { label: "قلقلة", color: "#14b8a6", symbol: "●" },
];

type Tool = "select" | "pen" | "eraser" | "text" | "rect" | "circle";

export default function WhiteboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const historyRef = useRef<string[]>([]);
  const redoRef = useRef<string[]>([]);
  const ignoreHistory = useRef(false);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(4);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // ─── تهيئة Fabric.js ─────────────────────────────────────────────────────

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const parent = el.parentElement!;
    const w = parent.clientWidth;
    const h = Math.max(600, window.innerHeight - 200);

    const canvas = new fabric.Canvas(el, {
      width: w,
      height: h,
      backgroundColor: "#ffffff",
      selection: true,
      isDrawingMode: true,
    });

    // خلفية شبكية
    const gridSize = 30;
    for (let x = 0; x <= w; x += gridSize) {
      canvas.add(new fabric.Line([x, 0, x, h], { stroke: "#f0f0f0", strokeWidth: 0.5, selectable: false, evented: false, excludeFromExport: false }));
    }
    for (let y = 0; y <= h; y += gridSize) {
      canvas.add(new fabric.Line([0, y, w, y], { stroke: "#f0f0f0", strokeWidth: 0.5, selectable: false, evented: false, excludeFromExport: false }));
    }

    canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
    canvas.freeDrawingBrush.color = color;
    canvas.freeDrawingBrush.width = brushSize;

    fabricRef.current = canvas;

    // حفظ الحالة الأولية
    historyRef.current = [JSON.stringify(canvas.toJSON())];

    // تتبع التغييرات
    canvas.on("object:added", () => {
      if (ignoreHistory.current) return;
      historyRef.current.push(JSON.stringify(canvas.toJSON()));
      redoRef.current = [];
      setCanUndo(historyRef.current.length > 1);
      setCanRedo(false);
    });

    canvas.on("object:modified", () => {
      if (ignoreHistory.current) return;
      historyRef.current.push(JSON.stringify(canvas.toJSON()));
      redoRef.current = [];
      setCanUndo(historyRef.current.length > 1);
      setCanRedo(false);
    });

    // تحميل حالة محفوظة
    try {
      const saved = localStorage.getItem("mutqin_whiteboard");
      if (saved) {
        ignoreHistory.current = true;
        canvas.loadFromJSON(JSON.parse(saved)).then(() => {
          canvas.renderAll();
          ignoreHistory.current = false;
          historyRef.current = [JSON.stringify(canvas.toJSON())];
        });
      }
    } catch {}

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  // ─── تحديث الأداة ─────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (tool === "pen") {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = color;
      canvas.freeDrawingBrush.width = brushSize;
      canvas.selection = false;
    } else if (tool === "eraser") {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = "#ffffff";
      canvas.freeDrawingBrush.width = brushSize * 3;
      canvas.selection = false;
    } else if (tool === "select") {
      canvas.isDrawingMode = false;
      canvas.selection = true;
    } else {
      canvas.isDrawingMode = false;
      canvas.selection = false;
    }
  }, [tool, color, brushSize]);

  // ─── إضافة أشكال ──────────────────────────────────────────────────────────

  const addText = useCallback((text: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const textObj = new fabric.IText(text, {
      left: canvas.width! / 2 - 100,
      top: canvas.height! / 2 - 20,
      fontFamily: "'Amiri', serif",
      fontSize: 28,
      fill: color,
      direction: "rtl",
      textAlign: "right",
    });
    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    setTool("select");
  }, [color]);

  const addRect = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const rect = new fabric.Rect({
      left: canvas.width! / 2 - 50,
      top: canvas.height! / 2 - 25,
      width: 100,
      height: 50,
      fill: "transparent",
      stroke: color,
      strokeWidth: brushSize,
      rx: 6,
      ry: 6,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    setTool("select");
  }, [color, brushSize]);

  const addCircle = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const circle = new fabric.Circle({
      left: canvas.width! / 2 - 30,
      top: canvas.height! / 2 - 30,
      radius: 30,
      fill: "transparent",
      stroke: color,
      strokeWidth: brushSize,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    setTool("select");
  }, [color, brushSize]);

  const addTajweedMark = useCallback((mark: typeof TAJWEED_MARKS[0]) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const text = new fabric.IText(`${mark.symbol} ${mark.label}`, {
      left: canvas.width! / 2 - 40,
      top: canvas.height! / 2 - 15,
      fontFamily: "'Tajawal', sans-serif",
      fontSize: 22,
      fill: mark.color,
      direction: "rtl",
      textAlign: "center",
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    setTool("select");
  }, []);

  // ─── تراجع / إعادة ────────────────────────────────────────────────────────

  const undo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyRef.current.length <= 1) return;
    redoRef.current.push(historyRef.current.pop()!);
    const prev = historyRef.current[historyRef.current.length - 1];
    ignoreHistory.current = true;
    canvas.loadFromJSON(JSON.parse(prev)).then(() => {
      canvas.renderAll();
      ignoreHistory.current = false;
      setCanUndo(historyRef.current.length > 1);
      setCanRedo(redoRef.current.length > 0);
    });
  }, []);

  const redo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || redoRef.current.length === 0) return;
    const next = redoRef.current.pop()!;
    historyRef.current.push(next);
    ignoreHistory.current = true;
    canvas.loadFromJSON(JSON.parse(next)).then(() => {
      canvas.renderAll();
      ignoreHistory.current = false;
      setCanUndo(historyRef.current.length > 1);
      setCanRedo(redoRef.current.length > 0);
    });
  }, []);

  // ─── حذف العنصر المحدد ────────────────────────────────────────────────────

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length === 0) return;
    active.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  }, []);

  // ─── مسح الكل ─────────────────────────────────────────────────────────────

  const clearAll = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#ffffff";
    canvas.renderAll();
  }, []);

  // ─── حفظ / تنزيل ─────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    localStorage.setItem("mutqin_whiteboard", JSON.stringify(canvas.toJSON()));
    toast({ title: "تم الحفظ", description: "تم حفظ السبورة بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
  }, [toast]);

  const handleDownload = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `whiteboard-${Date.now()}.png`;
    a.click();
  }, []);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          deleteSelected();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [deleteSelected, undo, redo]);

  // mouse handler for rect/circle tools
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const handleMouseDown = (opt: fabric.TPointerEventInfo) => {
      if (tool === "text") {
        const pointer = canvas.getScenePoint(opt.e);
        const text = new fabric.IText("اكتب هنا...", {
          left: pointer.x,
          top: pointer.y,
          fontFamily: "'Amiri', serif",
          fontSize: 24,
          fill: color,
          direction: "rtl",
          textAlign: "right",
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        setTool("select");
      } else if (tool === "rect") {
        addRect();
      } else if (tool === "circle") {
        addCircle();
      }
    };
    canvas.on("mouse:down", handleMouseDown);
    return () => { canvas.off("mouse:down", handleMouseDown); };
  }, [tool, color, brushSize, addRect, addCircle]);

  // ─── الواجهة ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* العنوان */}
      <div className="px-4 py-3 border-b">
        <h1 className="text-xl font-bold font-serif text-primary flex items-center gap-2">
          <span className="text-2xl">🖊️</span>
          السبورة التفاعلية
        </h1>
        <p className="text-xs text-muted-foreground">أداة بصرية لتصحيح التجويد والتعليم التفاعلي</p>
      </div>

      {/* شريط الأدوات */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-2 space-y-2">
        {/* صف الأدوات الرئيسية */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* أدوات الرسم */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button variant={tool === "select" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setTool("select")} title="تحديد ونقل">
              <MousePointer className="w-4 h-4" />
            </Button>
            <Button variant={tool === "pen" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setTool("pen")} title="قلم">
              <Pen className="w-4 h-4" />
            </Button>
            <Button variant={tool === "eraser" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setTool("eraser")} title="ممحاة">
              <Eraser className="w-4 h-4" />
            </Button>
            <Button variant={tool === "text" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setTool("text")} title="نص">
              <Type className="w-4 h-4" />
            </Button>
            <Button variant={tool === "rect" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => { setTool("select"); addRect(); }} title="مستطيل">
              <Square className="w-4 h-4" />
            </Button>
            <Button variant={tool === "circle" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => { setTool("select"); addCircle(); }} title="دائرة">
              <Circle className="w-4 h-4" />
            </Button>
          </div>

          {/* تراجع / إعادة / حذف / مسح */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={!canUndo} title="تراجع">
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={!canRedo} title="إعادة">
              <Redo2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={deleteSelected} title="حذف المحدد (Delete)">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={clearAll} title="مسح الكل">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* حفظ / تنزيل */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSave} title="حفظ">
              <Save className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload} title="تنزيل صورة">
              <Download className="w-4 h-4" />
            </Button>
          </div>

          {/* الألوان */}
          <div className="flex items-center gap-0.5 border rounded-lg p-1">
            {COLORS.map(c => (
              <button
                key={c}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? "scale-125 border-primary" : "border-transparent hover:scale-110"}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>

          {/* حجم الفرشاة */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            {BRUSH_SIZES.slice(0, 4).map(size => (
              <button
                key={size}
                className={`w-7 h-7 rounded flex items-center justify-center ${brushSize === size ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                onClick={() => setBrushSize(size)}
              >
                <div className="rounded-full bg-current" style={{ width: size + 2, height: size + 2 }} />
              </button>
            ))}
          </div>
        </div>

        {/* الشريط الجانبي — آيات + تجويد */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
            <select
              className="text-xs border rounded px-2 py-1 bg-background"
              defaultValue=""
              onChange={e => { if (e.target.value) { addText(e.target.value); e.target.value = ""; } }}
            >
              <option value="">إدراج آية...</option>
              {QURAN_VERSES.map((v, i) => <option key={i} value={v}>{v.slice(0, 30)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {TAJWEED_MARKS.map(mark => (
              <button
                key={mark.label}
                onClick={() => addTajweedMark(mark)}
                className="flex items-center gap-1 text-xs px-2 py-1 border rounded-full hover:bg-muted transition-colors whitespace-nowrap"
                style={{ borderColor: mark.color, color: mark.color }}
              >
                {mark.symbol} {mark.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* منطقة الرسم */}
      <div className="relative" style={{ cursor: tool === "pen" ? "crosshair" : tool === "eraser" ? "cell" : tool === "text" ? "text" : "default" }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  Pen, Eraser, Type, Square, Circle, Trash2, Download, Undo2, Redo2,
  Palette, Minus, Plus, MousePointer, Move, Save, FolderOpen, BookOpen
} from "lucide-react";

type Tool = "pen" | "eraser" | "text" | "rect" | "circle" | "select";
type DrawAction = {
  type: "path" | "text" | "rect" | "circle";
  points?: { x: number; y: number }[];
  text?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  color: string;
  lineWidth: number;
  fontSize?: number;
};

const COLORS = [
  "#000000", "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1",
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

export default function WhiteboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [redoStack, setRedoStack] = useState<DrawAction[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [textInput, setTextInput] = useState("");
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [selectedVerse, setSelectedVerse] = useState("");
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 600 });
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);

  const getCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    actions.forEach((action) => {
      ctx.strokeStyle = action.color;
      ctx.fillStyle = action.color;
      ctx.lineWidth = action.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (action.type === "path" && action.points && action.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(action.points[0].x, action.points[0].y);
        for (let i = 1; i < action.points.length; i++) {
          ctx.lineTo(action.points[i].x, action.points[i].y);
        }
        ctx.stroke();
      } else if (action.type === "text" && action.text && action.x !== undefined && action.y !== undefined) {
        ctx.font = `${action.fontSize || 24}px 'Amiri', serif`;
        ctx.textAlign = "right";
        ctx.direction = "rtl";
        ctx.fillText(action.text, action.x, action.y);
      } else if (action.type === "rect" && action.x !== undefined && action.y !== undefined) {
        ctx.strokeRect(action.x, action.y, action.width || 0, action.height || 0);
      } else if (action.type === "circle" && action.x !== undefined && action.y !== undefined) {
        ctx.beginPath();
        ctx.arc(action.x, action.y, action.radius || 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }, [actions]);

  useEffect(() => {
    redrawCanvas();
  }, [actions, redrawCanvas]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = Math.min(containerRef.current.clientWidth - 16, 1200);
        setCanvasSize({ width: Math.max(width, 400), height: 600 });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (tool === "text") {
      setTextPosition(coords);
      setShowTextInput(true);
      return;
    }

    if (tool === "rect" || tool === "circle") {
      setShapeStart(coords);
      setIsDrawing(true);
      return;
    }

    if (tool === "eraser") {
      setIsDrawing(true);
      setCurrentPath([coords]);
      return;
    }

    setIsDrawing(true);
    setCurrentPath([coords]);
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);

    if (tool === "pen" || tool === "eraser") {
      setCurrentPath((prev) => [...prev, coords]);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth = tool === "eraser" ? lineWidth * 3 : lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const prevPoint = currentPath[currentPath.length - 1] || coords;
      ctx.beginPath();
      ctx.moveTo(prevPoint.x, prevPoint.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const handlePointerUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if ((tool === "pen" || tool === "eraser") && currentPath.length > 0) {
      const newAction: DrawAction = {
        type: "path",
        points: [...currentPath],
        color: tool === "eraser" ? "#ffffff" : color,
        lineWidth: tool === "eraser" ? lineWidth * 3 : lineWidth,
      };
      setActions((prev) => [...prev, newAction]);
      setRedoStack([]);
      setCurrentPath([]);
    } else if (tool === "rect" && shapeStart) {
      const coords = getCanvasCoords(e);
      const newAction: DrawAction = {
        type: "rect",
        x: Math.min(shapeStart.x, coords.x),
        y: Math.min(shapeStart.y, coords.y),
        width: Math.abs(coords.x - shapeStart.x),
        height: Math.abs(coords.y - shapeStart.y),
        color,
        lineWidth,
      };
      setActions((prev) => [...prev, newAction]);
      setRedoStack([]);
      setShapeStart(null);
    } else if (tool === "circle" && shapeStart) {
      const coords = getCanvasCoords(e);
      const radius = Math.sqrt(Math.pow(coords.x - shapeStart.x, 2) + Math.pow(coords.y - shapeStart.y, 2));
      const newAction: DrawAction = {
        type: "circle",
        x: shapeStart.x,
        y: shapeStart.y,
        radius,
        color,
        lineWidth,
      };
      setActions((prev) => [...prev, newAction]);
      setRedoStack([]);
      setShapeStart(null);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (tool === "pen" || tool === "eraser") {
      setIsDrawing(true);
      setCurrentPath([coords]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    setCurrentPath((prev) => [...prev, coords]);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "eraser" ? lineWidth * 3 : lineWidth;
    ctx.lineCap = "round";
    const prevPoint = currentPath[currentPath.length - 1] || coords;
    ctx.beginPath();
    ctx.moveTo(prevPoint.x, prevPoint.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const handleTouchEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentPath.length > 0) {
      setActions((prev) => [...prev, {
        type: "path",
        points: [...currentPath],
        color: tool === "eraser" ? "#ffffff" : color,
        lineWidth: tool === "eraser" ? lineWidth * 3 : lineWidth,
      }]);
      setRedoStack([]);
      setCurrentPath([]);
    }
  };

  const addText = () => {
    if (!textInput || !textPosition) return;
    const newAction: DrawAction = {
      type: "text",
      text: textInput,
      x: textPosition.x,
      y: textPosition.y,
      color,
      lineWidth,
      fontSize,
    };
    setActions((prev) => [...prev, newAction]);
    setRedoStack([]);
    setTextInput("");
    setShowTextInput(false);
    setTextPosition(null);
  };

  const addVerse = () => {
    if (!selectedVerse) return;
    const newAction: DrawAction = {
      type: "text",
      text: selectedVerse,
      x: canvasSize.width / 2 + 100,
      y: 80,
      color: "#1e3a5f",
      lineWidth: 1,
      fontSize: 32,
    };
    setActions((prev) => [...prev, newAction]);
    setRedoStack([]);
    setSelectedVerse("");
  };

  const addTajweedMark = (mark: typeof TAJWEED_MARKS[0]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const newAction: DrawAction = {
      type: "text",
      text: `${mark.symbol} ${mark.label}`,
      x: canvasSize.width / 2,
      y: canvasSize.height / 2,
      color: mark.color,
      lineWidth: 1,
      fontSize: 20,
    };
    setActions((prev) => [...prev, newAction]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (actions.length === 0) return;
    const lastAction = actions[actions.length - 1];
    setActions((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, lastAction]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const lastRedo = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setActions((prev) => [...prev, lastRedo]);
  };

  const handleClear = () => {
    setActions([]);
    setRedoStack([]);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `whiteboard-${new Date().toISOString().split("T")[0]}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast({ title: "تم", description: "تم تحميل الصورة بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
  };

  const handleSave = () => {
    try {
      localStorage.setItem(`mutqin_whiteboard_${user?.id || "guest"}`, JSON.stringify(actions));
      toast({ title: "تم", description: "تم حفظ السبورة بنجاح", className: "bg-green-50 border-green-200 text-green-800" });
    } catch {
      toast({ title: "خطأ", description: "فشل في حفظ السبورة", variant: "destructive" });
    }
  };

  const handleLoad = () => {
    try {
      const stored = localStorage.getItem(`mutqin_whiteboard_${user?.id || "guest"}`);
      if (stored) {
        setActions(JSON.parse(stored));
        setRedoStack([]);
        toast({ title: "تم", description: "تم تحميل السبورة المحفوظة", className: "bg-green-50 border-green-200 text-green-800" });
      } else {
        toast({ title: "تنبيه", description: "لا يوجد سبورة محفوظة" });
      }
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل السبورة", variant: "destructive" });
    }
  };

  const tools: { id: Tool; label: string; icon: React.ElementType }[] = [
    { id: "pen", label: "قلم", icon: Pen },
    { id: "eraser", label: "ممحاة", icon: Eraser },
    { id: "text", label: "نص", icon: Type },
    { id: "rect", label: "مستطيل", icon: Square },
    { id: "circle", label: "دائرة", icon: Circle },
  ];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 page-transition" dir="rtl" data-testid="whiteboard-page">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-whiteboard">
            السبورة التفاعلية
          </h1>
          <p className="text-muted-foreground text-sm">أداة بصرية لتصحيح التجويد والتعليم التفاعلي</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleSave} className="gap-1" data-testid="btn-save">
            <Save className="w-4 h-4" />
            حفظ
          </Button>
          <Button variant="outline" size="sm" onClick={handleLoad} className="gap-1" data-testid="btn-load">
            <FolderOpen className="w-4 h-4" />
            تحميل
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1" data-testid="btn-download">
            <Download className="w-4 h-4" />
            تنزيل صورة
          </Button>
        </div>
      </div>

      <Card data-testid="toolbar">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 border-l pl-3">
              {tools.map((t) => (
                <Button
                  key={t.id}
                  variant={tool === t.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTool(t.id)}
                  className="gap-1"
                  data-testid={`btn-tool-${t.id}`}
                  title={t.label}
                >
                  <t.icon className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs">{t.label}</span>
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-1 border-l pl-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? "scale-125 border-gray-900 dark:border-white" : "border-transparent hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                  data-testid={`btn-color-${c}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1 border-l pl-3">
              <Minus className="w-3 h-3 text-muted-foreground" />
              {BRUSH_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => setLineWidth(size)}
                  className={`rounded-full bg-current transition-transform ${lineWidth === size ? "ring-2 ring-primary scale-125" : "hover:scale-110"}`}
                  style={{ width: size + 6, height: size + 6, color: color }}
                  data-testid={`btn-size-${size}`}
                />
              ))}
              <Plus className="w-3 h-3 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={handleUndo} disabled={actions.length === 0} data-testid="btn-undo" title="تراجع">
                <Undo2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRedo} disabled={redoStack.length === 0} data-testid="btn-redo" title="إعادة">
                <Redo2 className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleClear} className="text-red-500 hover:text-red-700" data-testid="btn-clear" title="مسح الكل">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-4">
        <Card ref={containerRef} data-testid="canvas-container">
          <CardContent className="p-2">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              className="border rounded-lg cursor-crosshair w-full touch-none"
              style={{ maxHeight: "70vh" }}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              data-testid="canvas-whiteboard"
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card data-testid="verse-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                إدراج آية قرآنية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Select value={selectedVerse} onValueChange={setSelectedVerse}>
                <SelectTrigger data-testid="select-verse" className="text-xs">
                  <SelectValue placeholder="اختر آية..." />
                </SelectTrigger>
                <SelectContent>
                  {QURAN_VERSES.map((v, i) => (
                    <SelectItem key={i} value={v} className="text-xs font-serif">{v.slice(0, 30)}...</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={addVerse} disabled={!selectedVerse} className="w-full text-xs" data-testid="btn-add-verse">
                إدراج الآية
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="tajweed-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="w-4 h-4" />
                علامات التجويد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-1.5">
                {TAJWEED_MARKS.map((mark) => (
                  <Button
                    key={mark.label}
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1 justify-start"
                    style={{ borderColor: mark.color, color: mark.color }}
                    onClick={() => addTajweedMark(mark)}
                    data-testid={`btn-tajweed-${mark.label}`}
                  >
                    <span className="font-bold">{mark.symbol}</span>
                    {mark.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {tool === "text" && (
            <Card data-testid="text-settings">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">حجم الخط</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setFontSize(Math.max(12, fontSize - 4))} data-testid="btn-decrease-font">
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="text-sm font-bold w-8 text-center">{fontSize}</span>
                  <Button variant="outline" size="sm" onClick={() => setFontSize(Math.min(72, fontSize + 4))} data-testid="btn-increase-font">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showTextInput && textPosition && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowTextInput(false)}>
          <div className="bg-background rounded-xl p-4 shadow-xl space-y-3 min-w-[300px]" onClick={e => e.stopPropagation()} data-testid="text-input-dialog">
            <h3 className="font-semibold text-sm">إضافة نص</h3>
            <Input
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder="اكتب النص هنا..."
              className="font-serif text-lg"
              autoFocus
              data-testid="input-text-content"
              onKeyDown={e => e.key === "Enter" && addText()}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={addText} disabled={!textInput} className="flex-1" data-testid="btn-confirm-text">
                إضافة
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowTextInput(false)} data-testid="btn-cancel-text">
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
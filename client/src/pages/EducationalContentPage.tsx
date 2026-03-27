import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import {
  Loader2, Plus, BookOpen, Trash2, Brain, CheckCircle2, XCircle, RotateCcw, Filter, Layers
} from "lucide-react";

interface SimilarVerse {
  id: string;
  verse1Surah: string;
  verse1Number: number;
  verse1Text: string;
  verse2Surah: string;
  verse2Number: number;
  verse2Text: string;
  explanation: string | null;
  difficulty: string;
  createdAt: string;
}

interface TajweedRule {
  id: string;
  category: string;
  title: string;
  description: string;
  examples: string | null;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
}

const difficultyMap: Record<string, { label: string; color: string }> = {
  easy: { label: "سهل", color: "bg-green-100 text-green-800 border-green-200" },
  medium: { label: "متوسط", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  hard: { label: "صعب", color: "bg-red-100 text-red-800 border-red-200" },
};

const categoryLabels: Record<string, string> = {
  idgham: "الإدغام",
  ikhfaa: "الإخفاء",
  iqlab: "الإقلاب",
  madd: "المد",
  qalqalah: "القلقلة",
  waqf: "الوقف والابتداء",
  noon_sakinah: "أحكام النون الساكنة والتنوين",
  meem_sakinah: "أحكام الميم الساكنة",
};

function generateQuestions(rules: TajweedRule[]): QuizQuestion[] {
  if (rules.length < 2) return [];
  const questions: QuizQuestion[] = [];

  rules.forEach(rule => {
    const otherRules = rules.filter(r => r.id !== rule.id);
    if (otherRules.length < 3) return;

    const shuffled = [...otherRules].sort(() => Math.random() - 0.5).slice(0, 3);
    const correctIndex = Math.floor(Math.random() * 4);
    const options = [...shuffled.map(r => r.title)];
    options.splice(correctIndex, 0, rule.title);

    questions.push({
      question: `ما هو الحكم التجويدي الذي يُعرّف بـ: "${rule.description.substring(0, 80)}..."؟`,
      options,
      correctIndex,
      category: rule.category,
    });
  });

  return questions.sort(() => Math.random() - 0.5);
}

export default function EducationalContentPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [similarVerses, setSimilarVerses] = useState<SimilarVerse[]>([]);
  const [tajweedRules, setTajweedRules] = useState<TajweedRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState("all");

  const [verse1Surah, setVerse1Surah] = useState("");
  const [verse1Number, setVerse1Number] = useState("");
  const [verse1Text, setVerse1Text] = useState("");
  const [verse2Surah, setVerse2Surah] = useState("");
  const [verse2Number, setVerse2Number] = useState("");
  const [verse2Text, setVerse2Text] = useState("");
  const [explanation, setExplanation] = useState("");
  const [difficulty, setDifficulty] = useState("medium");

  const [quizMode, setQuizMode] = useState(false);
  const [quizVerseIndex, setQuizVerseIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [exerciseScore, setExerciseScore] = useState(0);
  const [exerciseTotal, setExerciseTotal] = useState(0);
  const [exerciseCategory, setExerciseCategory] = useState("all");
  const [exerciseStarted, setExerciseStarted] = useState(false);

  const canManage = user?.role === "admin" || user?.role === "supervisor";

  const fetchData = async () => {
    try {
      const [versesRes, rulesRes] = await Promise.all([
        fetch("/api/similar-verses", { credentials: "include" }),
        fetch("/api/tajweed-rules", { credentials: "include" }),
      ]);
      if (versesRes.ok) setSimilarVerses(await versesRes.json());
      if (rulesRes.ok) setTajweedRules(await rulesRes.json());
    } catch {
      toast({ title: "خطأ", description: "فشل في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const saved = localStorage.getItem("tajweed_exercise_score");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setExerciseScore(parsed.score || 0);
        setExerciseTotal(parsed.total || 0);
      } catch {}
    }
  }, []);

  const saveExerciseScore = (score: number, total: number) => {
    localStorage.setItem("tajweed_exercise_score", JSON.stringify({ score, total }));
  };

  const resetForm = () => {
    setVerse1Surah(""); setVerse1Number(""); setVerse1Text("");
    setVerse2Surah(""); setVerse2Number(""); setVerse2Text("");
    setExplanation(""); setDifficulty("medium");
  };

  const handleCreate = async () => {
    if (!verse1Surah || !verse1Number || !verse1Text || !verse2Surah || !verse2Number || !verse2Text) {
      toast({ title: "خطأ", description: "جميع حقول الآيات مطلوبة", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/similar-verses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          verse1Surah, verse1Number: parseInt(verse1Number), verse1Text,
          verse2Surah, verse2Number: parseInt(verse2Number), verse2Text,
          explanation: explanation || null, difficulty,
        }),
      });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم إضافة المتشابهات", className: "bg-green-50 border-green-200 text-green-800" });
        setDialogOpen(false);
        resetForm();
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: "خطأ", description: err.message || "فشل في الإضافة", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVerse = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/similar-verses/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        toast({ title: "تم بنجاح", description: "تم الحذف", className: "bg-green-50 border-green-200 text-green-800" });
        fetchData();
      } else {
        toast({ title: "خطأ", description: "فشل في الحذف", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال بالخادم", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredVerses = filterDifficulty === "all"
    ? similarVerses
    : similarVerses.filter(v => v.difficulty === filterDifficulty);

  const startQuiz = () => {
    if (filteredVerses.length === 0) return;
    setQuizMode(true);
    setQuizVerseIndex(Math.floor(Math.random() * filteredVerses.length));
    setQuizAnswer(null);
    setQuizScore(0);
    setQuizTotal(0);
  };

  const handleQuizAnswer = (answer: string) => {
    const verse = filteredVerses[quizVerseIndex];
    const correct = answer === verse.verse2Text;
    setQuizAnswer(answer);
    setQuizTotal(prev => prev + 1);
    if (correct) setQuizScore(prev => prev + 1);
  };

  const nextQuizQuestion = () => {
    setQuizVerseIndex(Math.floor(Math.random() * filteredVerses.length));
    setQuizAnswer(null);
  };

  const startExercise = useCallback(() => {
    const filtered = exerciseCategory === "all"
      ? tajweedRules
      : tajweedRules.filter(r => r.category === exerciseCategory);
    const qs = generateQuestions(filtered);
    if (qs.length === 0) {
      toast({ title: "تنبيه", description: "لا توجد أسئلة كافية لهذه الفئة", variant: "destructive" });
      return;
    }
    setQuestions(qs.slice(0, 10));
    setCurrentQ(0);
    setSelectedAnswer(null);
    setExerciseStarted(true);
  }, [exerciseCategory, tajweedRules, toast]);

  const handleExerciseAnswer = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    const correct = index === questions[currentQ].correctIndex;
    const newScore = correct ? exerciseScore + 1 : exerciseScore;
    const newTotal = exerciseTotal + 1;
    setExerciseScore(newScore);
    setExerciseTotal(newTotal);
    saveExerciseScore(newScore, newTotal);
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      setExerciseStarted(false);
      toast({ title: "انتهى التمرين", description: `نتيجتك: ${exerciseScore}/${exerciseTotal}`, className: "bg-green-50 border-green-200 text-green-800" });
    }
  };

  const resetExerciseScore = () => {
    setExerciseScore(0);
    setExerciseTotal(0);
    saveExerciseScore(0, 0);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif text-primary" data-testid="text-page-title-educational-content">
          المحتوى التعليمي
        </h1>
        <p className="text-muted-foreground">المتشابهات القرآنية وتدريبات التجويد</p>
      </div>

      <Tabs defaultValue="similar" dir="rtl">
        <TabsList data-testid="tabs-educational">
          <TabsTrigger value="similar" data-testid="tab-similar">المتشابهات</TabsTrigger>
          <TabsTrigger value="exercises" data-testid="tab-exercises">تدريبات التجويد</TabsTrigger>
        </TabsList>

        <TabsContent value="similar" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-3">
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger className="w-40" data-testid="select-filter-difficulty">
                  <Filter className="w-4 h-4 ml-1" />
                  <SelectValue placeholder="المستوى" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع المستويات</SelectItem>
                  <SelectItem value="easy">سهل</SelectItem>
                  <SelectItem value="medium">متوسط</SelectItem>
                  <SelectItem value="hard">صعب</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={startQuiz} disabled={filteredVerses.length === 0} data-testid="button-start-quiz">
                <Brain className="w-4 h-4 ml-1" />
                وضع الاختبار
              </Button>
            </div>
            {canManage && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-similar-verse">
                    <Plus className="w-4 h-4 ml-1" />
                    إضافة متشابهات
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>إضافة آيات متشابهة</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="border rounded p-3 space-y-3">
                      <p className="font-semibold text-sm">الآية الأولى</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label>السورة</Label>
                          <Input value={verse1Surah} onChange={e => setVerse1Surah(e.target.value)} data-testid="input-verse1-surah" />
                        </div>
                        <div className="space-y-1">
                          <Label>رقم الآية</Label>
                          <Input type="number" value={verse1Number} onChange={e => setVerse1Number(e.target.value)} data-testid="input-verse1-number" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>نص الآية</Label>
                        <Textarea value={verse1Text} onChange={e => setVerse1Text(e.target.value)} rows={2} data-testid="input-verse1-text" />
                      </div>
                    </div>
                    <div className="border rounded p-3 space-y-3">
                      <p className="font-semibold text-sm">الآية الثانية</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label>السورة</Label>
                          <Input value={verse2Surah} onChange={e => setVerse2Surah(e.target.value)} data-testid="input-verse2-surah" />
                        </div>
                        <div className="space-y-1">
                          <Label>رقم الآية</Label>
                          <Input type="number" value={verse2Number} onChange={e => setVerse2Number(e.target.value)} data-testid="input-verse2-number" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>نص الآية</Label>
                        <Textarea value={verse2Text} onChange={e => setVerse2Text(e.target.value)} rows={2} data-testid="input-verse2-text" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>التوضيح</Label>
                      <Textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={2} data-testid="input-explanation" />
                    </div>
                    <div className="space-y-2">
                      <Label>المستوى</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger data-testid="select-difficulty">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">سهل</SelectItem>
                          <SelectItem value="medium">متوسط</SelectItem>
                          <SelectItem value="hard">صعب</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={handleCreate}
                      disabled={!verse1Surah || !verse1Text || !verse2Surah || !verse2Text || submitting}
                      className="w-full"
                      data-testid="button-confirm-add-verse"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                      إضافة
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {quizMode && filteredVerses.length > 0 && (
            <Card className="shadow-md border-t-4 border-t-primary" data-testid="card-quiz">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    وضع الاختبار
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" data-testid="badge-quiz-score">{quizScore}/{quizTotal}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => setQuizMode(false)} data-testid="button-exit-quiz">إنهاء</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">حدد الآية المشابهة لهذه الآية:</p>
                  <p className="text-lg font-semibold leading-relaxed" data-testid="text-quiz-verse">
                    {filteredVerses[quizVerseIndex]?.verse1Text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ({filteredVerses[quizVerseIndex]?.verse1Surah} - آية {filteredVerses[quizVerseIndex]?.verse1Number})
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {(() => {
                    const verse = filteredVerses[quizVerseIndex];
                    const wrongVerses = filteredVerses
                      .filter(v => v.id !== verse.id)
                      .sort(() => Math.random() - 0.5)
                      .slice(0, 2)
                      .map(v => v.verse2Text);
                    const options = [verse.verse2Text, ...wrongVerses].sort(() => Math.random() - 0.5);
                    return options.map((opt, i) => {
                      const isCorrect = opt === verse.verse2Text;
                      const isSelected = quizAnswer === opt;
                      let cls = "text-right p-3 border rounded";
                      if (quizAnswer) {
                        if (isCorrect) cls += " bg-green-50 border-green-300";
                        else if (isSelected) cls += " bg-red-50 border-red-300";
                      }
                      return (
                        <Button
                          key={i}
                          variant="outline"
                          className={cls}
                          onClick={() => handleQuizAnswer(opt)}
                          disabled={quizAnswer !== null}
                          data-testid={`button-quiz-option-${i}`}
                        >
                          {opt}
                          {quizAnswer && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />}
                          {quizAnswer && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-600 mr-2" />}
                        </Button>
                      );
                    });
                  })()}
                </div>
                {quizAnswer && (
                  <Button onClick={nextQuizQuestion} className="w-full" data-testid="button-next-quiz">
                    السؤال التالي
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12" data-testid="status-loading-educational-content">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="mr-2 text-muted-foreground">جاري التحميل...</span>
            </div>
          ) : filteredVerses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-verses">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد آيات متشابهة بعد</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVerses.map(v => (
                <Card key={v.id} className="shadow-sm border" data-testid={`card-verse-${v.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge className={difficultyMap[v.difficulty]?.color || ""} data-testid={`badge-difficulty-${v.id}`}>
                        {difficultyMap[v.difficulty]?.label || v.difficulty}
                      </Badge>
                      {canManage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDeleteVerse(v.id)}
                          disabled={deletingId === v.id}
                          data-testid={`button-delete-verse-${v.id}`}
                        >
                          {deletingId === v.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-blue-50 rounded p-3">
                      <p className="text-xs text-blue-600 mb-1">{v.verse1Surah} - آية {v.verse1Number}</p>
                      <p className="font-semibold leading-relaxed" data-testid={`text-verse1-${v.id}`}>{v.verse1Text}</p>
                    </div>
                    <div className="bg-green-50 rounded p-3">
                      <p className="text-xs text-green-600 mb-1">{v.verse2Surah} - آية {v.verse2Number}</p>
                      <p className="font-semibold leading-relaxed" data-testid={`text-verse2-${v.id}`}>{v.verse2Text}</p>
                    </div>
                    {v.explanation && (
                      <div className="text-sm text-muted-foreground bg-muted/30 rounded p-2">
                        <span className="font-medium">التوضيح: </span>{v.explanation}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="exercises" className="space-y-4">
          <Card className="shadow-md" data-testid="card-exercise-stats">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{exerciseScore}</p>
                    <p className="text-xs text-muted-foreground">إجابات صحيحة</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold">{exerciseTotal}</p>
                    <p className="text-xs text-muted-foreground">إجمالي المحاولات</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {exerciseTotal > 0 ? Math.round((exerciseScore / exerciseTotal) * 100) : 0}%
                    </p>
                    <p className="text-xs text-muted-foreground">نسبة النجاح</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={resetExerciseScore} data-testid="button-reset-score">
                  <RotateCcw className="w-4 h-4 ml-1" />
                  إعادة تعيين
                </Button>
              </div>
            </CardContent>
          </Card>

          {!exerciseStarted ? (
            <Card className="shadow-md" data-testid="card-exercise-start">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  ابدأ تمرين التجويد
                </CardTitle>
                <CardDescription>اختر فئة للتدريب عليها</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>الفئة</Label>
                  <Select value={exerciseCategory} onValueChange={setExerciseCategory}>
                    <SelectTrigger data-testid="select-exercise-category">
                      <SelectValue placeholder="جميع الفئات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الفئات</SelectItem>
                      {Object.entries(categoryLabels).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={startExercise} className="w-full" data-testid="button-start-exercise">
                  <Brain className="w-4 h-4 ml-1" />
                  ابدأ التمرين
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-md border-t-4 border-t-primary" data-testid="card-exercise-question">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    السؤال {currentQ + 1} من {questions.length}
                  </CardTitle>
                  <Badge variant="outline" data-testid="badge-exercise-category">
                    {categoryLabels[questions[currentQ]?.category] || questions[currentQ]?.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg font-medium leading-relaxed" data-testid="text-exercise-question">
                  {questions[currentQ]?.question}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {questions[currentQ]?.options.map((opt, i) => {
                    let cls = "text-right p-3 justify-start h-auto";
                    if (selectedAnswer !== null) {
                      if (i === questions[currentQ].correctIndex) cls += " bg-green-50 border-green-300 text-green-800";
                      else if (i === selectedAnswer) cls += " bg-red-50 border-red-300 text-red-800";
                    }
                    return (
                      <Button
                        key={i}
                        variant="outline"
                        className={cls}
                        onClick={() => handleExerciseAnswer(i)}
                        disabled={selectedAnswer !== null}
                        data-testid={`button-exercise-option-${i}`}
                      >
                        {opt}
                        {selectedAnswer !== null && i === questions[currentQ].correctIndex && (
                          <CheckCircle2 className="w-4 h-4 text-green-600 mr-auto" />
                        )}
                        {selectedAnswer !== null && i === selectedAnswer && i !== questions[currentQ].correctIndex && (
                          <XCircle className="w-4 h-4 text-red-600 mr-auto" />
                        )}
                      </Button>
                    );
                  })}
                </div>
                {selectedAnswer !== null && (
                  <Button onClick={nextQuestion} className="w-full" data-testid="button-next-question">
                    {currentQ < questions.length - 1 ? "السؤال التالي" : "إنهاء التمرين"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

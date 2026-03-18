import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Upload, Trash2, Loader2, CheckCircle2, AlertCircle, Volume2, Info, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AudioRecorderProps {
  assignmentId: string;
  surahName: string;
  fromVerse: number;
  toVerse: number;
  hasExistingAudio?: boolean;
  onAudioUploaded?: () => void;
  onAudioDeleted?: () => void;
}

const MAX_DURATION_SECONDS = 600;

type MicStatus = "checking" | "ready" | "denied" | "error" | "idle";

function detectBrowser(): string {
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  if (/CriOS/i.test(ua)) return "chrome-ios";
  if (/FxiOS/i.test(ua)) return "firefox-ios";
  if (/EdgiOS/i.test(ua)) return "edge-ios";
  if (/Safari/i.test(ua) && /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS/i.test(ua)) return "safari-ios";
  if (isAndroid && /Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) return "chrome-android";
  if (isAndroid) return "android-other";
  if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) return "chrome";
  if (/Firefox/i.test(ua)) return "firefox";
  if (/Edg/i.test(ua)) return "edge";
  if (/Safari/i.test(ua)) return "safari";
  return "other";
}

function getBrowserInstructions(browser: string): { steps: string[]; extra?: string } {
  switch (browser) {
    case "chrome-android":
      return {
        steps: [
          "اضغط على أيقونة القفل 🔒 في شريط العنوان أعلى الشاشة",
          "اضغط على \"الأذونات\"",
          "اضغط على \"الميكروفون\" واختر \"سماح\"",
          "اضغط زر \"إعادة تحميل الصفحة\" أدناه",
        ],
        extra: "إذا لم تجده: إعدادات الهاتف ← التطبيقات ← Chrome ← الأذونات ← الميكروفون ← سماح"
      };
    case "android-other":
      return {
        steps: [
          "اضغط على النقاط الثلاث ⋮ أو أيقونة القفل في المتصفح",
          "ابحث عن إعدادات الموقع أو الأذونات",
          "فعّل إذن الميكروفون",
          "أعد تحميل الصفحة",
        ],
        extra: "أو: إعدادات الهاتف ← التطبيقات ← المتصفح ← الأذونات ← الميكروفون"
      };
    case "chrome":
    case "edge":
      return {
        steps: [
          "اضغط على أيقونة القفل 🔒 بجانب عنوان الموقع في الأعلى",
          "ابحث عن \"الميكروفون\" واختر \"سماح\"",
          "أعد تحميل الصفحة",
        ]
      };
    case "safari":
      return {
        steps: [
          "اذهب إلى Safari ← الإعدادات ← المواقع ← الميكروفون",
          "ابحث عن هذا الموقع واختر \"سماح\"",
          "أعد تحميل الصفحة",
        ]
      };
    case "safari-ios":
      return {
        steps: [
          "اذهب إلى الإعدادات ← Safari ← الميكروفون",
          "تأكد أن \"السماح\" مفعّل",
          "ارجع للتطبيق وأعد تحميل الصفحة",
        ]
      };
    case "chrome-ios":
      return {
        steps: [
          "اذهب إلى الإعدادات ← Chrome ← الميكروفون",
          "تأكد أن الميكروفون مفعّل",
          "ارجع للتطبيق وأعد تحميل الصفحة",
        ]
      };
    case "firefox":
      return {
        steps: [
          "اضغط على أيقونة القفل بجانب عنوان الموقع",
          "اضغط \"مسح الأذونات والبيانات المخزنة\"",
          "أعد تحميل الصفحة وسيظهر طلب الإذن مجدداً",
        ]
      };
    default:
      return {
        steps: [
          "افتح إعدادات المتصفح",
          "ابحث عن إعدادات الميكروفون وسمح لهذا الموقع",
          "أعد تحميل الصفحة",
        ]
      };
  }
}

export default function AudioRecorder({
  assignmentId,
  surahName,
  fromVerse,
  toVerse,
  hasExistingAudio = false,
  onAudioUploaded,
  onAudioDeleted,
}: AudioRecorderProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(hasExistingAudio);
  const [deleting, setDeleting] = useState(false);
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");
  const [showHelp, setShowHelp] = useState(false);
  const [testingMic, setTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const browser = detectBrowser();

  useEffect(() => {
    setUploaded(hasExistingAudio);
  }, [hasExistingAudio]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [audioUrl]);

  useEffect(() => {
    checkMicPermission();
  }, []);

  const checkMicPermission = async () => {
    if (!navigator.permissions) {
      setMicStatus("idle");
      return;
    }
    try {
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (result.state === "granted") {
        setMicStatus("ready");
      } else if (result.state === "denied") {
        setMicStatus("denied");
      } else {
        setMicStatus("idle");
      }
      result.onchange = () => {
        if (result.state === "granted") setMicStatus("ready");
        else if (result.state === "denied") setMicStatus("denied");
        else setMicStatus("idle");
      };
    } catch {
      setMicStatus("idle");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const requestAndGetStream = async (): Promise<MediaStream> => {
    setMicStatus("checking");
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      }
    });
    setMicStatus("ready");
    return stream;
  };

  const testMicrophone = async () => {
    setTestingMic(true);
    try {
      const stream = await requestAndGetStream();
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      const updateLevel = () => {
        if (!analyzerRef.current) return;
        analyzerRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      toast({
        title: "المايكروفون يعمل ✓",
        description: "تحدث الآن لرؤية مستوى الصوت — سيتوقف الاختبار بعد 5 ثوانٍ",
        className: "bg-green-50 border-green-200 text-green-800"
      });

      setTimeout(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        analyzerRef.current = null;
        stream.getTracks().forEach(t => t.stop());
        audioCtx.close();
        setTestingMic(false);
        setMicLevel(0);
      }, 5000);

    } catch (err: any) {
      setTestingMic(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicStatus("denied");
        setShowHelp(true);
      } else {
        setMicStatus("error");
        toast({
          title: "خطأ",
          description: "لم يتم العثور على ميكروفون. تأكد من توصيل سماعة أو ميكروفون.",
          variant: "destructive"
        });
      }
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await requestAndGetStream();
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= MAX_DURATION_SECONDS - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setMicStatus("denied");
        setShowHelp(true);
      } else {
        setMicStatus("error");
        toast({
          title: "خطأ",
          description: "فشل في بدء التسجيل. تأكد من وجود ميكروفون متصل.",
          variant: "destructive"
        });
      }
    }
  }, [audioUrl, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const discardRecording = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
  };

  const uploadRecording = async () => {
    if (!audioBlob) return;
    setUploading(true);
    try {
      const formData = new FormData();
      const extension = audioBlob.type.includes("webm") ? "webm" : "mp4";
      formData.append("audio", audioBlob, `recitation_${assignmentId}.${extension}`);

      const res = await fetch(`/api/assignments/${assignmentId}/audio`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        setUploaded(true);
        setAudioBlob(null);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
          setAudioUrl(null);
        }
        toast({
          title: "تم الرفع بنجاح",
          description: "تم رفع التسجيل الصوتي وسيقوم المعلم بمراجعته",
          className: "bg-green-50 border-green-200 text-green-800"
        });
        onAudioUploaded?.();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "خطأ في الرفع",
          description: data.message || "فشل في رفع التسجيل",
          variant: "destructive"
        });
      }
    } catch {
      toast({
        title: "خطأ",
        description: "خطأ في الاتصال بالخادم",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteAudio = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/audio`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setUploaded(false);
        toast({
          title: "تم الحذف",
          description: "تم حذف التسجيل الصوتي",
          className: "bg-amber-50 border-amber-200 text-amber-800"
        });
        onAudioDeleted?.();
      } else {
        toast({ title: "خطأ", description: "فشل في حذف التسجيل", variant: "destructive" });
      }
    } catch {
      toast({ title: "خطأ", description: "خطأ في الاتصال", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (uploaded) {
    return (
      <div className="mt-3 p-3 bg-green-50/70 rounded-lg border border-green-200" data-testid={`audio-uploaded-${assignmentId}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded-full">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <span className="text-xs font-semibold text-green-800">تم التسميع الصوتي ✓</span>
              <p className="text-[10px] text-green-600">بانتظار مراجعة المعلم</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={(e) => { e.stopPropagation(); deleteAudio(); }}
            disabled={deleting}
            data-testid={`button-delete-audio-${assignmentId}`}
          >
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            <span className="mr-1">حذف</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 bg-violet-50/50 rounded-lg border border-violet-200" onClick={e => e.stopPropagation()} data-testid={`audio-recorder-${assignmentId}`}>
      <div className="flex items-center gap-2 mb-2">
        <Mic className="w-4 h-4 text-violet-600" />
        <span className="text-xs font-semibold text-violet-800">تسميع صوتي</span>
        <span className="text-[10px] text-violet-500">({surahName} — {fromVerse} إلى {toVerse})</span>
        {micStatus === "ready" && (
          <span className="text-[10px] text-green-600 mr-auto flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> المايكروفون جاهز
          </span>
        )}
      </div>

      {micStatus === "denied" && (
        <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-800 mb-1">المايكروفون محظور — اتبع الخطوات التالية:</p>
              <ol className="text-xs text-amber-700 space-y-1 list-decimal mr-4 mb-2">
                {getBrowserInstructions(browser).steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              {getBrowserInstructions(browser).extra && (
                <p className="text-[10px] text-amber-600 bg-amber-100 rounded p-1.5 mb-2">
                  💡 {getBrowserInstructions(browser).extra}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => window.location.reload()}
                  data-testid="button-reload-page"
                >
                  <RefreshCw className="w-3 h-3 ml-1" />
                  إعادة تحميل الصفحة
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                  onClick={() => { setMicStatus("idle"); setShowHelp(false); }}
                  data-testid="button-retry-mic"
                >
                  المحاولة مجدداً
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {micStatus === "error" && (
        <div className="mb-3 p-2.5 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-700 mb-1">لم يتم العثور على ميكروفون</p>
              <p className="text-[10px] text-red-600">تأكد من توصيل سماعة أو ميكروفون بجهازك، ثم اضغط \"المحاولة مجدداً\"</p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs mt-2 border-red-300 text-red-600 hover:bg-red-100"
                onClick={() => { setMicStatus("idle"); }}
                data-testid="button-retry-mic-error"
              >
                المحاولة مجدداً
              </Button>
            </div>
          </div>
        </div>
      )}

      {testingMic && (
        <div className="mb-3 p-2.5 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-1.5">
            <Volume2 className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold text-green-800">اختبار المايكروفون — تحدث الآن</span>
          </div>
          <div className="w-full bg-green-100 rounded-full h-3 overflow-hidden">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-100"
              style={{ width: `${micLevel}%` }}
            />
          </div>
          <p className="text-[10px] text-green-600 mt-1 text-center">
            {micLevel > 20 ? "ممتاز! المايكروفون يلتقط صوتك بوضوح ✓" : "تحدث بصوت أعلى قليلاً..."}
          </p>
        </div>
      )}

      {!audioBlob && !isRecording && (
        <div className="space-y-2">
          {micStatus !== "denied" && micStatus !== "error" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-10 text-xs gap-2 border-violet-300 text-violet-700 hover:bg-violet-100"
              onClick={startRecording}
              disabled={micStatus === "checking"}
              data-testid={`button-start-recording-${assignmentId}`}
            >
              {micStatus === "checking" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              {micStatus === "checking" ? "جاري التحقق من المايكروفون..." : "ابدأ التسجيل (حد أقصى 10 دقائق)"}
            </Button>
          )}
          {micStatus !== "denied" && micStatus !== "error" && !testingMic && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-[10px] text-muted-foreground hover:text-violet-700"
              onClick={testMicrophone}
              data-testid={`button-test-mic-${assignmentId}`}
            >
              <Volume2 className="w-3 h-3 ml-1" />
              اختبار المايكروفون أولاً
            </Button>
          )}
        </div>
      )}

      {isRecording && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-mono text-red-700" data-testid={`recording-timer-${assignmentId}`}>
                {formatTime(recordingTime)}
              </span>
              <span className="text-[10px] text-red-500">/ {formatTime(MAX_DURATION_SECONDS)}</span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={stopRecording}
              data-testid={`button-stop-recording-${assignmentId}`}
            >
              <Square className="w-3 h-3" />
              إيقاف
            </Button>
          </div>
          <div className="w-full bg-red-100 rounded-full h-1.5">
            <div
              className="bg-red-500 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${(recordingTime / MAX_DURATION_SECONDS) * 100}%` }}
            />
          </div>
        </div>
      )}

      {audioBlob && !isRecording && (
        <div className="space-y-2">
          {audioUrl && (
            <audio controls src={audioUrl} className="w-full h-10" data-testid={`audio-preview-${assignmentId}`} />
          )}
          <div className="text-[10px] text-gray-500 text-center">
            المدة: {formatTime(recordingTime)} — الحجم: {(audioBlob.size / 1024 / 1024).toFixed(2)} MB
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs gap-1 text-red-600 hover:bg-red-50"
              onClick={discardRecording}
              data-testid={`button-discard-recording-${assignmentId}`}
            >
              <Trash2 className="w-3 h-3" />
              إعادة التسجيل
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 text-xs gap-1 bg-violet-600 hover:bg-violet-700"
              onClick={uploadRecording}
              disabled={uploading}
              data-testid={`button-upload-recording-${assignmentId}`}
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              رفع التسجيل
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

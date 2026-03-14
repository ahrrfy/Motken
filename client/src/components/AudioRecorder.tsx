import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Upload, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    };
  }, [audioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
      streamRef.current = stream;
      setPermissionDenied(false);

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
        setPermissionDenied(true);
        toast({
          title: "تنبيه",
          description: "يرجى السماح بالوصول للميكروفون لتسجيل التسميع",
          variant: "destructive"
        });
      } else {
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
      </div>

      {permissionDenied && (
        <div className="flex items-center gap-2 mb-2 p-2 bg-red-50 rounded text-xs text-red-700">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          يرجى السماح بالوصول للميكروفون من إعدادات المتصفح
        </div>
      )}

      {!audioBlob && !isRecording && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-10 text-xs gap-2 border-violet-300 text-violet-700 hover:bg-violet-100"
          onClick={startRecording}
          data-testid={`button-start-recording-${assignmentId}`}
        >
          <Mic className="w-4 h-4" />
          ابدأ التسجيل (حد أقصى 10 دقائق)
        </Button>
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

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Volume2, Loader2, Mic } from "lucide-react";

interface AudioPlayerProps {
  assignmentId: string;
  surahName: string;
  fromVerse: number;
  toVerse: number;
  studentName?: string;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function AudioPlayer({
  assignmentId,
  surahName,
  fromVerse,
  toVerse,
  studentName,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = new Audio(`/api/assignments/${assignmentId}/audio`);
    audio.preload = "metadata";
    audioRef.current = audio;

    audio.addEventListener("loadedmetadata", () => {
      setDuration(audio.duration);
      setLoading(false);
    });

    audio.addEventListener("canplay", () => {
      setLoading(false);
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    });

    audio.addEventListener("error", () => {
      setError(true);
      setLoading(false);
    });

    return () => {
      audio.pause();
      audio.src = "";
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [assignmentId]);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(updateProgress);
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateProgress);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, updateProgress]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const seek = (value: number[]) => {
    if (!audioRef.current) return;
    const time = value[0];
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const restart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    if (!isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const changeSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(speed);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    const newSpeed = SPEED_OPTIONS[nextIndex];
    setSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  if (error) {
    return (
      <div className="p-2 bg-red-50 rounded-lg border border-red-200 text-center" data-testid={`audio-player-error-${assignmentId}`}>
        <p className="text-xs text-red-600">لا يمكن تحميل التسجيل الصوتي</p>
      </div>
    );
  }

  return (
    <div className="mt-3 p-3 bg-violet-50/70 rounded-lg border border-violet-200" onClick={e => e.stopPropagation()} data-testid={`audio-player-${assignmentId}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1 bg-violet-100 rounded-full">
          <Mic className="w-3.5 h-3.5 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold text-violet-800">تسميع صوتي</span>
          {studentName && (
            <span className="text-[10px] text-violet-500 mr-1">— {studentName}</span>
          )}
          <p className="text-[10px] text-violet-500 truncate">
            {surahName} ({fromVerse} - {toVerse})
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
          <span className="text-xs text-violet-500 mr-2">جاري تحميل التسجيل...</span>
        </div>
      ) : (
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={seek}
            className="w-full"
            data-testid={`audio-seek-${assignmentId}`}
          />
          <div className="flex items-center justify-between text-[10px] text-violet-600 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-violet-600 hover:bg-violet-100"
              onClick={restart}
              data-testid={`button-restart-audio-${assignmentId}`}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              size="sm"
              className="h-10 w-10 p-0 rounded-full bg-violet-600 hover:bg-violet-700"
              onClick={togglePlay}
              data-testid={`button-play-audio-${assignmentId}`}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 mr-[-2px]" />}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-violet-600 hover:bg-violet-100 font-mono"
              onClick={changeSpeed}
              data-testid={`button-speed-audio-${assignmentId}`}
            >
              {speed}x
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

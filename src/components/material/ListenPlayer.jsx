import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Headphones,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

function getPageTextFromDom(pageNumber) {
  if (typeof document === "undefined") return "";
  const pageShell = document.querySelector(
    `[data-pdf-page-number="${pageNumber}"]`,
  );
  if (!pageShell) return "";
  const spans = pageShell.querySelectorAll(
    ".react-pdf__Page__textContent span",
  );
  return Array.from(spans)
    .map((span) => String(span.textContent || "").trim())
    .filter(Boolean)
    .join(" ");
}

function splitIntoChunks(text) {
  if (!text) return [];
  return text
    .split(/(?<=[.!?…\n])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function estimateDuration(text, rate) {
  const wordsPerMinute = 160 * (rate || 1);
  const wordCount = String(text || "")
    .split(/\s+/)
    .filter(Boolean).length;
  if (!wordCount) return 0;
  return (wordCount / wordsPerMinute) * 60;
}

export default function ListenPlayer({
  isDarkMode = false,
  currentPage = 1,
}) {
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const chunkIndexRef = useRef(0);
  const chunksRef = useRef([]);
  const isCancellingRef = useRef(false);

  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [pageText, setPageText] = useState("");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const tick = () => {
      if (cancelled) return;
      const text = getPageTextFromDom(currentPage);
      if (text) {
        setPageText(text);
        chunksRef.current = splitIntoChunks(text);
        chunkIndexRef.current = 0;
        setProgress(0);
        return;
      }
      attempts += 1;
      if (attempts < 10) {
        setTimeout(tick, 250);
      } else {
        setPageText("");
        chunksRef.current = [];
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      window.speechSynthesis?.cancel?.();
    };
  }, []);

  const stopSpeech = useCallback(() => {
    if (!supported) return;
    isCancellingRef.current = true;
    window.speechSynthesis.cancel();
    setPlaying(false);
    setTimeout(() => {
      isCancellingRef.current = false;
    }, 50);
  }, [supported]);

  const speakFromIndex = useCallback(
    (startIndex) => {
      if (!supported) {
        setErrorMessage("Trình duyệt không hỗ trợ đọc to.");
        return;
      }
      const chunks = chunksRef.current;
      if (!chunks.length) {
        setErrorMessage("Không trích được nội dung trang này.");
        return;
      }
      setErrorMessage(null);
      window.speechSynthesis.cancel();
      chunkIndexRef.current = startIndex;

      const speakChunk = (index) => {
        if (index >= chunks.length) {
          setPlaying(false);
          setProgress(1);
          chunkIndexRef.current = chunks.length;
          return;
        }
        const utterance = new SpeechSynthesisUtterance(chunks[index]);
        utterance.rate = rate;
        utterance.volume = muted ? 0 : 1;
        utterance.lang = "vi-VN";
        utterance.onend = () => {
          if (isCancellingRef.current) return;
          chunkIndexRef.current = index + 1;
          setProgress((index + 1) / chunks.length);
          speakChunk(index + 1);
        };
        utterance.onerror = (event) => {
          if (event.error === "canceled" || event.error === "interrupted") {
            return;
          }
          setPlaying(false);
          setErrorMessage("Lỗi đọc to: " + event.error);
        };
        window.speechSynthesis.speak(utterance);
      };

      setPlaying(true);
      speakChunk(startIndex);
    },
    [muted, rate, supported],
  );

  const handlePlayPause = useCallback(() => {
    if (!supported) return;
    if (playing) {
      stopSpeech();
      return;
    }
    const chunks = chunksRef.current;
    const safeIndex =
      chunkIndexRef.current >= chunks.length ? 0 : chunkIndexRef.current;
    speakFromIndex(safeIndex);
  }, [playing, speakFromIndex, stopSpeech, supported]);

  const handleSkip = useCallback(
    (delta) => {
      const chunks = chunksRef.current;
      if (!chunks.length) return;
      const next = Math.min(
        Math.max(0, chunkIndexRef.current + delta),
        chunks.length,
      );
      chunkIndexRef.current = next;
      setProgress(next / chunks.length);
      if (playing) {
        speakFromIndex(next);
      }
    },
    [playing, speakFromIndex],
  );

  const handleRateCycle = useCallback(() => {
    setRate((current) => {
      const idx = SPEED_OPTIONS.indexOf(current);
      const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
      if (playing) {
        setTimeout(() => speakFromIndex(chunkIndexRef.current), 0);
      }
      return next;
    });
  }, [playing, speakFromIndex]);

  const handleMuteToggle = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      if (playing) {
        setTimeout(() => speakFromIndex(chunkIndexRef.current), 0);
      }
      return next;
    });
  }, [playing, speakFromIndex]);

  const totalDuration = useMemo(
    () => estimateDuration(pageText, rate),
    [pageText, rate],
  );
  const elapsed = totalDuration * progress;

  const iconBtn = `inline-flex items-center justify-center w-7 h-7 rounded-md transition ${
    isDarkMode
      ? "text-slate-300 hover:bg-slate-800"
      : "text-slate-600 hover:bg-blue-100"
  }`;

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border ${
        isDarkMode
          ? "bg-blue-500/10 border-blue-500/30"
          : "bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200/70 shadow-[0_2px_8px_-2px_rgba(37,99,235,0.25)]"
      }`}
    >
      <div
        className={`inline-flex items-center gap-1 pr-1.5 border-r ${
          isDarkMode ? "border-blue-500/30" : "border-blue-200/70"
        }`}
      >
        <Headphones
          size={12}
          className={isDarkMode ? "text-blue-300" : "text-blue-600"}
        />
        <span
          className={`text-[10px] font-extrabold uppercase tracking-wider ${
            isDarkMode ? "text-blue-300" : "text-blue-700"
          }`}
        >
          Nghe
        </span>
      </div>

      <button
        type="button"
        onClick={handleMuteToggle}
        title={muted ? "Bật âm" : "Tắt âm"}
        className={`${iconBtn} ${
          muted
            ? isDarkMode
              ? "bg-rose-500/20 text-rose-300"
              : "bg-rose-50 text-rose-600"
            : ""
        }`}
      >
        {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
      </button>

      <button
        type="button"
        onClick={() => handleSkip(-1)}
        title="Câu trước"
        className={iconBtn}
      >
        <RotateCcw size={13} />
      </button>

      <button
        type="button"
        onClick={handlePlayPause}
        disabled={!supported}
        title={playing ? "Tạm dừng" : "Phát"}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-white shadow-[0_4px_10px_-4px_rgba(37,99,235,0.55)] transition transform active:scale-95 ${
          supported ? "" : "opacity-50 cursor-not-allowed"
        }`}
        style={{
          background:
            "linear-gradient(135deg, #1E3A8A 0%, #2563EB 60%, #06B6D4 100%)",
        }}
      >
        {playing ? (
          <Pause size={14} fill="currentColor" />
        ) : (
          <Play size={14} fill="currentColor" className="ml-0.5" />
        )}
      </button>

      <button
        type="button"
        onClick={() => handleSkip(1)}
        title="Câu sau"
        className={iconBtn}
      >
        <RotateCw size={13} />
      </button>

      <div
        className={`flex items-center gap-1.5 px-1.5 min-w-[120px] ${
          errorMessage ? "opacity-60" : ""
        }`}
      >
        <span
          className={`text-[10px] font-bold tabular-nums ${
            isDarkMode ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {formatTime(elapsed)}
        </span>
        <div
          className={`relative flex-1 h-1 rounded-full overflow-hidden ${
            isDarkMode ? "bg-slate-800" : "bg-blue-100/80"
          }`}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-[width]"
            style={{
              width: `${Math.round(progress * 100)}%`,
              background: "linear-gradient(90deg, #2563EB 0%, #06B6D4 100%)",
            }}
          />
        </div>
        <span
          className={`text-[10px] font-bold tabular-nums ${
            isDarkMode ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {formatTime(totalDuration)}
        </span>
      </div>

      <button
        type="button"
        onClick={handleRateCycle}
        title="Tốc độ"
        className={`inline-flex items-center justify-center px-2 h-7 rounded-md text-[10px] font-extrabold transition ${
          isDarkMode
            ? "bg-slate-800 text-cyan-300 hover:bg-slate-700"
            : "bg-white/80 text-blue-700 hover:bg-white"
        }`}
      >
        {rate}x
      </button>

      {errorMessage && (
        <span
          className={`hidden lg:inline-flex max-w-[140px] truncate text-[10px] font-semibold ${
            isDarkMode ? "text-rose-300" : "text-rose-600"
          }`}
          title={errorMessage}
        >
          {errorMessage}
        </span>
      )}
    </div>
  );
}

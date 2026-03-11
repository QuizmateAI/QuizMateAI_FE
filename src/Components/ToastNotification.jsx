import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

function ToastNotification({ id, type, message, duration = 2000, onClose }) {
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);
  const startedAtRef = useRef(0);
  const remainingMsRef = useRef(duration);

  const stopTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimers = useCallback((remainingMs) => {
    stopTimers();

    if (remainingMs <= 0) {
      setProgress(0);
      onClose();
      return;
    }

    startedAtRef.current = Date.now();
    remainingMsRef.current = remainingMs;

    timeoutRef.current = setTimeout(() => {
      setProgress(0);
      onClose();
    }, remainingMs);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      const remaining = Math.max(0, remainingMsRef.current - elapsed);
      setProgress((remaining / duration) * 100);
    }, 50);
  }, [duration, onClose, stopTimers]);

  useEffect(() => {
    remainingMsRef.current = duration;
    const kickoff = setTimeout(() => {
      startTimers(duration);
    }, 0);

    return () => {
      clearTimeout(kickoff);
      stopTimers();
    };
  }, [id, duration, startTimers, stopTimers]);

  const handleMouseEnter = () => {
    if (isPaused) return;
    setIsPaused(true);
    const elapsed = Date.now() - startedAtRef.current;
    remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
    stopTimers();
  };

  const handleMouseLeave = () => {
    if (!isPaused) return;
    setIsPaused(false);
    startTimers(remainingMsRef.current);
  };

  const handleClose = () => {
    stopTimers();
    onClose();
  };

  const styleByType = {
    success: {
      textClass: 'text-emerald-600 dark:text-emerald-600',
      progressBgClass: 'bg-emerald-500',
      progressTrackClass: 'bg-emerald-100',
      icon: <CheckCircle2 className="w-4 h-4" aria-hidden="true" />,
      closeHoverClass: 'hover:text-emerald-700',
    },
    error: {
      textClass: 'text-rose-600 dark:text-rose-600',
      progressBgClass: 'bg-rose-500',
      progressTrackClass: 'bg-rose-100',
      icon: <AlertCircle className="w-4 h-4" aria-hidden="true" />,
      closeHoverClass: 'hover:text-rose-700',
    },
    warning: {
      textClass: 'text-amber-600 dark:text-amber-600',
      progressBgClass: 'bg-amber-500',
      progressTrackClass: 'bg-amber-100',
      icon: <AlertTriangle className="w-4 h-4" aria-hidden="true" />,
      closeHoverClass: 'hover:text-amber-700',
    },
    info: {
      textClass: 'text-sky-600 dark:text-sky-600',
      progressBgClass: 'bg-sky-500',
      progressTrackClass: 'bg-sky-100',
      icon: <Info className="w-4 h-4" aria-hidden="true" />,
      closeHoverClass: 'hover:text-sky-700',
    },
  };

  const selectedStyle = styleByType[type] || styleByType.info;
  const bgClass = 'bg-white dark:bg-white border-slate-200 dark:border-slate-300 shadow-xl';

  return (
    <div
      className={`w-[min(92vw,420px)] min-w-0 rounded-xl border shadow-lg overflow-hidden animate-in slide-in-from-right-5 duration-300 pointer-events-auto ${bgClass}`}
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`px-4 py-3 flex items-start gap-2 ${selectedStyle.textClass}`}>
        <span className="mt-0.5">{selectedStyle.icon}</span>
        <p className="text-sm font-medium flex-1 break-words">{message}</p>
        <button
          type="button"
          aria-label="Close toast"
          onClick={handleClose}
          className={`transition-colors ${selectedStyle.closeHoverClass}`}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <div className={`h-1 ${selectedStyle.progressTrackClass}`}>
        <div
          className={`h-full transition-all duration-75 ${selectedStyle.progressBgClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default ToastNotification;

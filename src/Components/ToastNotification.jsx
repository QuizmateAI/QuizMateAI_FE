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
  const isStructuredMessage = message && typeof message === 'object' && !Array.isArray(message);
  const structuredTitle = isStructuredMessage ? String(message.title || '').trim() : '';
  const structuredDescription = isStructuredMessage ? String(message.description || '').trim() : '';
  const structuredMeta = isStructuredMessage ? String(message.meta || '').trim() : '';
  const structuredItems = isStructuredMessage && Array.isArray(message.items) ? message.items : [];

  return (
    <div
      className={`w-[min(92vw,520px)] min-w-0 rounded-xl border shadow-lg overflow-hidden animate-in slide-in-from-right-5 duration-300 pointer-events-auto ${bgClass}`}
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="px-4 py-3 flex items-start gap-2">
        <span className={`mt-0.5 ${selectedStyle.textClass}`}>{selectedStyle.icon}</span>
        <div className="min-w-0 flex-1">
          {isStructuredMessage ? (
            <>
              {structuredTitle ? (
                <p className={`text-sm font-semibold break-words ${selectedStyle.textClass}`}>
                  {structuredTitle}
                </p>
              ) : null}
              {structuredDescription ? (
                <p className="mt-1 text-xs leading-5 text-slate-600 break-words">
                  {structuredDescription}
                </p>
              ) : null}
              {structuredItems.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {structuredItems.map((item, index) => {
                    const label = typeof item === 'string'
                      ? item
                      : String(item?.label || '').trim();
                    const detail = typeof item === 'string'
                      ? ''
                      : String(item?.detail || '').trim();

                    return (
                      <div key={`${label}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        {label ? (
                          <p className="text-xs font-semibold text-slate-900 break-words">
                            {label}
                          </p>
                        ) : null}
                        {detail ? (
                          <p className="mt-1 text-xs leading-5 text-slate-600 break-words">
                            {detail}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
              {structuredMeta ? (
                <p className="mt-2 text-[11px] leading-5 text-slate-500 break-words">
                  {structuredMeta}
                </p>
              ) : null}
            </>
          ) : (
            <p className={`text-sm font-medium break-words ${selectedStyle.textClass}`}>{message}</p>
          )}
        </div>
        <button
          type="button"
          aria-label="Close toast"
          onClick={handleClose}
          className={`transition-colors ${selectedStyle.textClass} ${selectedStyle.closeHoverClass}`}
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

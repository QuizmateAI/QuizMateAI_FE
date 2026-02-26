import React, { useEffect, useState } from 'react';

function ToastNotification({ id, type, message, duration = 2000, onClose }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);
    return () => clearInterval(interval);
  }, [id, duration, onClose]);

  const isSuccess = type === 'success';
  const bgClass = 'bg-white dark:bg-white border-slate-200 dark:border-slate-300 shadow-xl';
  const textClass = isSuccess ? 'text-emerald-600 dark:text-emerald-600' : 'text-rose-600 dark:text-rose-600';
  const progressBgClass = isSuccess ? 'bg-emerald-500' : 'bg-rose-500';

  return (
    <div
      className={`min-w-[320px] max-w-[420px] rounded-xl border shadow-lg overflow-hidden animate-in slide-in-from-right-5 duration-300 ${bgClass}`}
      role="alert"
    >
      <div className={`px-4 py-3 ${textClass}`}>
        <p className="text-sm font-medium">{message}</p>
      </div>
      <div className={`h-1 ${isSuccess ? 'bg-emerald-100' : 'bg-rose-100'}`}>
        <div
          className={`h-full transition-all duration-75 ${progressBgClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default ToastNotification;

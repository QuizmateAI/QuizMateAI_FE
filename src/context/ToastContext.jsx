import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import ToastNotification from '@/Components/ToastNotification';

const ToastContext = createContext(null);

const TOAST_DURATION = 2000;
const TOAST_DEDUP_MS = 1200;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const lastToastRef = useRef({ signature: '', timestamp: 0 });

  const pushToast = useCallback((type, message, options = {}) => {
    const normalizedMessage = typeof message === 'string'
      ? message.trim()
      : JSON.stringify(message || {});
    const signature = `${type}:${normalizedMessage}`;
    const now = Date.now();
    if (
      signature &&
      lastToastRef.current.signature === signature &&
      now - lastToastRef.current.timestamp < TOAST_DEDUP_MS
    ) {
      return null;
    }

    lastToastRef.current = { signature, timestamp: now };

    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, {
      id,
      type,
      message,
      duration: Number(options?.duration) > 0 ? Number(options.duration) : TOAST_DURATION,
    }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showSuccess = useCallback((message, options) => {
    return pushToast('success', message, options);
  }, [pushToast]);

  const showError = useCallback((message, options) => {
    return pushToast('error', message, options);
  }, [pushToast]);

  const showWarning = useCallback((message, options) => {
    return pushToast('warning', message, options);
  }, [pushToast]);

  const showInfo = useCallback((message, options) => {
    return pushToast('info', message, options);
  }, [pushToast]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError, showWarning, showInfo }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            id={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showSuccess: () => {},
      showError: () => {},
      showWarning: () => {},
      showInfo: () => {},
    };
  }
  return ctx;
}

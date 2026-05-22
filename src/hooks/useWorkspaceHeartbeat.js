import { useEffect, useRef } from 'react';
import { recordWorkspaceHeartbeat } from '@/api/GroupAPI';

export default function useWorkspaceHeartbeat(workspaceId, intervalMs = 30000) {
  const timerRef = useRef(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    const numericId = Number(workspaceId);
    if (!Number.isInteger(numericId) || numericId <= 0) return undefined;

    let cancelled = false;

    const send = async () => {
      // Skip nếu mới gửi gần đây (debounce vài lần gọi cùng lúc)
      const now = Date.now();
      if (now - lastSentRef.current < 5000) return;
      lastSentRef.current = now;
      try {
        await recordWorkspaceHeartbeat(numericId);
      } catch {
        // Network/permission lỗi: bỏ qua, lần tiếp theo sẽ thử lại.
      }
    };

    const startTimer = () => {
      stopTimer();
      timerRef.current = setInterval(() => {
        if (cancelled) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        send();
      }, intervalMs);
    };

    const stopTimer = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    // Gửi ngay khi vào workspace
    send();
    startTimer();

    const handleVisibility = () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && !document.hidden) {
        send();
        startTimer();
      } else {
        stopTimer();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      cancelled = true;
      stopTimer();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [workspaceId, intervalMs]);
}

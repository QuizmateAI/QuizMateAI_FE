import { useEffect, useRef } from 'react';
import { recordWorkspaceHeartbeat } from '@/api/GroupAPI';

/**
 * Gửi heartbeat tới BE theo định kỳ khi user đang mở workspace.
 * BE update `last_seen_at` trong `workspace_member` để tính online/offline
 * scope theo workspace (không dùng global lastLoginAt).
 *
 * Behavior:
 *  - Gọi heartbeat ngay khi mount (user vừa vào workspace)
 *  - Gọi lại mỗi `intervalMs` (mặc định 30s) khi tab visible
 *  - Khi tab quay về visible từ background → gọi ngay 1 phát + reset timer
 *  - Pause khi tab ẩn (document.hidden) để không spam khi user đã đi chỗ khác
 *  - Cleanup khi user rời workspace (unmount hoặc đổi workspaceId)
 *
 * @param {number|string|null} workspaceId — null/undefined = không gọi
 * @param {number} intervalMs — chu kỳ gửi heartbeat (mặc định 30000ms)
 */
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

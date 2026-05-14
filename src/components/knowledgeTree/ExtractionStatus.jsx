import { useEffect, useRef, useState } from 'react';
import { getTaskStatusByTaskId } from '../../api/MaterialAPI';

// ============================================================================
// ExtractionStatus — poll BE task status sau khi trigger extract-and-persist.
// Pattern lay tu SourceDetailView (existing task polling).
// ============================================================================

const POLL_INTERVAL_MS = 2000;     // 2s — extraction lau, khong can fast poll
const MAX_POLL_ATTEMPTS = 1200;    // 40 phut max — RTX 3060 6GB ~30 phut

const COMPLETED_STATES = new Set(['SUCCESS', 'COMPLETED', 'success']);
const FAILED_STATES = new Set(['ERROR', 'FAILED', 'failed', 'error']);

export default function ExtractionStatus({ taskId, onComplete, onError }) {
  const [progress, setProgress] = useState({ percent: 0, status: 'PROCESSING', message: 'Đang khởi tạo...' });
  const stoppedRef = useRef(false);

  useEffect(() => {
    if (!taskId) return undefined;
    stoppedRef.current = false;
    let attempts = 0;

    const tick = async () => {
      if (stoppedRef.current) return;
      attempts += 1;
      try {
        const status = await getTaskStatusByTaskId(taskId);
        // BE TaskStatusService trả về { percent, status, message, ... }
        const payload = status?.data || status;
        const percent = Number(payload?.percent ?? 0);
        const taskStatus = String(payload?.status ?? 'PROCESSING');
        const message = String(payload?.message ?? '');

        setProgress({ percent, status: taskStatus, message });

        if (COMPLETED_STATES.has(taskStatus)) {
          stoppedRef.current = true;
          onComplete?.(payload);
          return;
        }
        if (FAILED_STATES.has(taskStatus)) {
          stoppedRef.current = true;
          onError?.(message || 'Extraction thất bại');
          return;
        }
      } catch {
        // Transient lỗi (mất mạng, 5xx) — retry
        if (attempts >= MAX_POLL_ATTEMPTS) {
          stoppedRef.current = true;
          onError?.('Hết thời gian chờ extract');
          return;
        }
      }
      if (attempts >= MAX_POLL_ATTEMPTS) {
        stoppedRef.current = true;
        onError?.('Hết thời gian chờ extract (40 phút)');
        return;
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };

    setTimeout(tick, 500); // small initial delay
    return () => {
      stoppedRef.current = true;
    };
  }, [taskId, onComplete, onError]);

  if (!taskId) return null;

  const isFailed = FAILED_STATES.has(progress.status);
  const isDone = COMPLETED_STATES.has(progress.status);

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-700">
          {isDone ? '✅ Hoàn tất' : isFailed ? '❌ Thất bại' : '⏳ Đang extract cây kiến thức'}
        </h3>
        <span className="text-sm text-slate-500">{progress.percent}%</span>
      </div>
      <div className="h-2 w-full rounded bg-slate-200 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isFailed ? 'bg-red-500' : isDone ? 'bg-emerald-500' : 'bg-sky-500'
          }`}
          style={{ width: `${Math.max(2, Math.min(100, progress.percent))}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">{progress.message}</p>
      {!isDone && !isFailed && (
        <p className="mt-1 text-xs text-slate-400">
          Local AI đang chạy trên GPU — process này có thể mất 5-30 phút tùy độ dài tài liệu.
        </p>
      )}
    </div>
  );
}

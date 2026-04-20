import { useCallback } from "react";

/**
 * Hook quản lý phân bổ thời gian per-question (timerMode=false).
 *
 * Khi user sửa duration một câu:
 *  - Câu đó tự động bị lock.
 *  - Các câu chưa lock còn lại được rebalance để tổng = totalBudgetSeconds.
 *  - Nếu TẤT CẢ câu khác đã lock → confirm với user vì tổng thời gian bài sẽ thay đổi.
 */
export function useQuestionTimeBalancer({ questions, setQuestions, totalBudgetSeconds }) {
  const toggleLock = useCallback((questionId) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, timeLocked: !q.timeLocked } : q)),
    );
  }, [setQuestions]);

  const setDuration = useCallback((questionId, value) => {
    const secs = Math.max(5, Number(value) || 5);
    const budget = Number(totalBudgetSeconds) || 0;

    const allOthersLocked = questions.every((q) => q.id === questionId || q.timeLocked);

    if (allOthersLocked && budget > 0) {
      const currentTotal = questions.reduce((s, q) => s + (Number(q.duration) || 0), 0);
      const newTotal = questions.reduce(
        (s, q) => s + (q.id === questionId ? secs : (Number(q.duration) || 0)),
        0,
      );
      if (newTotal !== currentTotal) {
        const ok = window.confirm(
          `Tất cả câu hỏi khác đang bị khóa thời gian.\n` +
          `Hành động này sẽ làm tổng thời gian thay đổi từ ${currentTotal}s → ${newTotal}s.\nTiếp tục?`,
        );
        if (!ok) return;
      }
      setQuestions((prev) =>
        prev.map((q) => (q.id === questionId ? { ...q, duration: secs, timeLocked: true } : q)),
      );
      return;
    }

    // Auto-lock câu này + rebalance các câu chưa lock
    const lockedSum = questions.reduce((sum, q) => {
      if (q.id === questionId) return sum + secs;
      return sum + (q.timeLocked ? (Number(q.duration) || 0) : 0);
    }, 0);
    const unlockedOthers = questions.filter((q) => q.id !== questionId && !q.timeLocked);
    const remaining = budget - lockedSum;
    const share = unlockedOthers.length > 0
      ? Math.max(5, Math.round(remaining / unlockedOthers.length))
      : 0;

    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) return { ...q, duration: secs, timeLocked: true };
        if (q.timeLocked) return q;
        return { ...q, duration: share };
      }),
    );
  }, [questions, setQuestions, totalBudgetSeconds]);

  const rebalanceToDefault = useCallback((newDefault) => {
    const secs = Math.max(5, Number(newDefault) || 5);
    setQuestions((prev) => prev.map((q) => (q.timeLocked ? q : { ...q, duration: secs })));
  }, [setQuestions]);

  /**
   * Phân bổ đều thủ công: chia totalBudgetSecs cho các câu chưa lock.
   * @returns {{ ok: boolean, minShare: number }}
   */
  const distributeEvenly = useCallback((totalBudgetSecs) => {
    const budget = Number(totalBudgetSecs) || 0;
    const lockedSum = questions.reduce(
      (sum, q) => sum + (q.timeLocked ? (Number(q.duration) || 0) : 0),
      0,
    );
    const unlockedCount = questions.filter((q) => !q.timeLocked).length;
    if (unlockedCount === 0) return { ok: true, minShare: 0 };

    const share = Math.round((budget - lockedSum) / unlockedCount);
    if (share < 5) return { ok: false, minShare: share };

    setQuestions((prev) =>
      prev.map((q) => (q.timeLocked ? q : { ...q, duration: Math.max(5, share) })),
    );
    return { ok: true, minShare: share };
  }, [questions, setQuestions]);

  return { toggleLock, setDuration, rebalanceToDefault, distributeEvenly };
}

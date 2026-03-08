import { useEffect, useRef, useCallback } from 'react';
import { saveAttemptAnswers } from '@/api/QuizAPI';
import { buildSavePayload } from '../utils/quizTransform';

export function useQuizAutoSave(attemptId, answers, { interval = 30000, enabled = true } = {}) {
  const prevRef = useRef({});

  const saveChangedAnswers = useCallback(async () => {
    if (!attemptId) return;
    const changed = {};
    for (const [qId, vals] of Object.entries(answers)) {
      if (JSON.stringify(prevRef.current[qId]) !== JSON.stringify(vals)) {
        changed[qId] = vals;
      }
    }
    if (Object.keys(changed).length === 0) return;
    const payload = buildSavePayload(changed);
    if (payload.length === 0) return;
    try {
      await saveAttemptAnswers(attemptId, payload);
    } catch (err) {
      console.error('[QuizAutoSave] Save failed:', err);
    }
    prevRef.current = { ...answers };
  }, [attemptId, answers]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(saveChangedAnswers, interval);
    return () => clearInterval(timer);
  }, [saveChangedAnswers, interval, enabled]);

  return { saveManually: saveChangedAnswers };
}

import { useEffect, useRef, useCallback, useState } from 'react';
import { saveAttemptAnswers } from '@/api/QuizAPI';
import { buildSavePayload } from '../utils/quizTransform';

export function useQuizAutoSave(attemptId, answers, { interval = 10000, enabled = true } = {}) {
  const prevRef = useRef({});
  const [isSaving, setIsSaving] = useState(false);

  const saveChangedAnswers = useCallback(async ({ silent = false } = {}) => {
    if (!attemptId) return { ok: false, skipped: true, error: 'MISSING_ATTEMPT_ID' };
    const changed = {};
    for (const [qId, vals] of Object.entries(answers)) {
      if (JSON.stringify(prevRef.current[qId]) !== JSON.stringify(vals)) {
        changed[qId] = vals;
      }
    }
    if (Object.keys(changed).length === 0) return { ok: true, skipped: true };
    const payload = buildSavePayload(changed);
    if (payload.length === 0) return { ok: true, skipped: true };
    try {
      if (!silent) setIsSaving(true);
      await saveAttemptAnswers(attemptId, payload);
      prevRef.current = { ...answers };
      return { ok: true, skipped: false };
    } catch (err) {
      console.error('[QuizAutoSave] Save failed:', err);
      return { ok: false, skipped: false, error: err };
    } finally {
      if (!silent) setIsSaving(false);
    }
  }, [attemptId, answers]);

  const syncSnapshot = useCallback((snapshot = {}) => {
    prevRef.current = { ...snapshot };
  }, []);

  useEffect(() => {
    if (!attemptId) {
      prevRef.current = {};
    }
  }, [attemptId]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      saveChangedAnswers({ silent: true });
    }, interval);
    return () => clearInterval(timer);
  }, [saveChangedAnswers, interval, enabled]);

  return { saveManually: saveChangedAnswers, syncSnapshot, isSaving };
}

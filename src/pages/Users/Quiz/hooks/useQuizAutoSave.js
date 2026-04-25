import { useEffect, useRef, useCallback, useState } from 'react';
import { saveAttemptAnswers } from '@/api/QuizAPI';
import { buildSavePayload } from '../utils/quizTransform';

function cloneAnswerValue(value) {
  if (Array.isArray(value)) {
    return [...value];
  }

  if (value && typeof value === 'object') {
    return { ...value };
  }

  return value;
}

function cloneAnswerMap(snapshot = {}) {
  return Object.entries(snapshot).reduce((result, [questionId, value]) => {
    result[questionId] = cloneAnswerValue(value);
    return result;
  }, {});
}

function isSameAnswerValue(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function getChangedAnswers(previousAnswers = {}, nextAnswers = {}) {
  const questionIds = new Set([
    ...Object.keys(previousAnswers || {}),
    ...Object.keys(nextAnswers || {}),
  ]);
  const changed = {};

  for (const questionId of questionIds) {
    if (!isSameAnswerValue(previousAnswers[questionId], nextAnswers[questionId])) {
      changed[questionId] = cloneAnswerValue(nextAnswers[questionId]);
    }
  }

  return changed;
}

export function useQuizAutoSave(attemptId, answers, { interval = 10000, enabled = true } = {}) {
  const prevRef = useRef({});
  const answersRef = useRef({});
  const activeSaveRef = useRef(null);
  const pendingSaveRef = useRef(false);
  const pendingSilentRef = useRef(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    answersRef.current = answers || {};
  }, [answers]);

  const performSave = useCallback(async ({ silent = false } = {}) => {
    if (!attemptId) return { ok: false, skipped: true, error: 'MISSING_ATTEMPT_ID' };

    const snapshot = cloneAnswerMap(answersRef.current);
    const changed = getChangedAnswers(prevRef.current, snapshot);
    if (Object.keys(changed).length === 0) return { ok: true, skipped: true };

    const payload = buildSavePayload(changed);
    if (payload.length === 0) {
      prevRef.current = { ...prevRef.current, ...cloneAnswerMap(changed) };
      return { ok: true, skipped: true };
    }

    try {
      if (!silent) setIsSaving(true);
      await saveAttemptAnswers(attemptId, payload);
      prevRef.current = { ...prevRef.current, ...cloneAnswerMap(changed) };
      return { ok: true, skipped: false };
    } catch (err) {
      console.error('[QuizAutoSave] Save failed:', err);
      return { ok: false, skipped: false, error: err };
    } finally {
      if (!silent) setIsSaving(false);
    }
  }, [attemptId]);

  const saveChangedAnswers = useCallback(async ({ silent = false } = {}) => {
    if (activeSaveRef.current) {
      pendingSaveRef.current = true;
      pendingSilentRef.current = pendingSilentRef.current && silent;
      return activeSaveRef.current;
    }

    pendingSilentRef.current = silent;

    const savePromise = (async () => {
      let latestResult = await performSave({ silent });

      while (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        const nextSilent = pendingSilentRef.current;
        pendingSilentRef.current = true;
        latestResult = await performSave({ silent: nextSilent });
      }

      return latestResult;
    })().finally(() => {
      activeSaveRef.current = null;
      pendingSilentRef.current = true;
    });

    activeSaveRef.current = savePromise;
    return savePromise;
  }, [performSave]);

  const syncSnapshot = useCallback((snapshot = {}) => {
    prevRef.current = cloneAnswerMap(snapshot);
  }, []);

  useEffect(() => {
    prevRef.current = {};
    pendingSaveRef.current = false;
    pendingSilentRef.current = true;
    activeSaveRef.current = null;
    setIsSaving(false);
  }, [attemptId]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      void saveChangedAnswers({ silent: true });
    }, interval);
    return () => clearInterval(timer);
  }, [saveChangedAnswers, interval, enabled]);

  return { saveManually: saveChangedAnswers, syncSnapshot, isSaving };
}

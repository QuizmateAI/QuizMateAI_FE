import { useState, useCallback, useRef } from 'react';
import { saveAttemptAnswers } from '@/api/QuizAPI';
import { buildSavePayload, mapSavedAnswersToState } from '../utils/quizTransform';

export function useQuizProgress(attemptId) {
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const hasChangedRef = useRef(false);
  const changedQuestionsRef = useRef(new Set());

  const selectAnswer = useCallback((questionId, answerId, isMultiple) => {
    setAnswers(prev => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const updated = isMultiple
        ? (current.includes(answerId) ? current.filter(id => id !== answerId) : [...current, answerId])
        : [answerId];
      hasChangedRef.current = true;
      changedQuestionsRef.current.add(questionId);
      return { ...prev, [questionId]: updated };
    });
  }, []);

  const updateTextAnswer = useCallback((questionId, textAnswer) => {
    setAnswers(prev => {
      hasChangedRef.current = true;
      changedQuestionsRef.current.add(questionId);
      return { ...prev, [questionId]: textAnswer };
    });
  }, []);

  const saveProgress = useCallback(async (allAnswers) => {
    if (!hasChangedRef.current || !attemptId) return;
    const source = allAnswers || {};
    const changedOnly = {};
    for (const qId of changedQuestionsRef.current) {
      if (source[qId] !== undefined) changedOnly[qId] = source[qId];
    }
    const payload = buildSavePayload(changedOnly);
    if (payload.length === 0) return;
    try {
      await saveAttemptAnswers(attemptId, payload);
    } catch (err) {
      console.error('[QuizProgress] Save failed:', err);
    }
    hasChangedRef.current = false;
    changedQuestionsRef.current.clear();
  }, [attemptId]);

  const goNext = useCallback((total, shouldSave, allAnswers) => {
    if (shouldSave) saveProgress(allAnswers);
    setCurrentIndex(prev => Math.min(prev + 1, total - 1));
  }, [saveProgress]);

  const goBack = useCallback((shouldSave, allAnswers) => {
    if (shouldSave) saveProgress(allAnswers);
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, [saveProgress]);

  const initFromSaved = useCallback((savedAnswers) => {
    if (!savedAnswers?.length) return;
    setAnswers(mapSavedAnswersToState(savedAnswers));
  }, []);

  return { answers, currentIndex, setCurrentIndex, selectAnswer, updateTextAnswer, goNext, goBack, saveProgress, initFromSaved };
}

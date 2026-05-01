import { useCallback, useMemo, useState } from 'react';

/**
 * State machine cho mock test attempt theo che do "section-by-section" enforced.
 *
 * Phase machine:
 *   INTRO --------> IN_PROGRESS ---> COMPLETE ---> TRANSITION --+--> INTRO (next section)
 *                       |                                       |
 *                       +---> (timer expires) -----------------+
 *                                                              +--> FINISHED (last section)
 *
 * Khac biet so voi default ExamQuizPage:
 *   - Chi 1 section visible tai mot thoi diem.
 *   - Khong cho navigate ngươc (quay lai section da xong).
 *   - Submit chi available o phase=COMPLETE cua section cuoi.
 *
 * Usage:
 *   const flow = useMockTestSectionFlow({
 *     sectionGroups: quiz.sectionGroups,
 *     answers,
 *     onFinish: () => handleSubmit(),
 *   });
 *
 *   if (flow.phase === 'INTRO') return <MockTestSectionIntro section={flow.currentSection} ... />;
 *   if (flow.phase === 'TRANSITION') return <MockTestSectionTransition ... />;
 *   if (flow.phase === 'IN_PROGRESS') return <YourQuestionRenderer questions={flow.currentSectionQuestions} ... />;
 *   if (flow.phase === 'COMPLETE') return <ButtonNext onClick={flow.proceedToNextSection} />;
 */
export function useMockTestSectionFlow({
  sectionGroups,
  answers,
  onFinish,
  hasAnswerValue,
}) {
  const leafSections = useMemo(() => flattenLeafSections(sectionGroups || []), [sectionGroups]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('INTRO');
  const [completedKeys, setCompletedKeys] = useState(() => new Set());

  const currentSection = leafSections[currentIndex] || null;
  const totalSections = leafSections.length;
  const isFirstSection = currentIndex === 0;
  const isLastSection = currentIndex >= totalSections - 1;

  const currentSectionQuestions = useMemo(() => {
    if (!currentSection) return [];
    return currentSection.questions || [];
  }, [currentSection]);

  const currentSectionAnsweredCount = useMemo(() => {
    if (!currentSection || !answers) return 0;
    const checker = hasAnswerValue || defaultHasAnswer;
    return currentSectionQuestions.filter((q) => checker(answers[q.id ?? q.questionId])).length;
  }, [currentSection, currentSectionQuestions, answers, hasAnswerValue]);

  const currentSectionTotalQuestions = currentSectionQuestions.length;

  const isCurrentSectionFullyAnswered =
    currentSectionTotalQuestions > 0 && currentSectionAnsweredCount === currentSectionTotalQuestions;

  const effectivePhase = phase === 'IN_PROGRESS' && isCurrentSectionFullyAnswered ? 'COMPLETE' : phase;

  const startCurrentSection = useCallback(() => {
    setPhase('IN_PROGRESS');
  }, []);

  const completeCurrentSection = useCallback(() => {
    if (!currentSection) return;
    setCompletedKeys((prev) => {
      const next = new Set(prev);
      next.add(currentSection.sectionKey);
      return next;
    });
    setPhase('COMPLETE');
  }, [currentSection]);

  const proceedToNextSection = useCallback(() => {
    if (!currentSection) return;
    // mark as completed if not already
    setCompletedKeys((prev) => {
      const next = new Set(prev);
      next.add(currentSection.sectionKey);
      return next;
    });

    if (isLastSection) {
      setPhase('FINISHED');
      if (typeof onFinish === 'function') onFinish();
      return;
    }
    setPhase('TRANSITION');
  }, [currentSection, isLastSection, onFinish]);

  const advanceFromTransition = useCallback(() => {
    setCurrentIndex((idx) => Math.min(idx + 1, totalSections - 1));
    setPhase('INTRO');
  }, [totalSections]);

  const isSectionAccessible = useCallback(
    (sectionKey) => {
      if (!sectionKey) return false;
      // Section is accessible if it's the current one, OR already completed (review only).
      const idxOfKey = leafSections.findIndex((s) => s.sectionKey === sectionKey);
      if (idxOfKey === -1) return false;
      if (idxOfKey === currentIndex) return true;
      return completedKeys.has(sectionKey);
    },
    [leafSections, currentIndex, completedKeys],
  );

  const isQuestionInCurrentSection = useCallback(
    (questionId) => {
      if (!currentSection || questionId == null) return false;
      return currentSectionQuestions.some((q) => (q.id ?? q.questionId) === questionId);
    },
    [currentSection, currentSectionQuestions],
  );

  return {
    // state
    phase: effectivePhase,
    currentSectionIndex: currentIndex,
    currentSection,
    currentSectionKey: currentSection?.sectionKey || null,
    currentSectionQuestions,
    currentSectionAnsweredCount,
    currentSectionTotalQuestions,
    totalSections,
    isFirstSection,
    isLastSection,
    completedSectionKeys: completedKeys,
    isCurrentSectionFullyAnswered,
    leafSections,

    // actions
    startCurrentSection,
    completeCurrentSection,
    proceedToNextSection,
    advanceFromTransition,

    // helpers
    isSectionAccessible,
    isQuestionInCurrentSection,
  };
}

function flattenLeafSections(sectionGroups) {
  const out = [];
  const visit = (node, ancestorPath = []) => {
    if (!node) return;
    const key = node.sectionKey || node.id || node.sectionId || node.name;
    const path = [...ancestorPath, key];
    const children = node.children || node.subSections || node.sections || [];
    if (Array.isArray(children) && children.length > 0) {
      children.forEach((child) => visit(child, path));
      return;
    }
    out.push({
      ...node,
      sectionKey: key,
      ancestorPath: path,
    });
  };
  sectionGroups.forEach((root) => visit(root, []));
  return out;
}

function defaultHasAnswer(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

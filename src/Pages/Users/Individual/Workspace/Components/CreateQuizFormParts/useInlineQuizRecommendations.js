import { useCallback, useEffect, useMemo, useState } from "react";
import { dismissRecommendation, generateQuizFromWorkspaceAssessment, getPendingRecommendations } from "@/api/QuizAPI";

export const useInlineQuizRecommendations = ({ contextId, onCreateQuiz, t, enabled = true }) => {
  const [inlineRecommendations, setInlineRecommendations] = useState([]);
  const [inlineRecLoading, setInlineRecLoading] = useState(false);
  const [inlineRecError, setInlineRecError] = useState("");
  const [expandedRecId, setExpandedRecId] = useState(null);
  const [inlineRecGeneratingId, setInlineRecGeneratingId] = useState(null);
  const [inlineRecDismissingId, setInlineRecDismissingId] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setInlineRecommendations([]);
      setInlineRecError("");
      setExpandedRecId(null);
      setInlineRecLoading(false);
      return;
    }

    if (!contextId) {
      setInlineRecommendations([]);
      setExpandedRecId(null);
      return;
    }

    let cancelled = false;

    const fetchInlineRecommendations = async () => {
      setInlineRecLoading(true);
      setInlineRecError("");

      try {
        const response = await getPendingRecommendations(contextId);
        if (cancelled) {
          return;
        }

        const data = response?.data || response || [];
        const nextRecommendations = Array.isArray(data) ? data.slice(0, 5) : [];
        setInlineRecommendations(nextRecommendations);
        setExpandedRecId((previousId) => (
          nextRecommendations.some((item) => item.assessmentId === previousId) ? previousId : null
        ));
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Failed to load inline AI recommendations:", error);
        setInlineRecError(error?.message || t("workspace.quiz.aiRecommendations.loadFailed"));
      } finally {
        if (!cancelled) {
          setInlineRecLoading(false);
        }
      }
    };

    fetchInlineRecommendations();

    return () => {
      cancelled = true;
    };
  }, [contextId, enabled, t]);

  const handleGenerateFromInlineRecommendation = useCallback(async (assessmentId) => {
    if (!enabled || !assessmentId) {
      return;
    }

    setInlineRecGeneratingId(assessmentId);
    setInlineRecError("");

    try {
      const result = await generateQuizFromWorkspaceAssessment(assessmentId);
      const quizData = result?.data || result;
      await onCreateQuiz?.(quizData);
    } catch (error) {
      console.error("Failed to generate quiz from inline recommendation:", error);
      setInlineRecError(error?.message || t("workspace.quiz.aiRecommendations.generateFailed"));
    } finally {
      setInlineRecGeneratingId(null);
    }
  }, [enabled, onCreateQuiz, t]);

  const handleDismissRecommendation = useCallback(async (assessmentId) => {
    if (!assessmentId) return;
    setInlineRecDismissingId(assessmentId);
    setInlineRecError("");
    try {
      await dismissRecommendation(assessmentId);
      setInlineRecommendations((prev) => prev.filter((r) => r.assessmentId !== assessmentId));
      setExpandedRecId((prev) => (prev === assessmentId ? null : prev));
    } catch (error) {
      console.error("Failed to dismiss inline recommendation:", error);
      setInlineRecError(error?.message || t("workspace.quiz.aiRecommendations.dismissFailed"));
    } finally {
      setInlineRecDismissingId(null);
    }
  }, [t]);

  const activeRecommendation = useMemo(
    () => inlineRecommendations.find((item) => item.assessmentId === expandedRecId) || null,
    [expandedRecId, inlineRecommendations]
  );

  return {
    activeRecommendation,
    expandedRecId,
    inlineRecommendations,
    inlineRecError,
    inlineRecGeneratingId,
    inlineRecDismissingId,
    inlineRecLoading,
    setExpandedRecId,
    handleGenerateFromInlineRecommendation,
    handleDismissRecommendation,
  };
};

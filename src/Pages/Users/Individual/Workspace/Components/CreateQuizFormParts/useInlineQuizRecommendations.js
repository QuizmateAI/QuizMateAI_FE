import { useCallback, useEffect, useMemo, useState } from "react";
import { generateQuizFromWorkspaceAssessment, getPendingRecommendations } from "@/api/QuizAPI";

export const useInlineQuizRecommendations = ({ contextId, onCreateQuiz, t }) => {
  const [inlineRecommendations, setInlineRecommendations] = useState([]);
  const [inlineRecLoading, setInlineRecLoading] = useState(false);
  const [inlineRecError, setInlineRecError] = useState("");
  const [expandedRecId, setExpandedRecId] = useState(null);
  const [inlineRecGeneratingId, setInlineRecGeneratingId] = useState(null);

  useEffect(() => {
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
  }, [contextId, t]);

  const handleGenerateFromInlineRecommendation = useCallback(async (assessmentId) => {
    if (!assessmentId) {
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
  }, [onCreateQuiz, t]);

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
    inlineRecLoading,
    setExpandedRecId,
    handleGenerateFromInlineRecommendation,
  };
};

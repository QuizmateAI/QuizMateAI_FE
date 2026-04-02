import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCurrentRoadmapPhaseProgress,
  submitRoadmapPhaseSkipDecision,
} from "@/api/RoadmapPhaseAPI";

export function useRoadmapPreLearningDecision({
  roadmap,
  activePhase,
  onCreatePhaseKnowledge,
  onSkipSuccess,
  showError,
  showSuccess,
  t,
} = {}) {
  const [decisionState, setDecisionState] = useState({
    phaseId: null,
    loadingCurrentPhase: false,
    currentPhaseProgress: null,
  });
  const [submittingSkipDecision, setSubmittingSkipDecision] = useState(false);
  const [decisionHandledPhaseIds, setDecisionHandledPhaseIds] = useState([]);

  const preLearningDecisionFetchRef = useRef({
    inFlightKey: null,
  });

  const loadPreLearningDecisionState = useCallback(async (phase) => {
    const normalizedPhaseId = Number(phase?.phaseId);
    const normalizedRoadmapId = Number(roadmap?.roadmapId);
    const hasValidContext = Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0
      && Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0;

    if (!hasValidContext) {
      setDecisionState({
        phaseId: normalizedPhaseId,
        loadingCurrentPhase: false,
        currentPhaseProgress: null,
      });
      return;
    }

    const requestKey = `${normalizedRoadmapId}:${normalizedPhaseId}`;
    if (preLearningDecisionFetchRef.current.inFlightKey === requestKey) {
      return;
    }

    preLearningDecisionFetchRef.current.inFlightKey = requestKey;

    setDecisionState({
      phaseId: normalizedPhaseId,
      loadingCurrentPhase: true,
      currentPhaseProgress: null,
    });

    try {
      const phaseProgressResponse = await getCurrentRoadmapPhaseProgress(normalizedRoadmapId);
      const phaseProgressPayload = phaseProgressResponse?.data?.data || phaseProgressResponse?.data || null;

      setDecisionState((current) => ({
        ...current,
        phaseId: normalizedPhaseId,
        loadingCurrentPhase: false,
        currentPhaseProgress: phaseProgressPayload,
      }));
    } catch (error) {
      console.error("Failed to load post pre-learning decision state:", error);
      setDecisionState((current) => ({
        ...current,
        phaseId: normalizedPhaseId,
        loadingCurrentPhase: false,
        currentPhaseProgress: null,
      }));
    } finally {
      preLearningDecisionFetchRef.current.inFlightKey = null;
    }
  }, [roadmap?.roadmapId]);

  useEffect(() => {
    if (!activePhase) return;
    void loadPreLearningDecisionState(activePhase);
  }, [
    activePhase,
    loadPreLearningDecisionState,
  ]);

  const handleRoadmapPreLearningDecision = useCallback(async (phaseId, skipped) => {
    const normalizedPhaseId = Number(phaseId);
    if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0 || submittingSkipDecision) return;

    setSubmittingSkipDecision(true);
    try {
      await submitRoadmapPhaseSkipDecision(normalizedPhaseId, Boolean(skipped));

      if (skipped) {
        setDecisionHandledPhaseIds((current) => Array.from(new Set([...current, normalizedPhaseId])));
        showSuccess(t("workspace.quiz.result.skipPhaseSuccess", "Current phase has been skipped successfully."));
        await loadPreLearningDecisionState({ phaseId: normalizedPhaseId });
        await onSkipSuccess?.(normalizedPhaseId);
        return;
      }

      await onCreatePhaseKnowledge?.(normalizedPhaseId, { skipPreLearning: false });
      setDecisionHandledPhaseIds((current) => Array.from(new Set([...current, normalizedPhaseId])));
    } catch (error) {
      console.error("Failed to update pre-learning decision:", error);
      showError(error?.message || t("workspace.quiz.result.skipPhaseFail", "Could not update skip decision for this phase."));
    } finally {
      setSubmittingSkipDecision(false);
    }
  }, [loadPreLearningDecisionState, onCreatePhaseKnowledge, onSkipSuccess, showError, showSuccess, submittingSkipDecision, t]);

  const normalizedActivePhaseId = Number(activePhase?.phaseId);
  const hasActivePhase = Number.isInteger(normalizedActivePhaseId) && normalizedActivePhaseId > 0;
  const isDecisionHandled = hasActivePhase && decisionHandledPhaseIds.includes(normalizedActivePhaseId);
  const canShowSkipDecision = hasActivePhase
    && decisionState.phaseId === normalizedActivePhaseId
    && decisionState.currentPhaseProgress?.skipable === true
    && !isDecisionHandled;
  const canShowGenerateKnowledgeFallback = hasActivePhase
    && decisionState.phaseId === normalizedActivePhaseId
    && !decisionState.loadingCurrentPhase
    && !canShowSkipDecision;
  const shouldRenderDecisionCard = hasActivePhase && decisionState.phaseId === normalizedActivePhaseId;

  return {
    decisionState,
    submittingSkipDecision,
    decisionHandledPhaseIds,
    canShowSkipDecision,
    canShowGenerateKnowledgeFallback,
    shouldRenderDecisionCard,
    handleRoadmapPreLearningDecision,
  };
}

import api from './api';

export const getCurrentRoadmapPhaseProgress = async (roadmapId) => {
  const normalizedRoadmapId = Number(roadmapId);
  const response = await api.get('/roadmap-phases/current', {
    params: Number.isInteger(normalizedRoadmapId) && normalizedRoadmapId > 0
      ? { roadmapId: normalizedRoadmapId }
      : undefined,
  });
  return response;
};

export const submitRoadmapPhaseSkipDecision = async (phaseId, skipped) => {
  const normalizedPhaseId = Number(phaseId);
  const response = await api.patch(`/roadmap-phases/${normalizedPhaseId}/skip-decision`, {
    skipped: Boolean(skipped),
  });
  return response;
};

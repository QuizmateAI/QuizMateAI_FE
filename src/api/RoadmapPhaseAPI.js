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

export const submitRoadmapPhaseRemedialDecision = async (phaseId, option) => {
  const normalizedPhaseId = Number(phaseId);
  const normalizedOption = String(option || '').toUpperCase();
  const response = await api.post(`/roadmap-phases/${normalizedPhaseId}/remedial-decision`, {
    option: normalizedOption,
  });
  return response;
};

export const createPhaseProgressReview = async (phaseProgressId) => {
  const normalizedPhaseProgressId = Number(phaseProgressId);
  const response = await api.post(`/roadmap-phases/progress/${normalizedPhaseProgressId}/review`, null);
  return response;
};

export const getPhaseProgressReview = async (phaseId) => {
  const normalizedPhaseId = Number(phaseId);
  const response = await api.get(`/roadmap-phases/${normalizedPhaseId}/review`);
  return response;
};

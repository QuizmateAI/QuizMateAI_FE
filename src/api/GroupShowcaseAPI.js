import api from './api';

export const getShowcaseItems = async (workspaceId) => {
  const response = await api.get(`/v1/group/${workspaceId}/showcase`);
  return response;
};

export const addShowcaseItem = async (workspaceId, resourceId, resourceType) => {
  const response = await api.post(`/v1/group/${workspaceId}/showcase/items`, {
    resourceId,
    resourceType,
  });
  return response;
};

export const updateShowcaseItem = async (workspaceId, showcaseItemId, payload) => {
  const response = await api.patch(
    `/v1/group/${workspaceId}/showcase/items/${showcaseItemId}`,
    payload
  );
  return response;
};

export const deleteShowcaseItem = async (workspaceId, showcaseItemId) => {
  const response = await api.delete(
    `/v1/group/${workspaceId}/showcase/items/${showcaseItemId}`
  );
  return response;
};

export const reorderShowcaseItems = async (workspaceId, items) => {
  const response = await api.post(`/v1/group/${workspaceId}/showcase/reorder`, {
    items,
  });
  return response;
};

export const downloadShowcaseMaterial = async (workspaceId, materialId) => {
  const response = await api.get(
    `/v1/group/${workspaceId}/showcase/material/${materialId}/download`,
    {
      skipAuthHeader: true,
      skipAuthRedirect: true,
    }
  );
  return response;
};

export const getShowcasePreview = async (workspaceId) => {
  const response = await api.get(`/v1/group/${workspaceId}/showcase/preview`, {
    skipAuthHeader: true,
    skipAuthRedirect: true,
  });
  return response;
};

export const startShowcaseQuizTrial = async (workspaceId, quizId) => {
  const response = await api.post(
    `/v1/group/${workspaceId}/showcase/quiz/${quizId}/trial`,
    undefined,
    {
      skipAuthHeader: true,
      skipAuthRedirect: true,
    }
  );
  return response;
};

export const submitShowcaseQuizTrial = async (workspaceId, attemptId, answers) => {
  const response = await api.post(
    `/v1/group/${workspaceId}/showcase/quiz/trial/${attemptId}/submit`,
    answers,
    {
      timeout: 60000,
      skipAuthHeader: true,
      skipAuthRedirect: true,
    }
  );
  return response;
};

export const getShowcaseQuizTrialResult = async (workspaceId, attemptId) => {
  const response = await api.get(
    `/v1/group/${workspaceId}/showcase/quiz/trial/${attemptId}/result`,
    {
      skipAuthHeader: true,
      skipAuthRedirect: true,
    }
  );
  return response;
};

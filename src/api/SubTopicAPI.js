import api from './api';

/**
 * Plan §6.1 — SubTopic API client.
 * BE endpoints duoc khai bao trong SubTopicController (/api/sub-topics).
 */

// Lay subTopics theo material IDs (filter status COMPLETED). Tra ve { data: [{ subTopicId, title, description, keywords, materialIds }] }
export const getSubTopicsByMaterials = async (materialIds, workspaceId) => {
  if (!materialIds || materialIds.length === 0) return { data: [] };
  const csv = materialIds.join(',');
  const response = await api.get('/sub-topics/by-materials', {
    params: { materialIds: csv, workspaceId },
  });
  return response;
};

// Lay subTopics cua roadmap (qua roadmap_material).
export const getSubTopicsByRoadmap = async (roadmapId) => {
  const response = await api.get(`/sub-topics/by-roadmap/${roadmapId}`);
  return response;
};

// Lay subTopics cua workspace (filter status optional: ACTIVE | ORPHANED).
export const getSubTopicsByWorkspace = async (workspaceId, status) => {
  const response = await api.get(`/sub-topics/workspace/${workspaceId}`, {
    params: status ? { status } : {},
  });
  return response;
};

// Retry commit cho material da FAILED.
export const retrySubTopicCommit = async (materialId) => {
  const response = await api.post(`/sub-topics/materials/${materialId}/commit-retry`);
  return response;
};

// Poll trang thai extraction.
export const getExtractionStatus = async (materialId) => {
  const response = await api.get(`/sub-topics/materials/${materialId}/extraction-status`);
  return response;
};

const SubTopicAPI = {
  getByMaterials: getSubTopicsByMaterials,
  getByRoadmap: getSubTopicsByRoadmap,
  getByWorkspace: getSubTopicsByWorkspace,
  retryCommit: retrySubTopicCommit,
  getExtractionStatus,
};

export default SubTopicAPI;

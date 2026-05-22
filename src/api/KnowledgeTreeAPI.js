import api from './api';

export const extractAndPersistKnowledgeTree = async (materialId) => {
  const response = await api.post(`/knowledge-trees/extract-and-persist/${materialId}`);
  return response;
};

export const getKnowledgeTree = async (materialId) => {
  const response = await api.get(`/knowledge-trees/material/${materialId}`);
  return response;
};

export const getKnowledgeTreeSummary = async (materialId) => {
  const response = await api.get(`/knowledge-trees/material/${materialId}/summary`);
  return response;
};

export const toggleNode = async (nodeId, enabled) => {
  const response = await api.patch(
    `/knowledge-trees/nodes/${nodeId}/toggle`,
    null,
    { params: { enabled } }
  );
  return response;
};

export const toggleSubtree = async (nodeId, enabled) => {
  const response = await api.patch(
    `/knowledge-trees/nodes/${nodeId}/toggle-subtree`,
    null,
    { params: { enabled } }
  );
  return response;
};

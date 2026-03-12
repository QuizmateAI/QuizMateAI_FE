import api from './api';

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 100;

const withPaging = (page = DEFAULT_PAGE, size = DEFAULT_SIZE) => `?page=${page}&size=${size}`;

// Domains
export const getActiveDomains = async () => {
  const response = await api.get('/admin/config/domains/active');
  return response;
};

export const getAllDomains = async (page = DEFAULT_PAGE, size = DEFAULT_SIZE) => {
  const response = await api.get(`/admin/config/domains${withPaging(page, size)}`);
  return response;
};

export const createDomain = async (payload) => {
  const response = await api.post('/admin/config/domains', payload);
  return response;
};

export const updateDomain = async (domainId, payload) => {
  const response = await api.put(`/admin/config/domains/${domainId}`, payload);
  return response;
};

export const deleteDomain = async (domainId) => {
  const response = await api.delete(`/admin/config/domains/${domainId}`);
  return response;
};

// Knowledge
export const getKnowledgeByDomainId = async (domainId) => {
  const response = await api.get(`/admin/config/knowledge/domain/${domainId}`);
  return response;
};

export const getAllKnowledge = async (page = DEFAULT_PAGE, size = DEFAULT_SIZE) => {
  const response = await api.get(`/admin/config/knowledge${withPaging(page, size)}`);
  return response;
};

export const createKnowledge = async (payload) => {
  const response = await api.post('/admin/config/knowledge', payload);
  return response;
};

export const updateKnowledge = async (knowledge_id, payload) => {
  const response = await api.put(`/admin/config/knowledge/${knowledge_id}`, payload);
  return response;
};

export const deleteKnowledge = async (knowledge_id) => {
  const response = await api.delete(`/admin/config/knowledge/${knowledge_id}`);
  return response;
};

// Schemes
export const getSchemesByKnowledgeId = async (knowledge_id) => {
  const response = await api.get(`/admin/config/schemes/knowledge/${knowledge_id}`);
  return response;
};

export const getAllSchemes = async (page = DEFAULT_PAGE, size = DEFAULT_SIZE) => {
  const response = await api.get(`/admin/config/schemes${withPaging(page, size)}`);
  return response;
};

export const createScheme = async (payload) => {
  const response = await api.post('/admin/config/schemes', payload);
  return response;
};

export const updateScheme = async (schemeId, payload) => {
  const response = await api.put(`/admin/config/schemes/${schemeId}`, payload);
  return response;
};

export const deleteScheme = async (schemeId) => {
  const response = await api.delete(`/admin/config/schemes/${schemeId}`);
  return response;
};

// Levels
export const getLevelsByKnowledgeId = async (knowledgeId) => {
  const response = await api.get(`/admin/config/levels/knowledge/${knowledgeId}`);
  return response;
};

export const getLevelsBySchemeId = async (schemeId) => {
  const response = await api.get(`/admin/config/levels/scheme/${schemeId}`);
  return response;
};

export const getAllLevels = async (page = DEFAULT_PAGE, size = DEFAULT_SIZE) => {
  const response = await api.get(`/admin/config/levels${withPaging(page, size)}`);
  return response;
};

export const createLevel = async (payload) => {
  const response = await api.post('/admin/config/levels', payload);
  return response;
};

export const updateLevel = async (levelId, payload) => {
  const response = await api.put(`/admin/config/levels/${levelId}`, payload);
  return response;
};

export const deleteLevel = async (levelId) => {
  const response = await api.delete(`/admin/config/levels/${levelId}`);
  return response;
};

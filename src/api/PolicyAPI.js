import api from './api';

// ============== PUBLIC ==============

export const fetchPublicPolicies = async () => {
  const response = await api.get('/policies/public');
  return response?.data ?? [];
};

export const fetchPublicPolicyBySlug = async (slug) => {
  const response = await api.get(`/policies/public/${encodeURIComponent(slug)}`);
  return response?.data ?? null;
};

// ============== MANAGEMENT (SuperAdmin) ==============

export const fetchAllPolicies = async () => {
  const response = await api.get('/management/policies');
  return response?.data ?? [];
};

export const fetchPolicyById = async (policyId) => {
  const response = await api.get(`/management/policies/${policyId}`);
  return response?.data ?? null;
};

export const createPolicy = async (payload) => {
  const response = await api.post('/management/policies', payload);
  return response?.data ?? null;
};

export const updatePolicy = async (policyId, payload) => {
  const response = await api.put(`/management/policies/${policyId}`, payload);
  return response?.data ?? null;
};

export const publishPolicy = async (policyId) => {
  const response = await api.post(`/management/policies/${policyId}/publish`);
  return response?.data ?? null;
};

export const archivePolicy = async (policyId) => {
  const response = await api.delete(`/management/policies/${policyId}`);
  return response;
};

export const fetchPolicyVersions = async (policyId) => {
  const response = await api.get(`/management/policies/${policyId}/versions`);
  return response?.data ?? [];
};

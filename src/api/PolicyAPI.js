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

// ============== USER (own ban status) ==============

export const fetchMyBanStatus = async () => {
  const response = await api.get('/user/me/ban-status');
  return response?.data ?? [];
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

// ============== VIOLATIONS ==============

export const fetchViolations = async ({ offenderId, status, page = 0, size = 20 } = {}) => {
  const params = { page, size };
  if (offenderId != null) params.offenderId = offenderId;
  if (status) params.status = status;
  const response = await api.get('/management/violations', { params });
  return response?.data ?? { content: [], totalElements: 0 };
};

export const fetchViolationById = async (violationId) => {
  const response = await api.get(`/management/violations/${violationId}`);
  return response?.data ?? null;
};

export const createViolation = async (payload) => {
  const response = await api.post('/management/violations', payload);
  return response?.data ?? null;
};

export const updateViolationStatus = async (violationId, payload) => {
  const response = await api.put(`/management/violations/${violationId}/status`, payload);
  return response?.data ?? null;
};

// ============== PENALTIES ==============

export const fetchPenaltiesForUser = async (userId, { page = 0, size = 20 } = {}) => {
  const response = await api.get(`/management/penalties/users/${userId}`, {
    params: { page, size },
  });
  return response?.data ?? { content: [], totalElements: 0 };
};

export const fetchActivePenaltiesForUser = async (userId) => {
  const response = await api.get(`/management/penalties/users/${userId}/active`);
  return response?.data ?? [];
};

export const issuePenalty = async (payload) => {
  const response = await api.post('/management/penalties', payload);
  return response?.data ?? null;
};

export const revokePenalty = async (penaltyId, payload) => {
  const response = await api.post(`/management/penalties/${penaltyId}/revoke`, payload);
  return response?.data ?? null;
};

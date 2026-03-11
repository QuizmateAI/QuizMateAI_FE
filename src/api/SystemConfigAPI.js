import api from './api';

// Lấy danh sách Learning Domain đang ACTIVE
export const getActiveDomains = async () => {
  const response = await api.get('/admin/config/learning-domains/active');
  return response;
};

// Lấy danh sách Learning Program theo Domain ID
export const getProgramsByDomainId = async (domainId) => {
  const response = await api.get(`/admin/config/learning-programs/domain/${domainId}`);
  return response;
};

// Lấy danh sách Learning Scheme theo Program ID
export const getSchemesByProgramId = async (programId) => {
  const response = await api.get(`/admin/config/learning-schemes/program/${programId}`);
  return response;
};

// Lấy danh sách Scheme Level theo Scheme ID
export const getLevelsBySchemeId = async (schemeId) => {
  const response = await api.get(`/admin/config/scheme-levels/scheme/${schemeId}`);
  return response;
};

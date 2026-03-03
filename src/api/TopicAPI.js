import api from './api';

// Lấy danh sách chủ đề (topic) kèm lĩnh vực (domain)
export const getTopicsWithDomains = async () => {
  const response = await api.get('/topic/all');
  return response;
};

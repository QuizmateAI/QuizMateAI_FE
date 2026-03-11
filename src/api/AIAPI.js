import api from './api';

// Tạo Mock Test thông qua AI
export const generateMockTest = async (data) => {
  const response = await api.post('/mocktest:generated', data);
  return response;
};

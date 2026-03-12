import api from './api';

// Lấy danh sách tài liệu theo workspaceId
export const getMaterialsByWorkspace = async (workspaceId) => {
  const response = await api.get(`/materials/workspace/${workspaceId}`);
  return response;
};

// Xóa tài liệu
export const deleteMaterial = async (materialId) => {
  const response = await api.delete(`/materials/${materialId}`);
  return response;
};

// Upload tài liệu
export const uploadMaterial = async (file, workspaceId) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Backend expects request param name: workspaceID
  const response = await api.post(`/materials/upload?workspaceID=${workspaceId}`, formData, {
    headers: {
      'Content-Type': undefined, // Để Axios tự set multipart boundary
    },
    timeout: 120000, // 2 phút cho file lớn
  });
  return response;
};

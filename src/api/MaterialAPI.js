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

// Lấy extracted text từ materialId
export const getExtractedText = async (materialId) => {
  const response = await api.get(`/materials/${materialId}/extracted-text`);
  return response;
};

// Lấy extracted summary từ materialId
export const getExtractedSummary = async (materialId) => {
  const response = await api.get(`/materials/${materialId}/extracted-summary`);
  return response;
};

// Lấy chi tiết moderation report từ materialId
export const getModerationReportDetail = async (materialId) => {
  const response = await api.get(`/materials/${materialId}/moderation-report/detail`);
  return response;
};

// Duyệt tài liệu bị cảnh báo
export const reviewMaterial = async (materialId, isApproved) => {
  const response = await api.post(`/materials/${materialId}/review`, null, {
    params: {
      isApproved,
    },
  });
  return response;
};

// Đổi tên tài liệu
export const renameMaterial = async (materialId, title) => {
  const response = await api.put('/materials/rename-title', { materialId, title });
  return response;
};

// Upload tài liệu
export const uploadMaterial = async (file, workspaceId) => {
  if (!workspaceId) {
    throw new Error('workspaceID is required to upload material');
  }

  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/materials/upload', formData, {
    params: {
      workspaceID: Number(workspaceId),
    },
    headers: {
      'Content-Type': undefined, // Để Axios tự set multipart boundary
    },
    timeout: 120000, // 2 phút cho file lớn
  });
  return response;
};

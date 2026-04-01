import api from './api';

function buildMultipartConfig(workspaceId, options = {}) {
  const { onUploadProgress, timeout = 120000 } = options;

  return {
    params: {
      workspaceID: Number(workspaceId),
    },
    headers: {
      'Content-Type': undefined, // Để Axios tự set multipart boundary
    },
    timeout,
    ...(typeof onUploadProgress === 'function' ? { onUploadProgress } : {}),
  };
}

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

// Duyệt tài liệu group theo hàng chờ leader review
export const reviewGroupMaterial = async (materialId, isApproved) => {
  const response = await api.post(`/materials/${materialId}/group-review`, null, {
    params: {
      isApproved,
    },
  });
  return response;
};

// Lấy danh sách tài liệu group đang chờ leader duyệt
export const getPendingGroupMaterials = async (workspaceId) => {
  const response = await api.get(`/materials/workspace/${workspaceId}/pending-review`);
  return response;
};

// Upload tài liệu
export const uploadMaterial = async (file, workspaceId, options = {}) => {
  if (!workspaceId) {
    throw new Error('workspaceID is required to upload material');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(
    '/materials/upload',
    formData,
    buildMultipartConfig(workspaceId, options),
  );
  return response;
};

// Upload tài liệu group theo luồng AI kiểm duyệt + leader review
export const uploadGroupPendingMaterial = async (file, workspaceId, options = {}) => {
  if (!workspaceId) {
    throw new Error('workspaceID is required to upload group material');
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(
    '/materials/upload/group-pending',
    formData,
    buildMultipartConfig(workspaceId, options),
  );
  return response;
};

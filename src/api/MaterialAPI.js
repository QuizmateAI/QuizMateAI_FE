import api from './api';

const MATERIAL_REVIEW_TIMEOUT_MS = 60000;
// Material uploads can legitimately stay open for several minutes while the
// backend stores the file and starts downstream processing. A short client
// timeout makes the UI think the upload failed even though the server may
// still finish it, which leads to duplicate re-uploads.
const MATERIAL_UPLOAD_TIMEOUT_MS = 120000; // 2 phút timeout
// RAG ask: Python /rag/ask + Gemini có thể mất tới 2 phút khi cold start (reranker model
// load + Gemini API latency). FE timeout cao hơn BE (120s) để BE timeout trước với error
// message clear hơn.
const MATERIAL_ASK_TIMEOUT_MS = 130000;

function buildMultipartConfig(workspaceId, options = {}) {
  const { onUploadProgress, timeout = MATERIAL_UPLOAD_TIMEOUT_MS } = options;

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

// Lấy material content (URL + transcript) — dùng cho SourceDetailView khi
// material là media (audio/video) cần render player + script panel.
// Response shape: { materialId, materialType, url, transcript, isMedia }
export const getMaterialContent = async (materialId) => {
  const response = await api.get(`/materials/${materialId}/content`);
  return response;
};

// Lấy extracted summary từ materialId
export const getExtractedSummary = async (materialId) => {
  const response = await api.get(`/materials/${materialId}/extracted-summary`);
  return response;
};

// Lấy trạng thái task async theo taskId
export const getTaskStatusByTaskId = async (taskId) => {
  const response = await api.get(`/v1/quiz/status/${taskId}`);
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
    timeout: MATERIAL_REVIEW_TIMEOUT_MS,
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
    timeout: MATERIAL_REVIEW_TIMEOUT_MS,
  });
  return response;
};

// Lấy danh sách tài liệu group đang chờ leader duyệt
export const getPendingGroupMaterials = async (workspaceId) => {
  const response = await api.get(`/materials/workspace/${workspaceId}/pending-review`);
  return response;
};

// Hỏi AI dựa trên material — wraps POST /materials/ask
// Args: { question, workspaceId (required), materialId?, topK?, maxContextChars?, workspaceProfile? }
// Response forward từ Python /rag/ask: { question, answer, chunks_used, sources, chunk_contexts }
export const askMaterial = async ({
  question,
  workspaceId,
  materialId,
  topK,
  maxContextChars,
  workspaceProfile,
}) => {
  if (!question || !question.trim()) {
    throw new Error('Câu hỏi không được để trống');
  }
  if (!workspaceId) {
    throw new Error('workspaceId là bắt buộc');
  }
  const body = { question: question.trim(), workspaceId: Number(workspaceId) };
  if (materialId != null) body.materialId = Number(materialId);
  if (topK != null) body.topK = topK;
  if (maxContextChars != null) body.maxContextChars = maxContextChars;
  if (workspaceProfile) body.workspaceProfile = workspaceProfile;
  const response = await api.post('/materials/ask', body, {
    timeout: MATERIAL_ASK_TIMEOUT_MS,
  });
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

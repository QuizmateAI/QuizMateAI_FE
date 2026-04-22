import api from './api';

// Lấy danh sách flashcard set theo contextType và scopeId
export const getFlashcardsByScope = async (contextType, scopeId) => {
  let url = '';
  if (contextType === 'WORKSPACE' || contextType === 'GROUP') url = `/flashcards/getByWorkspace/${scopeId}`;
  else if (contextType === 'ROADMAP') url = `/flashcards/getByRoadmap/${scopeId}`;
  else if (contextType === 'PHASE') url = `/flashcards/getByPhase/${scopeId}`;
  else if (contextType === 'KNOWLEDGE') url = `/flashcards/getByKnowledge/${scopeId}`;
  
  if (url) return await api.get(url);
  throw new Error('Invalid contextType');
};

// Lấy danh sách flashcard set của user đang đăng nhập
export const getFlashcardsByUser = async () => {
  const response = await api.get('/flashcards/getByUser');
  return response;
};

// Tạo flashcard set mới (trạng thái DRAFT)
export const createFlashcardSet = async (data) => {
  const {
    workspaceId,
    roadmapId,
    phaseId,
    knowledgeId,
    contextType,
    contextId,
    flashcardSetName,
  } = data || {};

  const resolvedWorkspaceId = workspaceId
    || ((contextType === 'WORKSPACE' || contextType === 'GROUP') ? Number(contextId) : undefined);

  const payload = {
    workspaceId: Number(resolvedWorkspaceId),
    flashcardSetName,
  };

  if (roadmapId) payload.roadmapId = Number(roadmapId);
  if (phaseId) payload.phaseId = Number(phaseId);
  if (knowledgeId) payload.knowledgeId = Number(knowledgeId);

  const response = await api.post('/flashcards/create', payload);
  return response;
};

// Tạo flashcard set bằng AI (async)
export const generateAIFlashcardSet = async (data) => {
  const response = await api.post('/ai/flashcard:generated', data);
  return response;
};

// Lấy chi tiết flashcard set theo flashcardSetId
export const getFlashcardDetail = async (flashcardSetId) => {
  const response = await api.get(`/flashcards/get/${flashcardSetId}`);
  return response;
};

// Cập nhật tên flashcard set
export const updateFlashcardSetName = async (flashcardSetId, flashcardSetName) => {
  const response = await api.patch(`/flashcards/${flashcardSetId}/name`, { flashcardSetName });
  return response;
};

// Cập nhật trạng thái flashcard set (DRAFT -> ACTIVE, ...)
export const updateFlashcardSetStatus = async (flashcardSetId, status) => {
  const response = await api.patch(`/flashcards/${flashcardSetId}/status`, { status });
  return response;
};

// Cấu hình flashcard chung cho nhóm hoặc gán thành viên cụ thể
export const setGroupFlashcardAudience = async (flashcardSetId, body) => {
  const response = await api.put(`/flashcards/${flashcardSetId}/group/audience`, body);
  return response;
};

// Thêm flashcard item vào flashcard set
export const addFlashcardItem = async (flashcardSetId, data) => {
  const response = await api.post(`/flashcards/${flashcardSetId}/items`, data);
  return response;
};

// Cập nhật nội dung flashcard item
export const updateFlashcardItem = async (flashcardItemId, data) => {
  const response = await api.put(`/flashcards/items/${flashcardItemId}`, data);
  return response;
};

// Xóa flashcard item
export const deleteFlashcardItem = async (flashcardItemId) => {
  const response = await api.delete(`/flashcards/items/${flashcardItemId}`);
  return response;
};

// Xóa flashcard set
export const deleteFlashcardSet = async (flashcardSetId) => {
  const response = await api.delete(`/flashcards/${flashcardSetId}`);
  return response;
};

// Bulk create flashcard set + items. Default trạng thái DRAFT; nếu activate=true thì chuyển ACTIVE nguyên tử.
// payload: { workspaceId, flashcardSetName, items: [{ frontContent, backContent }, ...],
//           roadmapId?, phaseId?, knowledgeId?, activate?: boolean }
export const createManualFlashcardBulk = async (payload) => {
  const response = await api.post('/flashcards/manual:create-bulk', payload);
  return response;
};

// Bulk update flashcard set + items (diff-based upsert). Chỉ áp dụng ở DRAFT.
// Nếu activate=true: sau khi diff xong → chuyển sang ACTIVE.
// payload: { flashcardSetName, items: [{ flashcardItemId?, frontContent, backContent }, ...], activate?: boolean }
export const updateManualFlashcardBulk = async (flashcardSetId, payload) => {
  const response = await api.put(`/flashcards/${flashcardSetId}/manual:update-bulk`, payload);
  return response;
};

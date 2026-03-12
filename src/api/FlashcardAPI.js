import api from './api';

// Lấy danh sách flashcard set theo contextType và scopeId
export const getFlashcardsByScope = async (contextType, scopeId) => {
  let url = '';
  if (contextType === 'WORKSPACE') url = `/flashcards/getByWorkspace/${scopeId}`;
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
  const response = await api.post('/flashcards/create', data);
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

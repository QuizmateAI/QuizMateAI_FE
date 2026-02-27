import api from './api';

// Lấy danh sách flashcard set theo contextType và contextId
export const getFlashcardsByContext = async (contextType, contextId) => {
  const response = await api.get(`/flashcards/getByContext/${contextType}/${contextId}`);
  return response;
};

// Lấy danh sách flashcard của user đang đăng nhập
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

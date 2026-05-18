import api from './api';

const buildUrl = (path, params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

// List paginated. BE sort theo pinned DESC, createdAt DESC, max size = 50.
// Response: { items, totalElements, totalPages, page, size, unreadCount }.
export const listAnnouncements = async (workspaceId, { page = 0, size = 20 } = {}) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  return await api.get(buildUrl(`/group/${workspaceId}/announcements`, { page, size }));
};

// Detail. Tự-marked-read khi GET? Không — read là endpoint riêng để FE chủ động.
export const getAnnouncement = async (workspaceId, announcementId) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  if (announcementId == null) throw new Error('Missing announcementId');
  const id = encodeURIComponent(String(announcementId));
  return await api.get(`/group/${workspaceId}/announcements/${id}`);
};

// Số announcement chưa đọc trong workspace — dùng cho sidebar badge.
export const getAnnouncementUnreadCount = async (workspaceId) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  return await api.get(`/group/${workspaceId}/announcements/unread-count`);
};

// Mark read — idempotent.
export const markAnnouncementAsRead = async (workspaceId, announcementId) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  if (announcementId == null) throw new Error('Missing announcementId');
  const id = encodeURIComponent(String(announcementId));
  return await api.post(`/group/${workspaceId}/announcements/${id}/read`);
};

// Create — yêu cầu MANAGE_ANNOUNCEMENT (leader luôn có). BE fanout WS + notification.
export const createAnnouncement = async (workspaceId, payload) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  return await api.post(`/group/${workspaceId}/announcements`, payload);
};

// Update — chỉ author hoặc leader (+MANAGE_ANNOUNCEMENT). BE fanout WS update event.
export const updateAnnouncement = async (workspaceId, announcementId, payload) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  if (announcementId == null) throw new Error('Missing announcementId');
  const id = encodeURIComponent(String(announcementId));
  return await api.put(`/group/${workspaceId}/announcements/${id}`, payload);
};

// Delete soft — author hoặc leader. BE fanout WS delete event.
export const deleteAnnouncement = async (workspaceId, announcementId) => {
  if (workspaceId == null) throw new Error('Missing workspaceId');
  if (announcementId == null) throw new Error('Missing announcementId');
  const id = encodeURIComponent(String(announcementId));
  return await api.delete(`/group/${workspaceId}/announcements/${id}`);
};

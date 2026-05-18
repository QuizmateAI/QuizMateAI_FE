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

// Inbox phân trang. BE clamp 1 ≤ size ≤ 50 nhưng axios interceptor cũng tự
// clamp (applyPaginationBounds) — page mặc định 0, size mặc định 20.
export const listNotifications = async ({ page = 0, size = 20 } = {}) => {
  return await api.get(buildUrl('/notifications', { page, size }));
};

// Số notification chưa đọc — dùng cho badge bell. Idempotent, có thể poll.
export const getNotificationUnreadCount = async () => {
  return await api.get('/notifications/unread-count');
};

// Mark 1 notification đã đọc. BE trả về empty / idempotent — gọi lại không lỗi.
export const markNotificationAsRead = async (notificationId) => {
  if (notificationId == null) throw new Error('Missing notificationId');
  const id = encodeURIComponent(String(notificationId));
  return await api.post(`/notifications/${id}/read`);
};

// Mark tất cả đã đọc. BE trả về { updatedCount } trong data.
export const markAllNotificationsAsRead = async () => {
  return await api.post('/notifications/read-all');
};

import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/api/api';
import {
  getNotificationUnreadCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/api/NotificationAPI';

vi.mock('@/api/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('NotificationAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: {} });
    api.post.mockResolvedValue({ data: {} });
  });

  it('listNotifications passes default pagination', async () => {
    await listNotifications();
    expect(api.get).toHaveBeenCalledWith('/notifications?page=0&size=20');
  });

  it('listNotifications forwards custom pagination params', async () => {
    await listNotifications({ page: 3, size: 50 });
    expect(api.get).toHaveBeenCalledWith('/notifications?page=3&size=50');
  });

  it('listNotifications drops null params instead of serialising them', async () => {
    // Truyền null tường minh (caller hiếm khi làm, nhưng buildUrl phải an toàn).
    // Lưu ý: `size: undefined` sẽ bị destructure-default phục hồi về 20, đây là
    // lý do test dùng null để kiểm chứng nhánh drop của buildUrl.
    await listNotifications({ page: 0, size: null });
    expect(api.get).toHaveBeenCalledWith('/notifications?page=0');
  });

  it('getNotificationUnreadCount hits the dedicated endpoint', async () => {
    await getNotificationUnreadCount();
    expect(api.get).toHaveBeenCalledWith('/notifications/unread-count');
  });

  it('markNotificationAsRead encodes id and POSTs', async () => {
    await markNotificationAsRead(42);
    expect(api.post).toHaveBeenCalledWith('/notifications/42/read');
  });

  it('markNotificationAsRead throws on missing id (no API call)', async () => {
    await expect(markNotificationAsRead(null)).rejects.toThrow('Missing notificationId');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('markAllNotificationsAsRead hits the bulk endpoint', async () => {
    await markAllNotificationsAsRead();
    expect(api.post).toHaveBeenCalledWith('/notifications/read-all');
  });
});

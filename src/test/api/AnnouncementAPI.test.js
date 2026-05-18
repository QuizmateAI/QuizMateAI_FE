import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/api/api';
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncement,
  getAnnouncementUnreadCount,
  listAnnouncements,
  markAnnouncementAsRead,
  updateAnnouncement,
} from '@/api/AnnouncementAPI';

vi.mock('@/api/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('AnnouncementAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: {} });
    api.post.mockResolvedValue({ data: {} });
    api.put.mockResolvedValue({ data: {} });
    api.delete.mockResolvedValue({ data: {} });
  });

  it('listAnnouncements appends default pagination to workspace path', async () => {
    await listAnnouncements(123);
    expect(api.get).toHaveBeenCalledWith('/group/123/announcements?page=0&size=20');
  });

  it('listAnnouncements respects custom pagination', async () => {
    await listAnnouncements(7, { page: 2, size: 50 });
    expect(api.get).toHaveBeenCalledWith('/group/7/announcements?page=2&size=50');
  });

  it('listAnnouncements throws when workspaceId is missing', async () => {
    await expect(listAnnouncements(null)).rejects.toThrow('Missing workspaceId');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('getAnnouncement encodes both ids', async () => {
    await getAnnouncement(5, 42);
    expect(api.get).toHaveBeenCalledWith('/group/5/announcements/42');
  });

  it('getAnnouncementUnreadCount hits dedicated endpoint', async () => {
    await getAnnouncementUnreadCount(11);
    expect(api.get).toHaveBeenCalledWith('/group/11/announcements/unread-count');
  });

  it('markAnnouncementAsRead POSTs the read endpoint (idempotent)', async () => {
    await markAnnouncementAsRead(11, 99);
    expect(api.post).toHaveBeenCalledWith('/group/11/announcements/99/read');
  });

  it('createAnnouncement forwards title/content/pinned payload', async () => {
    const payload = { title: 'Hello', content: 'Body text', pinned: true };
    await createAnnouncement(11, payload);
    expect(api.post).toHaveBeenCalledWith('/group/11/announcements', payload);
  });

  it('updateAnnouncement uses PUT and the id endpoint', async () => {
    const payload = { title: 'Updated', content: 'New body', pinned: false };
    await updateAnnouncement(11, 99, payload);
    expect(api.put).toHaveBeenCalledWith('/group/11/announcements/99', payload);
  });

  it('deleteAnnouncement uses DELETE on the id endpoint', async () => {
    await deleteAnnouncement(11, 99);
    expect(api.delete).toHaveBeenCalledWith('/group/11/announcements/99');
  });

  it('mutations throw on missing ids without hitting the API', async () => {
    await expect(getAnnouncement(1, null)).rejects.toThrow('Missing announcementId');
    await expect(markAnnouncementAsRead(1, null)).rejects.toThrow('Missing announcementId');
    await expect(updateAnnouncement(1, null, {})).rejects.toThrow('Missing announcementId');
    await expect(deleteAnnouncement(1, null)).rejects.toThrow('Missing announcementId');
    expect(api.put).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});

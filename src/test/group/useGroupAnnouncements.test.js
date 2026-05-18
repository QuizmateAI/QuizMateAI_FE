import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/api/AnnouncementAPI', () => ({
  listAnnouncements: vi.fn(),
  getAnnouncementUnreadCount: vi.fn(),
  markAnnouncementAsRead: vi.fn(),
  createAnnouncement: vi.fn(),
  updateAnnouncement: vi.fn(),
  deleteAnnouncement: vi.fn(),
  getAnnouncement: vi.fn(),
}));

import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncementUnreadCount,
  listAnnouncements,
  markAnnouncementAsRead,
  updateAnnouncement,
} from '@/api/AnnouncementAPI';
import { useGroupAnnouncements } from '@/pages/Users/Group/hooks/useGroupAnnouncements';

const buildList = (overrides = {}) => ({
  data: {
    items: [
      { announcementId: 1, title: 'Pinned A', pinned: true, readByMe: false, createdAt: '2026-05-17T10:00:00Z' },
      { announcementId: 2, title: 'Recent B', pinned: false, readByMe: true, createdAt: '2026-05-17T09:00:00Z' },
    ],
    totalElements: 2,
    totalPages: 1,
    page: 0,
    size: 20,
    unreadCount: 1,
    ...overrides,
  },
});

describe('useGroupAnnouncements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAnnouncements.mockResolvedValue(buildList());
    getAnnouncementUnreadCount.mockResolvedValue({ data: { unreadCount: 1 } });
    markAnnouncementAsRead.mockResolvedValue({});
    createAnnouncement.mockResolvedValue({
      data: { announcementId: 99, title: 'New', pinned: true, readByMe: true, createdAt: '2026-05-17T11:00:00Z' },
    });
    updateAnnouncement.mockResolvedValue({
      data: { announcementId: 1, title: 'Pinned A (edited)', pinned: true, readByMe: false, createdAt: '2026-05-17T10:00:00Z' },
    });
    deleteAnnouncement.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches unread count on mount when enabled', async () => {
    renderHook(() => useGroupAnnouncements(7));
    await waitFor(() => {
      expect(getAnnouncementUnreadCount).toHaveBeenCalledWith(7);
    });
    expect(listAnnouncements).not.toHaveBeenCalled();
  });

  it('refresh loads page 0 and applies BE unreadCount', async () => {
    const { result } = renderHook(() => useGroupAnnouncements(7));
    await act(async () => {
      await result.current.refresh();
    });
    expect(listAnnouncements).toHaveBeenCalledWith(7, { page: 0, size: 20 });
    expect(result.current.items).toHaveLength(2);
    expect(result.current.unreadCount).toBe(1);
    // Pinned phải đứng đầu
    expect(result.current.items[0].pinned).toBe(true);
  });

  it('skips API entirely when workspaceId is missing', async () => {
    const { result } = renderHook(() => useGroupAnnouncements(null));
    await act(async () => {
      await result.current.refresh();
    });
    expect(listAnnouncements).not.toHaveBeenCalled();
    expect(getAnnouncementUnreadCount).not.toHaveBeenCalled();
  });

  it('markAsRead decrements unreadCount optimistically and POSTs once', async () => {
    const { result } = renderHook(() => useGroupAnnouncements(7));
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.markAsRead(1);
    });
    expect(markAnnouncementAsRead).toHaveBeenCalledWith(7, 1);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.items.find((i) => i.announcementId === 1)?.readByMe).toBe(true);
  });

  it('create prepends a new item locally and bumps total', async () => {
    const { result } = renderHook(() => useGroupAnnouncements(7));
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.create({ title: 'New', content: 'Body', pinned: true });
    });
    expect(createAnnouncement).toHaveBeenCalledWith(7, { title: 'New', content: 'Body', pinned: true });
    expect(result.current.items.find((i) => i.announcementId === 99)).toBeTruthy();
    expect(result.current.totalElements).toBe(3);
  });

  it('update replaces the in-place item', async () => {
    const { result } = renderHook(() => useGroupAnnouncements(7));
    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.update(1, { title: 'Pinned A (edited)', content: 'Body', pinned: true });
    });
    expect(updateAnnouncement).toHaveBeenCalledWith(7, 1, {
      title: 'Pinned A (edited)',
      content: 'Body',
      pinned: true,
    });
    expect(result.current.items.find((i) => i.announcementId === 1)?.title).toBe('Pinned A (edited)');
  });

  it('remove drops the item and decrements unread when unread', async () => {
    const { result } = renderHook(() => useGroupAnnouncements(7));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.unreadCount).toBe(1);
    await act(async () => {
      await result.current.remove(1);
    });
    expect(deleteAnnouncement).toHaveBeenCalledWith(7, 1);
    expect(result.current.items.find((i) => i.announcementId === 1)).toBeFalsy();
    expect(result.current.totalElements).toBe(1);
    expect(result.current.unreadCount).toBe(0);
  });

  it('handleWebSocketEvent DELETED removes item without refetch', async () => {
    const { result } = renderHook(() => useGroupAnnouncements(7));
    await act(async () => {
      await result.current.refresh();
    });
    listAnnouncements.mockClear();

    act(() => {
      result.current.handleWebSocketEvent({
        type: 'ANNOUNCEMENT_DELETED',
        announcementId: 1,
        workspaceId: 7,
      });
    });
    expect(listAnnouncements).not.toHaveBeenCalled();
    expect(result.current.items.find((i) => i.announcementId === 1)).toBeFalsy();
  });

  it('handleWebSocketEvent CREATED triggers refetch', async () => {
    const { result } = renderHook(() => useGroupAnnouncements(7));
    await act(async () => {
      await result.current.refresh();
    });
    listAnnouncements.mockClear();
    listAnnouncements.mockResolvedValueOnce(buildList({ totalElements: 3, unreadCount: 2 }));

    await act(async () => {
      result.current.handleWebSocketEvent({
        type: 'ANNOUNCEMENT_CREATED',
        announcementId: 5,
        workspaceId: 7,
      });
      // chờ promise refetch resolve
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listAnnouncements).toHaveBeenCalledTimes(1);
  });

  it('handleWebSocketEvent ignores events from other workspaces', async () => {
    const { result } = renderHook(() => useGroupAnnouncements(7));
    await act(async () => {
      await result.current.refresh();
    });
    listAnnouncements.mockClear();

    act(() => {
      result.current.handleWebSocketEvent({
        type: 'ANNOUNCEMENT_CREATED',
        announcementId: 11,
        workspaceId: 99,
      });
    });
    expect(listAnnouncements).not.toHaveBeenCalled();
  });
});

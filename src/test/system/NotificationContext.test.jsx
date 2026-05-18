import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import { NotificationProvider, useNotifications } from '@/context/NotificationContext';

// Mock token storage trước khi import context — context đọc qua hasAccessToken().
vi.mock('@/utils/tokenStorage', () => ({
  hasAccessToken: vi.fn(),
}));

// Bắt callback onNotification để có thể đẩy WS message giả vào provider.
let capturedOnNotification = null;
vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(({ onNotification } = {}) => {
    capturedOnNotification = onNotification ?? null;
    return { isConnected: true, lastMessage: null, send: () => {} };
  }),
}));

vi.mock('@/api/NotificationAPI', () => ({
  listNotifications: vi.fn(),
  getNotificationUnreadCount: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
}));

import { hasAccessToken } from '@/utils/tokenStorage';
import {
  getNotificationUnreadCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/api/NotificationAPI';

function NotificationProbe() {
  const ctx = useNotifications();
  return (
    <div>
      <span data-testid="unread">{ctx.unreadCount}</span>
      <span data-testid="items-count">{ctx.items.length}</span>
      <span data-testid="auth">{String(ctx.isAuthenticated)}</span>
      <span data-testid="loading">{String(ctx.isLoading)}</span>
      <button onClick={() => ctx.refresh()}>refresh</button>
      <button onClick={() => ctx.markAsRead(ctx.items[0]?.notificationId)}>read-first</button>
      <button onClick={() => ctx.markAllAsRead()}>read-all</button>
    </div>
  );
}

const renderProvider = () =>
  render(
    <NotificationProvider>
      <NotificationProbe />
    </NotificationProvider>,
  );

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('NotificationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnNotification = null;
    hasAccessToken.mockReturnValue(true);
    getNotificationUnreadCount.mockResolvedValue({ data: { unreadCount: 3 } });
    listNotifications.mockResolvedValue({
      data: {
        items: [
          { notificationId: 1, title: 'A', readAt: null, createdAt: '2026-05-17T08:00:00Z' },
          { notificationId: 2, title: 'B', readAt: '2026-05-17T07:30:00Z', createdAt: '2026-05-17T07:00:00Z' },
        ],
        totalElements: 2,
        totalPages: 1,
        page: 0,
        size: 20,
        unreadCount: 1,
      },
    });
    markNotificationAsRead.mockResolvedValue({});
    markAllNotificationsAsRead.mockResolvedValue({ data: { updatedCount: 1 } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches unread count on mount when authenticated', async () => {
    renderProvider();
    await flushPromises();

    expect(getNotificationUnreadCount).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('unread').textContent).toBe('3');
    // Không tự fetch list — chờ caller gọi refresh()
    expect(listNotifications).not.toHaveBeenCalled();
  });

  it('skips API calls and stays empty when unauthenticated', async () => {
    hasAccessToken.mockReturnValue(false);
    renderProvider();
    await flushPromises();

    expect(getNotificationUnreadCount).not.toHaveBeenCalled();
    expect(screen.getByTestId('auth').textContent).toBe('false');
    expect(screen.getByTestId('unread').textContent).toBe('0');
  });

  it('loads items via refresh() and uses BE unreadCount when present', async () => {
    renderProvider();
    await flushPromises();

    await act(async () => {
      screen.getByText('refresh').click();
    });
    await flushPromises();

    expect(listNotifications).toHaveBeenCalledWith({ page: 0, size: 20 });
    expect(screen.getByTestId('items-count').textContent).toBe('2');
    // unread count được override theo response của list
    expect(screen.getByTestId('unread').textContent).toBe('1');
  });

  it('prepends incoming WS notification and bumps unread', async () => {
    renderProvider();
    await flushPromises();
    await act(async () => {
      screen.getByText('refresh').click();
    });
    await flushPromises();

    expect(capturedOnNotification).toBeTypeOf('function');

    act(() => {
      capturedOnNotification({
        notificationId: 99,
        title: 'Live',
        body: 'từ WS',
        createdAt: '2026-05-17T09:00:00Z',
      });
    });

    expect(screen.getByTestId('items-count').textContent).toBe('3');
    expect(screen.getByTestId('unread').textContent).toBe('2');
  });

  it('does NOT prepend WS event before list is loaded (avoids orphan item)', async () => {
    renderProvider();
    await flushPromises();

    act(() => {
      capturedOnNotification({ notificationId: 7, title: 'Live', createdAt: '2026-05-17T09:00:00Z' });
    });

    expect(screen.getByTestId('items-count').textContent).toBe('0');
    // unread vẫn được bump kể cả khi list chưa load
    expect(screen.getByTestId('unread').textContent).toBe('4');
  });

  it('markAsRead decrements unread optimistically', async () => {
    renderProvider();
    await flushPromises();
    await act(async () => {
      screen.getByText('refresh').click();
    });
    await flushPromises();

    expect(screen.getByTestId('unread').textContent).toBe('1');

    await act(async () => {
      screen.getByText('read-first').click();
    });
    await flushPromises();

    expect(markNotificationAsRead).toHaveBeenCalledWith(1);
    expect(screen.getByTestId('unread').textContent).toBe('0');
  });

  it('markAllAsRead zeros the badge', async () => {
    renderProvider();
    await flushPromises();
    await act(async () => {
      screen.getByText('refresh').click();
    });
    await flushPromises();

    await act(async () => {
      screen.getByText('read-all').click();
    });
    await flushPromises();

    expect(markAllNotificationsAsRead).toHaveBeenCalled();
    expect(screen.getByTestId('unread').textContent).toBe('0');
  });

  it('clears state on logout via auth:changed', async () => {
    renderProvider();
    await flushPromises();
    await act(async () => {
      screen.getByText('refresh').click();
    });
    await flushPromises();

    expect(screen.getByTestId('items-count').textContent).toBe('2');

    hasAccessToken.mockReturnValue(false);
    act(() => {
      window.dispatchEvent(new Event('auth:changed'));
    });

    expect(screen.getByTestId('items-count').textContent).toBe('0');
    expect(screen.getByTestId('unread').textContent).toBe('0');
    expect(screen.getByTestId('auth').textContent).toBe('false');
  });
});

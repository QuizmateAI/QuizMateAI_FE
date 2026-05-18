import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  getNotificationUnreadCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/api/NotificationAPI';
import { useWebSocket } from '@/hooks/useWebSocket';
import { hasAccessToken } from '@/utils/tokenStorage';

const NotificationContext = createContext({
  items: [],
  unreadCount: 0,
  totalElements: 0,
  page: 0,
  hasMore: false,
  isLoading: false,
  isLoadingMore: false,
  isAuthenticated: false,
  error: null,
  refresh: async () => {},
  loadMore: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

const PAGE_SIZE = 20;

function normalizeId(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function unwrapData(response) {
  if (response && typeof response === 'object' && 'data' in response) {
    return response.data ?? null;
  }
  return response ?? null;
}

function mergeItemsUnique(existingItems, incomingItems) {
  if (!Array.isArray(incomingItems) || incomingItems.length === 0) return existingItems;
  const knownIds = new Set(
    existingItems
      .map((item) => normalizeId(item?.notificationId))
      .filter((value) => value !== null),
  );
  const filtered = incomingItems.filter((item) => {
    const id = normalizeId(item?.notificationId);
    if (id === null) return false;
    if (knownIds.has(id)) return false;
    knownIds.add(id);
    return true;
  });
  return [...existingItems, ...filtered];
}

function applyReadFlag(items, notificationId, readAtIso) {
  const targetId = normalizeId(notificationId);
  if (targetId === null) return items;
  let changed = false;
  const next = items.map((item) => {
    if (normalizeId(item?.notificationId) !== targetId) return item;
    if (item?.readAt) return item;
    changed = true;
    return { ...item, readAt: readAtIso };
  });
  return changed ? next : items;
}

function applyReadFlagAll(items, readAtIso) {
  let changed = false;
  const next = items.map((item) => {
    if (item?.readAt) return item;
    changed = true;
    return { ...item, readAt: readAtIso };
  });
  return changed ? next : items;
}

export function NotificationProvider({ children }) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => hasAccessToken());

  const itemsLoadedRef = useRef(false);
  const inflightRefreshRef = useRef(null);

  // Theo dõi login/logout → reset state khi đổi user. Việc kết nối WS được
  // useWebSocket bên trong cùng hook lo (nó cũng listen auth:changed).
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = () => {
      const next = hasAccessToken();
      setIsAuthenticated((prev) => (prev === next ? prev : next));
      if (!next) {
        setItems([]);
        setUnreadCount(0);
        setTotalElements(0);
        setTotalPages(0);
        setPage(0);
        setError(null);
        itemsLoadedRef.current = false;
      }
    };
    window.addEventListener('auth:changed', handler);
    return () => window.removeEventListener('auth:changed', handler);
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!hasAccessToken()) return;
    try {
      const response = await getNotificationUnreadCount();
      const data = unwrapData(response);
      const next = Number(data?.unreadCount);
      if (Number.isFinite(next) && next >= 0) {
        setUnreadCount(next);
      }
    } catch (err) {
      // Lỗi đếm unread không chặn UI — bell vẫn render với giá trị cũ.
      console.error('Failed to fetch notification unread count:', err);
    }
  }, []);

  // Tải page 0 (và refresh unread). Single-flight để click bell nhiều lần
  // không tạo race — caller gọi `refresh()` sẽ nhận lại cùng 1 promise.
  const refresh = useCallback(async () => {
    if (!hasAccessToken()) return;
    if (inflightRefreshRef.current) return inflightRefreshRef.current;

    setIsLoading(true);
    setError(null);

    const promise = (async () => {
      try {
        const response = await listNotifications({ page: 0, size: PAGE_SIZE });
        const data = unwrapData(response) || {};
        const incoming = Array.isArray(data.items) ? data.items : [];
        setItems(incoming);
        setTotalElements(Number(data.totalElements) || incoming.length);
        setTotalPages(Number(data.totalPages) || 0);
        setPage(0);
        const nextUnread = Number(data.unreadCount);
        if (Number.isFinite(nextUnread) && nextUnread >= 0) {
          setUnreadCount(nextUnread);
        }
        itemsLoadedRef.current = true;
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
        inflightRefreshRef.current = null;
      }
    })();

    inflightRefreshRef.current = promise;
    return promise;
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasAccessToken()) return;
    if (isLoadingMore || isLoading) return;
    const nextPage = page + 1;
    if (totalPages && nextPage >= totalPages) return;

    setIsLoadingMore(true);
    try {
      const response = await listNotifications({ page: nextPage, size: PAGE_SIZE });
      const data = unwrapData(response) || {};
      const incoming = Array.isArray(data.items) ? data.items : [];
      setItems((prev) => mergeItemsUnique(prev, incoming));
      setTotalElements(Number(data.totalElements) || totalElements);
      setTotalPages(Number(data.totalPages) || totalPages);
      setPage(nextPage);
      const nextUnread = Number(data.unreadCount);
      if (Number.isFinite(nextUnread) && nextUnread >= 0) {
        setUnreadCount(nextUnread);
      }
    } catch (err) {
      setError(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, page, totalElements, totalPages]);

  const markAsRead = useCallback(async (notificationId) => {
    const targetId = normalizeId(notificationId);
    if (targetId === null) return;
    if (!hasAccessToken()) return;

    // Optimistic: nếu item đang unread, giảm count và set readAt ngay.
    // Closure `wasUnread` được setItems-updater gán giá trị; setUnreadCount
    // dùng functional update để đọc sau khi updater trước đã chạy (cùng queue
    // React xử lý theo thứ tự), tránh đọc stale closure khi React batch.
    let wasUnread = false;
    setItems((prev) => {
      const current = prev.find((item) => normalizeId(item?.notificationId) === targetId);
      wasUnread = Boolean(current && !current.readAt);
      return applyReadFlag(prev, targetId, new Date().toISOString());
    });
    setUnreadCount((prev) => (wasUnread ? Math.max(0, prev - 1) : prev));

    try {
      await markNotificationAsRead(targetId);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      // Rollback unread count (state item vẫn giữ readAt vì có thể BE đã apply).
      if (wasUnread) {
        setUnreadCount((prev) => prev + 1);
      }
      // Đồng bộ lại từ server nếu có thể.
      void fetchUnreadCount();
      throw err;
    }
  }, [fetchUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    if (!hasAccessToken()) return;
    const previousUnread = unreadCount;
    setItems((prev) => applyReadFlagAll(prev, new Date().toISOString()));
    setUnreadCount(0);
    try {
      await markAllNotificationsAsRead();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      setUnreadCount(previousUnread);
      void fetchUnreadCount();
      throw err;
    }
  }, [fetchUnreadCount, unreadCount]);

  // WS push handler — BE đẩy NotificationResponse vào /user/queue/notifications.
  const handleIncomingNotification = useCallback((payload) => {
    if (!payload || typeof payload !== 'object') return;
    const id = normalizeId(payload.notificationId);
    if (id === null) return;

    setUnreadCount((prev) => prev + 1);
    setTotalElements((prev) => prev + 1);
    // Chỉ prepend nếu list đã load — tránh hiển thị 1 item lẻ trước khi user mở bell.
    if (itemsLoadedRef.current) {
      setItems((prev) => {
        if (prev.some((item) => normalizeId(item?.notificationId) === id)) return prev;
        return [payload, ...prev];
      });
    }
  }, []);

  // Mount WS subscription cho /user/queue/notifications khi đã đăng nhập.
  useWebSocket({
    onNotification: handleIncomingNotification,
    enabled: isAuthenticated,
  });

  // Lần đầu vào app: lấy unread count để bell hiển thị badge ngay.
  useEffect(() => {
    if (!isAuthenticated) return;
    void fetchUnreadCount();
  }, [fetchUnreadCount, isAuthenticated]);

  const hasMore = useMemo(() => {
    if (!totalPages) return false;
    return page + 1 < totalPages;
  }, [page, totalPages]);

  const value = useMemo(() => ({
    items,
    unreadCount,
    totalElements,
    page,
    hasMore,
    isLoading,
    isLoadingMore,
    isAuthenticated,
    error,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
  }), [
    items,
    unreadCount,
    totalElements,
    page,
    hasMore,
    isLoading,
    isLoadingMore,
    isAuthenticated,
    error,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
  ]);

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

export { NotificationContext };

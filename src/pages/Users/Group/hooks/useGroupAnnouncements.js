import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createAnnouncement as createAnnouncementAPI,
  deleteAnnouncement as deleteAnnouncementAPI,
  getAnnouncementUnreadCount as getAnnouncementUnreadCountAPI,
  listAnnouncements as listAnnouncementsAPI,
  markAnnouncementAsRead as markAnnouncementAsReadAPI,
  updateAnnouncement as updateAnnouncementAPI,
} from '@/api/AnnouncementAPI';

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

// BE sort theo `pinned DESC, createdAt DESC`. Khi prepend item từ WS hoặc local
// optimistic, sort lại để chuỗi pinned đứng đầu — tránh pinned bị lẫn vào unpinned.
function sortByPinnedThenRecent(items) {
  return [...items].sort((a, b) => {
    const pa = a?.pinned ? 1 : 0;
    const pb = b?.pinned ? 1 : 0;
    if (pa !== pb) return pb - pa;
    const ta = new Date(a?.createdAt || 0).getTime();
    const tb = new Date(b?.createdAt || 0).getTime();
    return tb - ta;
  });
}

function applyReadFlag(items, announcementId, readByMe = true) {
  const targetId = normalizeId(announcementId);
  if (targetId === null) return items;
  let changed = false;
  const next = items.map((item) => {
    if (normalizeId(item?.announcementId) !== targetId) return item;
    if (item?.readByMe === readByMe) return item;
    changed = true;
    return { ...item, readByMe };
  });
  return changed ? next : items;
}

function mergeUnique(existing, incoming) {
  if (!Array.isArray(incoming) || incoming.length === 0) return existing;
  const seen = new Set(
    existing
      .map((item) => normalizeId(item?.announcementId))
      .filter((value) => value !== null),
  );
  const filtered = incoming.filter((item) => {
    const id = normalizeId(item?.announcementId);
    if (id === null) return false;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return [...existing, ...filtered];
}

export function useGroupAnnouncements(workspaceId, { enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const inflightRefreshRef = useRef(null);
  const isEnabled = Boolean(enabled) && workspaceId != null && workspaceId !== 'new';

  // Reset state khi đổi workspace (user switch nhóm) — tránh leak items cũ.
  useEffect(() => {
    setItems([]);
    setUnreadCount(0);
    setTotalElements(0);
    setTotalPages(0);
    setPage(0);
    setError(null);
    inflightRefreshRef.current = null;
  }, [workspaceId]);

  const fetchUnreadCount = useCallback(async () => {
    if (!isEnabled) return;
    try {
      const response = await getAnnouncementUnreadCountAPI(workspaceId);
      const data = unwrapData(response);
      const next = Number(data?.unreadCount);
      if (Number.isFinite(next) && next >= 0) {
        setUnreadCount(next);
      }
    } catch (err) {
      // Badge có thể giữ giá trị cũ — không hiển thị lỗi cho user.
      console.error('Failed to fetch announcement unread count:', err);
    }
  }, [isEnabled, workspaceId]);

  // Load page 0. Single-flight: nhiều caller (mount + WS event) share 1 request.
  const refresh = useCallback(async () => {
    if (!isEnabled) return;
    if (inflightRefreshRef.current) return inflightRefreshRef.current;

    setIsLoading(true);
    setError(null);

    const promise = (async () => {
      try {
        const response = await listAnnouncementsAPI(workspaceId, { page: 0, size: PAGE_SIZE });
        const data = unwrapData(response) || {};
        const incoming = Array.isArray(data.items) ? data.items : [];
        setItems(sortByPinnedThenRecent(incoming));
        setTotalElements(Number(data.totalElements) || incoming.length);
        setTotalPages(Number(data.totalPages) || 0);
        setPage(0);
        const nextUnread = Number(data.unreadCount);
        if (Number.isFinite(nextUnread) && nextUnread >= 0) {
          setUnreadCount(nextUnread);
        }
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
        inflightRefreshRef.current = null;
      }
    })();

    inflightRefreshRef.current = promise;
    return promise;
  }, [isEnabled, workspaceId]);

  const loadMore = useCallback(async () => {
    if (!isEnabled) return;
    if (isLoadingMore || isLoading) return;
    const nextPage = page + 1;
    if (totalPages && nextPage >= totalPages) return;

    setIsLoadingMore(true);
    try {
      const response = await listAnnouncementsAPI(workspaceId, { page: nextPage, size: PAGE_SIZE });
      const data = unwrapData(response) || {};
      const incoming = Array.isArray(data.items) ? data.items : [];
      setItems((prev) => sortByPinnedThenRecent(mergeUnique(prev, incoming)));
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
  }, [isEnabled, isLoading, isLoadingMore, page, totalElements, totalPages, workspaceId]);

  const markAsRead = useCallback(async (announcementId) => {
    const targetId = normalizeId(announcementId);
    if (targetId === null || !isEnabled) return;

    // Optimistic — closure `wasUnread` được updater gán, setUnreadCount đọc lại
    // qua functional update để tránh stale closure khi React batch (xem
    // NotificationContext.markAsRead cho cùng lý do).
    let wasUnread = false;
    setItems((prev) => {
      const current = prev.find((item) => normalizeId(item?.announcementId) === targetId);
      wasUnread = Boolean(current && !current.readByMe);
      return applyReadFlag(prev, targetId, true);
    });
    setUnreadCount((prev) => (wasUnread ? Math.max(0, prev - 1) : prev));

    try {
      await markAnnouncementAsReadAPI(workspaceId, targetId);
    } catch (err) {
      console.error('Failed to mark announcement as read:', err);
      if (wasUnread) {
        setUnreadCount((prev) => prev + 1);
      }
      void fetchUnreadCount();
      throw err;
    }
  }, [fetchUnreadCount, isEnabled, workspaceId]);

  const create = useCallback(async ({ title, content, pinned = false }) => {
    if (!isEnabled) throw new Error('Workspace not ready');
    const response = await createAnnouncementAPI(workspaceId, {
      title: String(title || '').trim(),
      content: String(content || '').trim(),
      pinned: Boolean(pinned),
    });
    const created = unwrapData(response);
    if (created && created.announcementId != null) {
      // Local prepend + sort lại — không chờ WS để tránh delay trên creator.
      setItems((prev) => sortByPinnedThenRecent(mergeUnique([{ ...created, readByMe: true }], prev)));
      setTotalElements((prev) => prev + 1);
    }
    return created;
  }, [isEnabled, workspaceId]);

  const update = useCallback(async (announcementId, { title, content, pinned = false }) => {
    if (!isEnabled) throw new Error('Workspace not ready');
    const targetId = normalizeId(announcementId);
    if (targetId === null) throw new Error('Invalid announcement id');
    const response = await updateAnnouncementAPI(workspaceId, targetId, {
      title: String(title || '').trim(),
      content: String(content || '').trim(),
      pinned: Boolean(pinned),
    });
    const updated = unwrapData(response);
    if (updated && updated.announcementId != null) {
      setItems((prev) => sortByPinnedThenRecent(
        prev.map((item) => (
          normalizeId(item?.announcementId) === normalizeId(updated.announcementId)
            ? { ...item, ...updated }
            : item
        )),
      ));
    }
    return updated;
  }, [isEnabled, workspaceId]);

  const remove = useCallback(async (announcementId) => {
    if (!isEnabled) throw new Error('Workspace not ready');
    const targetId = normalizeId(announcementId);
    if (targetId === null) throw new Error('Invalid announcement id');
    await deleteAnnouncementAPI(workspaceId, targetId);
    let wasUnreadAndRemoved = false;
    setItems((prev) => {
      const target = prev.find((item) => normalizeId(item?.announcementId) === targetId);
      wasUnreadAndRemoved = Boolean(target && !target.readByMe);
      return prev.filter((item) => normalizeId(item?.announcementId) !== targetId);
    });
    setTotalElements((prev) => Math.max(0, prev - 1));
    setUnreadCount((prev) => (wasUnreadAndRemoved ? Math.max(0, prev - 1) : prev));
  }, [isEnabled, workspaceId]);

  // Xử lý event WS broadcast từ `/topic/workspace/{id}/announcement`.
  // Payload BE: { type: ANNOUNCEMENT_CREATED|UPDATED|DELETED, announcementId,
  // workspaceId, timestamp }. Đơn giản: refetch page 0 — tránh ghép logic
  // 3 branch khác nhau và đảm bảo sort + pagination luôn đúng phía server.
  const handleWebSocketEvent = useCallback((event) => {
    if (!isEnabled || !event || typeof event !== 'object') return;
    const eventWorkspaceId = normalizeId(event.workspaceId);
    const currentWorkspaceId = normalizeId(workspaceId);
    if (eventWorkspaceId !== null && currentWorkspaceId !== null && eventWorkspaceId !== currentWorkspaceId) {
      return;
    }
    const type = String(event.type || '').toUpperCase();
    if (type === 'ANNOUNCEMENT_DELETED') {
      const targetId = normalizeId(event.announcementId);
      if (targetId !== null) {
        setItems((prev) => prev.filter((item) => normalizeId(item?.announcementId) !== targetId));
        setTotalElements((prev) => Math.max(0, prev - 1));
      }
      void fetchUnreadCount();
      return;
    }
    // CREATED + UPDATED: refetch ngắn cho đơn giản. CREATED cũng đã được fanout
    // qua /user/queue/notifications nên global bell đã bump unread count rồi.
    void refresh();
  }, [fetchUnreadCount, isEnabled, refresh, workspaceId]);

  // Lần đầu vào tab: lấy unread count để badge sidebar hiển thị sớm. List vẫn
  // lazy load — caller (tab) tự gọi refresh khi mount để tránh fetch khi user
  // chưa mở tab announcements.
  useEffect(() => {
    if (!isEnabled) return;
    void fetchUnreadCount();
  }, [fetchUnreadCount, isEnabled]);

  const hasMore = useMemo(() => {
    if (!totalPages) return false;
    return page + 1 < totalPages;
  }, [page, totalPages]);

  return {
    items,
    unreadCount,
    totalElements,
    page,
    totalPages,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    refresh,
    loadMore,
    markAsRead,
    create,
    update,
    remove,
    handleWebSocketEvent,
  };
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  approveJoinRequest as approveJoinRequestAPI,
  cancelJoinRequest as cancelJoinRequestAPI,
  listGroupJoinRequests as listGroupJoinRequestsAPI,
  listMyJoinRequests as listMyJoinRequestsAPI,
  rejectJoinRequest as rejectJoinRequestAPI,
  submitJoinRequest as submitJoinRequestAPI,
} from '@/api/JoinRequestAPI';

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

function mergeUnique(existing, incoming) {
  if (!Array.isArray(incoming) || incoming.length === 0) return existing;
  const seen = new Set(
    existing.map((item) => normalizeId(item?.joinRequestId)).filter((id) => id !== null),
  );
  const filtered = incoming.filter((item) => {
    const id = normalizeId(item?.joinRequestId);
    if (id === null || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return [...existing, ...filtered];
}

function sortByCreatedDesc(items) {
  return [...items].sort((a, b) => {
    const ta = new Date(a?.createdAt || 0).getTime();
    const tb = new Date(b?.createdAt || 0).getTime();
    return tb - ta;
  });
}

export function useGroupJoinRequests(workspaceId, { enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const inflightRefreshRef = useRef(null);
  const isEnabled = Boolean(enabled) && workspaceId != null && workspaceId !== 'new';

  useEffect(() => {
    setItems([]);
    setPendingCount(0);
    setTotalElements(0);
    setTotalPages(0);
    setPage(0);
    setError(null);
    inflightRefreshRef.current = null;
  }, [workspaceId]);

  const refresh = useCallback(async () => {
    if (!isEnabled) return;
    if (inflightRefreshRef.current) return inflightRefreshRef.current;

    setIsLoading(true);
    setError(null);

    const promise = (async () => {
      try {
        const response = await listGroupJoinRequestsAPI(workspaceId, { page: 0, size: PAGE_SIZE });
        const data = unwrapData(response) || {};
        const incoming = Array.isArray(data.items) ? data.items : [];
        setItems(sortByCreatedDesc(incoming));
        setTotalElements(Number(data.totalElements) || incoming.length);
        setTotalPages(Number(data.totalPages) || 0);
        setPage(0);
        const nextPending = Number(data.pendingCount);
        if (Number.isFinite(nextPending) && nextPending >= 0) {
          setPendingCount(nextPending);
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
      const response = await listGroupJoinRequestsAPI(workspaceId, { page: nextPage, size: PAGE_SIZE });
      const data = unwrapData(response) || {};
      const incoming = Array.isArray(data.items) ? data.items : [];
      setItems((prev) => sortByCreatedDesc(mergeUnique(prev, incoming)));
      setTotalElements(Number(data.totalElements) || totalElements);
      setTotalPages(Number(data.totalPages) || totalPages);
      setPage(nextPage);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isEnabled, isLoading, isLoadingMore, page, totalElements, totalPages, workspaceId]);

  // Loại request đã quyết định khỏi danh sách. BE đã tạo member (approve) hoặc
  // chỉ flip status (reject); FE chỉ cần xóa khỏi pending view.
  const handleDecided = useCallback((joinRequestId) => {
    const targetId = normalizeId(joinRequestId);
    if (targetId === null) return;
    setItems((prev) => prev.filter((it) => normalizeId(it?.joinRequestId) !== targetId));
    setTotalElements((prev) => Math.max(0, prev - 1));
    setPendingCount((prev) => Math.max(0, prev - 1));
  }, []);

  const approve = useCallback(async (joinRequestId, { decisionNote } = {}) => {
    if (!isEnabled) throw new Error('Workspace not ready');
    const targetId = normalizeId(joinRequestId);
    if (targetId === null) throw new Error('Invalid joinRequestId');
    const payload = decisionNote ? { decisionNote } : {};
    const response = await approveJoinRequestAPI(workspaceId, targetId, payload);
    handleDecided(targetId);
    return unwrapData(response);
  }, [handleDecided, isEnabled, workspaceId]);

  const reject = useCallback(async (joinRequestId, { decisionNote } = {}) => {
    if (!isEnabled) throw new Error('Workspace not ready');
    const targetId = normalizeId(joinRequestId);
    if (targetId === null) throw new Error('Invalid joinRequestId');
    const payload = decisionNote ? { decisionNote } : {};
    const response = await rejectJoinRequestAPI(workspaceId, targetId, payload);
    handleDecided(targetId);
    return unwrapData(response);
  }, [handleDecided, isEnabled, workspaceId]);

  const hasMore = useMemo(() => {
    if (!totalPages) return false;
    return page + 1 < totalPages;
  }, [page, totalPages]);

  return {
    items,
    pendingCount,
    totalElements,
    page,
    totalPages,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    refresh,
    loadMore,
    approve,
    reject,
  };
}

export function useMyJoinRequests({ enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const inflightRefreshRef = useRef(null);
  const isEnabled = Boolean(enabled);

  const refresh = useCallback(async () => {
    if (!isEnabled) return;
    if (inflightRefreshRef.current) return inflightRefreshRef.current;
    setIsLoading(true);
    setError(null);
    const promise = (async () => {
      try {
        const response = await listMyJoinRequestsAPI();
        const data = unwrapData(response);
        const list = Array.isArray(data) ? data : [];
        setItems(sortByCreatedDesc(list));
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
        inflightRefreshRef.current = null;
      }
    })();
    inflightRefreshRef.current = promise;
    return promise;
  }, [isEnabled]);

  const submit = useCallback(async (workspaceId, { message } = {}) => {
    if (workspaceId == null) throw new Error('Missing workspaceId');
    const payload = message ? { message: String(message).trim() } : {};
    const response = await submitJoinRequestAPI(workspaceId, payload);
    const created = unwrapData(response);
    if (created && created.joinRequestId != null) {
      // Prepend bản record mới — user mở dialog "My requests" thấy ngay state PENDING.
      setItems((prev) => sortByCreatedDesc(mergeUnique([created], prev)));
    }
    return created;
  }, []);

  const cancel = useCallback(async (workspaceId) => {
    if (workspaceId == null) throw new Error('Missing workspaceId');
    await cancelJoinRequestAPI(workspaceId);
    // Xóa request PENDING của workspace này khỏi list (BE chỉ cho 1 pending /
    // workspace nên filter theo workspaceId + PENDING là đủ).
    setItems((prev) => prev.filter((it) => !(
      Number(it?.workspaceId) === Number(workspaceId)
      && String(it?.status || '').toUpperCase() === 'PENDING'
    )));
  }, []);

  return {
    items,
    isLoading,
    error,
    refresh,
    submit,
    cancel,
  };
}

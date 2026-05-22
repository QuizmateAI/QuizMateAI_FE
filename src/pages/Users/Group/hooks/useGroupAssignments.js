import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createAssignment as createAssignmentAPI,
  deleteAssignment as deleteAssignmentAPI,
  listGroupAssignments as listGroupAssignmentsAPI,
  listMyAssignments as listMyAssignmentsAPI,
  submitAssignment as submitAssignmentAPI,
  updateAssignment as updateAssignmentAPI,
} from '@/api/AssignmentAPI';

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
    existing.map((item) => normalizeId(item?.assignmentId)).filter((id) => id !== null),
  );
  const filtered = incoming.filter((item) => {
    const id = normalizeId(item?.assignmentId);
    if (id === null || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return [...existing, ...filtered];
}

// BE sort tự nhiên: createdAt DESC (BE). Khi local replace/prepend, ưu tiên giữ
// item mới ở đầu — nhưng vẫn sort lại theo `createdAt DESC` để vẫn nhất quán
// khi user pagination về sau.
function sortByCreatedDesc(items) {
  return [...items].sort((a, b) => {
    const ta = new Date(a?.createdAt || 0).getTime();
    const tb = new Date(b?.createdAt || 0).getTime();
    return tb - ta;
  });
}

export function useGroupAssignments(workspaceId, { enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const inflightRefreshRef = useRef(null);
  const isEnabled = Boolean(enabled) && workspaceId != null && workspaceId !== 'new';

  // Reset state khi đổi workspace để không leak dữ liệu nhóm cũ.
  useEffect(() => {
    setItems([]);
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
        const response = await listGroupAssignmentsAPI(workspaceId, { page: 0, size: PAGE_SIZE });
        const data = unwrapData(response) || {};
        const incoming = Array.isArray(data.items) ? data.items : [];
        setItems(sortByCreatedDesc(incoming));
        setTotalElements(Number(data.totalElements) || incoming.length);
        setTotalPages(Number(data.totalPages) || 0);
        setPage(0);
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
      const response = await listGroupAssignmentsAPI(workspaceId, { page: nextPage, size: PAGE_SIZE });
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

  const create = useCallback(async (payload) => {
    if (!isEnabled) throw new Error('Workspace not ready');
    const response = await createAssignmentAPI(workspaceId, payload);
    const created = unwrapData(response);
    if (created && created.assignmentId != null) {
      setItems((prev) => sortByCreatedDesc(mergeUnique([created], prev)));
      setTotalElements((prev) => prev + 1);
    }
    return created;
  }, [isEnabled, workspaceId]);

  const update = useCallback(async (assignmentId, payload) => {
    if (!isEnabled) throw new Error('Workspace not ready');
    const targetId = normalizeId(assignmentId);
    if (targetId === null) throw new Error('Invalid assignment id');
    const response = await updateAssignmentAPI(workspaceId, targetId, payload);
    const updated = unwrapData(response);
    if (updated && updated.assignmentId != null) {
      setItems((prev) => sortByCreatedDesc(
        prev.map((item) => (
          normalizeId(item?.assignmentId) === normalizeId(updated.assignmentId)
            ? { ...item, ...updated }
            : item
        )),
      ));
    }
    return updated;
  }, [isEnabled, workspaceId]);

  const remove = useCallback(async (assignmentId) => {
    if (!isEnabled) throw new Error('Workspace not ready');
    const targetId = normalizeId(assignmentId);
    if (targetId === null) throw new Error('Invalid assignment id');
    await deleteAssignmentAPI(workspaceId, targetId);
    setItems((prev) => prev.filter((item) => normalizeId(item?.assignmentId) !== targetId));
    setTotalElements((prev) => Math.max(0, prev - 1));
  }, [isEnabled, workspaceId]);

  const hasMore = useMemo(() => {
    if (!totalPages) return false;
    return page + 1 < totalPages;
  }, [page, totalPages]);

  return {
    items,
    totalElements,
    page,
    totalPages,
    hasMore,
    isLoading,
    isLoadingMore,
    error,
    refresh,
    loadMore,
    create,
    update,
    remove,
  };
}

export function useMyAssignments(workspaceId, { enabled = true } = {}) {
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
        const response = await listMyAssignmentsAPI();
        const data = unwrapData(response);
        const list = Array.isArray(data) ? data : [];
        // Filter theo workspace nếu prop có. BE không filter giúp vì endpoint
        // /me/assignments tổng hợp đa workspace cho landing dashboard.
        const scoped = workspaceId != null
          ? list.filter((item) => Number(item?.workspaceId) === Number(workspaceId))
          : list;
        setItems(sortByCreatedDesc(scoped));
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

  const submit = useCallback(async (assignmentId, { submissionRefId } = {}) => {
    const targetId = normalizeId(assignmentId);
    if (targetId === null) throw new Error('Invalid assignment id');
    const item = items.find((it) => normalizeId(it?.assignmentId) === targetId);
    const itemWorkspaceId = workspaceId ?? item?.workspaceId;
    if (itemWorkspaceId == null) throw new Error('Missing workspaceId for submit');

    // Optimistic update: mark myTarget SUBMITTED. BE idempotent nên click double
    // không làm hỏng state — chỉ tránh phát phụ optimistic thay đổi `submittedAt`.
    const submittedAtIso = new Date().toISOString();
    setItems((prev) => prev.map((it) => {
      if (normalizeId(it?.assignmentId) !== targetId) return it;
      const currentTarget = it?.myTarget || {};
      if (currentTarget.status === 'SUBMITTED') return it;
      return {
        ...it,
        myTarget: {
          ...currentTarget,
          status: 'SUBMITTED',
          submittedAt: submittedAtIso,
          ...(submissionRefId != null ? { submissionRefId } : {}),
        },
        submittedCount: Number(it?.submittedCount || 0) + 1,
      };
    }));

    try {
      const response = await submitAssignmentAPI(itemWorkspaceId, targetId, submissionRefId != null ? { submissionRefId } : {});
      const updatedTarget = unwrapData(response);
      if (updatedTarget && updatedTarget.userId != null) {
        setItems((prev) => prev.map((it) => (
          normalizeId(it?.assignmentId) === targetId
            ? { ...it, myTarget: { ...(it?.myTarget || {}), ...updatedTarget } }
            : it
        )));
      }
      return updatedTarget;
    } catch (err) {
      // Rollback optimistic — refetch để đồng bộ.
      await refresh();
      throw err;
    }
  }, [items, refresh, workspaceId]);

  return {
    items,
    isLoading,
    error,
    refresh,
    submit,
  };
}

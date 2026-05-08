import { useCallback, useEffect, useState } from 'react';
import {
  deleteMockTestTemplate,
  getMySavedMockTestTemplate,
  listMySavedMockTestTemplates,
  saveMockTestTemplate,
  updateMockTestTemplate,
} from '@/api/MockTestAPI';

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response;
}

/**
 * Hook quản lý kho saved templates của user TRONG workspace cụ thể
 * (visibility=PRIVATE, source=USER, workspace_id = workspaceId param).
 *
 * @param {object} options
 * @param {boolean} [options.enabled=true] — gate fetching (vd dialog đóng)
 * @param {number} options.workspaceId — BẮT BUỘC kể từ BE V2026_05_14. Nếu null/undefined,
 *   hook tự disable list/save (không gọi API). Caller phải pass workspaceId hiện tại.
 *
 * Provides:
 *   - templates: list of summaries (chỉ trong workspace + legacy NULL rows)
 *   - savedIds: Set<number> of templateIds user already saved (derivedFromTemplateId)
 *   - savingTemplateId: id of template currently being saved (for spinner state)
 *   - actions: refetch, save, update, remove, fetchDetail
 */
export function useSavedMockTestTemplates({ enabled = true, workspaceId } = {}) {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savingTemplateId, setSavingTemplateId] = useState(null);
  const [derivedFromMap, setDerivedFromMap] = useState(new Map());

  // Hook chỉ active khi enabled VÀ có workspaceId. Trả empty list khi missing
  // workspaceId để không phá UI (FE chưa pass đủ context).
  const effectiveEnabled = Boolean(enabled && workspaceId);

  const refetch = useCallback(async () => {
    if (!effectiveEnabled) {
      setTemplates([]);
      return [];
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await listMySavedMockTestTemplates(workspaceId);
      const list = unwrap(response);
      const items = Array.isArray(list) ? list : [];
      setTemplates(items);
      return items;
    } catch (e) {
      setError(e);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [effectiveEnabled, workspaceId]);

  useEffect(() => {
    if (effectiveEnabled) {
      refetch();
    } else {
      setTemplates([]);
    }
  }, [effectiveEnabled, refetch]);

  /**
   * Save a template snapshot. Caller PHẢI đảm bảo payload có workspaceId
   * (build helpers đã inject nó). Hook check ở runtime để fail-fast nếu thiếu.
   */
  const save = useCallback(async (payload) => {
    if (!payload?.workspaceId) {
      throw new Error('save() payload must include workspaceId');
    }
    const { derivedFromTemplateId } = payload;
    setSavingTemplateId(derivedFromTemplateId ?? -1);
    try {
      const response = await saveMockTestTemplate(payload);
      const created = unwrap(response);
      if (derivedFromTemplateId != null) {
        setDerivedFromMap((prev) => {
          const next = new Map(prev);
          next.set(derivedFromTemplateId, created?.mockTestTemplateId ?? true);
          return next;
        });
      }
      await refetch();
      return created;
    } finally {
      setSavingTemplateId(null);
    }
  }, [refetch]);

  const update = useCallback(async (templateId, payload) => {
    const response = await updateMockTestTemplate(templateId, payload);
    const updated = unwrap(response);
    await refetch();
    return updated;
  }, [refetch]);

  const remove = useCallback(async (templateId) => {
    await deleteMockTestTemplate(templateId);
    await refetch();
  }, [refetch]);

  const fetchDetail = useCallback(async (templateId) => {
    const response = await getMySavedMockTestTemplate(templateId);
    return unwrap(response);
  }, []);

  return {
    templates,
    isLoading,
    error,
    savingTemplateId,
    derivedFromTemplateIds: new Set(derivedFromMap.keys()),
    refetch,
    save,
    update,
    remove,
    fetchDetail,
  };
}

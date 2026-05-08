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
 * Hook quan ly kho saved templates cua user TRONG workspace cu the
 * (visibility=PRIVATE, source=USER, workspace_id = workspaceId param).
 *
 * @param {object} options
 * @param {boolean} [options.enabled=true] — gate fetching (vd dialog dong)
 * @param {number} options.workspaceId — BAT BUOC ke tu BE V2026_05_14. Neu null/undefined,
 *   hook tu disable list/save (khong goi API). Caller phai pass workspaceId hien tai.
 *
 * Provides:
 *   - templates: list of summaries (chi trong workspace + legacy NULL rows)
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

  const effectiveEnabled = Boolean(enabled) && workspaceId != null;

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
   * Save a template snapshot. If the snapshot is from an AI-suggested template,
   * pass derivedFromTemplateId so we can mark it as "saved" in the suggestion UI.
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

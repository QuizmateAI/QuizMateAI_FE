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
 * Hook quản lý kho saved templates của user (visibility=PRIVATE, source=USER).
 *
 * Provides:
 *   - templates: list of summaries
 *   - savedIds: Set<number> of templateIds user already has in their library
 *     (compared against derivedFromTemplateId so AI suggestion picker shows "Đã lưu" badge)
 *   - savingTemplateId: id of template currently being saved (for spinner state)
 *   - actions: refetch, save, update, remove
 */
export function useSavedMockTestTemplates({ enabled = true } = {}) {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savingTemplateId, setSavingTemplateId] = useState(null);
  const [derivedFromMap, setDerivedFromMap] = useState(new Map());

  const refetch = useCallback(async () => {
    if (!enabled) return [];
    setIsLoading(true);
    setError(null);
    try {
      const response = await listMySavedMockTestTemplates();
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
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      refetch();
    }
  }, [enabled, refetch]);

  /**
   * Save a template snapshot. If the snapshot is from an AI-suggested template,
   * pass derivedFromTemplateId so we can mark it as "saved" in the suggestion UI.
   */
  const save = useCallback(async ({
    displayName,
    examType,
    contentLanguage,
    description,
    totalQuestion,
    durationMinutes,
    structure,
    scoring,
    derivedFromTemplateId,
  }) => {
    setSavingTemplateId(derivedFromTemplateId ?? -1);
    try {
      const response = await saveMockTestTemplate({
        displayName,
        examType,
        contentLanguage,
        description,
        totalQuestion,
        durationMinutes,
        structure,
        scoring,
        derivedFromTemplateId,
      });
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

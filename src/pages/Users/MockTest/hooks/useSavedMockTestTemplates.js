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

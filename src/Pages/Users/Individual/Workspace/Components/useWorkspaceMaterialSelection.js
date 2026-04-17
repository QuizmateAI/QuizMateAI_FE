import { useCallback, useEffect, useMemo, useState } from "react";
import { getMaterialsByWorkspace } from "@/api/MaterialAPI";

function toNumericId(value) {
  const nextId = Number(value);
  return Number.isInteger(nextId) && nextId > 0 ? nextId : null;
}

function normalizeIds(items) {
  if (!Array.isArray(items)) return [];
  return [...new Set(items.map(toNumericId).filter(Boolean))];
}

function normalizeSources(items, t) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const id = toNumericId(item?.id ?? item?.materialId);
      if (!id) return null;

      return {
        ...item,
        id,
        name: item?.name || item?.title || t("workspace.quiz.aiConfig.materialFallback", { id }),
        status: String(item?.status || "").toUpperCase(),
      };
    })
    .filter((item) => item && item.status === "ACTIVE");
}

function extractMaterialArray(payload) {
  if (Array.isArray(payload)) return payload;

  const nestedData = payload?.data;
  if (Array.isArray(nestedData)) return nestedData;
  if (Array.isArray(nestedData?.content)) return nestedData.content;

  if (Array.isArray(payload?.content)) return payload.content;

  return [];
}

function arraysHaveSameIds(left, right) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

export default function useWorkspaceMaterialSelection({
  contextId,
  sources,
  selectedSourceIds,
  onToggleMaterialSelection,
  t,
}) {
  const [fetchedSources, setFetchedSources] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState("");
  const [localSelectedSourceIds, setLocalSelectedSourceIds] = useState([]);

  const hasExternalSelectionControl = typeof onToggleMaterialSelection === "function";
  const hasProvidedSources = Array.isArray(sources) && sources.length > 0;
  const hasControlledSelectedSourceIds = Array.isArray(selectedSourceIds);

  useEffect(() => {
    let cancelled = false;

    const loadMaterials = async () => {
      if (hasProvidedSources || !contextId) {
        setFetchedSources([]);
        setMaterialsLoading(false);
        setMaterialsError("");
        return;
      }

      setMaterialsLoading(true);
      setMaterialsError("");

      try {
        const response = await getMaterialsByWorkspace(contextId);
        if (cancelled) return;
        setFetchedSources(extractMaterialArray(response));
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load workspace materials:", error);
        setFetchedSources([]);
        setMaterialsError(error?.message || t("workspace.quiz.aiConfig.metadataLoadFailed"));
      } finally {
        if (!cancelled) {
          setMaterialsLoading(false);
        }
      }
    };

    loadMaterials();

    return () => {
      cancelled = true;
    };
  }, [contextId, hasProvidedSources, t]);

  const normalizedSources = useMemo(
    () => normalizeSources(hasProvidedSources ? sources : fetchedSources, t),
    [fetchedSources, hasProvidedSources, sources, t],
  );

  const normalizedSourceIdSet = useMemo(
    () => new Set(normalizedSources.map((source) => source.id)),
    [normalizedSources],
  );

  const normalizedSelectedSourceIds = useMemo(
    () => normalizeIds(selectedSourceIds).filter((id) => normalizedSourceIdSet.has(id)),
    [normalizedSourceIdSet, selectedSourceIds],
  );

  useEffect(() => {
    if (hasExternalSelectionControl || !hasControlledSelectedSourceIds) {
      return;
    }

    setLocalSelectedSourceIds((previousItems) => (
      arraysHaveSameIds(previousItems, normalizedSelectedSourceIds)
        ? previousItems
        : normalizedSelectedSourceIds
    ));
  }, [
    hasControlledSelectedSourceIds,
    hasExternalSelectionControl,
    normalizedSelectedSourceIds,
  ]);

  const selectedIds = useMemo(() => {
    const candidateIds = hasExternalSelectionControl
      ? normalizedSelectedSourceIds
      : localSelectedSourceIds;

    return candidateIds.filter((id) => normalizedSourceIdSet.has(id));
  }, [
    hasExternalSelectionControl,
    localSelectedSourceIds,
    normalizedSelectedSourceIds,
    normalizedSourceIdSet,
  ]);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const allSourceIds = useMemo(
    () => normalizedSources.map((source) => source.id),
    [normalizedSources],
  );

  const allSelected = allSourceIds.length > 0 && allSourceIds.every((id) => selectedIdSet.has(id));

  const toggleSourceSelection = useCallback((sourceId, isSelected) => {
    const normalizedId = toNumericId(sourceId);
    if (!normalizedId) return;

    if (hasExternalSelectionControl) {
      onToggleMaterialSelection(normalizedId, Boolean(isSelected));
      return;
    }

    setLocalSelectedSourceIds((previousItems) => {
      if (isSelected) {
        return previousItems.includes(normalizedId)
          ? previousItems
          : [...previousItems, normalizedId];
      }

      return previousItems.filter((item) => item !== normalizedId);
    });
  }, [hasExternalSelectionControl, onToggleMaterialSelection]);

  const selectAllSources = useCallback(() => {
    if (allSourceIds.length === 0) return;

    if (hasExternalSelectionControl) {
      allSourceIds.forEach((id) => {
        if (!selectedIdSet.has(id)) {
          onToggleMaterialSelection(id, true);
        }
      });
      return;
    }

    setLocalSelectedSourceIds(allSourceIds);
  }, [allSourceIds, hasExternalSelectionControl, onToggleMaterialSelection, selectedIdSet]);

  const clearSelectedSources = useCallback(() => {
    if (hasExternalSelectionControl) {
      selectedIds.forEach((id) => {
        onToggleMaterialSelection(id, false);
      });
      return;
    }

    setLocalSelectedSourceIds([]);
  }, [hasExternalSelectionControl, onToggleMaterialSelection, selectedIds]);

  return {
    allSelected,
    clearSelectedSources,
    materialsError,
    materialsLoading,
    normalizedSources,
    selectAllSources,
    selectedIds,
    selectedIdSet,
    toggleSourceSelection,
  };
}

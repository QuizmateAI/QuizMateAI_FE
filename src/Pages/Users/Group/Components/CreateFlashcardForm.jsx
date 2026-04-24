import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMaterialsByWorkspace } from "@/api/MaterialAPI";

const BaseCreateFlashcardForm = React.lazy(
	() => import("@/Pages/Users/Individual/Workspace/Components/CreateFlashcardForm")
);

function unwrapMaterialList(response) {
	const payload = response?.data?.data ?? response?.data ?? response;
	return Array.isArray(payload) ? payload : [];
}

function normalizeSourceItem(item, index, t) {
	const id = Number(item?.materialId ?? item?.id ?? 0);
	if (!Number.isInteger(id) || id <= 0) return null;

	const status = String(item?.status || "").toUpperCase();
	if (status !== "ACTIVE") return null;

	return {
		id,
		materialId: id,
		name: String(item?.title || item?.name || t("workspace.quiz.aiConfig.materialFallback", { id: index + 1 })),
		status,
		uploadedAt: item?.uploadedAt || null,
		...item,
	};
}

function normalizeSelectedIds(ids) {
	return Array.isArray(ids)
		? ids
			.map((id) => Number(id))
			.filter((id, index, arr) => Number.isInteger(id) && id > 0 && arr.indexOf(id) === index)
		: [];
}

function CreateFlashcardFormGroup({
	contextId,
	selectedSourceIds = [],
	onToggleMaterialSelection,
	...restProps
}) {
	const { t } = useTranslation();
	const [sources, setSources] = useState([]);
	const [loadingSources, setLoadingSources] = useState(false);
	const [loadError, setLoadError] = useState("");
	const [localSelectedIds, setLocalSelectedIds] = useState(() => normalizeSelectedIds(selectedSourceIds).slice(0, 1));
	const selectedIdsRef = useRef(localSelectedIds);

	useEffect(() => {
		selectedIdsRef.current = localSelectedIds;
	}, [localSelectedIds]);

	useEffect(() => {
		setLocalSelectedIds(normalizeSelectedIds(selectedSourceIds).slice(0, 1));
	}, [selectedSourceIds]);

	useEffect(() => {
		const workspaceId = Number(contextId);
		if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
			setSources([]);
			setLoadError("");
			setLoadingSources(false);
			return;
		}

		let cancelled = false;
		const fetchSources = async () => {
			setLoadingSources(true);
			setLoadError("");

			try {
				const response = await getMaterialsByWorkspace(workspaceId);
				if (cancelled) return;

				const nextSources = unwrapMaterialList(response)
					.map((item, index) => normalizeSourceItem(item, index, t))
					.filter(Boolean);

				setSources(nextSources);
			} catch {
				if (!cancelled) {
					setSources([]);
					setLoadError(t("groupWorkspace.forms.loadMaterialsError"));
				}
			} finally {
				if (!cancelled) {
					setLoadingSources(false);
				}
			}
		};

		void fetchSources();

		return () => {
			cancelled = true;
		};
	}, [contextId, t]);

	const validSourceIds = useMemo(
		() => new Set(sources.map((source) => Number(source.id)).filter((id) => Number.isInteger(id) && id > 0)),
		[sources],
	);

	const selectedIds = useMemo(
		() => localSelectedIds.filter((id) => validSourceIds.has(id)),
		[localSelectedIds, validSourceIds],
	);

	const handleToggleMaterialSelection = useCallback((sourceId, shouldSelect) => {
		const normalizedSourceId = Number(sourceId);
		if (!Number.isInteger(normalizedSourceId) || normalizedSourceId <= 0) return;
		const previousIds = selectedIdsRef.current;

		setLocalSelectedIds((current) => {
			if (shouldSelect) {
				return [normalizedSourceId];
			}
			return current.filter((id) => id !== normalizedSourceId);
		});

		if (typeof onToggleMaterialSelection === "function") {
			if (shouldSelect) {
				previousIds
					.filter((id) => id !== normalizedSourceId)
					.forEach((id) => onToggleMaterialSelection(id, false));
			}
			onToggleMaterialSelection(normalizedSourceId, shouldSelect);
		}
	}, [onToggleMaterialSelection]);

	const workspaceMaterialsEmptyMessage = loadError
		|| (loadingSources
			? t("groupWorkspace.forms.loadingMaterials")
			: t("groupWorkspace.forms.workspaceMaterialsEmpty"));

	return (
		<Suspense
			fallback={(
				<div className="flex h-full items-center justify-center px-4 text-sm text-slate-500 dark:text-slate-400">
					{t("common.loading", "Đang tải...")}
				</div>
			)}
		>
			<BaseCreateFlashcardForm
				{...restProps}
				contextId={contextId}
				sources={sources}
				selectedSourceIds={selectedIds}
				onToggleMaterialSelection={handleToggleMaterialSelection}
				workspaceMaterialsEmptyMessage={workspaceMaterialsEmptyMessage}
			/>
		</Suspense>
	);
}

export default CreateFlashcardFormGroup;

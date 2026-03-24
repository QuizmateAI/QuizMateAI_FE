import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

const PROGRESS_STORAGE_PREFIX = 'workspace_progress_tracking_v1';

function clampPercent(percent) {
	return Math.max(0, Math.min(100, Number(percent) || 0));
}

function normalizeRecordMap(value) {
	if (!value || typeof value !== 'object') return {};
	return Object.entries(value).reduce((acc, [key, rawValue]) => {
		const normalizedKey = String(key || '').trim();
		if (!normalizedKey) return acc;
		acc[normalizedKey] = clampPercent(rawValue);
		return acc;
	}, {});
}

function readProgressSnapshot(storageKey) {
	if (!storageKey || typeof window === 'undefined') return null;
	try {
		const raw = window.localStorage.getItem(storageKey);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object') return null;
		return {
			progressByTaskId: normalizeRecordMap(parsed.progressByTaskId),
			progressByMaterialId: normalizeRecordMap(parsed.progressByMaterialId),
			preLearningProgressByPhaseId: normalizeRecordMap(parsed.preLearningProgressByPhaseId),
			knowledgeProgressByPhaseId: normalizeRecordMap(parsed.knowledgeProgressByPhaseId),
			postLearningProgressByPhaseId: normalizeRecordMap(parsed.postLearningProgressByPhaseId),
		};
	} catch (error) {
		console.error('Khong the khoi phuc progress tu localStorage:', error);
		return null;
	}
}

function persistProgressSnapshot(storageKey, snapshot) {
	if (!storageKey || typeof window === 'undefined') return;
	try {
		window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
	} catch (error) {
		console.error('Khong the luu progress vao localStorage:', error);
	}
}

function clearPersistedProgressSnapshot(storageKey) {
	if (!storageKey || typeof window === 'undefined') return;
	try {
		window.localStorage.removeItem(storageKey);
	} catch (error) {
		console.error('Khong the xoa progress trong localStorage:', error);
	}
}

/**
 * Hook để quản lý progress percent cho các tasks AI
 * Lưu trữ percent theo taskId/materialId/phaseId
 */
export function useProgressTracking(options = {}) {
	const scopeKey = typeof options === 'string' ? options : options?.scopeKey;
	const storageKey = useMemo(() => {
		if (!scopeKey) return null;
		return `${PROGRESS_STORAGE_PREFIX}:${scopeKey}`;
	}, [scopeKey]);
	const hasHydratedRef = useRef(false);

	// Lưu percent theo taskId: { taskId -> percent }
	const [progressByTaskId, setProgressByTaskId] = useState({});
	// Lưu percent theo materialId: { materialId -> percent }
	const [progressByMaterialId, setProgressByMaterialId] = useState({});
	// Lưu percent theo phaseId cho prelearning: { phaseId -> percent }
	const [preLearningProgressByPhaseId, setPreLearningProgressByPhaseId] = useState({});
	// Lưu percent theo phaseId cho knowledge: { phaseId -> percent }
	const [knowledgeProgressByPhaseId, setKnowledgeProgressByPhaseId] = useState({});
	// Lưu percent theo phaseId cho post-learning: { phaseId -> percent }
	const [postLearningProgressByPhaseId, setPostLearningProgressByPhaseId] = useState({});

	useEffect(() => {
		hasHydratedRef.current = false;
		if (!storageKey) {
			setProgressByTaskId({});
			setProgressByMaterialId({});
			setPreLearningProgressByPhaseId({});
			setKnowledgeProgressByPhaseId({});
			setPostLearningProgressByPhaseId({});
			hasHydratedRef.current = true;
			return;
		}

		const snapshot = readProgressSnapshot(storageKey);
		setProgressByTaskId(snapshot?.progressByTaskId || {});
		setProgressByMaterialId(snapshot?.progressByMaterialId || {});
		setPreLearningProgressByPhaseId(snapshot?.preLearningProgressByPhaseId || {});
		setKnowledgeProgressByPhaseId(snapshot?.knowledgeProgressByPhaseId || {});
		setPostLearningProgressByPhaseId(snapshot?.postLearningProgressByPhaseId || {});
		hasHydratedRef.current = true;
	}, [storageKey]);

	useEffect(() => {
		if (!storageKey || !hasHydratedRef.current) return;
		const snapshot = {
			progressByTaskId,
			progressByMaterialId,
			preLearningProgressByPhaseId,
			knowledgeProgressByPhaseId,
			postLearningProgressByPhaseId,
		};
		const hasAnyProgress = Object.keys(progressByTaskId).length
			|| Object.keys(progressByMaterialId).length
			|| Object.keys(preLearningProgressByPhaseId).length
			|| Object.keys(knowledgeProgressByPhaseId).length
			|| Object.keys(postLearningProgressByPhaseId).length;

		if (!hasAnyProgress) {
			clearPersistedProgressSnapshot(storageKey);
			return;
		}

		persistProgressSnapshot(storageKey, snapshot);
	}, [
		storageKey,
		progressByTaskId,
		progressByMaterialId,
		preLearningProgressByPhaseId,
		knowledgeProgressByPhaseId,
		postLearningProgressByPhaseId,
	]);

	const updateTaskProgress = useCallback((taskId, percent) => {
		if (!taskId) return;
		setProgressByTaskId((prev) => ({
			...prev,
			[taskId]: clampPercent(percent),
		}));
	}, []);

	const updateMaterialProgress = useCallback((materialId, percent) => {
		if (!materialId) return;
		setProgressByMaterialId((prev) => ({
			...prev,
			[materialId]: clampPercent(percent),
		}));
	}, []);

	const updatePreLearningProgress = useCallback((phaseId, percent) => {
		if (!phaseId) return;
		setPreLearningProgressByPhaseId((prev) => ({
			...prev,
			[phaseId]: clampPercent(percent),
		}));
	}, []);

	const updateKnowledgeProgress = useCallback((phaseId, percent) => {
		if (!phaseId) return;
		setKnowledgeProgressByPhaseId((prev) => ({
			...prev,
			[phaseId]: clampPercent(percent),
		}));
	}, []);

	const updatePostLearningProgress = useCallback((phaseId, percent) => {
		if (!phaseId) return;
		setPostLearningProgressByPhaseId((prev) => ({
			...prev,
			[phaseId]: clampPercent(percent),
		}));
	}, []);

	const reconcileMaterialProgress = useCallback((materialIds = []) => {
		const allowedIds = new Set(
			(materialIds || [])
				.map((id) => String(Number(id)))
				.filter((id) => id !== 'NaN' && Number(id) > 0)
		);

		setProgressByMaterialId((prev) => {
			const next = Object.entries(prev).reduce((acc, [key, value]) => {
				if (allowedIds.has(String(Number(key)))) {
					acc[key] = clampPercent(value);
				}
				return acc;
			}, {});

			if (Object.keys(next).length === Object.keys(prev).length) {
				return prev;
			}
			return next;
		});
	}, []);

	const getTaskProgress = useCallback((taskId) => {
		return progressByTaskId[taskId] ?? 0;
	}, [progressByTaskId]);

	const getMaterialProgress = useCallback((materialId) => {
		return progressByMaterialId[materialId] ?? 0;
	}, [progressByMaterialId]);

	const getPreLearningProgress = useCallback((phaseId) => {
		return preLearningProgressByPhaseId[phaseId] ?? 0;
	}, [preLearningProgressByPhaseId]);

	const getKnowledgeProgress = useCallback((phaseId) => {
		return knowledgeProgressByPhaseId[phaseId] ?? 0;
	}, [knowledgeProgressByPhaseId]);

	const getPostLearningProgress = useCallback((phaseId) => {
		return postLearningProgressByPhaseId[phaseId] ?? 0;
	}, [postLearningProgressByPhaseId]);

	const clearProgress = useCallback((type, id) => {
		switch (type) {
			case 'task':
				setProgressByTaskId((prev) => {
					const next = { ...prev };
					delete next[id];
					return next;
				});
				break;
			case 'material':
				setProgressByMaterialId((prev) => {
					const next = { ...prev };
					delete next[id];
					return next;
				});
				break;
			case 'preLearning':
				setPreLearningProgressByPhaseId((prev) => {
					const next = { ...prev };
					delete next[id];
					return next;
				});
				break;
			case 'knowledge':
				setKnowledgeProgressByPhaseId((prev) => {
					const next = { ...prev };
					delete next[id];
					return next;
				});
				break;
			case 'postLearning':
				setPostLearningProgressByPhaseId((prev) => {
					const next = { ...prev };
					delete next[id];
					return next;
				});
				break;
			default:
				break;
		}
	}, []);

	return {
		// Updates
		updateTaskProgress,
		updateMaterialProgress,
		updatePreLearningProgress,
		updateKnowledgeProgress,
		updatePostLearningProgress,
		// Getters
		getTaskProgress,
		getMaterialProgress,
		getPreLearningProgress,
		getKnowledgeProgress,
		getPostLearningProgress,
		reconcileMaterialProgress,
		// Clear
		clearProgress,
		// Raw state (if components need direct access)
		progressByTaskId,
		progressByMaterialId,
		preLearningProgressByPhaseId,
		knowledgeProgressByPhaseId,
		postLearningProgressByPhaseId,
	};
}

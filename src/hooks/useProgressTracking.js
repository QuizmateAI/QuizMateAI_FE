import { useState, useCallback } from 'react';

/**
 * Hook để quản lý progress percent cho các tasks AI
 * Lưu trữ percent theo taskId/materialId/phaseId
 */
export function useProgressTracking() {
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

	const updateTaskProgress = useCallback((taskId, percent) => {
		if (!taskId) return;
		setProgressByTaskId((prev) => ({
			...prev,
			[taskId]: Math.max(0, Math.min(100, Number(percent) || 0)),
		}));
	}, []);

	const updateMaterialProgress = useCallback((materialId, percent) => {
		if (!materialId) return;
		setProgressByMaterialId((prev) => ({
			...prev,
			[materialId]: Math.max(0, Math.min(100, Number(percent) || 0)),
		}));
	}, []);

	const updatePreLearningProgress = useCallback((phaseId, percent) => {
		if (!phaseId) return;
		setPreLearningProgressByPhaseId((prev) => ({
			...prev,
			[phaseId]: Math.max(0, Math.min(100, Number(percent) || 0)),
		}));
	}, []);

	const updateKnowledgeProgress = useCallback((phaseId, percent) => {
		if (!phaseId) return;
		setKnowledgeProgressByPhaseId((prev) => ({
			...prev,
			[phaseId]: Math.max(0, Math.min(100, Number(percent) || 0)),
		}));
	}, []);

	const updatePostLearningProgress = useCallback((phaseId, percent) => {
		if (!phaseId) return;
		setPostLearningProgressByPhaseId((prev) => ({
			...prev,
			[phaseId]: Math.max(0, Math.min(100, Number(percent) || 0)),
		}));
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

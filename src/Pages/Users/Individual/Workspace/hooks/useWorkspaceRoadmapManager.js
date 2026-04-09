import { useActiveTaskFallback } from "@/hooks/useActiveTaskFallback";
import { useWebSocket } from "@/hooks/useWebSocket";
import { generateRoadmapKnowledgeQuiz, generateRoadmapPhaseContent, generateRoadmapPhases, generateRoadmapPreLearning } from "@/api/AIAPI";
import { uploadMaterial } from "@/api/MaterialAPI";
import { getRoadmapGraph, getRoadmapStructureById } from "@/api/RoadmapAPI";
import { inferProcessingRoadmapGenerationIds } from "@/Pages/Users/Individual/Workspace/utils/roadmapProcessing";
import { normalizeRuntimeTaskSignal } from "@/lib/runtimeTaskSignal";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function clampPercent(value) {
	return Math.max(0, Math.min(100, Number(value) || 0));
}

function normalizePositiveIds(ids = []) {
	return Array.from(new Set((ids || [])
		.map((id) => Number(id))
		.filter((id) => Number.isInteger(id) && id > 0)));
}

function isActiveMaterial(material) {
	return String(material?.status || "").toUpperCase() === "ACTIVE";
}

export function useWorkspaceRoadmapManager({
	workspaceId,
	roadmapAiRoadmapId,
	setRoadmapAiRoadmapId,
	setRoadmapHasPhases,
	setIsRoadmapStructureMissing,
	sources,
	progressTracking,
	isProfileConfigured,
	isStudyNewRoadmap,
	fetchSources,
	loadWorkspaceProfileData,
	focusRoadmapViewSafely,
	openProfileSetup,
	openRoadmapView,
	clearSelectedRoadmapPhase,
	showError,
} = {}) {
	const [quizGenerationTaskByQuizId, setQuizGenerationTaskByQuizId] = useState({});
	const [quizGenerationProgressByQuizId, setQuizGenerationProgressByQuizId] = useState({});
	const [phaseGenerateDialogOpen, setPhaseGenerateDialogOpen] = useState(false);
	const [phaseGenerateDialogDefaultIds, setPhaseGenerateDialogDefaultIds] = useState([]);
	const [isGeneratingRoadmapPhases, setIsGeneratingRoadmapPhases] = useState(false);
	const [roadmapPhaseGenerationProgress, setRoadmapPhaseGenerationProgress] = useState(0);
	const [roadmapPhaseGenerationTaskId, setRoadmapPhaseGenerationTaskId] = useState(null);
	const [isSubmittingRoadmapPhaseRequest, setIsSubmittingRoadmapPhaseRequest] = useState(false);
	const [generatingKnowledgePhaseIds, setGeneratingKnowledgePhaseIds] = useState([]);
	const [generatingKnowledgeQuizPhaseIds, setGeneratingKnowledgeQuizPhaseIds] = useState([]);
	const [generatingKnowledgeQuizKnowledgeKeys, setGeneratingKnowledgeQuizKnowledgeKeys] = useState([]);
	const [knowledgeQuizRefreshByKey, setKnowledgeQuizRefreshByKey] = useState({});
	const [generatingPreLearningPhaseIds, setGeneratingPreLearningPhaseIds] = useState([]);
	const [skipPreLearningPhaseIds, setSkipPreLearningPhaseIds] = useState([]);
	const [roadmapReloadToken, setRoadmapReloadToken] = useState(0);

	const roadmapPhaseGeneratingStorageKey = workspaceId ? `workspace_${workspaceId}_roadmapPhaseGenerating` : null;
	const phaseContentGeneratingStorageKey = workspaceId ? `workspace_${workspaceId}_phaseContentGeneratingPhaseIds` : null;
	const preLearningGeneratingStorageKey = workspaceId ? `workspace_${workspaceId}_preLearningGeneratingPhaseIds` : null;
	const skipPreLearningPhaseStorageKey = workspaceId ? `workspace_${workspaceId}_skipPreLearningPhaseIds` : null;
	const preLearningRequestGuardStorageKey = workspaceId ? `workspace_${workspaceId}_preLearningRequestGuard` : null;

	const mountedRef = useRef(true);
	const phaseGenerationPollingRef = useRef({ runId: 0, active: false });
	const phaseContentPollingRef = useRef({});
	const phaseContentRequestInFlightRef = useRef({});
	const preLearningPollingRef = useRef({});
	const preLearningRequestGuardRef = useRef({});
	const roadmapStructureSyncRunRef = useRef(0);
	const nonStudyPreLearningAutoRunRef = useRef({ runId: 0, active: false });
	const knowledgeQuizPollingRef = useRef({});
	const knowledgeQuizGenerationRequestedRef = useRef({});
	const knowledgeQuizGenerationRequestedByKnowledgeRef = useRef({});
	const roadmapReloadThrottleRef = useRef({
		lastBumpAt: 0,
		timerId: null,
	});

	const updateTaskProgress = progressTracking?.updateTaskProgress?.bind(progressTracking);
	const updateMaterialProgress = progressTracking?.updateMaterialProgress?.bind(progressTracking);
	const updateKnowledgeProgress = progressTracking?.updateKnowledgeProgress?.bind(progressTracking);
	const updatePreLearningProgress = progressTracking?.updatePreLearningProgress?.bind(progressTracking);
	const updatePostLearningProgress = progressTracking?.updatePostLearningProgress?.bind(progressTracking);
	const clearProgress = progressTracking?.clearProgress?.bind(progressTracking);

	const openRoadmapViewNow = useCallback(() => {
		openRoadmapView?.();
	}, [openRoadmapView]);

	const openProfileSetupNow = useCallback(() => {
		openProfileSetup?.();
	}, [openProfileSetup]);

	const clearSelectedRoadmapPhaseNow = useCallback(() => {
		clearSelectedRoadmapPhase?.();
	}, [clearSelectedRoadmapPhase]);

	const bumpRoadmapReloadToken = useCallback(() => {
		const now = Date.now();
		const minIntervalMs = 800;
		const elapsed = now - roadmapReloadThrottleRef.current.lastBumpAt;

		if (elapsed >= minIntervalMs) {
			roadmapReloadThrottleRef.current.lastBumpAt = now;
			setRoadmapReloadToken((current) => current + 1);
			return;
		}

		if (roadmapReloadThrottleRef.current.timerId) {
			return;
		}

		const waitMs = Math.max(0, minIntervalMs - elapsed);
		roadmapReloadThrottleRef.current.timerId = globalThis.setTimeout(() => {
			roadmapReloadThrottleRef.current.timerId = null;
			roadmapReloadThrottleRef.current.lastBumpAt = Date.now();
			setRoadmapReloadToken((current) => current + 1);
		}, waitMs);
	}, []);

	const bumpKnowledgeQuizRefreshByKeys = useCallback((knowledgeKeys = []) => {
		const normalizedKeys = Array.from(new Set((knowledgeKeys || [])
			.map((key) => String(key || "").trim())
			.filter((key) => key.length > 0)));

		if (normalizedKeys.length === 0) return;

		setKnowledgeQuizRefreshByKey((current) => {
			const next = { ...current };
			normalizedKeys.forEach((key) => {
				next[key] = (Number(next[key]) || 0) + 1;
			});
			return next;
		});
	}, []);

	const stopPhaseGenerationPolling = useCallback(() => {
		phaseGenerationPollingRef.current.runId += 1;
		phaseGenerationPollingRef.current.active = false;
	}, []);

	const stopPhaseContentPolling = useCallback((phaseId) => {
		const normalized = Number(phaseId);
		if (!Number.isInteger(normalized) || normalized <= 0) return;
		phaseContentPollingRef.current[normalized] = (phaseContentPollingRef.current[normalized] || 0) + 1;
	}, []);

	const stopKnowledgeQuizPolling = useCallback((phaseId) => {
		const normalized = Number(phaseId);
		if (!Number.isInteger(normalized) || normalized <= 0) return;
		knowledgeQuizPollingRef.current[normalized] = (knowledgeQuizPollingRef.current[normalized] || 0) + 1;
	}, []);

	const stopPreLearningPolling = useCallback((phaseId) => {
		const normalized = Number(phaseId);
		if (!Number.isInteger(normalized) || normalized <= 0) return;
		preLearningPollingRef.current[normalized] = (preLearningPollingRef.current[normalized] || 0) + 1;
	}, []);

	const persistPreLearningRequestGuard = useCallback((nextGuard) => {
		if (!preLearningRequestGuardStorageKey || typeof window === "undefined") return;
		try {
			window.sessionStorage.setItem(preLearningRequestGuardStorageKey, JSON.stringify(nextGuard || {}));
		} catch (error) {
			console.error("Failed to persist pre-learning request guard:", error);
		}
	}, [preLearningRequestGuardStorageKey]);

	const clearPreLearningRequestGuard = useCallback((options = {}) => {
		const clearAll = options?.all === true;
		const roadmapId = Number(options?.roadmapId);
		const phaseId = Number(options?.phaseId);

		if (clearAll) {
			preLearningRequestGuardRef.current = {};
			persistPreLearningRequestGuard(preLearningRequestGuardRef.current);
			return;
		}

		const next = { ...preLearningRequestGuardRef.current };
		Object.keys(next).forEach((key) => {
			const [rawRoadmapId, rawPhaseId] = String(key || "").split(":");
			const keyRoadmapId = Number(rawRoadmapId);
			const keyPhaseId = Number(rawPhaseId);
			const roadmapMatched = Number.isInteger(roadmapId) && roadmapId > 0 ? keyRoadmapId === roadmapId : true;
			const phaseMatched = Number.isInteger(phaseId) && phaseId > 0 ? keyPhaseId === phaseId : true;
			if (roadmapMatched && phaseMatched) {
				delete next[key];
			}
		});

		preLearningRequestGuardRef.current = next;
		persistPreLearningRequestGuard(preLearningRequestGuardRef.current);
	}, [persistPreLearningRequestGuard]);

	const tryStartPreLearningRequest = useCallback((roadmapId, phaseId, options = {}) => {
		const normalizedRoadmapId = Number(roadmapId);
		const normalizedPhaseId = Number(phaseId);
		if (!Number.isInteger(normalizedRoadmapId) || normalizedRoadmapId <= 0) return null;
		if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return null;

		const cooldownMs = Number(options?.cooldownMs) > 0 ? Number(options.cooldownMs) : 15000;
		const awaitCompletion = options?.awaitCompletion !== false;
		const key = `${normalizedRoadmapId}:${normalizedPhaseId}`;
		const now = Date.now();

		if (preLearningRequestGuardStorageKey && typeof window !== "undefined") {
			try {
				const raw = window.sessionStorage.getItem(preLearningRequestGuardStorageKey);
				if (raw) {
					const persisted = JSON.parse(raw);
					if (persisted && typeof persisted === "object" && !Array.isArray(persisted)) {
						preLearningRequestGuardRef.current = {
							...persisted,
							...preLearningRequestGuardRef.current,
						};
					}
				}
			} catch {
				// Ignore guard restore failures.
			}
		}

		const current = preLearningRequestGuardRef.current[key] || null;
		if (current?.inFlight) return null;
		if (current?.awaitingCompletion === true) return null;
		if (Number(current?.lastRequestedAt) > 0 && now - Number(current.lastRequestedAt) < cooldownMs) return null;

		preLearningRequestGuardRef.current[key] = {
			inFlight: true,
			lastRequestedAt: now,
			awaitingCompletion: awaitCompletion,
		};
		persistPreLearningRequestGuard(preLearningRequestGuardRef.current);

		return key;
	}, [persistPreLearningRequestGuard, preLearningRequestGuardStorageKey]);

	const finishPreLearningRequest = useCallback((requestKey, options = {}) => {
		if (!requestKey) return;
		const current = preLearningRequestGuardRef.current[requestKey] || null;
		if (!current) return;

		const succeeded = options?.succeeded === true;
		if (succeeded) {
			preLearningRequestGuardRef.current[requestKey] = {
				inFlight: false,
				lastRequestedAt: Number(current?.lastRequestedAt) || Date.now(),
				awaitingCompletion: current?.awaitingCompletion === true,
			};
			persistPreLearningRequestGuard(preLearningRequestGuardRef.current);
			return;
		}

		delete preLearningRequestGuardRef.current[requestKey];
		persistPreLearningRequestGuard(preLearningRequestGuardRef.current);
	}, [persistPreLearningRequestGuard]);

	const resolveLatestRoadmapId = useCallback(async () => {
		if (!workspaceId) return null;
		const profileData = await loadWorkspaceProfileData?.();
		const rawRoadmapId = profileData?.roadmap_id ?? profileData?.roadmapId ?? null;
		const roadmapId = Number(rawRoadmapId);
		return Number.isInteger(roadmapId) && roadmapId > 0 ? roadmapId : null;
	}, [loadWorkspaceProfileData, workspaceId]);

	const effectiveRoadmapPhaseGenerationProgress = useMemo(() => {
		const progressFromTask = roadmapPhaseGenerationTaskId
			? Number(progressTracking?.progressByTaskId?.[roadmapPhaseGenerationTaskId] ?? 0)
			: 0;
		return clampPercent(progressFromTask > 0 ? progressFromTask : roadmapPhaseGenerationProgress);
	}, [progressTracking?.progressByTaskId, roadmapPhaseGenerationProgress, roadmapPhaseGenerationTaskId]);

	const trackQuizGenerationStart = useCallback((data) => {
		const normalizedQuizId = Number(data?.quizId ?? data?.id ?? 0);
		const websocketTaskId = data?.websocketTaskId ?? data?.taskId ?? null;
		const initialProgress = clampPercent(
			data?.percent
			?? data?.progressPercent
			?? data?.processingPercent
			?? 0
		);

		if (Number.isInteger(normalizedQuizId) && normalizedQuizId > 0 && websocketTaskId) {
			setQuizGenerationTaskByQuizId((current) => {
				if (current[normalizedQuizId] === websocketTaskId) return current;
				return {
					...current,
					[normalizedQuizId]: websocketTaskId,
				};
			});
		}

		if (Number.isInteger(normalizedQuizId) && normalizedQuizId > 0 && initialProgress > 0) {
			setQuizGenerationProgressByQuizId((current) => ({
				...current,
				[normalizedQuizId]: initialProgress,
			}));
		}
	}, []);

	const resetRoadmapRuntimeState = useCallback((options = {}) => {
		const clearPresence = options?.clearPresence === true;
		stopPhaseGenerationPolling();
		phaseContentPollingRef.current = {};
		phaseContentRequestInFlightRef.current = {};
		preLearningPollingRef.current = {};
		knowledgeQuizPollingRef.current = {};
		knowledgeQuizGenerationRequestedRef.current = {};
		knowledgeQuizGenerationRequestedByKnowledgeRef.current = {};
		nonStudyPreLearningAutoRunRef.current = { runId: 0, active: false };
		clearPreLearningRequestGuard({ all: true });

		setIsGeneratingRoadmapPhases(false);
		setRoadmapPhaseGenerationProgress(0);
		setRoadmapPhaseGenerationTaskId(null);
		setIsSubmittingRoadmapPhaseRequest(false);
		setGeneratingKnowledgePhaseIds([]);
		setGeneratingKnowledgeQuizPhaseIds([]);
		setGeneratingKnowledgeQuizKnowledgeKeys([]);
		setKnowledgeQuizRefreshByKey({});
		setGeneratingPreLearningPhaseIds([]);
		setSkipPreLearningPhaseIds([]);
		setPhaseGenerateDialogOpen(false);
		setPhaseGenerateDialogDefaultIds([]);
		setQuizGenerationTaskByQuizId({});
		setQuizGenerationProgressByQuizId({});

		if (clearPresence) {
			setRoadmapAiRoadmapId(null);
			setRoadmapHasPhases(false);
			setIsRoadmapStructureMissing(false);
		}
	}, [
		clearPreLearningRequestGuard,
		setIsRoadmapStructureMissing,
		setRoadmapAiRoadmapId,
		setRoadmapHasPhases,
		stopPhaseGenerationPolling,
	]);

	useEffect(() => {
		return () => {
			if (roadmapReloadThrottleRef.current.timerId) {
				globalThis.clearTimeout(roadmapReloadThrottleRef.current.timerId);
				roadmapReloadThrottleRef.current.timerId = null;
			}
		};
	}, []);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
			resetRoadmapRuntimeState();
		};
	}, [resetRoadmapRuntimeState]);

	useEffect(() => {
		resetRoadmapRuntimeState({ clearPresence: true });
	}, [resetRoadmapRuntimeState, workspaceId]);

	useEffect(() => {
		if (!preLearningRequestGuardStorageKey || typeof window === "undefined") return;
		try {
			const raw = window.sessionStorage.getItem(preLearningRequestGuardStorageKey);
			if (!raw) return;
			const parsed = JSON.parse(raw);
			if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
			preLearningRequestGuardRef.current = parsed;
		} catch (error) {
			console.error("Failed to restore pre-learning request guard:", error);
		}
	}, [preLearningRequestGuardStorageKey]);

	useEffect(() => {
		if (!workspaceId || typeof window === "undefined") return;

		try {
			const storedRoadmapGenerating = window.sessionStorage.getItem(roadmapPhaseGeneratingStorageKey);
			const storedPhaseContentGenerating = window.sessionStorage.getItem(phaseContentGeneratingStorageKey);
			const storedPreLearningGenerating = window.sessionStorage.getItem(preLearningGeneratingStorageKey);
			const storedSkipPreLearning = window.sessionStorage.getItem(skipPreLearningPhaseStorageKey);

			if (storedRoadmapGenerating !== null) {
				setIsGeneratingRoadmapPhases(storedRoadmapGenerating === "true");
			}

			if (storedPreLearningGenerating) {
				setGeneratingPreLearningPhaseIds(normalizePositiveIds(JSON.parse(storedPreLearningGenerating)));
			}

			if (storedSkipPreLearning) {
				setSkipPreLearningPhaseIds(normalizePositiveIds(JSON.parse(storedSkipPreLearning)));
			}

			if (storedPhaseContentGenerating) {
				setGeneratingKnowledgePhaseIds(normalizePositiveIds(JSON.parse(storedPhaseContentGenerating)));
			}
		} catch (error) {
			console.error("Failed to restore roadmap generating state:", error);
		}
	}, [
		phaseContentGeneratingStorageKey,
		preLearningGeneratingStorageKey,
		roadmapPhaseGeneratingStorageKey,
		skipPreLearningPhaseStorageKey,
		workspaceId,
	]);

	useEffect(() => {
		if (!workspaceId || typeof window === "undefined") return;

		window.sessionStorage.setItem(roadmapPhaseGeneratingStorageKey, String(isGeneratingRoadmapPhases));
		window.sessionStorage.setItem(
			phaseContentGeneratingStorageKey,
			JSON.stringify(normalizePositiveIds(generatingKnowledgePhaseIds)),
		);
		window.sessionStorage.setItem(
			preLearningGeneratingStorageKey,
			JSON.stringify(normalizePositiveIds(generatingPreLearningPhaseIds)),
		);
		window.sessionStorage.setItem(
			skipPreLearningPhaseStorageKey,
			JSON.stringify(normalizePositiveIds(skipPreLearningPhaseIds)),
		);
	}, [
		generatingKnowledgePhaseIds,
		generatingPreLearningPhaseIds,
		isGeneratingRoadmapPhases,
		phaseContentGeneratingStorageKey,
		preLearningGeneratingStorageKey,
		roadmapPhaseGeneratingStorageKey,
		skipPreLearningPhaseIds,
		skipPreLearningPhaseStorageKey,
		workspaceId,
	]);

	useEffect(() => {
		if (!workspaceId) return;

		let cancelled = false;
		const syncRunId = roadmapStructureSyncRunRef.current + 1;
		roadmapStructureSyncRunRef.current = syncRunId;

		const syncRoadmapPhaseGeneratingStatus = async () => {
			if (cancelled || roadmapStructureSyncRunRef.current !== syncRunId) return;
			const normalizedRoadmapId = Number(roadmapAiRoadmapId);
			if (!Number.isInteger(normalizedRoadmapId) || normalizedRoadmapId <= 0) {
				if (cancelled || roadmapStructureSyncRunRef.current !== syncRunId) return;
				setIsRoadmapStructureMissing(true);
				setRoadmapHasPhases(false);
				setIsGeneratingRoadmapPhases(false);
				setRoadmapPhaseGenerationTaskId(null);
				setRoadmapPhaseGenerationProgress(0);
				stopPhaseGenerationPolling();
				return;
			}

			try {
				const roadmapData = await getRoadmapStructureById(normalizedRoadmapId);
				if (cancelled || roadmapStructureSyncRunRef.current !== syncRunId) return;

				setIsRoadmapStructureMissing(false);
				const roadmapStatus = String(roadmapData?.status || "").toUpperCase();
				const isProcessing = roadmapStatus === "PROCESSING";
				const phases = Array.isArray(roadmapData?.phases) ? roadmapData.phases : [];
				const skipPreLearningPhaseIdSet = new Set(normalizePositiveIds(skipPreLearningPhaseIds));
				const {
					knowledge: inferredPhaseContentGeneratingIds,
					preLearning: inferredPreLearningGeneratingIds,
				} = inferProcessingRoadmapGenerationIds(phases, skipPreLearningPhaseIds);

				setIsGeneratingRoadmapPhases(isProcessing);
				if (isProcessing) {
					setRoadmapPhaseGenerationProgress((current) => (current > 0 ? current : 0));
				} else {
					setRoadmapPhaseGenerationTaskId(null);
					setRoadmapPhaseGenerationProgress(0);
				}
				setRoadmapHasPhases(phases.length > 0);

				if (inferredPhaseContentGeneratingIds.length > 0) {
					setGeneratingKnowledgePhaseIds((current) => {
						const merged = new Set([...normalizePositiveIds(current), ...inferredPhaseContentGeneratingIds]);
						return Array.from(merged);
					});
				}

				if (inferredPreLearningGeneratingIds.length > 0) {
					setGeneratingPreLearningPhaseIds((current) => {
						const filteredCurrent = normalizePositiveIds(current)
							.filter((phaseId) => !skipPreLearningPhaseIdSet.has(phaseId));
						const merged = new Set([...filteredCurrent, ...inferredPreLearningGeneratingIds]);
						return Array.from(merged);
					});
				} else if (skipPreLearningPhaseIdSet.size > 0) {
					setGeneratingPreLearningPhaseIds((current) => normalizePositiveIds(current)
						.filter((phaseId) => !skipPreLearningPhaseIdSet.has(phaseId)));
				}

				if (!isProcessing) {
					stopPhaseGenerationPolling();
				}
			} catch (error) {
				if (cancelled || roadmapStructureSyncRunRef.current !== syncRunId) return;
				const statusCode = Number(error?.statusCode ?? error?.status ?? 0);
				if (statusCode === 404) {
					setIsRoadmapStructureMissing(true);
					setRoadmapHasPhases(false);
					setIsGeneratingRoadmapPhases(false);
					setRoadmapPhaseGenerationTaskId(null);
					setRoadmapPhaseGenerationProgress(0);
					stopPhaseGenerationPolling();
					return;
				}
				console.error("Failed to sync roadmap phase generating status:", error);
			}
		};

		syncRoadmapPhaseGeneratingStatus();
		return () => {
			cancelled = true;
		};
	}, [
		roadmapAiRoadmapId,
		roadmapReloadToken,
		setIsRoadmapStructureMissing,
		setRoadmapHasPhases,
		skipPreLearningPhaseIds,
		stopPhaseGenerationPolling,
		workspaceId,
	]);

	const triggerNonStudyPreLearningAfterPhases = useCallback(async (roadmapIdHint = null) => {
		if (!workspaceId || isStudyNewRoadmap) return;
		if (nonStudyPreLearningAutoRunRef.current.active) return;

		const runId = nonStudyPreLearningAutoRunRef.current.runId + 1;
		nonStudyPreLearningAutoRunRef.current.runId = runId;
		nonStudyPreLearningAutoRunRef.current.active = true;

		try {
			const response = await getRoadmapGraph({ workspaceId });
			if (!mountedRef.current || nonStudyPreLearningAutoRunRef.current.runId !== runId) return;

			const roadmapData = response?.data?.data ?? null;
			const roadmapId = Number(roadmapData?.roadmapId ?? roadmapIdHint ?? roadmapAiRoadmapId);
			if (!Number.isInteger(roadmapId) || roadmapId <= 0) return;

			const phases = Array.isArray(roadmapData?.phases) ? roadmapData.phases : [];
			const phaseIdsToGenerate = [];
			if (phases.length > 0) {
				const firstPhase = phases[0];
				const hasPreLearning = (firstPhase?.preLearningQuizzes || []).length > 0;
				const hasKnowledge = (firstPhase?.knowledges || []).length > 0;
				if (!hasPreLearning && !hasKnowledge) {
					phaseIdsToGenerate.push(firstPhase.phaseId);
				}
			}

			const normalizedPhaseIds = normalizePositiveIds(phaseIdsToGenerate);
			if (normalizedPhaseIds.length === 0) return;

			setRoadmapAiRoadmapId(roadmapId);
			focusRoadmapViewSafely?.();

			for (const phaseId of normalizedPhaseIds) {
				if (!mountedRef.current || nonStudyPreLearningAutoRunRef.current.runId !== runId) return;
				const requestKey = tryStartPreLearningRequest(roadmapId, phaseId, {
					cooldownMs: 180000,
					awaitCompletion: true,
				});
				if (!requestKey) continue;

				setGeneratingPreLearningPhaseIds((current) => {
					if (current.includes(phaseId)) return current;
					return [...current, phaseId];
				});

				try {
					await generateRoadmapPreLearning({ roadmapId, phaseId });
					finishPreLearningRequest(requestKey, { succeeded: true });
				} catch (error) {
					setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== phaseId));
					finishPreLearningRequest(requestKey, { succeeded: false });
					throw error;
				}
			}

			bumpRoadmapReloadToken();
		} catch (error) {
			console.error("Failed auto-generating pre-learning for non-STUDY_NEW roadmap:", error);
			showError?.(error?.message || "Tao pre-learning tu dong that bai.");
		} finally {
			if (nonStudyPreLearningAutoRunRef.current.runId === runId) {
				nonStudyPreLearningAutoRunRef.current.active = false;
			}
		}
	}, [
		bumpRoadmapReloadToken,
		finishPreLearningRequest,
		focusRoadmapViewSafely,
		isStudyNewRoadmap,
		roadmapAiRoadmapId,
		setRoadmapAiRoadmapId,
		showError,
		tryStartPreLearningRequest,
		workspaceId,
	]);

	const handleCreateKnowledgeQuizForKnowledge = useCallback(async (phaseId, knowledgeId) => {
		const normalizedPhaseId = Number(phaseId);
		const normalizedKnowledgeId = Number(knowledgeId);
		if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;
		if (!Number.isInteger(normalizedKnowledgeId) || normalizedKnowledgeId <= 0) return;

		const requestKey = `${normalizedPhaseId}:${normalizedKnowledgeId}`;
		if (knowledgeQuizGenerationRequestedByKnowledgeRef.current[requestKey] === true) return;

		setGeneratingKnowledgeQuizPhaseIds((current) => {
			if (current.includes(normalizedPhaseId)) return current;
			return [...current, normalizedPhaseId];
		});
		setGeneratingKnowledgeQuizKnowledgeKeys((current) => {
			if (current.includes(requestKey)) return current;
			return [...current, requestKey];
		});

		knowledgeQuizGenerationRequestedByKnowledgeRef.current[requestKey] = true;
		knowledgeQuizGenerationRequestedRef.current[normalizedPhaseId] = true;

		try {
			const roadmapId = roadmapAiRoadmapId || await resolveLatestRoadmapId();
			if (!roadmapId) {
				showError?.("Khong tim thay roadmapId trong Workspace Profile.");
				openProfileSetupNow();
				knowledgeQuizGenerationRequestedByKnowledgeRef.current[requestKey] = false;
				setGeneratingKnowledgeQuizKnowledgeKeys((current) => current.filter((key) => key !== requestKey));
				return;
			}

			await generateRoadmapKnowledgeQuiz({ roadmapId, knowledgeId: normalizedKnowledgeId });
		} catch (error) {
			knowledgeQuizGenerationRequestedByKnowledgeRef.current[requestKey] = false;
			setGeneratingKnowledgeQuizKnowledgeKeys((current) => current.filter((key) => key !== requestKey));
			const hasPendingRequests = Object.entries(knowledgeQuizGenerationRequestedByKnowledgeRef.current)
				.some(([key, requested]) => requested === true && key.startsWith(`${normalizedPhaseId}:`));
			if (!hasPendingRequests) {
				knowledgeQuizGenerationRequestedRef.current[normalizedPhaseId] = false;
				setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
			}
			showError?.(error?.message || "Tao quiz cho knowledge that bai.");
		}
	}, [openProfileSetupNow, resolveLatestRoadmapId, roadmapAiRoadmapId, showError]);

	const handleOpenRoadmapPhaseDialog = useCallback(async () => {
		if (!workspaceId) return;

		if (!isProfileConfigured) {
			openProfileSetupNow();
			return;
		}

		try {
			const roadmapId = await resolveLatestRoadmapId();
			if (!roadmapId) {
				showError?.("Vui long nhap Workspace Profile truoc khi tao phase.");
				openProfileSetupNow();
				return;
			}

			const defaultIds = normalizePositiveIds(sources.filter(isActiveMaterial).map((material) => material.id));
			setRoadmapAiRoadmapId(roadmapId);
			setPhaseGenerateDialogDefaultIds(defaultIds);
			setPhaseGenerateDialogOpen(true);
		} catch (error) {
			showError?.(error?.message || "Khong the doc Workspace Profile de lay roadmapId.");
		}
	}, [
		isProfileConfigured,
		openProfileSetupNow,
		resolveLatestRoadmapId,
		setRoadmapAiRoadmapId,
		showError,
		sources,
		workspaceId,
	]);

	const handleSubmitRoadmapPhaseDialog = useCallback(async ({ files = [], materialIds = [] }) => {
		if (!workspaceId) return;
		setIsSubmittingRoadmapPhaseRequest(true);

		try {
			let latestSources = sources;
			if (files.length > 0) {
				const uploadPromises = files.map((file) => uploadMaterial(file, workspaceId));
				await Promise.all(uploadPromises);
				latestSources = await fetchSources?.();
			}

			const activeMaterialIds = normalizePositiveIds((latestSources || [])
				.filter(isActiveMaterial)
				.map((item) => item.id));
			const selectedMaterialIds = normalizePositiveIds(materialIds)
				.filter((id) => activeMaterialIds.includes(id));

			if (activeMaterialIds.length === 0) {
				showError?.("Vui long tai tai lieu va doi tai lieu o trang thai ACTIVE truoc khi tao phase.");
				return;
			}

			if (selectedMaterialIds.length === 0) {
				showError?.("Vui long chon it nhat 1 tai lieu ACTIVE de tao phase.");
				return;
			}

			const roadmapId = roadmapAiRoadmapId || await resolveLatestRoadmapId();
			if (!roadmapId) {
				showError?.("Khong tim thay roadmapId trong Workspace Profile.");
				openProfileSetupNow();
				return;
			}

			setRoadmapPhaseGenerationProgress(0);
			setRoadmapPhaseGenerationTaskId(null);
			const roadmapPhaseResponse = await generateRoadmapPhases({
				roadmapId,
				materialIds: selectedMaterialIds,
			});
			const roadmapPhasePayload = roadmapPhaseResponse?.data?.data || roadmapPhaseResponse?.data || roadmapPhaseResponse;
			const responseTaskId = roadmapPhasePayload?.websocketTaskId ?? roadmapPhasePayload?.taskId;
			if (responseTaskId) {
				setRoadmapPhaseGenerationTaskId(responseTaskId);
			}
			setRoadmapPhaseGenerationProgress(clampPercent(roadmapPhasePayload?.percent ?? roadmapPhasePayload?.progressPercent ?? 0));

			setRoadmapAiRoadmapId(roadmapId);
			setPhaseGenerateDialogOpen(false);
			setIsGeneratingRoadmapPhases(true);
			clearSelectedRoadmapPhaseNow();
			openRoadmapViewNow();
			bumpRoadmapReloadToken();
		} catch (error) {
			showError?.(error?.message || "Tao phase roadmap that bai.");
		} finally {
			setIsSubmittingRoadmapPhaseRequest(false);
		}
	}, [
		bumpRoadmapReloadToken,
		clearSelectedRoadmapPhaseNow,
		fetchSources,
		openProfileSetupNow,
		openRoadmapViewNow,
		resolveLatestRoadmapId,
		roadmapAiRoadmapId,
		setRoadmapAiRoadmapId,
		showError,
		sources,
		workspaceId,
	]);

	const handleCreatePhaseKnowledge = useCallback(async (phaseId, options = {}) => {
		const normalizedPhaseId = Number(phaseId);
		if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;
		if (phaseContentRequestInFlightRef.current[normalizedPhaseId]) return;
		const skipPreLearning = Boolean(options?.skipPreLearning);

		phaseContentRequestInFlightRef.current[normalizedPhaseId] = true;

		if (skipPreLearning) {
			setSkipPreLearningPhaseIds((current) => normalizePositiveIds([...current, normalizedPhaseId]));
			setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
			stopPreLearningPolling(normalizedPhaseId);
		}

		try {
			const roadmapId = roadmapAiRoadmapId || await resolveLatestRoadmapId();
			if (!roadmapId) {
				showError?.("Khong tim thay roadmapId trong Workspace Profile.");
				openProfileSetupNow();
				return;
			}

			setGeneratingKnowledgePhaseIds((current) => {
				if (current.includes(normalizedPhaseId)) return current;
				return [...current, normalizedPhaseId];
			});

			await generateRoadmapPhaseContent({
				roadmapId,
				phaseId: normalizedPhaseId,
				skipPreLearning,
			});

			openRoadmapViewNow();
			bumpRoadmapReloadToken();
		} catch (error) {
			setGeneratingKnowledgePhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
			showError?.(error?.message || "Tao knowledge cho phase that bai.");
		} finally {
			phaseContentRequestInFlightRef.current[normalizedPhaseId] = false;
		}
	}, [
		bumpRoadmapReloadToken,
		openProfileSetupNow,
		openRoadmapViewNow,
		resolveLatestRoadmapId,
		roadmapAiRoadmapId,
		showError,
		stopPreLearningPolling,
	]);

	const handleCreatePhasePreLearning = useCallback(async (phaseId, options = {}) => {
		const normalizedPhaseId = Number(phaseId);
		if (!Number.isInteger(normalizedPhaseId) || normalizedPhaseId <= 0) return;
		const skipPreLearning = Boolean(options?.skipPreLearning);
		setSkipPreLearningPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
		let requestKey = null;

		try {
			const roadmapId = roadmapAiRoadmapId || await resolveLatestRoadmapId();
			if (!roadmapId) {
				showError?.("Khong tim thay roadmapId trong Workspace Profile.");
				openProfileSetupNow();
				return;
			}

			requestKey = tryStartPreLearningRequest(roadmapId, normalizedPhaseId, {
				cooldownMs: 180000,
				awaitCompletion: true,
			});
			if (!requestKey) {
				return;
			}

			setGeneratingPreLearningPhaseIds((current) => {
				if (current.includes(normalizedPhaseId)) return current;
				return [...current, normalizedPhaseId];
			});

			await generateRoadmapPreLearning({
				roadmapId,
				phaseId: normalizedPhaseId,
				skipPreLearning,
			});
			finishPreLearningRequest(requestKey, { succeeded: true });

			openRoadmapViewNow();
			bumpRoadmapReloadToken();
		} catch (error) {
			setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== normalizedPhaseId));
			finishPreLearningRequest(requestKey, { succeeded: false });
			showError?.(error?.message || "Tao pre-learning cho phase that bai.");
			throw error;
		}
	}, [
		bumpRoadmapReloadToken,
		finishPreLearningRequest,
		openProfileSetupNow,
		openRoadmapViewNow,
		resolveLatestRoadmapId,
		roadmapAiRoadmapId,
		showError,
		tryStartPreLearningRequest,
	]);

	const applyRecoveredActiveTaskSnapshot = useCallback((snapshot) => {
		const snapshotTasks = Array.isArray(snapshot?.activeTasks) ? snapshot.activeTasks : [];
		const currentWorkspaceId = Number(workspaceId);
		const currentRoadmapId = Number(roadmapAiRoadmapId);
		const knownMaterialIds = new Set(normalizePositiveIds((sources || []).map((item) => Number(item?.id))));

		const tasks = snapshotTasks.filter((task) => {
			const normalizedStatus = String(task?.status || "").toUpperCase();
			if (normalizedStatus === "ROADMAP_MODERATION_DONE") return false;

			const processingObject = (task?.processingObject && typeof task.processingObject === "object")
				? task.processingObject
				: {};

			const taskWorkspaceId = Number(processingObject?.workspaceId ?? 0);
			if (
				Number.isInteger(taskWorkspaceId)
				&& taskWorkspaceId > 0
				&& Number.isInteger(currentWorkspaceId)
				&& currentWorkspaceId > 0
				&& taskWorkspaceId !== currentWorkspaceId
			) {
				return false;
			}

			const taskRoadmapId = Number(processingObject?.roadmapId ?? 0);
			if (
				Number.isInteger(taskRoadmapId)
				&& taskRoadmapId > 0
				&& Number.isInteger(currentRoadmapId)
				&& currentRoadmapId > 0
				&& taskRoadmapId !== currentRoadmapId
			) {
				return false;
			}

			const taskMaterialId = Number(processingObject?.materialId ?? 0);
			if (
				Number.isInteger(taskMaterialId)
				&& taskMaterialId > 0
				&& knownMaterialIds.size > 0
				&& !knownMaterialIds.has(taskMaterialId)
			) {
				return false;
			}

			return true;
		});

		const hasActiveTask = Boolean(snapshot?.hasActiveTask) && tasks.length > 0;
		if (!hasActiveTask || tasks.length === 0) {
			clearPreLearningRequestGuard({ all: true });
			setIsGeneratingRoadmapPhases(false);
			setRoadmapPhaseGenerationTaskId(null);
			setQuizGenerationTaskByQuizId({});
			setQuizGenerationProgressByQuizId({});
			setGeneratingKnowledgePhaseIds([]);
			setGeneratingKnowledgeQuizPhaseIds([]);
			setGeneratingKnowledgeQuizKnowledgeKeys([]);
			setGeneratingPreLearningPhaseIds([]);

			const staleKnowledgeKeys = Object.keys(progressTracking?.knowledgeProgressByPhaseId || {});
			const stalePreLearningKeys = Object.keys(progressTracking?.preLearningProgressByPhaseId || {});
			const stalePostLearningKeys = Object.keys(progressTracking?.postLearningProgressByPhaseId || {});
			staleKnowledgeKeys.forEach((id) => clearProgress?.("knowledge", id));
			stalePreLearningKeys.forEach((id) => clearProgress?.("preLearning", id));
			stalePostLearningKeys.forEach((id) => clearProgress?.("postLearning", id));

			void fetchSources?.();
			bumpRoadmapReloadToken();
			return;
		}

		const recoveredPreLearningPhaseIds = new Set();
		const recoveredKnowledgePhaseIds = new Set();
		const recoveredKnowledgeQuizPhaseIds = new Set();
		const recoveredKnowledgeQuizKeys = new Set();
		let hasRoadmapPreLearningTask = false;
		let hasRoadmapKnowledgeTask = false;
		let hasRoadmapKnowledgeQuizTask = false;

		tasks.forEach((task) => {
			const signal = normalizeRuntimeTaskSignal(task, { source: "active-task" });
			const normalizedStatus = signal.status;
			const taskId = String(signal.taskId || "").trim();
			const percent = clampPercent(signal.percent ?? 0);
			const progressQuizId = Number(signal.quizId ?? 0);
			const progressPhaseId = Number(signal.phaseId ?? 0);
			const progressKnowledgeId = Number(signal.knowledgeId ?? 0);
			const progressRoadmapId = Number(signal.roadmapId ?? 0);
			const hasExplicitRoadmapPhaseSignal = signal.hasExplicitRoadmapPhaseSignal;
			const hasGenericRoadmapPhaseSignal = signal.hasGenericRoadmapPhaseSignal;
			const isTaskStillProcessing = signal.isTaskStillProcessing;

			if (taskId) updateTaskProgress?.(taskId, percent);

			if (Number.isInteger(progressQuizId) && progressQuizId > 0) {
				if (taskId) {
					setQuizGenerationTaskByQuizId((current) => ({ ...current, [progressQuizId]: taskId }));
				}
				setQuizGenerationProgressByQuizId((current) => ({
					...current,
					[progressQuizId]: Math.max(Number(current?.[progressQuizId] ?? 0), percent),
				}));
			}

			if (hasExplicitRoadmapPhaseSignal || hasGenericRoadmapPhaseSignal) {
				setIsGeneratingRoadmapPhases(true);
				if (taskId) setRoadmapPhaseGenerationTaskId(taskId);
				setRoadmapPhaseGenerationProgress((current) => {
					if (percent <= 0) return current;
					return Math.max(Number(current) || 0, percent);
				});
			}

			if (normalizedStatus === "ROADMAP_PHASES_COMPLETED") {
				setIsGeneratingRoadmapPhases(false);
				setRoadmapPhaseGenerationTaskId(null);
				setRoadmapPhaseGenerationProgress(100);
				if (Number.isInteger(progressRoadmapId) && progressRoadmapId > 0) {
					setRoadmapAiRoadmapId(progressRoadmapId);
				}
				bumpRoadmapReloadToken();
			}

			const isPreLearningRecovered = signal.isPreLearningSignal;
			const isPhaseContent = signal.isPhaseContentSignal;
			const isKnowledgeQuiz = signal.isKnowledgeQuizSignal;
			const isKnowledgeByStatus = signal.isKnowledgeSignal;
			const isPostLearningByStatus = signal.isPostLearningSignal;

				if (isPreLearningRecovered) {
					hasRoadmapPreLearningTask = true;
				}
				if (isPhaseContent || isKnowledgeByStatus || isPostLearningByStatus) {
					hasRoadmapKnowledgeTask = true;
				}
				if (isKnowledgeQuiz) {
					hasRoadmapKnowledgeQuizTask = true;
					hasRoadmapKnowledgeTask = true;
				}

			if (isPreLearningRecovered && Number.isInteger(progressPhaseId) && progressPhaseId > 0 && percent > 0) {
				updatePreLearningProgress?.(progressPhaseId, percent);
			}

			if ((isKnowledgeByStatus || isKnowledgeQuiz || isPhaseContent)
				&& Number.isInteger(progressPhaseId)
				&& progressPhaseId > 0
				&& percent > 0) {
				updateKnowledgeProgress?.(progressPhaseId, percent);
			}

			if (isPostLearningByStatus && Number.isInteger(progressPhaseId) && progressPhaseId > 0 && percent > 0) {
				updatePostLearningProgress?.(progressPhaseId, percent);
			}

			if (!isTaskStillProcessing) return;

			if (isPreLearningRecovered && Number.isInteger(progressPhaseId) && progressPhaseId > 0) {
				recoveredPreLearningPhaseIds.add(progressPhaseId);
			}

			if (
				(isPhaseContent || (isKnowledgeByStatus && !isKnowledgeQuiz) || isPostLearningByStatus)
				&& Number.isInteger(progressPhaseId)
				&& progressPhaseId > 0
			) {
				recoveredKnowledgePhaseIds.add(progressPhaseId);
			}

			if (isKnowledgeQuiz && Number.isInteger(progressPhaseId) && progressPhaseId > 0) {
				recoveredKnowledgeQuizPhaseIds.add(progressPhaseId);
				if (Number.isInteger(progressKnowledgeId) && progressKnowledgeId > 0) {
					recoveredKnowledgeQuizKeys.add(`${progressPhaseId}:${progressKnowledgeId}`);
				}
			}
		});

		if (hasRoadmapPreLearningTask) {
			setGeneratingPreLearningPhaseIds(normalizePositiveIds(Array.from(recoveredPreLearningPhaseIds)));
		}
		if (hasRoadmapKnowledgeTask) {
			setGeneratingKnowledgePhaseIds(normalizePositiveIds(Array.from(recoveredKnowledgePhaseIds)));
		}
		if (hasRoadmapKnowledgeQuizTask) {
			setGeneratingKnowledgeQuizPhaseIds(normalizePositiveIds(Array.from(recoveredKnowledgeQuizPhaseIds)));
			setGeneratingKnowledgeQuizKnowledgeKeys(Array.from(recoveredKnowledgeQuizKeys));
		}
	}, [
		bumpRoadmapReloadToken,
		clearPreLearningRequestGuard,
		clearProgress,
		fetchSources,
		progressTracking?.knowledgeProgressByPhaseId,
		progressTracking?.postLearningProgressByPhaseId,
		progressTracking?.preLearningProgressByPhaseId,
		roadmapAiRoadmapId,
		setRoadmapAiRoadmapId,
		sources,
		updateKnowledgeProgress,
		updatePostLearningProgress,
		updatePreLearningProgress,
		updateTaskProgress,
		workspaceId,
	]);

	const handleWebSocketProgress = useCallback((progress) => {
		const signal = normalizeRuntimeTaskSignal(progress, { source: "websocket" });
		const status = String(signal.status || "").toUpperCase();
		const normalizedTaskType = String(signal.taskType || "").toUpperCase();
		const progressPhaseId = Number(signal.phaseId ?? 0);
		const progressRoadmapId = Number(signal.roadmapId ?? 0);
		const progressPercent = clampPercent(signal.percent ?? 0);
		const websocketTaskId = signal.taskId;
		const materialId = Number(signal.materialId ?? 0);
		const progressQuizId = Number(signal.quizId ?? 0);
		const isQuizSignal = signal.isQuizSignal;
		const isRoadmapTaskSignal = Boolean(
			status.startsWith("ROADMAP_")
			|| normalizedTaskType.includes("ROADMAP")
			|| signal.hasExplicitRoadmapPhaseSignal
			|| signal.hasGenericRoadmapPhaseSignal
			|| signal.isPreLearningSignal
			|| signal.isPhaseContentSignal
			|| signal.isKnowledgeSignal
			|| signal.isKnowledgeQuizSignal
			|| signal.isPostLearningSignal
			|| (Number.isInteger(progressPhaseId) && progressPhaseId > 0)
			|| (Number.isInteger(progressRoadmapId) && progressRoadmapId > 0)
		);

		if (websocketTaskId) updateTaskProgress?.(websocketTaskId, progressPercent);
		if (materialId > 0) updateMaterialProgress?.(materialId, progressPercent);

		if (Number.isInteger(progressQuizId) && progressQuizId > 0 && websocketTaskId) {
			setQuizGenerationTaskByQuizId((current) => {
				if (current[progressQuizId] === websocketTaskId) return current;
				return { ...current, [progressQuizId]: websocketTaskId };
			});
		}

		if (isQuizSignal && Number.isInteger(progressQuizId) && progressQuizId > 0) {
			setQuizGenerationProgressByQuizId((current) => {
				const nextPercent = progressPercent > 0
					? progressPercent
					: (status.includes("COMPLETED") ? 100 : current[progressQuizId] ?? 0);
				if ((current[progressQuizId] ?? 0) === nextPercent) return current;
				return { ...current, [progressQuizId]: nextPercent };
			});
		}

		if (progressPercent > 0 && isRoadmapTaskSignal) {
			const isPreLearningSignal = signal.isPreLearningSignal;
			const isKnowledgeSignal = signal.isKnowledgeSignal;
			const isKnowledgeQuizSignal = signal.isKnowledgeQuizSignal;
			const isPostLearningSignal = signal.isPostLearningSignal;

			let inferredPhaseId = progressPhaseId;
			if ((!Number.isInteger(inferredPhaseId) || inferredPhaseId <= 0)
				&& generatingPreLearningPhaseIds.length === 1
				&& !isKnowledgeSignal
				&& !isPostLearningSignal) {
				inferredPhaseId = Number(generatingPreLearningPhaseIds[0]);
			}

			if ((!Number.isInteger(inferredPhaseId) || inferredPhaseId <= 0)
				&& generatingKnowledgeQuizPhaseIds.length === 1
				&& !isPreLearningSignal
				&& !isPostLearningSignal) {
				inferredPhaseId = Number(generatingKnowledgeQuizPhaseIds[0]);
			}

			if (Number.isInteger(inferredPhaseId) && inferredPhaseId > 0) {
				const isPreLearningSkipped = skipPreLearningPhaseIds.includes(inferredPhaseId);
				if ((isPreLearningSignal || generatingPreLearningPhaseIds.includes(inferredPhaseId)) && !isPreLearningSkipped) {
					updatePreLearningProgress?.(inferredPhaseId, progressPercent);
				} else if (
					isKnowledgeSignal
					|| isKnowledgeQuizSignal
					|| generatingKnowledgePhaseIds.includes(inferredPhaseId)
					|| generatingKnowledgeQuizPhaseIds.includes(inferredPhaseId)
				) {
					updateKnowledgeProgress?.(inferredPhaseId, progressPercent);
				} else if (isPostLearningSignal) {
					updatePostLearningProgress?.(inferredPhaseId, progressPercent);
				}
			}
		}

		if (status === "ROADMAP_STRUCTURE_STARTED" || status === "ROADMAP_STRUCTURE_PROCESSING") {
			focusRoadmapViewSafely?.();
			return;
		}

		if (status === "ROADMAP_STRUCTURE_COMPLETED" || status === "ROADMAP_COMPLETED") {
			setRoadmapAiRoadmapId(progressRoadmapId || roadmapAiRoadmapId);
			focusRoadmapViewSafely?.();
			bumpRoadmapReloadToken();
			return;
		}

		if (status === "ROADMAP_PHASES_PROCESSING") {
			setIsGeneratingRoadmapPhases(true);
			if (websocketTaskId) setRoadmapPhaseGenerationTaskId(websocketTaskId);
			setRoadmapPhaseGenerationProgress((current) => (progressPercent > 0 ? progressPercent : current));
			focusRoadmapViewSafely?.();
			return;
		}

		if (status === "ROADMAP_PHASES_COMPLETED") {
			stopPhaseGenerationPolling();
			setIsGeneratingRoadmapPhases(false);
			setRoadmapPhaseGenerationProgress(100);
			setRoadmapPhaseGenerationTaskId(null);
			if (websocketTaskId) clearProgress?.("task", websocketTaskId);
			const completedRoadmapId = progressRoadmapId || roadmapAiRoadmapId;
			setRoadmapAiRoadmapId(completedRoadmapId);
			focusRoadmapViewSafely?.();
			bumpRoadmapReloadToken();
			if (!isStudyNewRoadmap) {
				void triggerNonStudyPreLearningAfterPhases(completedRoadmapId);
			}
			return;
		}

		if (status === "ROADMAP_PHASE_CONTENT_COMPLETED") {
			const phaseId = progressPhaseId;
			if (Number.isInteger(phaseId) && phaseId > 0) {
				stopPhaseContentPolling(phaseId);
				setGeneratingKnowledgePhaseIds((current) => current.filter((id) => id !== phaseId));
				clearProgress?.("knowledge", phaseId);
				clearProgress?.("postLearning", phaseId);
			} else {
				setGeneratingKnowledgePhaseIds([]);
			}
			if (websocketTaskId) clearProgress?.("task", websocketTaskId);
			focusRoadmapViewSafely?.();
			bumpRoadmapReloadToken();
			return;
		}

		if (status === "ROADMAP_KNOWLEDGE_QUIZ_COMPLETED") {
			const phaseId = progressPhaseId;
			if (Number.isInteger(phaseId) && phaseId > 0) {
				const knowledgeKeysToRefresh = generatingKnowledgeQuizKnowledgeKeys
					.filter((key) => String(key || "").startsWith(`${phaseId}:`));
				bumpKnowledgeQuizRefreshByKeys(knowledgeKeysToRefresh);

				knowledgeQuizGenerationRequestedRef.current[phaseId] = false;
				Object.keys(knowledgeQuizGenerationRequestedByKnowledgeRef.current).forEach((key) => {
					if (key.startsWith(`${phaseId}:`)) {
						knowledgeQuizGenerationRequestedByKnowledgeRef.current[key] = false;
					}
				});
				setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== phaseId));
				setGeneratingKnowledgeQuizKnowledgeKeys((current) => current.filter((key) => !key.startsWith(`${phaseId}:`)));
				clearProgress?.("knowledge", phaseId);
			} else {
				bumpKnowledgeQuizRefreshByKeys(generatingKnowledgeQuizKnowledgeKeys);
				knowledgeQuizGenerationRequestedRef.current = {};
				knowledgeQuizGenerationRequestedByKnowledgeRef.current = {};
				setGeneratingKnowledgeQuizPhaseIds([]);
				setGeneratingKnowledgeQuizKnowledgeKeys([]);
			}
			if (websocketTaskId) clearProgress?.("task", websocketTaskId);
			focusRoadmapViewSafely?.();
			return;
		}

		if (status === "ROADMAP_KNOWLEDGE_QUIZ_STARTED" || status === "ROADMAP_KNOWLEDGE_QUIZ_PROCESSING") {
			const phaseId = progressPhaseId;
			if (Number.isInteger(phaseId) && phaseId > 0) {
				setGeneratingKnowledgeQuizPhaseIds((current) => {
					if (current.includes(phaseId)) return current;
					return [...current, phaseId];
				});
			}
			focusRoadmapViewSafely?.();
			return;
		}

		if (status === "ROADMAP_PHASE_CONTENT_STARTED" || status === "ROADMAP_PHASE_CONTENT_PROCESSING") {
			const phaseId = progressPhaseId;
			if (Number.isInteger(phaseId) && phaseId > 0) {
				if (skipPreLearningPhaseIds.includes(phaseId)) {
					setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== phaseId));
				}
				setGeneratingKnowledgePhaseIds((current) => {
					if (current.includes(phaseId)) return current;
					return [...current, phaseId];
				});
			}
			focusRoadmapViewSafely?.();
			return;
		}

		if (status === "ROADMAP_PRE_LEARNING_STARTED" || status === "ROADMAP_PRE_LEARNING_PROCESSING") {
			const phaseId = progressPhaseId;
			if (Number.isInteger(phaseId) && phaseId > 0) {
				if (skipPreLearningPhaseIds.includes(phaseId)) {
					return;
				}
				setGeneratingPreLearningPhaseIds((current) => {
					if (current.includes(phaseId)) return current;
					return [...current, phaseId];
				});
			}
			focusRoadmapViewSafely?.();
			return;
		}

		if (status === "ROADMAP_PRE_LEARNING_COMPLETED") {
			const phaseId = progressPhaseId;
			const roadmapId = Number(progressRoadmapId || roadmapAiRoadmapId || 0);
			if (Number.isInteger(phaseId) && phaseId > 0) {
				clearPreLearningRequestGuard({ roadmapId, phaseId });
				clearProgress?.("preLearning", phaseId);
				setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== phaseId));
				if (skipPreLearningPhaseIds.includes(phaseId)) {
					return;
				}
			} else {
				setGeneratingPreLearningPhaseIds([]);
			}
			if (websocketTaskId) clearProgress?.("task", websocketTaskId);
			focusRoadmapViewSafely?.();
			bumpRoadmapReloadToken();
			return;
		}

		if (status === "ROADMAP_MODERATION_DONE") {
			if (websocketTaskId) clearProgress?.("task", websocketTaskId);
			void fetchSources?.();
			return;
		}

		if (status === "ERROR") {
			const phaseId = progressPhaseId;
			const roadmapId = progressRoadmapId;

			if (Number.isInteger(phaseId) && phaseId > 0) {
				clearPreLearningRequestGuard({ roadmapId, phaseId });
				knowledgeQuizGenerationRequestedRef.current[phaseId] = false;
				Object.keys(knowledgeQuizGenerationRequestedByKnowledgeRef.current).forEach((key) => {
					if (key.startsWith(`${phaseId}:`)) {
						knowledgeQuizGenerationRequestedByKnowledgeRef.current[key] = false;
					}
				});
				setGeneratingKnowledgePhaseIds((current) => current.filter((id) => id !== phaseId));
				setGeneratingKnowledgeQuizPhaseIds((current) => current.filter((id) => id !== phaseId));
				setGeneratingKnowledgeQuizKnowledgeKeys((current) => current.filter((key) => !key.startsWith(`${phaseId}:`)));
				setGeneratingPreLearningPhaseIds((current) => current.filter((id) => id !== phaseId));
				clearProgress?.("knowledge", phaseId);
				clearProgress?.("preLearning", phaseId);
				clearProgress?.("postLearning", phaseId);
				stopPhaseContentPolling(phaseId);
				stopPreLearningPolling(phaseId);
				stopKnowledgeQuizPolling(phaseId);
			}

			if (!Number.isInteger(phaseId) || phaseId <= 0) {
				clearPreLearningRequestGuard({ all: true });
				knowledgeQuizGenerationRequestedRef.current = {};
				knowledgeQuizGenerationRequestedByKnowledgeRef.current = {};
				knowledgeQuizPollingRef.current = {};
				setGeneratingKnowledgePhaseIds([]);
				setGeneratingKnowledgeQuizPhaseIds([]);
				setGeneratingKnowledgeQuizKnowledgeKeys([]);
				setGeneratingPreLearningPhaseIds([]);
				preLearningPollingRef.current = {};
			}

			if (websocketTaskId) clearProgress?.("task", websocketTaskId);

			if (Number.isInteger(roadmapId) && roadmapId > 0) {
				setIsGeneratingRoadmapPhases(false);
				stopPhaseGenerationPolling();
			}

			bumpRoadmapReloadToken();
		}
	}, [
		bumpRoadmapReloadToken,
		bumpKnowledgeQuizRefreshByKeys,
		clearProgress,
		clearPreLearningRequestGuard,
		fetchSources,
		focusRoadmapViewSafely,
		generatingKnowledgePhaseIds,
		generatingKnowledgeQuizKnowledgeKeys,
		generatingKnowledgeQuizPhaseIds,
		generatingPreLearningPhaseIds,
		isStudyNewRoadmap,
		roadmapAiRoadmapId,
		setRoadmapAiRoadmapId,
		skipPreLearningPhaseIds,
		stopKnowledgeQuizPolling,
		stopPhaseContentPolling,
		stopPhaseGenerationPolling,
		stopPreLearningPolling,
		triggerNonStudyPreLearningAfterPhases,
		updateKnowledgeProgress,
		updateMaterialProgress,
		updatePostLearningProgress,
		updatePreLearningProgress,
		updateTaskProgress,
	]);

	const { isConnected: wsConnected, lastMessage: wsLastMessage } = useWebSocket({
		workspaceId,
		enabled: Boolean(workspaceId),
		onMaterialUploaded: () => {
			fetchSources?.();
		},
		onMaterialDeleted: () => {
			fetchSources?.();
		},
		onMaterialUpdated: () => {
			fetchSources?.();
		},
		onProgress: handleWebSocketProgress,
	});

	const { refreshActiveTaskSnapshot } = useActiveTaskFallback({
		enabled: Boolean(workspaceId),
		lastWebSocketMessage: wsLastMessage,
		onSnapshot: (snapshot) => {
			applyRecoveredActiveTaskSnapshot(snapshot);
		},
		silenceThresholdMs: 15000,
		pollIntervalMs: 15000,
	});

	useEffect(() => {
		if (!workspaceId) return;
		void refreshActiveTaskSnapshot("page-reload");
	}, [refreshActiveTaskSnapshot, workspaceId]);

	return {
		wsConnected,
		roadmapReloadToken,
		bumpRoadmapReloadToken,
		quizGenerationTaskByQuizId,
		quizGenerationProgressByQuizId,
		trackQuizGenerationStart,
		phaseGenerateDialogOpen,
		setPhaseGenerateDialogOpen,
		phaseGenerateDialogDefaultIds,
		isGeneratingRoadmapPhases,
		effectiveRoadmapPhaseGenerationProgress,
		isSubmittingRoadmapPhaseRequest,
		generatingKnowledgePhaseIds,
		generatingKnowledgeQuizPhaseIds,
		generatingKnowledgeQuizKnowledgeKeys,
		knowledgeQuizRefreshByKey,
		generatingPreLearningPhaseIds,
		skipPreLearningPhaseIds,
		handleOpenRoadmapPhaseDialog,
		handleSubmitRoadmapPhaseDialog,
		handleCreatePhaseKnowledge,
		handleCreateKnowledgeQuizForKnowledge,
		handleCreatePhasePreLearning,
		resetRoadmapRuntimeState,
	};
}

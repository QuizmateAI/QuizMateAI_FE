import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

const PROGRESS_STORAGE_PREFIX = 'workspace_progress_tracking_v1';

// ============================================================================
// Smooth progress animation config
// ----------------------------------------------------------------------------
// The backend (Python → Redis → Spring → WebSocket) publishes DISCRETE
// milestones (e.g. 5% → 15% → 45% → 85% → 100%). To make the progress bar
// feel realistic instead of "snapping", we treat each server update as a
// TARGET and animate the displayed value toward it with:
//   - Easing: speed is proportional to distance (fast far, slow close)
//   - Creep: after hitting the target, slowly approach (target + 5%) up to
//            a cap (95%) so the bar keeps ticking while we wait for the
//            next milestone from the server.
// ============================================================================
const ANIM_EASING_PER_SECOND = 1.2;   // Higher = snappier catch-up near the target
const ANIM_MIN_STEP_PER_SECOND = 1.5; // Minimum speed (pct/s) so we always keep ticking
const ANIM_MAX_STEP_PER_SECOND = 5;   // Maximum speed (pct/s) — prevents big jumps from rushing ahead of reality
const CREEP_OVERSHOOT_PCT = 3;        // Max extra % to creep past last target while idle
const CREEP_CEILING = 95;             // Never creep above this (reserved for "COMPLETED")
const CREEP_SPEED_PER_SECOND = 0.35;  // Slow log-like creep rate while waiting for next milestone
const SNAPSHOT_MIN_INTERVAL_MS = 250; // Throttle localStorage writes during animation
const ANIM_FRAME_INTERVAL_MS = 120;   // ~8 fps — smooth enough for progress bars, very low CPU

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
 * Hook để quản lý progress percent cho các tasks AI.
 *
 * Lưu trữ percent theo taskId/materialId/phaseId và animate mượt từ giá trị
 * hiện tại đến target mỗi khi BE gửi update (qua Redis → WebSocket).
 *
 * API công khai KHÔNG thay đổi — mọi consumer hiện tại sẽ tự động có
 * smooth animation.
 */
export function useProgressTracking(options = {}) {
	const scopeKey = typeof options === 'string' ? options : options?.scopeKey;
	const storageKey = useMemo(() => {
		if (!scopeKey) return null;
		return `${PROGRESS_STORAGE_PREFIX}:${scopeKey}`;
	}, [scopeKey]);
	const hasHydratedRef = useRef(false);

	// -------- Displayed values (state) -------------------------------------
	// These are what UI reads. They animate smoothly toward targets.
	const [progressByTaskId, setProgressByTaskId] = useState({});
	const [progressByMaterialId, setProgressByMaterialId] = useState({});
	const [preLearningProgressByPhaseId, setPreLearningProgressByPhaseId] = useState({});
	const [knowledgeProgressByPhaseId, setKnowledgeProgressByPhaseId] = useState({});
	const [postLearningProgressByPhaseId, setPostLearningProgressByPhaseId] = useState({});

	// -------- Target values (refs) -----------------------------------------
	// The "true" target the backend last reported. UI doesn't read these
	// directly; the animation loop pulls them to advance displayed values.
	const targetsRef = useRef({
		task: {},
		material: {},
		preLearning: {},
		knowledge: {},
		postLearning: {},
	});
	// Live-display mirror (avoids stale-closure reads in the rAF tick)
	const displayRef = useRef({
		task: {},
		material: {},
		preLearning: {},
		knowledge: {},
		postLearning: {},
	});
	const timerRef = useRef(null);
	const lastTickRef = useRef(0);
	const lastPersistRef = useRef(0);

	// Keep the display mirror in sync whenever state actually commits.
	useEffect(() => { displayRef.current.task = progressByTaskId; }, [progressByTaskId]);
	useEffect(() => { displayRef.current.material = progressByMaterialId; }, [progressByMaterialId]);
	useEffect(() => { displayRef.current.preLearning = preLearningProgressByPhaseId; }, [preLearningProgressByPhaseId]);
	useEffect(() => { displayRef.current.knowledge = knowledgeProgressByPhaseId; }, [knowledgeProgressByPhaseId]);
	useEffect(() => { displayRef.current.postLearning = postLearningProgressByPhaseId; }, [postLearningProgressByPhaseId]);

	// ----- Animation loop --------------------------------------------------
	// Throttled timer (~8 fps, configurable via ANIM_FRAME_INTERVAL_MS) drives
	// all five maps. Advances displayed values toward targets with easing;
	// when at target, applies a slow creep. Using setTimeout instead of
	// requestAnimationFrame keeps CPU cost low and avoids firing 60 updates/sec.
	const tickAnimation = useCallback(() => {
		timerRef.current = null;
		const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
		const last = lastTickRef.current || now;
		const dt = Math.max(0, (now - last) / 1000); // seconds
		lastTickRef.current = now;

		let keepRunning = false;
		const updates = {
			task: null,
			material: null,
			preLearning: null,
			knowledge: null,
			postLearning: null,
		};

		const kinds = ['task', 'material', 'preLearning', 'knowledge', 'postLearning'];
		for (const kind of kinds) {
			const targets = targetsRef.current[kind] || {};
			const display = displayRef.current[kind] || {};
			const nextMap = { ...display };
			let changed = false;

			const keys = new Set([...Object.keys(targets), ...Object.keys(display)]);
			for (const key of keys) {
				const rawTarget = clampPercent(targets[key] ?? 0);
				const current = clampPercent(display[key] ?? 0);

				if (rawTarget <= 0 && current <= 0) continue;

				// If the target has "completed" (100) we snap to it.
				if (rawTarget >= 100) {
					if (current < 100) {
						// Glide fast into 100 — proportional to distance, but never slower than
						// ~60%/sec so the finish feels decisive.
						const speed = Math.max(60, (100 - current) * ANIM_EASING_PER_SECOND);
						const next = Math.min(100, current + speed * dt);
						if (next !== current) {
							nextMap[key] = next;
							changed = true;
						}
						if (next < 100) keepRunning = true;
					}
					continue;
				}

				// Effective ceiling: the server's target + a small creep overshoot,
				// clamped below CREEP_CEILING so "ACTIVE/COMPLETED" transitions still
				// produce a visible jump to 100.
				const creepCeiling = Math.min(
					CREEP_CEILING,
					rawTarget + CREEP_OVERSHOOT_PCT
				);

				if (current < rawTarget) {
					// Phase 1: catch up to the server's target. Speed is clamped so large
					// milestone jumps (e.g. 0 → 45%) don't "rocket" — they crawl linearly
					// up to MAX_STEP, then ease out as we approach the target.
					const distance = rawTarget - current;
					const speed = Math.min(
						ANIM_MAX_STEP_PER_SECOND,
						Math.max(
							ANIM_MIN_STEP_PER_SECOND,
							distance * ANIM_EASING_PER_SECOND
						)
					);
					const next = Math.min(rawTarget, current + speed * dt);
					if (next !== current) {
						nextMap[key] = next;
						changed = true;
					}
					keepRunning = true;
				} else if (current < creepCeiling) {
					// Phase 2: "creep" past the last milestone while waiting for the
					// next server update. Logarithmic-like slowdown: speed shrinks as
					// we approach the ceiling, so the bar never actually hits it.
					const remaining = creepCeiling - current;
					const speed = Math.max(0.15, CREEP_SPEED_PER_SECOND * (remaining / CREEP_OVERSHOOT_PCT));
					const next = Math.min(creepCeiling - 0.001, current + speed * dt);
					if (next - current > 0.05) {
						nextMap[key] = next;
						changed = true;
					}
					keepRunning = true;
				}
			}

			if (changed) updates[kind] = nextMap;
		}

		if (updates.task) setProgressByTaskId(updates.task);
		if (updates.material) setProgressByMaterialId(updates.material);
		if (updates.preLearning) setPreLearningProgressByPhaseId(updates.preLearning);
		if (updates.knowledge) setKnowledgeProgressByPhaseId(updates.knowledge);
		if (updates.postLearning) setPostLearningProgressByPhaseId(updates.postLearning);

		if (keepRunning) {
			timerRef.current = globalThis.setTimeout(tickAnimation, ANIM_FRAME_INTERVAL_MS);
		} else {
			lastTickRef.current = 0;
		}
	}, []);

	const ensureAnimating = useCallback(() => {
		if (timerRef.current != null) return;
		lastTickRef.current = 0;
		timerRef.current = globalThis.setTimeout(tickAnimation, ANIM_FRAME_INTERVAL_MS);
	}, [tickAnimation]);

	// Hydrate from localStorage on scope change.
	useEffect(() => {
		hasHydratedRef.current = false;
		if (timerRef.current != null) {
			globalThis.clearTimeout(timerRef.current);
			timerRef.current = null;
		}

		if (!storageKey) {
			queueMicrotask(() => {
				setProgressByTaskId({});
				setProgressByMaterialId({});
				setPreLearningProgressByPhaseId({});
				setKnowledgeProgressByPhaseId({});
				setPostLearningProgressByPhaseId({});
				targetsRef.current = { task: {}, material: {}, preLearning: {}, knowledge: {}, postLearning: {} };
				displayRef.current = { task: {}, material: {}, preLearning: {}, knowledge: {}, postLearning: {} };
				hasHydratedRef.current = true;
			});
			return;
		}

		const snapshot = readProgressSnapshot(storageKey);
		queueMicrotask(() => {
			const t = snapshot?.progressByTaskId || {};
			const m = snapshot?.progressByMaterialId || {};
			const pre = snapshot?.preLearningProgressByPhaseId || {};
			const k = snapshot?.knowledgeProgressByPhaseId || {};
			const post = snapshot?.postLearningProgressByPhaseId || {};

			setProgressByTaskId(t);
			setProgressByMaterialId(m);
			setPreLearningProgressByPhaseId(pre);
			setKnowledgeProgressByPhaseId(k);
			setPostLearningProgressByPhaseId(post);

			// On restore, the target is the stored value (no animation needed yet).
			targetsRef.current = {
				task: { ...t },
				material: { ...m },
				preLearning: { ...pre },
				knowledge: { ...k },
				postLearning: { ...post },
			};
			displayRef.current = {
				task: { ...t },
				material: { ...m },
				preLearning: { ...pre },
				knowledge: { ...k },
				postLearning: { ...post },
			};
			hasHydratedRef.current = true;
		});
	}, [storageKey]);

	// Persist snapshots (throttled so the 60fps animation loop doesn't thrash localStorage).
	useEffect(() => {
		if (!storageKey || !hasHydratedRef.current) return;
		const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
		if (now - lastPersistRef.current < SNAPSHOT_MIN_INTERVAL_MS) return;
		lastPersistRef.current = now;

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

	// ----- Public updaters -------------------------------------------------
	// Each updater writes the TARGET in the ref and starts the animation
	// loop. The displayed state is updated by the rAF tick, not here,
	// unless the caller explicitly requests instant behavior.
	const setTarget = useCallback((kind, key, percent, { instant = false, allowLower = false } = {}) => {
		if (!key) return;
		const normalizedKey = String(key);
		const targetPercent = clampPercent(percent);
		const prevTarget = clampPercent(targetsRef.current[kind][normalizedKey] ?? 0);

		// Monotonic by default — never walk the target BACKWARD unless caller asks.
		// (The server can emit stale messages; we don't want 60% → 45% jitter.)
		const nextTarget = allowLower
			? targetPercent
			: Math.max(prevTarget, targetPercent);
		targetsRef.current[kind][normalizedKey] = nextTarget;

		if (instant) {
			const setter = {
				task: setProgressByTaskId,
				material: setProgressByMaterialId,
				preLearning: setPreLearningProgressByPhaseId,
				knowledge: setKnowledgeProgressByPhaseId,
				postLearning: setPostLearningProgressByPhaseId,
			}[kind];
			if (setter) {
				setter((prev) => ({ ...prev, [normalizedKey]: nextTarget }));
			}
			return;
		}

		ensureAnimating();
	}, [ensureAnimating]);

	const updateTaskProgress = useCallback((taskId, percent, opts) => setTarget('task', taskId, percent, opts), [setTarget]);
	const updateMaterialProgress = useCallback((materialId, percent, opts) => setTarget('material', materialId, percent, opts), [setTarget]);
	const updatePreLearningProgress = useCallback((phaseId, percent, opts) => setTarget('preLearning', phaseId, percent, opts), [setTarget]);
	const updateKnowledgeProgress = useCallback((phaseId, percent, opts) => setTarget('knowledge', phaseId, percent, opts), [setTarget]);
	const updatePostLearningProgress = useCallback((phaseId, percent, opts) => setTarget('postLearning', phaseId, percent, opts), [setTarget]);

	const reconcileMaterialProgress = useCallback((materialIds = []) => {
		const allowedIds = new Set(
			(materialIds || [])
				.map((id) => String(Number(id)))
				.filter((id) => id !== 'NaN' && Number(id) > 0)
		);

		// Drop targets for materials the server no longer reports as processing.
		const nextTargets = Object.entries(targetsRef.current.material).reduce((acc, [key, value]) => {
			if (allowedIds.has(String(Number(key)))) acc[key] = value;
			return acc;
		}, {});
		targetsRef.current.material = nextTargets;

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

	const getTaskProgress = useCallback((taskId) => progressByTaskId[taskId] ?? 0, [progressByTaskId]);
	const getMaterialProgress = useCallback((materialId) => progressByMaterialId[materialId] ?? 0, [progressByMaterialId]);
	const getPreLearningProgress = useCallback((phaseId) => preLearningProgressByPhaseId[phaseId] ?? 0, [preLearningProgressByPhaseId]);
	const getKnowledgeProgress = useCallback((phaseId) => knowledgeProgressByPhaseId[phaseId] ?? 0, [knowledgeProgressByPhaseId]);
	const getPostLearningProgress = useCallback((phaseId) => postLearningProgressByPhaseId[phaseId] ?? 0, [postLearningProgressByPhaseId]);

	const clearProgress = useCallback((type, id) => {
		const kind = {
			task: 'task',
			material: 'material',
			preLearning: 'preLearning',
			knowledge: 'knowledge',
			postLearning: 'postLearning',
		}[type];
		if (!kind) return;
		const key = String(id);
		if (targetsRef.current[kind]) delete targetsRef.current[kind][key];

		const setter = {
			task: setProgressByTaskId,
			material: setProgressByMaterialId,
			preLearning: setPreLearningProgressByPhaseId,
			knowledge: setKnowledgeProgressByPhaseId,
			postLearning: setPostLearningProgressByPhaseId,
		}[kind];
		if (!setter) return;
		setter((prev) => {
			if (!(key in prev)) return prev;
			const next = { ...prev };
			delete next[key];
			return next;
		});
	}, []);

	// Cancel any pending timer on unmount.
	useEffect(() => () => {
		if (timerRef.current != null) {
			globalThis.clearTimeout(timerRef.current);
			timerRef.current = null;
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

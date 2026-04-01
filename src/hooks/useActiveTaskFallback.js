import { useCallback, useEffect, useRef } from "react";
import { getActiveTask } from "@/api/QuizAPI";

function normalizeActiveTaskSnapshot(response) {
  const payload = response?.data || response || {};
  const declaredTasks = Array.isArray(payload?.activeTasks) ? payload.activeTasks : [];

  const fallbackTask = payload?.taskId
    ? [{
      taskId: payload.taskId,
      percent: payload?.percent,
      status: payload?.status,
      message: payload?.message,
      processingObject: payload?.processingObject,
    }]
    : [];

  const activeTasks = declaredTasks.length > 0 ? declaredTasks : fallbackTask;
  const hasActiveTask = payload?.hasActiveTask === true || activeTasks.length > 0;

  return {
    ...payload,
    activeTasks,
    activeTaskCount: Number(payload?.activeTaskCount ?? activeTasks.length),
    hasActiveTask,
  };
}

function buildSnapshotSignature(snapshot) {
  const hasActiveTask = Boolean(snapshot?.hasActiveTask);
  const tasks = Array.isArray(snapshot?.activeTasks) ? snapshot.activeTasks : [];
  const normalizedTasks = tasks
    .map((task) => {
      const processingObject = task?.processingObject && typeof task.processingObject === "object"
        ? task.processingObject
        : {};
      return {
        taskId: String(task?.taskId || ""),
        status: String(task?.status || "").toUpperCase(),
        percent: Number(task?.percent ?? 0),
        message: String(task?.message || ""),
        roadmapId: Number(processingObject?.roadmapId ?? 0),
        phaseId: Number(processingObject?.phaseId ?? 0),
        knowledgeId: Number(processingObject?.knowledgeId ?? 0),
        quizId: Number(processingObject?.quizId ?? 0),
        materialId: Number(processingObject?.materialId ?? 0),
      };
    })
    .sort((a, b) => a.taskId.localeCompare(b.taskId));

  return JSON.stringify({
    hasActiveTask,
    activeTaskCount: Number(snapshot?.activeTaskCount ?? normalizedTasks.length),
    activeTasks: normalizedTasks,
  });
}

export function useActiveTaskFallback({
  enabled = true,
  lastWebSocketMessage = null,
  onSnapshot,
  silenceThresholdMs = 15000,
  pollIntervalMs = 15000,
} = {}) {
  const lastRealtimeUpdateAtRef = useRef(Date.now());
  const shouldContinuePollingRef = useRef(false);
  const pollingStoppedByNoTaskRef = useRef(false);
  const inFlightRef = useRef(false);
  const lastFetchAtRef = useRef(0);
  const lastSnapshotSignatureRef = useRef("");

  useEffect(() => {
    if (!enabled) return;
    if (!lastWebSocketMessage?.timestamp) return;

    lastRealtimeUpdateAtRef.current = Date.now();
    shouldContinuePollingRef.current = false;
    pollingStoppedByNoTaskRef.current = false;
  }, [enabled, lastWebSocketMessage?.timestamp]);

  const fetchActiveTaskSnapshot = useCallback(async (reason = "manual") => {
    if (!enabled || inFlightRef.current) return null;

    const requestedAt = Date.now();
    lastFetchAtRef.current = requestedAt;
    inFlightRef.current = true;
    try {
      const response = await getActiveTask();
      const snapshot = normalizeActiveTaskSnapshot(response);
      const hasActiveTask = Boolean(snapshot?.hasActiveTask);
      shouldContinuePollingRef.current = hasActiveTask;
      pollingStoppedByNoTaskRef.current = !hasActiveTask;
      if (!hasActiveTask) {
        // Nếu backend xác nhận không còn task thì reset mốc im lặng để không gọi dồn dập.
        lastRealtimeUpdateAtRef.current = Date.now();
      }

      const nextSignature = buildSnapshotSignature(snapshot);
      if (lastSnapshotSignatureRef.current !== nextSignature) {
        lastSnapshotSignatureRef.current = nextSignature;
        onSnapshot?.(snapshot, { reason, fetchedAt: Date.now() });
      }
      return snapshot;
    } catch (error) {
      return null;
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled, onSnapshot]);

  useEffect(() => {
    if (!enabled) return undefined;

    void fetchActiveTaskSnapshot("mount");

    const interval = globalThis.setInterval(() => {
      if (pollingStoppedByNoTaskRef.current) return;

      const now = Date.now();
      const isSilentTooLong = now - lastRealtimeUpdateAtRef.current >= silenceThresholdMs;
      const shouldPollNow = shouldContinuePollingRef.current || isSilentTooLong;
      const reachedPollInterval = now - lastFetchAtRef.current >= pollIntervalMs;

      if (!shouldPollNow || !reachedPollInterval) return;
      void fetchActiveTaskSnapshot(shouldContinuePollingRef.current ? "active-task-polling" : "websocket-silence");
    }, 1000);

    return () => {
      globalThis.clearInterval(interval);
    };
  }, [enabled, fetchActiveTaskSnapshot, pollIntervalMs, silenceThresholdMs]);

  return {
    refreshActiveTaskSnapshot: fetchActiveTaskSnapshot,
  };
}

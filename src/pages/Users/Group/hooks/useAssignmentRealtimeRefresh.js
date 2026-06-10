import { useEffect, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

const ASSIGNMENT_EVENT_TYPES = new Set([
  'ASSIGNMENT_CREATED',
  'ASSIGNMENT_UPDATED',
  'ASSIGNMENT_DELETED',
  'ASSIGNMENT_SUBMITTED',
]);

function isAssignmentRealtimeEvent(event) {
  const eventType = String(event?.type || event?.eventType || '').toUpperCase();
  return ASSIGNMENT_EVENT_TYPES.has(eventType);
}

export function useAssignmentRealtimeRefresh({
  workspaceId,
  enabled = true,
  isActive = true,
  onRefresh,
  onPatch,
  pollIntervalMs = 12000,
}) {
  const refreshRef = useRef(onRefresh);
  const patchRef = useRef(onPatch);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    patchRef.current = onPatch;
  }, [onPatch]);

  useWebSocket({
    workspaceId: enabled ? workspaceId : null,
    enabled: Boolean(enabled && workspaceId),
    onGroupUpdate: (event) => {
      if (!isAssignmentRealtimeEvent(event)) return;

      const eventType = String(event?.type || event?.eventType || '').toUpperCase();
      if (eventType === 'ASSIGNMENT_DELETED') {
        void refreshRef.current?.();
        return;
      }

      const submittedCount = Number(event?.submittedCount);
      const totalTargets = Number(event?.totalTargets);
      const canPatchCounts = event?.assignmentId != null
        && (
          (Number.isFinite(submittedCount) && submittedCount >= 0)
          || (Number.isFinite(totalTargets) && totalTargets >= 0)
        );

      if (canPatchCounts && typeof patchRef.current === 'function') {
        patchRef.current(event);
        return;
      }

      void refreshRef.current?.();
    },
  });

  useEffect(() => {
    if (!enabled || !isActive || !workspaceId) return undefined;

    const timerId = globalThis.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void refreshRef.current?.();
    }, pollIntervalMs);

    return () => globalThis.clearInterval(timerId);
  }, [enabled, isActive, pollIntervalMs, workspaceId]);
}

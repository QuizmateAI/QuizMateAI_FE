import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import IndividualQuizListView from "@/pages/Users/Individual/Workspace/Components/QuizListView";
import {
  buildGroupWorkspaceSectionPath,
  extractWorkspaceIdFromPath,
} from "@/lib/routePaths";
import { useMyAssignments } from "@/pages/Users/Group/hooks/useGroupAssignments";

function resolveGroupPhaseReturnPath(pathname, phaseId) {
  const workspaceId = extractWorkspaceIdFromPath(pathname);
  const normalizedPhaseId = Number(phaseId);

  if (
    !workspaceId ||
    !Number.isInteger(normalizedPhaseId) ||
    normalizedPhaseId <= 0
  ) {
    return null;
  }

  return buildGroupWorkspaceSectionPath(workspaceId, "roadmap", {
    phaseId: normalizedPhaseId,
  });
}

function QuizListView({
  contextType = "GROUP",
  contextId,
  returnToPath = null,
  ...restProps
}) {
  const location = useLocation();
  const normalizedContextType = String(contextType || "").toUpperCase();

  const resolvedReturnToPath = useMemo(() => {
    if (returnToPath) return returnToPath;
    if (normalizedContextType === "PHASE") {
      return resolveGroupPhaseReturnPath(location.pathname, contextId);
    }
    return null;
  }, [contextId, location.pathname, normalizedContextType, returnToPath]);

  // Map<quizId, dueAtIso|null> — chỉ chứa các assignment PENDING (chưa nộp).
  // Dùng để hiển thị badge "Được giao" trên card quiz cho member/leader thấy bài
  // mình còn phải làm. Không gắn group-leader-only — leader cũng có thể là target.
  const assignmentsState = useMyAssignments(contextId, {
    enabled: normalizedContextType === "GROUP" && contextId != null,
  });
  React.useEffect(() => {
    if (normalizedContextType === "GROUP" && contextId != null) {
      void assignmentsState.refresh();
    }
  }, [normalizedContextType, contextId]);

  const assignedQuizMap = useMemo(() => {
    const map = new Map();
    for (const item of assignmentsState.items || []) {
      if (String(item?.resourceType || "").toUpperCase() !== "QUIZ") continue;
      const qid = Number(item?.resourceId);
      if (!Number.isFinite(qid)) continue;
      const status = String(item?.myTarget?.status || "").toUpperCase();
      if (status === "SUBMITTED") continue;
      // Giữ assignment có deadline sớm nhất nếu trùng quizId.
      const existing = map.get(qid);
      const dueAt = item?.dueAt || null;
      if (!existing) {
        map.set(qid, { dueAt, assignmentId: item?.assignmentId });
      } else if (dueAt && (!existing.dueAt || new Date(dueAt).getTime() < new Date(existing.dueAt).getTime())) {
        map.set(qid, { dueAt, assignmentId: item?.assignmentId });
      }
    }
    return map;
  }, [assignmentsState.items]);

  return (
    <IndividualQuizListView
      {...restProps}
      contextType={contextType}
      contextId={contextId}
      returnToPath={resolvedReturnToPath}
      assignedQuizMap={assignedQuizMap}
    />
  );
}

export default QuizListView;

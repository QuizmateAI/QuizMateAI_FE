import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import IndividualQuizListView from "@/pages/Users/Individual/Workspace/Components/QuizListView";
import {
  buildGroupWorkspaceSectionPath,
  extractWorkspaceIdFromPath,
} from "@/lib/routePaths";

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

  return (
    <IndividualQuizListView
      {...restProps}
      contextType={contextType}
      contextId={contextId}
      returnToPath={resolvedReturnToPath}
    />
  );
}

export default QuizListView;

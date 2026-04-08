export const APP_ROUTE_SEGMENTS = {
  workspaces: "workspaces",
  groupWorkspaces: "group-workspaces",
  quizzes: "quizzes",
};

export const WORKSPACE_ROUTE_SEGMENTS = {
  roadmaps: "roadmaps",
  phases: "phases",
  quizzes: "quizzes",
  flashcards: "flashcards",
  mockTests: "mock-tests",
  postLearnings: "post-learnings",
};

function normalizeSubPath(subPath = "") {
  return String(subPath || "").replace(/^\/+/, "");
}

export function buildWorkspacePath(workspaceId, subPath = "") {
  const normalizedSubPath = normalizeSubPath(subPath);
  const basePath = `/${APP_ROUTE_SEGMENTS.workspaces}/${workspaceId}`;
  return normalizedSubPath ? `${basePath}/${normalizedSubPath}` : basePath;
}

export function buildGroupWorkspacePath(workspaceId, subPath = "") {
  const normalizedSubPath = normalizeSubPath(subPath);
  const basePath = `/${APP_ROUTE_SEGMENTS.groupWorkspaces}/${workspaceId}`;
  return normalizedSubPath ? `${basePath}/${normalizedSubPath}` : basePath;
}

export function extractWorkspaceSubPath(pathname, workspaceId) {
  if (!workspaceId || !pathname) return "";

  const prefix = buildWorkspacePath(workspaceId);
  if (!String(pathname).startsWith(prefix)) return "";

  return String(pathname).slice(prefix.length).replace(/^\/+/, "");
}

export function buildWorkspaceRoadmapsPath(workspaceId, phaseId = null) {
  const basePath = buildWorkspacePath(workspaceId, WORKSPACE_ROUTE_SEGMENTS.roadmaps);
  return Number.isInteger(Number(phaseId)) && Number(phaseId) > 0
    ? `${basePath}?phaseId=${Number(phaseId)}`
    : basePath;
}

export function buildWorkspaceRoadmapPhasePath(workspaceId, roadmapId, phaseId) {
  return buildWorkspacePath(
    workspaceId,
    `${WORKSPACE_ROUTE_SEGMENTS.roadmaps}/${roadmapId}/${WORKSPACE_ROUTE_SEGMENTS.phases}/${phaseId}`,
  );
}

export function buildWorkspaceQuizPath(workspaceId, quizId) {
  return buildWorkspacePath(
    workspaceId,
    `${WORKSPACE_ROUTE_SEGMENTS.quizzes}/${quizId}`,
  );
}

export function buildWorkspaceRoadmapQuizPath(
  workspaceId,
  { roadmapId = null, phaseId = null, quizId, edit = false } = {},
) {
  if (!quizId) return null;

  const normalizedRoadmapId = Number(roadmapId);
  const normalizedPhaseId = Number(phaseId);
  const editSuffix = edit ? "/edit" : "";

  if (
    Number.isInteger(normalizedRoadmapId) &&
    normalizedRoadmapId > 0 &&
    Number.isInteger(normalizedPhaseId) &&
    normalizedPhaseId > 0
  ) {
    return buildWorkspacePath(
      workspaceId,
      `${WORKSPACE_ROUTE_SEGMENTS.roadmaps}/${normalizedRoadmapId}/${WORKSPACE_ROUTE_SEGMENTS.phases}/${normalizedPhaseId}/${WORKSPACE_ROUTE_SEGMENTS.quizzes}/${quizId}${editSuffix}`,
    );
  }

  return buildWorkspacePath(
    workspaceId,
    `${WORKSPACE_ROUTE_SEGMENTS.roadmaps}/${WORKSPACE_ROUTE_SEGMENTS.quizzes}/${quizId}${editSuffix}`,
  );
}

export function buildQuizAttemptPath(mode, quizId) {
  if (mode === "practice") {
    return `/${APP_ROUTE_SEGMENTS.quizzes}/practice/${quizId}`;
  }

  if (mode === "exam") {
    return `/${APP_ROUTE_SEGMENTS.quizzes}/exams/${quizId}`;
  }

  return null;
}

export function buildQuizResultPath(attemptId) {
  return `/${APP_ROUTE_SEGMENTS.quizzes}/results/${attemptId}`;
}

export function extractWorkspaceIdFromPath(path) {
  if (!path) return null;

  const match = String(path).match(/^\/workspaces\/(\d+)/);
  if (!match) return null;

  const parsedWorkspaceId = Number(match[1]);
  return Number.isInteger(parsedWorkspaceId) && parsedWorkspaceId > 0
    ? parsedWorkspaceId
    : null;
}

export function isWorkspaceRoadmapsPath(path) {
  return /\/workspaces\/\d+\/roadmaps(?:\/|$|\?)/.test(String(path || ""));
}

export function isWorkspaceQuizDetailPath(path) {
  return /\/workspaces\/\d+\/(?:quizzes(?:\/\d+)?|roadmaps\/(?:\d+\/phases\/\d+\/)?quizzes\/\d+)(?:\?|$)/.test(String(path || ""));
}

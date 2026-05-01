export const APP_ROUTE_SEGMENTS = {
  home: "home",
  payments: "payments",
  profiles: "profiles",
  plans: "plans",
  wallets: "wallets",
  feedbacks: "feedbacks",
  workspaces: "workspaces",
  groupWorkspaces: "group-workspaces",
  groups: "groups",
  quizzes: "quizzes",
};

export const WORKSPACE_ROUTE_SEGMENTS = {
  roadmaps: "roadmaps",
  phases: "phases",
  knowledges: "knowledges",
  quizzes: "quizzes",
  flashcards: "flashcards",
  mockTests: "mock-tests",
  postLearnings: "post-learnings",
};

function normalizeSubPath(subPath = "") {
  return String(subPath || "").replace(/^\/+/, "");
}

function buildAppPath(segment, subPath = "") {
  const normalizedSubPath = normalizeSubPath(subPath);
  const basePath = `/${segment}`;
  return normalizedSubPath ? `${basePath}/${normalizedSubPath}` : basePath;
}

export function withQueryParams(path, queryParams = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(queryParams || {}).forEach(([key, value]) => {
    if (value == null || value === "") return;
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export function buildPaymentsPath(subPath = "") {
  return buildAppPath(APP_ROUTE_SEGMENTS.payments, subPath);
}

export function buildPaymentCreditsPath() {
  return buildPaymentsPath("credits");
}

export function buildPaymentResultsPath(queryParams = null) {
  const basePath = buildPaymentsPath("results");
  return queryParams ? withQueryParams(basePath, queryParams) : basePath;
}

export function buildProfilesPath() {
  return buildAppPath(APP_ROUTE_SEGMENTS.profiles);
}

export function buildPlansPath() {
  return buildAppPath(APP_ROUTE_SEGMENTS.plans);
}

export function buildWalletsPath() {
  return buildAppPath(APP_ROUTE_SEGMENTS.wallets);
}

export function buildFeedbacksPath(subPath = "") {
  return buildAppPath(APP_ROUTE_SEGMENTS.feedbacks, subPath);
}

export function buildWorkspacePath(workspaceId, subPath = "") {
  return buildAppPath(`${APP_ROUTE_SEGMENTS.workspaces}/${workspaceId}`, subPath);
}

export function buildGroupWorkspacePath(workspaceId, subPath = "") {
  return buildAppPath(`${APP_ROUTE_SEGMENTS.groupWorkspaces}/${workspaceId}`, subPath);
}

export function buildGroupManagementPath(workspaceId) {
  return buildAppPath(`${APP_ROUTE_SEGMENTS.groups}/${workspaceId}/manage`);
}

export function buildGroupWorkspaceSectionPath(
  workspaceId,
  section = null,
  queryParams = {},
) {
  if (section === "roadmap") {
    return withQueryParams(
      buildGroupWorkspacePath(workspaceId, WORKSPACE_ROUTE_SEGMENTS.roadmaps),
      queryParams,
    );
  }

  return withQueryParams(
    buildGroupWorkspacePath(workspaceId),
    section ? { section, ...queryParams } : queryParams,
  );
}

export function buildGroupWorkspaceDetailPath(
  workspaceId,
  subPath = "",
  queryParams = {},
) {
  return withQueryParams(buildGroupWorkspacePath(workspaceId, subPath), queryParams);
}

export function extractWorkspaceSubPath(pathname, workspaceId) {
  if (!workspaceId || !pathname) return "";

  const prefix = buildWorkspacePath(workspaceId);
  if (!String(pathname).startsWith(prefix)) return "";

  return String(pathname).slice(prefix.length).replace(/^\/+/, "");
}

export function extractGroupWorkspaceSubPath(pathname, workspaceId) {
  if (!workspaceId || !pathname) return "";

  const prefix = buildGroupWorkspacePath(workspaceId);
  if (!String(pathname).startsWith(prefix)) return "";

  return String(pathname).slice(prefix.length).replace(/^\/+/, "");
}

export function resolveGroupWorkspaceSectionFromSubPath(subPath = "") {
  const normalizedSubPath = normalizeSubPath(subPath);
  if (!normalizedSubPath) return null;

  if (
    normalizedSubPath === WORKSPACE_ROUTE_SEGMENTS.roadmaps
    || normalizedSubPath.startsWith(`${WORKSPACE_ROUTE_SEGMENTS.roadmaps}/`)
  ) {
    return "roadmap";
  }

  return null;
}

export function buildGroupWorkspaceRoadmapPath(
  workspaceId,
  {
    roadmapId = null,
    phaseId = null,
    knowledgeId = null,
    quizId = null,
  } = {},
) {
  const basePath = buildGroupWorkspacePath(workspaceId, WORKSPACE_ROUTE_SEGMENTS.roadmaps);
  const normalizedRoadmapId = Number(roadmapId);
  const normalizedPhaseId = Number(phaseId);
  const normalizedKnowledgeId = Number(knowledgeId);
  const normalizedQuizId = Number(quizId);

  if (!Number.isInteger(normalizedRoadmapId) || normalizedRoadmapId <= 0) {
    return basePath;
  }

  let mappedPath = `${basePath}/${normalizedRoadmapId}`;

  if (Number.isInteger(normalizedPhaseId) && normalizedPhaseId > 0) {
    mappedPath += `/${WORKSPACE_ROUTE_SEGMENTS.phases}/${normalizedPhaseId}`;
    if (Number.isInteger(normalizedKnowledgeId) && normalizedKnowledgeId > 0) {
      mappedPath += `/${WORKSPACE_ROUTE_SEGMENTS.knowledges}/${normalizedKnowledgeId}`;
    }
  }

  if (Number.isInteger(normalizedQuizId) && normalizedQuizId > 0) {
    mappedPath += `/${WORKSPACE_ROUTE_SEGMENTS.quizzes}/${normalizedQuizId}`;
  }

  return mappedPath;
}

export function resolveGroupRoadmapPathParams(subPath = "") {
  const normalizedSubPath = normalizeSubPath(subPath);
  if (!normalizedSubPath) return { roadmapId: null, phaseId: null, knowledgeId: null, quizId: null };

  const parts = normalizedSubPath.split("/").filter(Boolean);
  if (parts[0] !== WORKSPACE_ROUTE_SEGMENTS.roadmaps) {
    return { roadmapId: null, phaseId: null, knowledgeId: null, quizId: null };
  }

  const readPositiveId = (value) => {
    const normalizedValue = Number(value);
    return Number.isInteger(normalizedValue) && normalizedValue > 0 ? normalizedValue : null;
  };

  const roadmapId = readPositiveId(parts[1]);
  if (!roadmapId) {
    return { roadmapId: null, phaseId: null, knowledgeId: null, quizId: null };
  }

  let phaseId = null;
  let knowledgeId = null;
  let quizId = null;
  let cursor = 2;

  while (cursor < parts.length) {
    const segment = parts[cursor];
    if (segment === WORKSPACE_ROUTE_SEGMENTS.phases) {
      phaseId = readPositiveId(parts[cursor + 1]);
      cursor += 2;
      continue;
    }
    if (segment === WORKSPACE_ROUTE_SEGMENTS.knowledges) {
      knowledgeId = readPositiveId(parts[cursor + 1]);
      cursor += 2;
      continue;
    }
    if (segment === WORKSPACE_ROUTE_SEGMENTS.quizzes) {
      quizId = readPositiveId(parts[cursor + 1]);
      cursor += 2;
      continue;
    }
    cursor += 1;
  }

  return {
    roadmapId,
    phaseId,
    knowledgeId,
    quizId,
  };
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

export function buildWorkspaceMockTestPath(workspaceId, mockTestId) {
  return buildWorkspacePath(
    workspaceId,
    `${WORKSPACE_ROUTE_SEGMENTS.mockTests}/${mockTestId}`,
  );
}

export function buildWorkspaceRoadmapQuizPath(
  workspaceId,
  {
    roadmapId = null,
    phaseId = null,
    knowledgeId = null,
    quizId,
    edit = false,
  } = {},
) {
  if (!quizId) return null;

  const normalizedRoadmapId = Number(roadmapId);
  const normalizedPhaseId = Number(phaseId);
  const normalizedKnowledgeId = Number(knowledgeId);
  const hasKnowledgeId = Number.isInteger(normalizedKnowledgeId) && normalizedKnowledgeId > 0;
  const editSuffix = edit ? "/edit" : "";

  if (
    Number.isInteger(normalizedRoadmapId) &&
    normalizedRoadmapId > 0 &&
    Number.isInteger(normalizedPhaseId) &&
    normalizedPhaseId > 0
  ) {
    const knowledgePart = hasKnowledgeId
      ? `/${WORKSPACE_ROUTE_SEGMENTS.knowledges}/${normalizedKnowledgeId}`
      : "";

    return buildWorkspacePath(
      workspaceId,
      `${WORKSPACE_ROUTE_SEGMENTS.roadmaps}/${normalizedRoadmapId}/${WORKSPACE_ROUTE_SEGMENTS.phases}/${normalizedPhaseId}${knowledgePart}/${WORKSPACE_ROUTE_SEGMENTS.quizzes}/${quizId}${editSuffix}`,
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

/**
 * MockTest v2 — dedicated section-by-section attempt page (separate from ExamQuizPage).
 * Mounted at /quizzes/mock-tests/{quizId}/exam.
 */
export function buildMockTestExamPath(quizId) {
  if (!quizId) return null;
  return `/${APP_ROUTE_SEGMENTS.quizzes}/${WORKSPACE_ROUTE_SEGMENTS.mockTests}/${quizId}/exam`;
}

export function buildQuizResultPath(attemptId) {
  return `/${APP_ROUTE_SEGMENTS.quizzes}/results/${attemptId}`;
}

export function extractWorkspaceIdFromPath(path) {
  if (!path) return null;

  const match = String(path).match(/^\/(?:workspaces|group-workspaces)\/(\d+)/);
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
  return /\/workspaces\/\d+\/(?:quizzes(?:\/\d+)?|roadmaps\/(?:\d+\/phases\/\d+(?:\/knowledges\/\d+)?\/)?quizzes\/\d+)(?:\?|$)/.test(String(path || ""));
}

export function isWorkspaceMockTestDetailPath(path) {
  return /\/workspaces\/\d+\/mock-tests\/\d+(?:\?|$)/.test(String(path || ""));
}

export function isGroupWorkspacePath(path) {
  return /\/group-workspaces\/\d+(?:\/|$|\?)/.test(String(path || ""));
}

function toPositiveInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function toPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
}

function normalizeStatus(status) {
  if (!status) return "PROCESSING";
  const upper = String(status).toUpperCase();
  if (upper === "START") return "PROCESSING";
  if (upper === "FAILED") return "ERROR";
  if (upper === "WARNED") return "WARN";
  if (upper === "REJECTED") return "REJECT";
  return upper;
}

function resolveTaskType(processingObject, data, payload) {
  return String(
    processingObject?.taskType
      || processingObject?.task_type
      || processingObject?.type
      || data?.taskType
      || data?.task_type
      || data?.type
      || payload?.taskType
      || payload?.task_type
      || payload?.type
      || ""
  ).toUpperCase();
}

function buildProcessingObject(payload) {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const source = payload?.processingObject && typeof payload.processingObject === "object"
    ? payload.processingObject
    : {};

  const taskType = resolveTaskType(source, data, payload);
  const roadmapId = toPositiveInt(source?.roadmapId ?? source?.roadmap_id ?? data?.roadmapId ?? data?.roadmap_id ?? payload?.roadmapId ?? payload?.roadmap_id);
  const workspaceId = toPositiveInt(source?.workspaceId ?? source?.workspace_id ?? data?.workspaceId ?? data?.workspace_id ?? payload?.workspaceId ?? payload?.workspace_id);
  const phaseId = toPositiveInt(source?.phaseId ?? source?.phase_id ?? data?.phaseId ?? data?.phase_id ?? payload?.phaseId ?? payload?.phase_id);
  const knowledgeId = toPositiveInt(source?.knowledgeId ?? source?.knowledge_id ?? data?.knowledgeId ?? data?.knowledge_id ?? payload?.knowledgeId ?? payload?.knowledge_id);
  const quizId = toPositiveInt(source?.quizId ?? source?.quiz_id ?? data?.quizId ?? data?.quiz_id ?? payload?.quizId ?? payload?.quiz_id);
  const materialId = toPositiveInt(source?.materialId ?? source?.material_id ?? data?.materialId ?? data?.material_id ?? payload?.materialId ?? payload?.material_id);

  return {
    ...(taskType ? { taskType } : {}),
    ...(workspaceId > 0 ? { workspaceId } : {}),
    ...(roadmapId > 0 ? { roadmapId } : {}),
    ...(phaseId > 0 ? { phaseId } : {}),
    ...(knowledgeId > 0 ? { knowledgeId } : {}),
    ...(quizId > 0 ? { quizId } : {}),
    ...(materialId > 0 ? { materialId } : {}),
  };
}

export function normalizeRuntimeTaskSignal(payload, options = {}) {
  const source = String(options?.source || "");
  const data = payload?.data && typeof payload.data === "object" ? payload.data : {};
  const processingObject = buildProcessingObject(payload || {});

  const taskId = String(
    payload?.websocketTaskId
      ?? payload?.websocket_task_id
      ?? payload?.taskId
      ?? payload?.task_id
      ?? data?.websocketTaskId
      ?? data?.websocket_task_id
      ?? data?.taskId
      ?? data?.task_id
      ?? ""
  ).trim();
  const status = normalizeStatus(payload?.status ?? payload?.final_status);
  const message = String(payload?.message ?? data?.message ?? "");
  const step = String(payload?.step ?? data?.step ?? "");
  const percent = toPercent(payload?.percent ?? payload?.progressPercent ?? data?.percent ?? data?.progressPercent ?? 0);

  const workspaceId = toPositiveInt(processingObject?.workspaceId);
  const roadmapId = toPositiveInt(processingObject?.roadmapId);
  const phaseId = toPositiveInt(processingObject?.phaseId);
  const knowledgeId = toPositiveInt(processingObject?.knowledgeId);
  const quizId = toPositiveInt(processingObject?.quizId);
  const materialId = toPositiveInt(processingObject?.materialId);
  const taskType = String(processingObject?.taskType || "").toUpperCase();

  const normalizedStatus = String(status || "").toUpperCase();
  const normalizedMessage = String(message || "").toUpperCase();
  const normalizedStep = String(step || "").toUpperCase();

  const hasValidPhaseId = phaseId > 0;
  const hasValidQuizId = quizId > 0;
  const isGenericStatus = normalizedStatus === "PROCESSING" || normalizedStatus === "START";

  const hasExplicitRoadmapPhaseSignal = normalizedStatus === "ROADMAP_PHASES_PROCESSING"
    || (isGenericStatus && taskType === "ROADMAP_PHASES");
  const hasGenericRoadmapPhaseSignal = normalizedStatus === "PROCESSING"
    && !hasValidQuizId
    && !hasValidPhaseId
    && (
      normalizedMessage.includes("PHASE")
      || normalizedMessage.includes("ROADMAP")
      || normalizedMessage.includes("NGU CANH PHASE")
      || normalizedMessage.includes("NGU CANH")
    );

  const isPreLearningByStatus = normalizedStatus.includes("PRE_LEARNING");
  const isPreLearningByTaskType = isGenericStatus
    && (taskType === "ROADMAP_PRE_LEARNING" || taskType === "PRE_LEARNING");
  const isPreLearningByMessage = isGenericStatus
    && (
      normalizedMessage.includes("PRE_LEARNING")
      || normalizedMessage.includes("PRE-LEARNING")
      || normalizedMessage.includes("PRE LEARNING")
    );
  const isPreLearningSignal = isPreLearningByStatus || isPreLearningByTaskType || isPreLearningByMessage;

  const isPhaseContentByStatus = normalizedStatus.includes("ROADMAP_PHASE_CONTENT");
  const isPhaseContentByTaskType = isGenericStatus
    && (taskType === "ROADMAP_PHASE_CONTENT" || taskType === "PHASE_CONTENT");
  const isPhaseContentSignal = isPhaseContentByStatus || isPhaseContentByTaskType;

  const isKnowledgeQuizByStatus = normalizedStatus.includes("KNOWLEDGE_QUIZ");
  const isKnowledgeQuizByTaskType = isGenericStatus
    && (taskType === "ROADMAP_KNOWLEDGE_QUIZ" || taskType === "KNOWLEDGE_QUIZ");
  const isKnowledgeQuizSignal = isKnowledgeQuizByStatus || isKnowledgeQuizByTaskType;

  const isKnowledgeSignal = normalizedStatus.includes("KNOWLEDGE") && !isKnowledgeQuizSignal;
  const isPostLearningSignal = normalizedStatus.includes("POST_LEARNING") || normalizedStep.includes("POST_LEARNING");
  const isQuizSignal = hasValidQuizId
    || (
      !normalizedStatus.startsWith("ROADMAP_")
      && (
        normalizedStatus.includes("QUIZ")
        || normalizedStep.includes("QUIZ")
        || normalizedMessage.includes("QUIZ")
      )
    );
  const isTaskStillProcessing = !(
    normalizedStatus.includes("COMPLETED")
    || normalizedStatus.includes("ERROR")
    || normalizedStatus.includes("FAILED")
    || normalizedStatus.includes("CANCEL")
  );

  return {
    source,
    taskId,
    websocketTaskId: taskId,
    status: normalizedStatus,
    message,
    step,
    percent,
    progressPercent: percent,
    processingObject,
    data,
    taskType,
    workspaceId,
    roadmapId,
    phaseId,
    knowledgeId,
    quizId,
    materialId,
    hasValidPhaseId,
    hasValidQuizId,
    isGenericStatus,
    hasExplicitRoadmapPhaseSignal,
    hasGenericRoadmapPhaseSignal,
    isPreLearningSignal,
    isPhaseContentSignal,
    isKnowledgeQuizSignal,
    isKnowledgeSignal,
    isPostLearningSignal,
    isQuizSignal,
    isTaskStillProcessing,
  };
}

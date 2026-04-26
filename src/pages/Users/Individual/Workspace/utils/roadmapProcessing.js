function hasItems(items) {
  return Array.isArray(items) && items.length > 0;
}

const IN_FLIGHT_QUIZ_STATUSES = new Set([
  "CREATING",
  "GENERATING",
  "IN_PROGRESS",
  "PENDING",
  "PROCESSING",
  "STARTED",
]);

export function isReadyRoadmapQuiz(quiz) {
  if (!quiz || typeof quiz !== "object") return false;
  const normalizedStatus = String(quiz?.status || "").toUpperCase();
  return !IN_FLIGHT_QUIZ_STATUSES.has(normalizedStatus);
}

export function hasReadyRoadmapQuiz(quizzes = []) {
  return Array.isArray(quizzes) && quizzes.some((quiz) => isReadyRoadmapQuiz(quiz));
}

function normalizePositiveIds(ids = []) {
  return Array.from(new Set((ids || [])
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)));
}

export function inferProcessingRoadmapGenerationIds(phases = [], skipPreLearningPhaseIds = []) {
  const skipPreLearningPhaseIdSet = new Set(normalizePositiveIds(skipPreLearningPhaseIds));

  return (Array.isArray(phases) ? phases : []).reduce((accumulator, phase) => {
    if (String(phase?.status || "").toUpperCase() !== "PROCESSING") {
      return accumulator;
    }

    const phaseId = Number(phase?.phaseId);
    if (!Number.isInteger(phaseId) || phaseId <= 0) {
      return accumulator;
    }

    const hasKnowledge = hasItems(phase?.knowledges);
    if (hasKnowledge) {
      return accumulator;
    }

    const hasPreLearning = hasReadyRoadmapQuiz(phase?.preLearningQuizzes);
    if (hasPreLearning || skipPreLearningPhaseIdSet.has(phaseId)) {
      accumulator.knowledge.push(phaseId);
      return accumulator;
    }

    accumulator.preLearning.push(phaseId);
    return accumulator;
  }, {
    knowledge: [],
    preLearning: [],
  });
}

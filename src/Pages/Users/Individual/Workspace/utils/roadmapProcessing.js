function hasItems(items) {
  return Array.isArray(items) && items.length > 0;
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

    const hasPreLearning = hasItems(phase?.preLearningQuizzes);
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

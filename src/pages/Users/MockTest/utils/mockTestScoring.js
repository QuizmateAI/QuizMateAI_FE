export const MOCK_TEST_QUESTION_TYPES = [
  { value: 'SINGLE_CHOICE', label: 'Single choice' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple choice' },
  { value: 'TRUE_FALSE', label: 'True / False' },
];

export const MOCK_TEST_QUESTION_TYPE_VALUES = MOCK_TEST_QUESTION_TYPES.map((item) => item.value);

export function roundScore(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

export function sumStructureQuantity(structure) {
  if (!Array.isArray(structure)) return 0;
  return structure.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
}

export function countLeafQuestions(sections) {
  if (!Array.isArray(sections)) return 0;
  return sections.reduce((total, section) => {
    const children = Array.isArray(section?.subConfigs) ? section.subConfigs : [];
    if (children.length > 0) return total + countLeafQuestions(children);
    return total + sumStructureQuantity(section?.structure);
  }, 0);
}

/**
 * Count leaf questions of a single section (or sub-section), recursing into subConfigs.
 */
export function countSectionLeafQuestions(section) {
  if (!section || typeof section !== 'object') return 0;
  const children = Array.isArray(section?.subConfigs) ? section.subConfigs : [];
  if (children.length > 0) return countLeafQuestions(children);
  return sumStructureQuantity(section?.structure);
}

export function normalizeMockTestScoring(scoring, totalQuestions = 0) {
  const total = Number(scoring?.totalPoints);
  const fallbackTotal = Number(totalQuestions) > 0 ? 100 : 100;
  const totalPoints = Number.isFinite(total) && total > 0 ? roundScore(total) : fallbackTotal;
  const pass = Number(scoring?.passingScore);
  const passingScore = Number.isFinite(pass) && pass >= 0
    ? Math.min(roundScore(pass), totalPoints)
    : roundScore(totalPoints * 0.5);
  const passingPercent = totalPoints > 0
    ? roundScore((passingScore / totalPoints) * 100)
    : 0;
  return {
    totalPoints,
    passingScore,
    passingPercent,
    mode: scoring?.mode || 'RAW',
    perQuestionPoints: scoring?.perQuestionPoints || 'uniform',
    sectionScoring: Array.isArray(scoring?.sectionScoring)
      ? scoring.sectionScoring.map((entry) => ({
        sectionIndex: Number.isFinite(entry?.sectionIndex) ? Number(entry.sectionIndex) : null,
        name: entry?.name || '',
        weight: Number.isFinite(entry?.weight) ? Number(entry.weight) : null,
        points: Number.isFinite(entry?.points) ? roundScore(entry.points) : null,
        percent: Number.isFinite(entry?.percent) ? roundScore(entry.percent) : null,
        passingScore: Number.isFinite(entry?.passingScore) ? roundScore(entry.passingScore) : null,
      }))
      : [],
  };
}

export function scorePerQuestion(scoring, sections) {
  const totalQuestions = countLeafQuestions(sections);
  if (totalQuestions <= 0) return 0;
  return roundScore((Number(scoring?.totalPoints) || 0) / totalQuestions);
}

/**
 * Build per-section scoring breakdown given current sections + scoring.
 *
 * Strategy:
 *   1. If scoring.sectionScoring contains entries with valid points, use them as authoritative
 *      (AI templates already include real-exam standard weights). Recompute percent from totalPoints.
 *   2. Otherwise, allocate proportionally to leaf-question count of each section, so per-section
 *      points = (sectionLeafCount / totalLeafCount) * totalPoints.
 *   3. Per-question points = sectionPoints / sectionLeafCount when leafCount > 0.
 */
export function deriveSectionScoring(sections, scoring) {
  const list = Array.isArray(sections) ? sections : [];
  const normalized = normalizeMockTestScoring(scoring);
  const totalPoints = Number(normalized.totalPoints) || 0;
  const totalLeaf = countLeafQuestions(list);

  return list.map((section, idx) => {
    const leafCount = countSectionLeafQuestions(section);
    const aiEntry = normalized.sectionScoring.find(
      (entry) => Number(entry?.sectionIndex) === idx,
    );
    let sectionPoints;
    let sectionPercent;
    if (aiEntry && Number.isFinite(aiEntry.points)) {
      sectionPoints = roundScore(aiEntry.points);
      sectionPercent = totalPoints > 0
        ? roundScore((sectionPoints / totalPoints) * 100)
        : 0;
    } else if (totalLeaf > 0 && leafCount > 0) {
      sectionPoints = roundScore((leafCount / totalLeaf) * totalPoints);
      sectionPercent = roundScore((leafCount / totalLeaf) * 100);
    } else {
      sectionPoints = 0;
      sectionPercent = 0;
    }
    const perQuestionPoints = leafCount > 0 ? roundScore(sectionPoints / leafCount) : 0;
    const sectionPassing = aiEntry && Number.isFinite(aiEntry.passingScore)
      ? roundScore(aiEntry.passingScore)
      : null;
    const sectionPassingPercent = sectionPassing != null && sectionPoints > 0
      ? roundScore((sectionPassing / sectionPoints) * 100)
      : null;
    return {
      sectionIndex: idx,
      name: section?.name || `Section ${idx + 1}`,
      leafCount,
      points: sectionPoints,
      percent: sectionPercent,
      perQuestionPoints,
      passingScore: sectionPassing,
      passingPercent: sectionPassingPercent,
    };
  });
}

/**
 * Build payload-shape sectionScoring array (suitable for POST /generate or
 * POST /my-templates) from sections + current totalPoints.
 *
 * Honors explicit overrides in scoring.sectionScoring; otherwise allocates by leaf count.
 */
export function buildSectionScoringPayload(sections, scoring) {
  const breakdown = deriveSectionScoring(sections, scoring);
  return breakdown.map((entry) => ({
    sectionIndex: entry.sectionIndex,
    name: entry.name,
    weight: entry.percent / 100,
    points: entry.points,
    percent: entry.percent,
    passingScore: entry.passingScore,
  }));
}

/**
 * Adjust section points and propagate change up to totalPoints.
 *
 * - When user changes one section's points, we KEEP other sections unchanged
 *   and recompute totalPoints = sum of all section points.
 * - passingScore percent stays the same; absolute is recomputed on the new total.
 */
export function applySectionPointChange(scoring, sections, sectionIndex, nextPoints) {
  const breakdown = deriveSectionScoring(sections, scoring);
  const safeNext = Math.max(0, roundScore(Number(nextPoints) || 0));
  const updated = breakdown.map((entry, idx) => (
    idx === sectionIndex ? { ...entry, points: safeNext } : entry
  ));
  const newTotal = updated.reduce((sum, entry) => sum + (Number(entry.points) || 0), 0);
  const safeTotal = newTotal > 0 ? roundScore(newTotal) : 1;
  const oldPassPercent = Number(scoring?.passingPercent) || (
    Number(scoring?.totalPoints) > 0
      ? (Number(scoring?.passingScore) / Number(scoring?.totalPoints)) * 100
      : 50
  );
  const newPassing = roundScore((oldPassPercent / 100) * safeTotal);
  return {
    ...normalizeMockTestScoring({ ...scoring, totalPoints: safeTotal, passingScore: newPassing }),
    sectionScoring: updated.map((entry) => ({
      sectionIndex: entry.sectionIndex,
      name: entry.name,
      weight: safeTotal > 0 ? roundScore(entry.points / safeTotal, 4) : 0,
      points: entry.points,
      percent: safeTotal > 0 ? roundScore((entry.points / safeTotal) * 100) : 0,
      passingScore: entry.passingScore,
    })),
  };
}

/**
 * Adjust totalPoints, then redistribute section points proportionally so the
 * structure stays consistent.
 */
export function applyTotalPointsChange(scoring, sections, nextTotal) {
  const breakdown = deriveSectionScoring(sections, scoring);
  const safeNextTotal = Math.max(1, roundScore(Number(nextTotal) || 1));
  const oldTotal = breakdown.reduce((sum, entry) => sum + (Number(entry.points) || 0), 0);
  const factor = oldTotal > 0 ? safeNextTotal / oldTotal : 1;
  const oldPassPercent = Number(scoring?.passingPercent) || (
    Number(scoring?.totalPoints) > 0
      ? (Number(scoring?.passingScore) / Number(scoring?.totalPoints)) * 100
      : 50
  );
  const newPassing = roundScore((oldPassPercent / 100) * safeNextTotal);
  return {
    ...normalizeMockTestScoring({ ...scoring, totalPoints: safeNextTotal, passingScore: newPassing }),
    sectionScoring: breakdown.map((entry) => {
      const scaled = roundScore(entry.points * factor);
      return {
        sectionIndex: entry.sectionIndex,
        name: entry.name,
        weight: safeNextTotal > 0 ? roundScore(scaled / safeNextTotal, 4) : 0,
        points: scaled,
        percent: safeNextTotal > 0 ? roundScore((scaled / safeNextTotal) * 100) : 0,
        passingScore: entry.passingScore != null
          ? roundScore(entry.passingScore * factor)
          : null,
      };
    }),
  };
}

/**
 * Update passingScore (absolute), clamping to [0, totalPoints]. Recomputes percent.
 */
export function applyPassingScoreChange(scoring, nextPassing) {
  const total = Number(scoring?.totalPoints) || 0;
  const safe = Math.min(total, Math.max(0, roundScore(Number(nextPassing) || 0)));
  return normalizeMockTestScoring({
    ...scoring,
    passingScore: safe,
  });
}

/**
 * Update passingScore via percent input. Percent stored separately so user can
 * type 50% and have absolute compute as totalPoints * 0.5.
 */
export function applyPassingPercentChange(scoring, nextPercent) {
  const total = Number(scoring?.totalPoints) || 0;
  const safePct = Math.min(100, Math.max(0, Number(nextPercent) || 0));
  const passing = roundScore((safePct / 100) * total);
  return normalizeMockTestScoring({
    ...scoring,
    passingScore: passing,
  });
}

export function buildMockTestCustomScoring(scoring, sections) {
  const normalized = normalizeMockTestScoring(scoring);
  const sectionScoring = Array.isArray(sections) && sections.length > 0
    ? buildSectionScoringPayload(sections, normalized)
    : normalized.sectionScoring;
  return {
    totalPoints: normalized.totalPoints,
    passingScore: normalized.passingScore,
    passingPercent: normalized.passingPercent,
    mode: normalized.mode,
    perQuestionPoints: normalized.perQuestionPoints,
    sectionScoring,
  };
}

import {
  buildSectionScoringPayload,
  roundScore,
  scorePerQuestion,
} from './mockTestScoring';

export function aggregateStructure(structure, bloomMap) {
  const items = Array.isArray(structure) ? structure : [];
  const numQuestions = items.reduce((s, it) => s + (Number(it?.quantity) || 0), 0);

  const diffCounts = { EASY: 0, MEDIUM: 0, HARD: 0 };
  const bloomCounts = {};
  items.forEach((it) => {
    const q = Number(it?.quantity) || 0;
    if (q <= 0) return;
    if (it?.difficulty && diffCounts[it.difficulty] != null) diffCounts[it.difficulty] += q;
    if (it?.bloomSkill) bloomCounts[it.bloomSkill] = (bloomCounts[it.bloomSkill] || 0) + q;
  });

  let easyRatio = 0;
  let mediumRatio = 0;
  let hardRatio = 0;
  if (numQuestions > 0) {
    easyRatio = Math.round((diffCounts.EASY / numQuestions) * 100);
    mediumRatio = Math.round((diffCounts.MEDIUM / numQuestions) * 100);
    hardRatio = Math.round((diffCounts.HARD / numQuestions) * 100);
    const sum = easyRatio + mediumRatio + hardRatio;
    if (sum !== 100) {
      const delta = 100 - sum;
      if (diffCounts.MEDIUM >= diffCounts.EASY && diffCounts.MEDIUM >= diffCounts.HARD) mediumRatio += delta;
      else if (diffCounts.EASY >= diffCounts.HARD) easyRatio += delta;
      else hardRatio += delta;
    }
  }

  const bloomSkills = Object.entries(bloomCounts)
    .map(([skill, count]) => {
      const id = bloomMap?.[skill];
      if (!Number.isFinite(id) || count <= 0) return null;
      return { bloomId: id, ratio: count };
    })
    .filter(Boolean);

  return { numQuestions, easyRatio, mediumRatio, hardRatio, questionTypes: [], bloomSkills };
}

export function sectionsToServerDTOs(sections, bloomMap, scoring) {
  if (!Array.isArray(sections)) return [];
  const sectionScoring = buildSectionScoringPayload(sections, scoring);
  const pointPerQuestionFallback = scorePerQuestion(scoring, sections);
  return sections.map((sec, sectionIdx) => {
    const sectionEntry = sectionScoring.find((entry) => entry.sectionIndex === sectionIdx);
    const sectionPoints = Number(sectionEntry?.points);
    const hasSubs = sec.subConfigs && sec.subConfigs.length > 0;
    if (hasSubs) {
      return {
        name: sec.name,
        description: sec.description,
        numQuestions: null,
        easyRatio: 0,
        mediumRatio: 0,
        hardRatio: 0,
        questionUnit: false,
        bloomUnit: true,
        timerMode: true,
        requiresSharedContext: false,
        questionTypes: [],
        bloomSkills: [],
        subConfigs: sectionsToServerDTOs(sec.subConfigs, bloomMap, scoring),
      };
    }
    const agg = aggregateStructure(sec.structure, bloomMap);
    const pointPerQuestion = (Number.isFinite(sectionPoints) && agg.numQuestions > 0)
      ? roundScore(sectionPoints / agg.numQuestions)
      : pointPerQuestionFallback;
    const structureItems = (Array.isArray(sec.structure) ? sec.structure : [])
      .map((item) => {
        const quantity = Number(item?.quantity) || 0;
        if (quantity <= 0) return null;
        return {
          difficulty: item.difficulty || 'MEDIUM',
          questionType: item.questionType || 'SINGLE_CHOICE',
          bloomSkill: item.bloomSkill || 'UNDERSTAND',
          quantity,
          scorePerQuestion: pointPerQuestion,
        };
      })
      .filter(Boolean);
    return {
      name: sec.name,
      description: sec.description,
      numQuestions: agg.numQuestions,
      easyRatio: agg.easyRatio,
      mediumRatio: agg.mediumRatio,
      hardRatio: agg.hardRatio,
      questionUnit: false,
      bloomUnit: true,
      timerMode: true,
      requiresSharedContext: sec.requiresSharedContext === true,
      questionTypes: agg.questionTypes,
      bloomSkills: agg.bloomSkills,
      maxScore: Number.isFinite(sectionPoints) ? sectionPoints : roundScore(agg.numQuestions * pointPerQuestion),
      structureItems,
      subConfigs: [],
    };
  });
}

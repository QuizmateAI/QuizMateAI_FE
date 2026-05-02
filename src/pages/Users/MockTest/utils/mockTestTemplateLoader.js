import {
  MOCK_TEST_QUESTION_TYPE_VALUES,
  buildSectionScoringPayload,
  countLeafQuestions,
  normalizeMockTestScoring,
  roundScore,
} from './mockTestScoring';

const ALLOWED_BLOOM = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE'];
const ALLOWED_DIFFICULTY = ['EASY', 'MEDIUM', 'HARD'];

function sanitize(value, allowed, fallback) {
  if (typeof value !== 'string') return fallback;
  const upper = value.trim().toUpperCase();
  return allowed.includes(upper) ? upper : fallback;
}

/**
 * Convert v2 template (structure with ratio-based sections + items) to v1
 * sections shape (concrete quantity counts) used by the form editor.
 *
 * Identical algorithm to useMockTestStructureSuggestion.templateStructureToV1Sections,
 * but exported as a reusable util so other entry points (saved templates panel,
 * "Use this template" actions) can prefill the form without going through the hook.
 */
export function templateStructureToV1ForForm(template) {
  if (!template || typeof template !== 'object') return [];
  const structure = template.structure;
  if (!structure || !Array.isArray(structure.sections) || structure.sections.length === 0) {
    return [];
  }
  const total = Number.isFinite(template.totalQuestion) && template.totalQuestion > 0
    ? template.totalQuestion
    : 0;
  if (total <= 0) return [];

  const sectionCount = structure.sections.length;
  const sectionSizes = new Array(sectionCount);
  let allocated = 0;
  structure.sections.forEach((section, index) => {
    const ratio = Number.isFinite(section.questionRatio)
      ? section.questionRatio
      : 1.0 / sectionCount;
    sectionSizes[index] = Math.floor(total * ratio);
    allocated += sectionSizes[index];
  });
  let remainder = total - allocated;
  for (let i = 0; remainder > 0 && i < sectionCount; i += 1) {
    sectionSizes[i] += 1;
    remainder -= 1;
  }

  return structure.sections.map((section, index) => {
    const size = sectionSizes[index];
    const items = Array.isArray(section.items) ? section.items : [];
    const itemCount = items.length;
    const itemSizes = new Array(itemCount);
    let allocItems = 0;
    items.forEach((item, j) => {
      const ratio = Number.isFinite(item.quantityRatio)
        ? item.quantityRatio
        : 1.0 / Math.max(itemCount, 1);
      itemSizes[j] = Math.floor(size * ratio);
      allocItems += itemSizes[j];
    });
    let remItems = size - allocItems;
    for (let j = 0; remItems > 0 && j < itemCount; j += 1) {
      itemSizes[j] += 1;
      remItems -= 1;
    }

    const sanitizedItems = items
      .map((item, j) => {
        const quantity = itemSizes[j];
        if (quantity <= 0) return null;
        return {
          difficulty: sanitize(item.difficulty, ALLOWED_DIFFICULTY, 'MEDIUM'),
          bloomSkill: sanitize(item.bloomSkill, ALLOWED_BLOOM, 'UNDERSTAND'),
          questionType: sanitize(item.questionType, MOCK_TEST_QUESTION_TYPE_VALUES, 'SINGLE_CHOICE'),
          quantity,
        };
      })
      .filter(Boolean);

    const structureRows = sanitizedItems.length > 0
      ? sanitizedItems
      : (size > 0
        ? [{
          difficulty: 'MEDIUM',
          bloomSkill: 'UNDERSTAND',
          questionType: 'SINGLE_CHOICE',
          quantity: size,
        }]
        : []);

    return {
      name: typeof section.name === 'string' ? section.name.trim() : `Section ${index + 1}`,
      description: typeof section.description === 'string' ? section.description.trim() : '',
      numQuestions: size,
      structure: structureRows,
      subConfigs: [],
      requiresSharedContext: section.sharedContextRequired === true,
    };
  });
}

function normalizeLanguage(value, fallback = 'vi') {
  const normalized = String(value || '').trim().toLowerCase();
  return /^[a-z]{2,3}$/.test(normalized) ? normalized : fallback;
}

/**
 * Convert v1 form sections (concrete quantities) → v2 ratio-based structure jsonb
 * suitable for POST /api/mocktest/my-templates.
 *
 * @param {object} input
 * @param {Array} input.sections — current form sections
 * @param {object} input.scoring — current form scoring
 * @param {number} input.totalQuestions
 * @param {number} input.duration
 * @param {string} input.examName
 * @param {string} input.examLanguage
 * @param {string} input.aiTopNotice
 * @param {object|null} input.matchedTemplate — derived-from template (optional)
 */
export function buildSavedTemplatePayload({
  sections,
  scoring,
  totalQuestions,
  duration,
  examName,
  examLanguage,
  aiTopNotice,
  matchedTemplate,
}) {
  const safeSections = Array.isArray(sections) ? sections : [];
  const normalizedScoring = normalizeMockTestScoring(scoring, totalQuestions);
  const sectionScoring = buildSectionScoringPayload(safeSections, normalizedScoring);
  const totalLeaf = countLeafQuestions(safeSections);
  const v2Sections = safeSections.map((sec) => {
    const sectionLeaf = sec.subConfigs && sec.subConfigs.length > 0
      ? countLeafQuestions(sec.subConfigs)
      : (Array.isArray(sec.structure)
        ? sec.structure.reduce((s, it) => s + (Number(it?.quantity) || 0), 0)
        : 0);
    const items = Array.isArray(sec.structure) ? sec.structure : [];
    const itemTotal = items.reduce((s, it) => s + (Number(it?.quantity) || 0), 0);
    return {
      name: sec.name || '',
      description: sec.description || '',
      questionRatio: totalLeaf > 0
        ? roundScore(sectionLeaf / totalLeaf, 4)
        : (1 / Math.max(safeSections.length, 1)),
      sharedContextRequired: sec.requiresSharedContext === true,
      items: items.map((it) => ({
        difficulty: it.difficulty || 'MEDIUM',
        questionType: it.questionType || 'SINGLE_CHOICE',
        bloomSkill: it.bloomSkill || 'UNDERSTAND',
        quantityRatio: itemTotal > 0
          ? roundScore((Number(it.quantity) || 0) / itemTotal, 4)
          : (1 / Math.max(items.length, 1)),
      })),
    };
  });
  const trimmedExamName = String(examName || '').trim();
  return {
    displayName: matchedTemplate?.displayName || trimmedExamName || 'Mock test custom',
    examType: matchedTemplate?.examType || 'CUSTOM',
    contentLanguage: normalizeLanguage(
      examLanguage || matchedTemplate?.contentLanguage,
      'vi',
    ),
    description: aiTopNotice || (trimmedExamName ? `Saved from form for: ${trimmedExamName}` : 'Saved mocktest template'),
    totalQuestion: Number(totalQuestions) || 1,
    durationMinutes: Number(duration) || 60,
    structure: { sections: v2Sections },
    scoring: {
      totalPoints: normalizedScoring.totalPoints,
      passingScore: normalizedScoring.passingScore,
      passingPercent: normalizedScoring.passingPercent,
      mode: normalizedScoring.mode,
      perQuestionPoints: 'uniform',
      sectionScoring,
    },
    derivedFromTemplateId: matchedTemplate?.mockTestTemplateId || null,
  };
}

/**
 * Build payload for saving a *suggested* AI template — we copy the v2 jsonb
 * directly without re-deriving from form state, because the AI already provided
 * canonical structure + scoring with section weights.
 */
export function buildSavedTemplatePayloadFromSuggestion(option) {
  if (!option) return null;
  const meta = option?.v2Template || {};
  return {
    displayName: meta.displayName || option.displayName || 'AI template',
    examType: meta.examType || 'CUSTOM',
    contentLanguage: normalizeLanguage(meta.contentLanguage || option.examLanguage, 'vi'),
    description: option.description || meta.description || `AI suggested: ${meta.displayName || option.displayName}`,
    totalQuestion: Number(meta.totalQuestion || option.totalQuestion || 30),
    durationMinutes: Number(meta.durationMinutes || option.durationMinutes || 60),
    structure: meta.structure || { sections: [] },
    scoring: meta.scoring || { totalPoints: 100, passingScore: 50 },
    derivedFromTemplateId: meta.mockTestTemplateId || null,
  };
}

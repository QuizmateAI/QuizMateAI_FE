import { useCallback, useRef, useState } from 'react';
import { getMockTestTemplate, recommendMockTestTemplate } from '@/api/MockTestAPI';
import {
  MOCK_TEST_QUESTION_TYPE_VALUES,
  normalizeMockTestScoring,
} from '../utils/mockTestScoring';

const DEFAULT_MOCK_TEST_QUESTION_TYPE = 'SINGLE_CHOICE';
const ALLOWED_BLOOM_SKILLS = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE'];
const ALLOWED_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

function sanitizeEnum(raw, allowed, fallback) {
  if (typeof raw !== 'string') return fallback;
  const upper = raw.trim().toUpperCase();
  return allowed.includes(upper) ? upper : fallback;
}

/**
 * Convert v2 template.structure (ratio-based) → v1 sections shape (concrete counts).
 * Round-trip with backend is acceptable — BE re-distributes via floor + remainder.
 *
 * v2 input shape:
 *   { sections: [{ name, description, questionRatio, sharedContextRequired,
 *                  items: [{ difficulty, bloomSkill, questionType, quantityRatio }] }] }
 * v1 output shape:
 *   { description, examLanguage, sections: [{ name, description, numQuestions,
 *     structure: [{difficulty, bloomSkill, quantity, questionType}], subConfigs, requiresSharedContext }] }
 */
function templateStructureToV1Sections(template, totalQuestion) {
  const structure = template?.structure;
  if (!structure || !Array.isArray(structure.sections) || structure.sections.length === 0) {
    return [];
  }
  const total = Number.isFinite(totalQuestion) && totalQuestion > 0
    ? totalQuestion
    : (template.totalQuestion || 0);

  // Distribute total questions across sections by questionRatio (floor + remainder).
  const sectionCount = structure.sections.length;
  const sectionSizes = new Array(sectionCount);
  let allocated = 0;
  structure.sections.forEach((s, i) => {
    const ratio = Number.isFinite(s.questionRatio) ? s.questionRatio : (1.0 / sectionCount);
    sectionSizes[i] = Math.floor(total * ratio);
    allocated += sectionSizes[i];
  });
  let remainder = total - allocated;
  for (let i = 0; remainder > 0 && i < sectionCount; i += 1) {
    sectionSizes[i] += 1;
    remainder -= 1;
  }

  return structure.sections.map((s, i) => {
    const size = sectionSizes[i];
    const items = Array.isArray(s.items) ? s.items : [];
    // Distribute size across items by quantityRatio.
    const itemCount = items.length;
    const itemSizes = new Array(itemCount);
    let allocItems = 0;
    items.forEach((item, j) => {
      const r = Number.isFinite(item.quantityRatio) ? item.quantityRatio : (1.0 / Math.max(itemCount, 1));
      itemSizes[j] = Math.floor(size * r);
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
          difficulty: sanitizeEnum(item.difficulty, ALLOWED_DIFFICULTIES, 'MEDIUM'),
          bloomSkill: sanitizeEnum(item.bloomSkill, ALLOWED_BLOOM_SKILLS, 'UNDERSTAND'),
          questionType: sanitizeEnum(
            item.questionType,
            MOCK_TEST_QUESTION_TYPE_VALUES,
            DEFAULT_MOCK_TEST_QUESTION_TYPE,
          ),
          quantity,
        };
      })
      .filter(Boolean);

    // Fallback: if section has no items, give it a single MEDIUM/UNDERSTAND row.
    const structureRows = sanitizedItems.length > 0
      ? sanitizedItems
      : (size > 0
        ? [{
          difficulty: 'MEDIUM',
          bloomSkill: 'UNDERSTAND',
          questionType: DEFAULT_MOCK_TEST_QUESTION_TYPE,
          quantity: size,
        }]
        : []);

    return {
      name: typeof s.name === 'string' ? s.name.trim() : `Section ${i + 1}`,
      description: typeof s.description === 'string' ? s.description.trim() : '',
      numQuestions: size,
      structure: structureRows,
      subConfigs: [],
      requiresSharedContext: s.sharedContextRequired === true,
    };
  });
}

function unwrapApiData(response) {
  return response?.data?.data || response?.data || response || {};
}

function extractSourceMaterialIds(scoringJsonb) {
  const list = scoringJsonb?.sourceMaterialIds;
  if (!Array.isArray(list)) return [];
  return list
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function templateToSuggestion(template, recommendation, recData, totalQuestion) {
  const sections = templateStructureToV1Sections(template, totalQuestion);
  // Preserve sectionScoring from AI/system template — normalizeMockTestScoring carries it through.
  const scoring = normalizeMockTestScoring(template.scoring, template.totalQuestion);
  const sourceMaterialIds = extractSourceMaterialIds(template.scoring);
  return {
    description: typeof template.description === 'string' ? template.description.trim() : '',
    examLanguage: (template.contentLanguage || recData.resolvedLanguage || '').toLowerCase(),
    sections,
    totalQuestion: Number.isFinite(template.totalQuestion) ? template.totalQuestion : null,
    durationMinutes: Number.isFinite(template.durationMinutes) ? template.durationMinutes : null,
    scoring,
    sourceMaterialIds,
    v2Template: {
      mockTestTemplateId: template.mockTestTemplateId,
      code: template.code,
      displayName: template.displayName,
      examType: template.examType,
      contentLanguage: template.contentLanguage,
      description: template.description,
      totalQuestion: template.totalQuestion,
      durationMinutes: template.durationMinutes,
      structure: template.structure,
      scoring: template.scoring,
      source: template.source,
      visibility: template.visibility,
      ownerUserId: template.ownerUserId,
      sourceMaterialIds,
      confidence: recommendation?.confidence,
      strategy: recData.strategy,
    },
  };
}

/**
 * Hook gọi v2 recommend-template + getTemplate để gợi ý cấu trúc mocktest.
 *
 * Output v1-compatible shape: { description, examLanguage, sections: [...] }
 * Caller form không cần đổi — hook đã adapter sẵn.
 *
 * Migration note: thay thế POST /api/ai/mocktest:suggest-structure (deprecated)
 * bằng POST /api/mocktest/recommend-template + GET /api/mocktest/templates/{id}.
 */
export function useMockTestStructureSuggestion() {
  const [suggestion, setSuggestion] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastPayloadRef = useRef(null);

  const requestSuggestion = useCallback(async (payload) => {
    setIsLoading(true);
    setError(null);
    lastPayloadRef.current = payload;
    try {
      const examName = (payload?.examName || '').trim();
      const workspaceId = payload?.workspaceId;
      const materialIds = Array.isArray(payload?.materialIds) ? payload.materialIds : [];
      const contentLanguageSource =
        payload?.contentLanguage || (materialIds.length === 0 ? payload?.outputLanguage : '');
      const contentLanguage = String(contentLanguageSource || '').trim().toLowerCase() || undefined;
      const totalQuestion = Number.isFinite(payload?.totalQuestion) ? payload.totalQuestion : 0;

      // Step 1: ask v2 recommender for matching templates.
      // limit=4: balance between du dien va toc do.
      // - Material RAG path: 4 template ~30-45s thay vi 6 templates ~60-90s.
      // - DB hit / Spring AI path: 4 da du, BE van co the tra it hon neu khong tim duoc.
      const recRes = await recommendMockTestTemplate({
        examName,
        contentLanguage,
        workspaceId,
        materialIds,
        limit: 4,
      });
      const recData = unwrapApiData(recRes);
      const recommendations = Array.isArray(recData.recommendations) ? recData.recommendations : [];
      const strategy = recData.strategy || 'UNKNOWN';

      // Empty recommendations = lỗi setup (templates chưa seed) hoặc BE chưa restart sau JPQL fix.
      // KHONG fallthrough sang STRUCTURE step rỗng — throw để form hiển thị diagnostic message.
      if (recommendations.length === 0) {
        if (strategy === 'NO_TEMPLATES_AVAILABLE') {
          throw new Error(
            'Hệ thống chưa có template mocktest nào. Admin cần chạy seed SQL '
            + '(scripts/migrations/2026_04_30_mocktest_v2_seed_templates.sql) trước khi sử dụng.',
          );
        }
        throw new Error(
          `Không tìm thấy template phù hợp với "${examName}". `
          + 'Hãy thử tên kỳ thi khác (vd: IELTS, TOEIC, JLPT N5, VSTEP B2, THPT) '
          + 'hoặc kiểm tra BE đã restart sau khi fix JPQL chưa.',
        );
      }

      // Step 2: fetch full templates (structure + scoring jsonb), not just top-1.
      const hydrated = (await Promise.all(
        recommendations
          .filter((rec) => rec?.mockTestTemplateId)
          .map(async (rec) => {
            const tplRes = await getMockTestTemplate(rec.mockTestTemplateId);
            const template = unwrapApiData(tplRes);
            if (!template?.structure?.sections || template.structure.sections.length === 0) {
              return null;
            }
            return templateToSuggestion(template, rec, recData, totalQuestion);
          }),
      )).filter(Boolean);

      if (hydrated.length === 0) {
        throw new Error('Recommend response trả về template không hợp lệ hoặc structure rỗng.');
      }

      const sanitized = hydrated[0];
      setSuggestions(hydrated);
      setSuggestion(sanitized);
      return sanitized;
    } catch (e) {
      setError(e);
      setSuggestion(null);
      setSuggestions([]);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const regenerate = useCallback(async () => {
    if (!lastPayloadRef.current) {
      throw new Error('Chưa có payload trước đó để sinh lại');
    }
    return requestSuggestion(lastPayloadRef.current);
  }, [requestSuggestion]);

  const reset = useCallback(() => {
    setSuggestion(null);
    setSuggestions([]);
    setError(null);
    setIsLoading(false);
    lastPayloadRef.current = null;
  }, []);

  const selectSuggestion = useCallback((templateIdOrSuggestion) => {
    const next = typeof templateIdOrSuggestion === 'object'
      ? templateIdOrSuggestion
      : suggestions.find((item) => item?.v2Template?.mockTestTemplateId === templateIdOrSuggestion);
    if (!next) return null;
    setSuggestion(next);
    return next;
  }, [suggestions]);

  return {
    suggestion,
    suggestions,
    isLoading,
    error,
    requestSuggestion,
    regenerate,
    selectSuggestion,
    reset,
  };
}

export const MOCK_TEST_QUESTION_TYPES = MOCK_TEST_QUESTION_TYPE_VALUES;
export const MOCK_TEST_BLOOM_SKILLS = ALLOWED_BLOOM_SKILLS;
export const MOCK_TEST_DIFFICULTIES = ALLOWED_DIFFICULTIES;

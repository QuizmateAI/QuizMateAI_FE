import { useCallback, useRef, useState } from 'react';
import { suggestMockTestStructure } from '@/api/AIAPI';

const DEFAULT_MOCK_TEST_QUESTION_TYPE = 'SINGLE_CHOICE';
const ALLOWED_BLOOM_SKILLS = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE'];
const ALLOWED_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

function sanitizeEnum(raw, allowed, fallback) {
  if (typeof raw !== 'string') return fallback;
  const upper = raw.trim().toUpperCase();
  return allowed.includes(upper) ? upper : fallback;
}

function sanitizeStructureItem(rawItem) {
  if (!rawItem || typeof rawItem !== 'object') return null;
  const quantity = Number.isFinite(rawItem.quantity)
    ? Math.max(0, Math.round(rawItem.quantity))
    : 0;
  if (quantity <= 0) return null;
  return {
    difficulty: sanitizeEnum(rawItem.difficulty, ALLOWED_DIFFICULTIES, 'MEDIUM'),
    questionType: DEFAULT_MOCK_TEST_QUESTION_TYPE,
    bloomSkill: sanitizeEnum(rawItem.bloomSkill, ALLOWED_BLOOM_SKILLS, 'UNDERSTAND'),
    quantity,
  };
}

function sanitizeSection(rawSection) {
  if (!rawSection || typeof rawSection !== 'object') return null;

  const subConfigs = Array.isArray(rawSection.subConfigs)
    ? rawSection.subConfigs.map(sanitizeSection).filter(Boolean)
    : [];
  const hasSubs = subConfigs.length > 0;

  const rawStructure = Array.isArray(rawSection.structure)
    ? rawSection.structure.map(sanitizeStructureItem).filter(Boolean)
    : [];
  const structure = hasSubs ? [] : rawStructure;
  const structureTotal = structure.reduce((s, it) => s + (Number(it.quantity) || 0), 0);

  let numQuestions;
  if (hasSubs) {
    numQuestions = 0;
  } else if (Number.isFinite(rawSection.numQuestions)) {
    numQuestions = Math.max(0, Math.round(rawSection.numQuestions));
  } else {
    numQuestions = structureTotal;
  }
  // Ở leaf, đồng bộ numQuestions với tổng structure nếu AI trả lệch.
  if (!hasSubs && structure.length > 0) {
    numQuestions = structureTotal;
  }
  const sectionType = typeof rawSection.sectionType === 'string'
    ? rawSection.sectionType.trim().toUpperCase()
    : '';
  const requiresSharedContext = !hasSubs && (
    rawSection.requiresSharedContext === true
    || String(rawSection.requiresSharedContext).trim().toLowerCase() === 'true'
  );

  return {
    ...(sectionType ? { sectionType } : {}),
    name: typeof rawSection.name === 'string' ? rawSection.name.trim() : '',
    description: typeof rawSection.description === 'string' ? rawSection.description.trim() : '',
    numQuestions,
    structure,
    subConfigs,
    requiresSharedContext,
  };
}

function sanitizeResponse(raw) {
  if (!raw || typeof raw !== 'object') {
    return { description: '', examLanguage: '', sections: [] };
  }
  const description = typeof raw.description === 'string' ? raw.description.trim() : '';
  const examLanguage = typeof raw.examLanguage === 'string'
    ? raw.examLanguage.trim().toLowerCase()
    : '';
  const sections = Array.isArray(raw.sections)
    ? raw.sections.map(sanitizeSection).filter(Boolean)
    : [];
  return { description, examLanguage, sections };
}

/**
 * Hook gọi AI gợi ý cấu trúc mock test (bước 1 của flow tạo).
 *
 * Trả về `suggestion = { description, examLanguage, sections }` đã sanitize.
 * Mỗi leaf section có `structure: [{difficulty, bloomSkill, quantity}]`;
 * `questionType` luôn được normalize về SINGLE_CHOICE để khớp rule backend,
 * wrapper section chỉ có `subConfigs`, `structure = []`, `numQuestions = 0`.
 */
export function useMockTestStructureSuggestion() {
  const [suggestion, setSuggestion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastPayloadRef = useRef(null);

  const requestSuggestion = useCallback(async (payload) => {
    setIsLoading(true);
    setError(null);
    lastPayloadRef.current = payload;
    try {
      const response = await suggestMockTestStructure(payload);
      const sanitized = sanitizeResponse(response);
      setSuggestion(sanitized);
      return sanitized;
    } catch (e) {
      setError(e);
      setSuggestion(null);
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
    setError(null);
    setIsLoading(false);
    lastPayloadRef.current = null;
  }, []);

  return {
    suggestion,
    isLoading,
    error,
    requestSuggestion,
    regenerate,
    reset,
  };
}

export const MOCK_TEST_QUESTION_TYPES = [DEFAULT_MOCK_TEST_QUESTION_TYPE];
export const MOCK_TEST_BLOOM_SKILLS = ALLOWED_BLOOM_SKILLS;
export const MOCK_TEST_DIFFICULTIES = ALLOWED_DIFFICULTIES;

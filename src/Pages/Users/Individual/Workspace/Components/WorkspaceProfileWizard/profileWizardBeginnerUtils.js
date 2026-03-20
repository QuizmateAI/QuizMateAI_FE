function normalizeComparableText(value) {
  return (value ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const ABSOLUTE_BEGINNER_PATTERNS = [
  'moi bat dau',
  'moi hoc',
  'chua biet gi',
  'chua biet',
  'chua hoc',
  'tu dau',
  'beginner',
  'new to',
  'from scratch',
  'starting from zero',
  'zero base',
];

const JAPANESE_SCOPE_PATTERNS = [
  'tieng nhat',
  'japanese',
  'jlpt',
  'hiragana',
  'katakana',
  'kanji',
];

export function isAbsoluteBeginnerLevel(value) {
  const normalized = normalizeComparableText(value);
  if (!normalized) return false;

  return ABSOLUTE_BEGINNER_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function isJapaneseLearningScope(...values) {
  const normalized = normalizeComparableText(values.filter(Boolean).join(' '));
  if (!normalized) return false;

  return JAPANESE_SCOPE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function getBeginnerScopeLabel(values, fallback = 'kiến thức này') {
  const knowledge = values?.knowledgeInput?.trim();
  const domain = values?.inferredDomain?.trim();

  return knowledge || domain || fallback;
}

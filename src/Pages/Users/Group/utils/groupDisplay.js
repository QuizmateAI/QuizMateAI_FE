const LEARNING_MODE_LABELS = {
  STUDY_NEW: {
    vi: 'Học kiến thức mới',
    en: 'Study new topics',
  },
  REVIEW: {
    vi: 'Ôn tập theo nhóm',
    en: 'Group review',
  },
  MOCK_TEST: {
    vi: 'Thi thử cùng nhóm',
    en: 'Group mock test',
  },
};

const ROLE_LABELS = {
  LEADER: {
    vi: 'Trưởng nhóm',
    en: 'Leader',
  },
  CONTRIBUTOR: {
    vi: 'Cộng tác viên',
    en: 'Contributor',
  },
  MEMBER: {
    vi: 'Thành viên',
    en: 'Member',
  },
};

function normalizeLocale(lang) {
  return lang === 'en' ? 'en' : 'vi';
}

export function formatGroupLearningMode(value, lang = 'vi') {
  if (!value) return '';
  const key = String(value).trim().toUpperCase();
  const locale = normalizeLocale(lang);
  return LEARNING_MODE_LABELS[key]?.[locale] || value;
}

export function formatGroupRole(value, lang = 'vi') {
  if (!value) return '';
  const key = String(value).trim().toUpperCase();
  const locale = normalizeLocale(lang);
  return ROLE_LABELS[key]?.[locale] || value;
}

// Helpers cho việc nhận diện và hiển thị tên plan của group workspace.
// Tách ra utils để dễ test và tái sử dụng giữa các UI surface (header,
// upgrade modal, billing).

import i18nInstance from '@/i18n';

export function normalizePlanNameToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}

export function canonicalPlanNameToken(value) {
  const normalizedValue = normalizePlanNameToken(value);
  if (normalizedValue === 'GROUPBASE') {
    return 'GROUP_BASE';
  }
  return normalizedValue;
}

export function normalizePlanLookupText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_-]+/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferGroupPlanTokenFromDisplayName(planDisplayName) {
  const normalized = normalizePlanLookupText(planDisplayName);
  if (!normalized) return '';

  if (
    normalized.includes('group base')
    || normalized.includes('goi nhom co ban')
    || normalized === 'goi co ban'
  ) {
    return 'GROUP_BASE';
  }

  return '';
}

export const GROUP_PLAN_NAME_FALLBACKS = {
  GROUP_BASE: {
    en: 'Group Base',
    get vi() {
      return i18nInstance.t('groupWorkspacePage.planNames.groupBase', 'Group Base', { lng: 'vi' });
    },
  },
};

export function resolveLocalizedGroupPlanName({ planDisplayName, planCode, t, lang = 'vi' }) {
  const normalizedLang = String(lang || 'vi').toLowerCase().startsWith('en') ? 'en' : 'vi';
  const normalizedPlanCode = canonicalPlanNameToken(planCode);
  const normalizedDisplayName = canonicalPlanNameToken(planDisplayName);
  const normalizedDisplayNameCompact = normalizedDisplayName.replace(/_/g, '');
  const inferredDisplayToken = inferGroupPlanTokenFromDisplayName(planDisplayName);

  const keyCandidates = [
    inferredDisplayToken,
    normalizedPlanCode,
    normalizedDisplayName,
    canonicalPlanNameToken(normalizedDisplayNameCompact),
  ].filter(Boolean).filter((candidate, index, candidates) => candidates.indexOf(candidate) === index);

  for (const candidate of keyCandidates) {
    const localized = String(
      t(`groupWorkspace.header.planNames.${candidate}`, { defaultValue: '' })
    ).trim();

    if (localized) {
      return localized;
    }
  }

  for (const candidate of keyCandidates) {
    const fallbackLabel = GROUP_PLAN_NAME_FALLBACKS?.[candidate]?.[normalizedLang] || GROUP_PLAN_NAME_FALLBACKS?.[candidate]?.en;
    if (fallbackLabel) return fallbackLabel;
  }

  return String(planDisplayName || planCode || '').trim();
}

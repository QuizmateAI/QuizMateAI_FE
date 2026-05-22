export const APP_SUPPORTED_LANGUAGES = Object.freeze(['vi', 'en', 'ja']);

export function getBaseAppLanguage(language) {
  const raw = String(language || 'vi').trim().toLowerCase();
  const base = raw.split('-')[0] || 'vi';
  return APP_SUPPORTED_LANGUAGES.includes(base) ? base : 'vi';
}

export function cycleAppLanguage(language) {
  const base = getBaseAppLanguage(language);
  const idx = APP_SUPPORTED_LANGUAGES.indexOf(base);
  return APP_SUPPORTED_LANGUAGES[(idx + 1) % APP_SUPPORTED_LANGUAGES.length];
}

export function appLanguageShortLabel(language) {
  return getBaseAppLanguage(language).toUpperCase();
}

export function getAppNumberLocale(language) {
  const base = getBaseAppLanguage(language);
  if (base === 'vi') return 'vi-VN';
  if (base === 'ja') return 'ja-JP';
  return 'en-US';
}

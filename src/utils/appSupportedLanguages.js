/** Base language codes with full folders under `src/i18n/locales`. */
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

/** Uppercase short label for UI badges (VI, EN, JA). */
export function appLanguageShortLabel(language) {
  return getBaseAppLanguage(language).toUpperCase();
}

/** Locale for `Intl` / number formatting. */
export function getAppNumberLocale(language) {
  const base = getBaseAppLanguage(language);
  if (base === 'vi') return 'vi-VN';
  if (base === 'ja') return 'ja-JP';
  return 'en-US';
}

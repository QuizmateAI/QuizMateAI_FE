export const SUPPORTED_LANGUAGES = ['vi', 'en', 'ja'];

export const LANGUAGE_LABELS = {
  vi: 'VI',
  en: 'EN',
  ja: 'JA',
};

export const LANGUAGE_DISPLAY_NAMES = {
  vi: 'Tiếng Việt',
  en: 'English',
  ja: '日本語',
};

export const LOCALE_BCP47 = {
  vi: 'vi-VN',
  en: 'en-US',
  ja: 'ja-JP',
};

export function getNextLanguage(current) {
  const normalized = normalizeLanguageCode(current);
  const index = SUPPORTED_LANGUAGES.indexOf(normalized);
  if (index === -1) return SUPPORTED_LANGUAGES[0];
  return SUPPORTED_LANGUAGES[(index + 1) % SUPPORTED_LANGUAGES.length];
}

export function normalizeLanguageCode(language) {
  const value = String(language || '').trim().toLowerCase();
  if (!value) return SUPPORTED_LANGUAGES[0];
  if (value.startsWith('ja')) return 'ja';
  if (value.startsWith('en')) return 'en';
  if (value.startsWith('vi')) return 'vi';
  return SUPPORTED_LANGUAGES.includes(value) ? value : SUPPORTED_LANGUAGES[0];
}

export function getLanguageShortLabel(language) {
  return LANGUAGE_LABELS[normalizeLanguageCode(language)] ?? LANGUAGE_LABELS.vi;
}

export function getLanguageDisplayName(language) {
  return LANGUAGE_DISPLAY_NAMES[normalizeLanguageCode(language)] ?? LANGUAGE_DISPLAY_NAMES.vi;
}

export function getBcp47Locale(language) {
  return LOCALE_BCP47[normalizeLanguageCode(language)] ?? LOCALE_BCP47.vi;
}

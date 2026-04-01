import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const DEFAULT_LANGUAGE = 'vi';

const localeLoaders = {
  en: () => import('./locales/en.json'),
  vi: () => import('./locales/vi.json'),
};

const loadedLanguages = new Set();
const loadedTranslations = {};

function normalizeLanguage(language) {
  const normalized = String(language || DEFAULT_LANGUAGE).trim().toLowerCase();
  return localeLoaders[normalized] ? normalized : DEFAULT_LANGUAGE;
}

function getSavedLanguage() {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }

  return normalizeLanguage(window.localStorage.getItem('app_language'));
}

function syncDocumentLanguage(language) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = normalizeLanguage(language);
}

async function loadLanguageResources(language) {
  const normalizedLanguage = normalizeLanguage(language);

  if (loadedLanguages.has(normalizedLanguage)) {
    return normalizedLanguage;
  }

  const localeModule = await localeLoaders[normalizedLanguage]();
  const translation = localeModule.default ?? localeModule;

  loadedTranslations[normalizedLanguage] = translation;

  if (i18n.isInitialized) {
    i18n.addResourceBundle(normalizedLanguage, 'translation', translation, true, true);
  }

  loadedLanguages.add(normalizedLanguage);

  return normalizedLanguage;
}

const initialLanguage = getSavedLanguage();
syncDocumentLanguage(initialLanguage);

export const i18nReady = (async () => {
  const normalizedInitialLanguage = await loadLanguageResources(initialLanguage);

  await i18n
    .use(initReactI18next)
    .init({
      lng: normalizedInitialLanguage,
      fallbackLng: false,
      defaultNS: 'translation',
      ns: ['translation'],
      resources: {
        [normalizedInitialLanguage]: {
          translation: loadedTranslations[normalizedInitialLanguage],
        },
      },
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });

  const originalChangeLanguage = i18n.changeLanguage.bind(i18n);
  i18n.changeLanguage = async (language, ...args) => {
    const normalizedLanguage = await loadLanguageResources(language);
    return originalChangeLanguage(normalizedLanguage, ...args);
  };

  i18n.on('languageChanged', (language) => {
    const normalizedLanguage = normalizeLanguage(language);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('app_language', normalizedLanguage);
    }

    syncDocumentLanguage(normalizedLanguage);
  });
})();

await i18nReady;

export async function preloadLanguage(language) {
  return loadLanguageResources(language);
}

export default i18n;

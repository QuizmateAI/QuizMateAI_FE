import i18n from 'i18next';
import { updateUserPreferredLanguage } from '@/api/ProfilePreferencesAPI';
import { hasAccessToken } from '@/utils/tokenStorage';

const DEFAULT_LANGUAGE = 'vi';
const I18N_NAMESPACES = ['common', 'auth', 'home', 'workspace', 'group', 'admin'];

const localeNamespaceLoaders = import.meta.glob('./locales/*/*.json');
const loadedTranslations = {};
const loadedLanguageNamespaces = new Map();
const namespaceLoadPromises = new Map();

const routeNamespaceRules = [
  {
    matches: (pathname) => pathname === '/',
    namespaces: ['common', 'home'],
  },
  {
    matches: (pathname) => pathname === '/login' || pathname === '/register' || pathname === '/forgot-password',
    namespaces: ['common', 'auth'],
  },
  {
    matches: (pathname) => pathname === '/home'
      || pathname.startsWith('/plans')
      || pathname.startsWith('/wallets')
      || pathname.startsWith('/profiles')
      || pathname.startsWith('/payments')
      || pathname.startsWith('/feedbacks'),
    namespaces: ['common', 'home'],
  },
  {
    matches: (pathname) => pathname.startsWith('/workspaces') || pathname.startsWith('/quizzes'),
    namespaces: ['common', 'workspace'],
  },
  {
    matches: (pathname) => pathname.startsWith('/group-workspaces'),
    namespaces: ['common', 'home', 'workspace', 'group'],
  },
  {
    matches: (pathname) => pathname.startsWith('/groups'),
    namespaces: ['common', 'home', 'group'],
  },
  {
    matches: (pathname) => pathname.startsWith('/admin') || pathname.startsWith('/super-admin'),
    namespaces: ['common', 'admin'],
  },
];

function normalizeLanguage(language) {
  const normalized = String(language || DEFAULT_LANGUAGE).trim().toLowerCase();
  return localeNamespaceLoaders[`./locales/${normalized}/common.json`] ? normalized : DEFAULT_LANGUAGE;
}

function normalizePathname(pathname) {
  const normalized = String(pathname || '/').trim();

  if (!normalized) return '/';
  if (normalized.startsWith('/')) return normalized;

  return `/${normalized}`;
}

function getCurrentPathname() {
  if (typeof window === 'undefined') {
    return '/';
  }

  return normalizePathname(window.location?.pathname);
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

function ensureLanguageState(language) {
  const normalizedLanguage = normalizeLanguage(language);

  if (!loadedTranslations[normalizedLanguage]) {
    loadedTranslations[normalizedLanguage] = {};
  }

  if (!loadedLanguageNamespaces.has(normalizedLanguage)) {
    loadedLanguageNamespaces.set(normalizedLanguage, new Set());
  }

  return loadedLanguageNamespaces.get(normalizedLanguage);
}

function mergeTranslationResources(target, source) {
  Object.entries(source || {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nextTarget = target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])
        ? target[key]
        : {};
      target[key] = mergeTranslationResources(nextTarget, value);
      return;
    }

    target[key] = value;
  });

  return target;
}

function getLocaleLoader(language, namespace) {
  return localeNamespaceLoaders[`./locales/${language}/${namespace}.json`];
}

function getUniqueNamespaces(namespaces = []) {
  return [...new Set(namespaces.filter(Boolean))];
}

async function loadNamespaceResources(language, namespace) {
  const normalizedLanguage = normalizeLanguage(language);
  const normalizedNamespace = String(namespace || '').trim().toLowerCase();

  if (!I18N_NAMESPACES.includes(normalizedNamespace)) {
    throw new Error(`Unsupported i18n namespace: ${namespace}`);
  }

  const loadedNamespaces = ensureLanguageState(normalizedLanguage);
  if (loadedNamespaces.has(normalizedNamespace)) {
    return normalizedNamespace;
  }

  const cacheKey = `${normalizedLanguage}:${normalizedNamespace}`;
  if (namespaceLoadPromises.has(cacheKey)) {
    return namespaceLoadPromises.get(cacheKey);
  }

  const loader = getLocaleLoader(normalizedLanguage, normalizedNamespace);
  if (!loader) {
    throw new Error(`Missing locale namespace loader for ${normalizedLanguage}/${normalizedNamespace}`);
  }

  const promise = loader()
    .then((localeModule) => {
      const translation = localeModule.default ?? localeModule;

      mergeTranslationResources(loadedTranslations[normalizedLanguage], translation);

      if (i18n.isInitialized) {
        i18n.addResourceBundle(normalizedLanguage, 'translation', translation, true, true);
      }

      loadedNamespaces.add(normalizedNamespace);
      return normalizedNamespace;
    })
    .finally(() => {
      namespaceLoadPromises.delete(cacheKey);
    });

  namespaceLoadPromises.set(cacheKey, promise);
  return promise;
}

async function loadNamespacesForLanguage(language, namespaces) {
  const normalizedLanguage = normalizeLanguage(language);
  const requestedNamespaces = getUniqueNamespaces(namespaces);

  await Promise.all(requestedNamespaces.map((namespace) => loadNamespaceResources(normalizedLanguage, namespace)));

  return normalizedLanguage;
}

function areNamespacesLoaded(language, namespaces) {
  const normalizedLanguage = normalizeLanguage(language);
  const loadedNamespaces = loadedLanguageNamespaces.get(normalizedLanguage);

  if (!loadedNamespaces) {
    return false;
  }

  return getUniqueNamespaces(namespaces).every((namespace) => loadedNamespaces.has(namespace));
}

export function getRouteNamespaces(pathname) {
  const normalizedPathname = normalizePathname(pathname);

  for (const rule of routeNamespaceRules) {
    if (rule.matches(normalizedPathname)) {
      return rule.namespaces;
    }
  }

  return ['common'];
}

export async function preloadNamespaces(namespaces, language = i18n.language ?? getSavedLanguage()) {
  return loadNamespacesForLanguage(language, namespaces);
}

export async function preloadRouteNamespaces(pathname, language = i18n.language ?? getSavedLanguage()) {
  return loadNamespacesForLanguage(language, getRouteNamespaces(pathname || getCurrentPathname()));
}

export function hasRouteNamespacesLoaded(pathname, language = i18n.language ?? getSavedLanguage()) {
  return areNamespacesLoaded(language, getRouteNamespaces(pathname || getCurrentPathname()));
}

const initialLanguage = getSavedLanguage();
syncDocumentLanguage(initialLanguage);

export const i18nReady = (async () => {
  const initialPathname = getCurrentPathname();
  const normalizedInitialLanguage = await preloadRouteNamespaces(initialPathname, initialLanguage);
  const reactI18nextModule = await import('react-i18next').catch(() => null);
  let initReactI18nextPlugin = null;

  try {
    initReactI18nextPlugin = reactI18nextModule?.initReactI18next ?? null;
  } catch {
    initReactI18nextPlugin = null;
  }

  const reactI18nextPlugin = initReactI18nextPlugin ?? {
    type: '3rdParty',
    init() {},
  };

  await i18n
    .use(reactI18nextPlugin)
    .init({
      lng: normalizedInitialLanguage,
      fallbackLng: false,
      defaultNS: 'translation',
      ns: ['translation'],
      resources: {
        [normalizedInitialLanguage]: {
          translation: loadedTranslations[normalizedInitialLanguage] ?? {},
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
    const normalizedLanguage = await preloadRouteNamespaces(getCurrentPathname(), language);
    return originalChangeLanguage(normalizedLanguage, ...args);
  };

  i18n.on('languageChanged', (language) => {
    const normalizedLanguage = normalizeLanguage(language);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem('app_language', normalizedLanguage);
    }

    syncDocumentLanguage(normalizedLanguage);

    // Persist lên BE nếu user đã đăng nhập.
    if (typeof window !== 'undefined' && hasAccessToken()) {
      void updateUserPreferredLanguage(normalizedLanguage);
    }
  });
})();

export async function preloadLanguage(language) {
  return loadNamespacesForLanguage(language, I18N_NAMESPACES);
}

export default i18n;

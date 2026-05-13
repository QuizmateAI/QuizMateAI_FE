import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { APP_SUPPORTED_LANGUAGES, getBaseAppLanguage } from '@/utils/appSupportedLanguages';

const SITE_NAME = 'Quizmate AI';
const DEFAULT_IMAGE = '/logo-light.webp';
const DEFAULT_LANGUAGE = 'vi';

// Open Graph dùng dạng underscore (`vi_VN`), khác BCP 47 dùng dấu gạch.
const OG_LOCALES = {
  vi: 'vi_VN',
  en: 'en_US',
  ja: 'ja_JP',
};

function getSiteUrl() {
  if (import.meta.env.VITE_SITE_URL) {
    return import.meta.env.VITE_SITE_URL;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return '';
}

function upsertMeta(attribute, key, content) {
  if (typeof document === 'undefined') return;

  let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function upsertCanonical(url) {
  if (typeof document === 'undefined') return;

  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'canonical');
    document.head.appendChild(element);
  }

  element.setAttribute('href', url);
}

function upsertHreflang(lang, url) {
  if (typeof document === 'undefined') return;

  let element = document.head.querySelector(`link[rel="alternate"][hreflang="${lang}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', 'alternate');
    element.setAttribute('hreflang', lang);
    document.head.appendChild(element);
  }

  element.setAttribute('href', url);
}

function clearHreflang() {
  if (typeof document === 'undefined') return;
  document.head
    .querySelectorAll('link[rel="alternate"][hreflang]')
    .forEach((element) => element.remove());
}

function replaceOgLocaleAlternates(currentLang) {
  if (typeof document === 'undefined') return;

  document.head
    .querySelectorAll('meta[property="og:locale:alternate"]')
    .forEach((element) => element.remove());

  APP_SUPPORTED_LANGUAGES.forEach((lang) => {
    if (lang === currentLang) return;
    const ogLocale = OG_LOCALES[lang];
    if (!ogLocale) return;
    const element = document.createElement('meta');
    element.setAttribute('property', 'og:locale:alternate');
    element.setAttribute('content', ogLocale);
    document.head.appendChild(element);
  });
}

/**
 * Build URL cho 1 ngôn ngữ cụ thể:
 * - Ngôn ngữ mặc định (vi) → URL trần (không kèm `?lang=`)
 * - Ngôn ngữ khác → đính kèm `?lang=<code>`
 *
 * Quy ước này giúp canonical mỗi ngôn ngữ tự trỏ về chính nó, tránh việc
 * Google gom các biến thể `?lang=` về 1 URL duy nhất.
 */
function buildLanguageUrl(canonicalPath, siteUrl, language) {
  const url = new URL(canonicalPath || '/', siteUrl);
  if (language !== DEFAULT_LANGUAGE) {
    url.searchParams.set('lang', language);
  }
  return url.toString();
}

function buildRouteMeta(pathname, language) {
  const lang = APP_SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;
  const localized = {
    en: {
      defaultTitle: SITE_NAME,
      defaultDescription: 'Create quizzes, flashcards, and roadmaps faster with an AI learning workspace built for focused study.',
      landingTitle: SITE_NAME,
      landingDescription: 'Turn materials into quizzes, flashcards, and study roadmaps with an AI workspace built for modern learners.',
      loginTitle: SITE_NAME,
      loginDescription: 'Access your QuizMate AI workspace and continue studying with AI-powered tools.',
      registerTitle: SITE_NAME,
      registerDescription: 'Create a QuizMate AI account to start learning with quizzes, flashcards, and personalized roadmaps.',
      forgotPasswordTitle: SITE_NAME,
      forgotPasswordDescription: 'Recover access to your QuizMate AI account and return to your learning workspace.',
    },
    vi: {
      defaultTitle: SITE_NAME,
      defaultDescription: 'Tao quiz, flashcard va roadmap nhanh hon voi khong gian hoc tap duoc ho tro boi AI.',
      landingTitle: SITE_NAME,
      landingDescription: 'Bien tai lieu thanh quiz, flashcard va roadmap hoc tap voi khong gian hoc AI danh cho nguoi hoc hien dai.',
      loginTitle: SITE_NAME,
      loginDescription: 'Dang nhap vao QuizMate AI de tiep tuc hoc tap voi quiz, flashcard va roadmap duoc AI ho tro.',
      registerTitle: SITE_NAME,
      registerDescription: 'Tao tai khoan QuizMate AI de bat dau hoc voi quiz, flashcard va roadmap ca nhan hoa.',
      forgotPasswordTitle: SITE_NAME,
      forgotPasswordDescription: 'Khoi phuc truy cap vao tai khoan QuizMate AI va quay lai khong gian hoc tap cua ban.',
    },
    ja: {
      defaultTitle: SITE_NAME,
      defaultDescription: 'AIで学習に集中できるワークスペース。クイズ・フラッシュカード・学習ロードマップを素早く作成。',
      landingTitle: SITE_NAME,
      landingDescription: '教材をクイズ・フラッシュカード・学習ロードマップに変換。現代の学習者のためのAI学習ワークスペース。',
      loginTitle: SITE_NAME,
      loginDescription: 'QuizMate AIワークスペースにログインし、AI支援ツールで学習を続けましょう。',
      registerTitle: SITE_NAME,
      registerDescription: 'QuizMate AIアカウントを作成し、クイズ・フラッシュカード・パーソナライズされた学習ロードマップで学び始めましょう。',
      forgotPasswordTitle: SITE_NAME,
      forgotPasswordDescription: 'QuizMate AIアカウントへのアクセスを復旧し、学習ワークスペースに戻りましょう。',
    },
  }[lang];

  const authenticatedPrefixes = [
    '/admin',
    '/super-admin',
    '/home',
    '/plans',
    '/wallets',
    '/profiles',
    '/workspaces',
    '/group-workspaces',
    '/groups',
    '/quizzes',
    '/payments',
    '/feedbacks',
    '/accept-invite',
  ];

  if (pathname === '/') {
    return {
      title: localized.landingTitle,
      description: localized.landingDescription,
      canonicalPath: '/',
      robots: 'index,follow',
    };
  }

  if (pathname === '/login') {
    return {
      title: localized.loginTitle,
      description: localized.loginDescription,
      canonicalPath: '/login',
      robots: 'noindex,nofollow',
    };
  }

  if (pathname === '/register') {
    return {
      title: localized.registerTitle,
      description: localized.registerDescription,
      canonicalPath: '/register',
      robots: 'noindex,nofollow',
    };
  }

  if (pathname === '/forgot-password') {
    return {
      title: localized.forgotPasswordTitle,
      description: localized.forgotPasswordDescription,
      canonicalPath: '/forgot-password',
      robots: 'noindex,nofollow',
    };
  }

  if (authenticatedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return {
      title: SITE_NAME,
      description: localized.defaultDescription,
      canonicalPath: pathname,
      robots: 'noindex,nofollow',
    };
  }

  return {
    title: localized.defaultTitle,
    description: localized.defaultDescription,
    canonicalPath: pathname,
    robots: 'index,follow',
  };
}

export default function RouteMetaManager() {
  const location = useLocation();
  const { i18n } = useTranslation();

  useEffect(() => {
    const language = getBaseAppLanguage(i18n.language);
    const meta = buildRouteMeta(location.pathname, language);
    const siteUrl = getSiteUrl();
    const canonicalPath = meta.canonicalPath || location.pathname || '/';
    // Canonical mỗi ngôn ngữ trỏ về chính nó (xem buildLanguageUrl) — Google
    // cần điều này để cluster hreflang validate.
    const canonicalUrl = buildLanguageUrl(canonicalPath, siteUrl, language);
    const imageUrl = new URL(DEFAULT_IMAGE, siteUrl).toString();

    document.title = meta.title;
    upsertCanonical(canonicalUrl);
    upsertMeta('name', 'description', meta.description);
    upsertMeta('name', 'robots', meta.robots);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:title', meta.title);
    upsertMeta('property', 'og:description', meta.description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:locale', OG_LOCALES[language] ?? OG_LOCALES[DEFAULT_LANGUAGE]);
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', meta.title);
    upsertMeta('name', 'twitter:description', meta.description);
    upsertMeta('name', 'twitter:image', imageUrl);

    // Hreflang chỉ emit trên trang indexable. Trang noindex thì Google không
    // index nên hreflang vô nghĩa; đồng thời clear để tránh tag rớt lại từ
    // navigation trước (ví dụ từ "/" sang "/login").
    if (meta.robots === 'index,follow') {
      APP_SUPPORTED_LANGUAGES.forEach((lang) => {
        upsertHreflang(lang, buildLanguageUrl(canonicalPath, siteUrl, lang));
      });
      // x-default = bản mặc định (vi) cho user/crawler không match locale nào.
      upsertHreflang('x-default', buildLanguageUrl(canonicalPath, siteUrl, DEFAULT_LANGUAGE));
    } else {
      clearHreflang();
    }

    replaceOgLocaleAlternates(language);
  }, [i18n.language, location.pathname]);

  return null;
}

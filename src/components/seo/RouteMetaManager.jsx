import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const SITE_NAME = 'Quizmate AI';
const DEFAULT_IMAGE = '/logo-light.webp';

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

function buildRouteMeta(pathname, language) {
  const lang = language === 'en' ? 'en' : 'vi';
  const localized = {
    en: {
      defaultTitle: SITE_NAME,
      defaultDescription: 'Create quizzes, flashcards, and roadmaps faster with an AI learning workspace built for focused study.',
      landingTitle: SITE_NAME,
      landingDescription: 'Turn materials into quizzes, flashcards, and study roadmaps with an AI workspace built for modern learners.',
      pricingTitle: SITE_NAME,
      pricingDescription: 'Understand QuizMate AI credit usage, pricing logic, and quick estimation examples before you start.',
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
      pricingTitle: SITE_NAME,
      pricingDescription: 'Hieu cach tinh credit, chi phi va cac vi du uoc tinh nhanh truoc khi ban su dung QuizMate AI.',
      loginTitle: SITE_NAME,
      loginDescription: 'Dang nhap vao QuizMate AI de tiep tuc hoc tap voi quiz, flashcard va roadmap duoc AI ho tro.',
      registerTitle: SITE_NAME,
      registerDescription: 'Tao tai khoan QuizMate AI de bat dau hoc voi quiz, flashcard va roadmap ca nhan hoa.',
      forgotPasswordTitle: SITE_NAME,
      forgotPasswordDescription: 'Khoi phuc truy cap vao tai khoan QuizMate AI va quay lai khong gian hoc tap cua ban.',
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

  if (pathname === '/pricing') {
    return {
      title: localized.pricingTitle,
      description: localized.pricingDescription,
      canonicalPath: '/pricing',
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
    const language = i18n.language?.startsWith('en') ? 'en' : 'vi';
    const meta = buildRouteMeta(location.pathname, language);
    const siteUrl = getSiteUrl();
    const canonicalUrl = new URL(meta.canonicalPath || location.pathname || '/', siteUrl).toString();
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
    upsertMeta('property', 'og:locale', language === 'en' ? 'en_US' : 'vi_VN');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', meta.title);
    upsertMeta('name', 'twitter:description', meta.description);
    upsertMeta('name', 'twitter:image', imageUrl);
  }, [i18n.language, location.pathname]);

  return null;
}

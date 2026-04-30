import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  FileWarning,
  Home,
  ChevronRight,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { fetchPublicPolicyBySlug } from '@/api/PolicyAPI';
import PolicyHeader from './components/PolicyHeader';
import PolicyTOC from './components/PolicyTOC';
import PolicyMarkdown, { extractHeadings } from '@/lib/policyMarkdown';
import Footer from '@/pages/LandingPage/components/Footer';

const ACCENT_GRADIENT_HERO = {
  indigo: 'from-indigo-500 via-blue-500 to-violet-500',
  emerald: 'from-emerald-500 via-teal-500 to-cyan-500',
  amber: 'from-amber-500 via-orange-500 to-rose-500',
  violet: 'from-violet-500 via-fuchsia-500 to-pink-500',
  rose: 'from-rose-500 via-pink-500 to-orange-500',
  sky: 'from-sky-500 via-blue-500 to-indigo-500',
};

const ACCENT_BG_TINT = {
  indigo: 'from-indigo-100/50 dark:from-indigo-950/30',
  emerald: 'from-emerald-100/50 dark:from-emerald-950/30',
  amber: 'from-amber-100/50 dark:from-amber-950/30',
  violet: 'from-violet-100/50 dark:from-violet-950/30',
  rose: 'from-rose-100/50 dark:from-rose-950/30',
  sky: 'from-sky-100/50 dark:from-sky-950/30',
};

const ACCENT_ICON_BG = {
  indigo: 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white',
  emerald: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
  amber: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
  violet: 'bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white',
  rose: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white',
  sky: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white',
};

function ReadingProgressBar({ accent }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const accentClass = ACCENT_GRADIENT_HERO[accent] ?? ACCENT_GRADIENT_HERO.indigo;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 h-0.5 bg-transparent pointer-events-none">
      <div
        className={`h-full bg-gradient-to-r ${accentClass} transition-[width] duration-150`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export default function PolicyDetailPage() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language?.startsWith('en') ? 'font-poppins' : 'font-sans';

  const [policy, setPolicy] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchPublicPolicyBySlug(slug)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setStatus('not-found');
          return;
        }
        setPolicy(data);
        setStatus('idle');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(err?.statusCode === 400 ? 'not-found' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const headings = useMemo(
    () => (policy?.content ? extractHeadings(policy.content) : []),
    [policy?.content]
  );

  const i18nKey = policy ? `policies.categories.${policy.type}` : null;
  const displayTitle = policy ? t(i18nKey ? `${i18nKey}.title` : '', policy.title) : '';
  const displayCategory = policy ? t(i18nKey ? `${i18nKey}.category` : '', '') : '';

  const accent = policy?.accentColor ?? 'indigo';
  const heroGradient = ACCENT_GRADIENT_HERO[accent] ?? ACCENT_GRADIENT_HERO.indigo;
  const heroTint = ACCENT_BG_TINT[accent] ?? ACCENT_BG_TINT.indigo;
  const iconBg = ACCENT_ICON_BG[accent] ?? ACCENT_ICON_BG.indigo;
  const IconComponent =
    (policy?.iconName && LucideIcons[policy.iconName]) || LucideIcons.FileText;

  return (
    <div
      className={`min-h-screen ${fontClass} transition-colors ${
        isDarkMode ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <PolicyHeader />
      {status === 'idle' && policy && <ReadingProgressBar accent={accent} />}

      {status === 'loading' && (
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className={`h-12 rounded-lg animate-pulse ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-200/60'}`} />
            <div className={`h-6 w-3/4 rounded-lg animate-pulse ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-200/60'}`} />
            <div className={`h-96 rounded-lg animate-pulse ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-200/60'}`} />
          </div>
        </div>
      )}

      {status === 'not-found' && (
        <div className="container mx-auto px-4 py-24 text-center">
          <FileWarning className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">{t('policies.notFound')}</h2>
          <Link
            to="/policies"
            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
          >
            {t('policies.backToPolicies')}
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="container mx-auto px-4 py-24 text-center text-rose-500">
          {t('policies.errorLoading')}
        </div>
      )}

      {status === 'idle' && policy && (
        <>
          {/* Hero */}
          <section className="relative overflow-hidden">
            <div
              aria-hidden="true"
              className={`absolute inset-0 -z-10 bg-gradient-to-b ${heroTint} via-transparent to-transparent`}
            />
            <div
              aria-hidden="true"
              className={`absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br ${heroGradient} opacity-[0.08] dark:opacity-[0.12] blur-3xl -z-10`}
            />
            <div
              aria-hidden="true"
              className={`absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full bg-gradient-to-tr ${heroGradient} opacity-[0.06] dark:opacity-[0.08] blur-3xl -z-10`}
            />

            <div className="container mx-auto px-4 pt-12 pb-12 md:pt-16 md:pb-16">
              <div className="max-w-4xl">
                <nav
                  className={`flex items-center gap-1.5 text-xs mb-8 ${
                    isDarkMode ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  <Link
                    to="/"
                    className="inline-flex items-center hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    <Home className="w-3.5 h-3.5" />
                  </Link>
                  <ChevronRight className="w-3 h-3" />
                  <Link
                    to="/policies"
                    className="hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    {t('policies.pageTitle')}
                  </Link>
                  {displayCategory && (
                    <>
                      <ChevronRight className="w-3 h-3" />
                      <span className="font-medium text-slate-600 dark:text-slate-400">
                        {displayCategory}
                      </span>
                    </>
                  )}
                </nav>

                <div className="flex items-start gap-5 mb-6">
                  <div
                    className={`shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center shadow-lg ${iconBg}`}
                  >
                    <IconComponent className="w-8 h-8 md:w-10 md:h-10" strokeWidth={1.6} />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    {displayCategory && (
                      <p
                        className={`text-[11px] font-bold uppercase tracking-[0.2em] mb-2 bg-clip-text text-transparent bg-gradient-to-r ${heroGradient}`}
                      >
                        {displayCategory}
                      </p>
                    )}
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.05]">
                      {displayTitle}
                    </h1>
                  </div>
                </div>

                {policy.summary && (
                  <p
                    className={`text-base md:text-lg leading-relaxed max-w-3xl mb-7 ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {policy.summary}
                  </p>
                )}

                {policy.effectiveDate && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                        isDarkMode
                          ? 'bg-slate-900/80 border border-slate-700 text-slate-300'
                          : 'bg-white/90 border border-slate-200 text-slate-600 shadow-sm'
                      }`}
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      {t('policies.effectiveDate')}: {policy.effectiveDate}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Body with TOC */}
          <section className="container mx-auto px-4 pb-24">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-8 lg:gap-12 max-w-6xl">
              <article
                className={`relative rounded-3xl px-6 py-8 md:px-12 md:py-14 ${
                  isDarkMode
                    ? 'bg-slate-900/40 border border-slate-800/80'
                    : 'bg-white border border-slate-200/80 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.18)]'
                }`}
              >
                <div
                  aria-hidden="true"
                  className={`absolute top-0 left-12 right-12 h-0.5 bg-gradient-to-r ${heroGradient} rounded-full opacity-60`}
                />
                <PolicyMarkdown content={policy.content} />
              </article>

              <aside>
                <PolicyTOC headings={headings} />
              </aside>
            </div>
          </section>

          <Footer />
        </>
      )}
    </div>
  );
}

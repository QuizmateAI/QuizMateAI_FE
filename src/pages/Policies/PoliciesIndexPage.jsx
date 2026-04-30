import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, BookOpenCheck, MailQuestion } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { fetchPublicPolicies } from '@/api/PolicyAPI';
import PolicyHeader from './components/PolicyHeader';
import PolicyCard from './components/PolicyCard';
import Footer from '@/pages/LandingPage/components/Footer';

export default function PoliciesIndexPage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language?.startsWith('en') ? 'font-poppins' : 'font-sans';
  const [policies, setPolicies] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchPublicPolicies()
      .then((data) => {
        if (cancelled) return;
        setPolicies(Array.isArray(data) ? data : []);
        setStatus('idle');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={`min-h-screen ${fontClass} transition-colors ${
        isDarkMode ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <PolicyHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className={`absolute inset-0 -z-10 ${
            isDarkMode
              ? 'bg-gradient-to-br from-blue-950/40 via-slate-950 to-violet-950/30'
              : 'bg-gradient-to-br from-blue-50 via-white to-violet-50'
          }`}
        />
        <div
          aria-hidden="true"
          className={`absolute -top-40 -right-32 w-[500px] h-[500px] rounded-full blur-3xl -z-10 ${
            isDarkMode ? 'bg-blue-500/10' : 'bg-blue-300/30'
          }`}
        />
        <div
          aria-hidden="true"
          className={`absolute -bottom-40 -left-32 w-[400px] h-[400px] rounded-full blur-3xl -z-10 ${
            isDarkMode ? 'bg-violet-500/10' : 'bg-violet-300/30'
          }`}
        />

        <div className="container mx-auto px-4 pt-16 pb-12 md:pt-24 md:pb-20 relative">
          <div className="max-w-3xl">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 ${
                isDarkMode
                  ? 'bg-blue-950/60 text-blue-300 border border-blue-900/50'
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}
            >
              <BookOpenCheck className="w-3.5 h-3.5" />
              {t('policies.lastUpdated', 'Last updated')}: 2026-04-30
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-5 leading-[1.05]">
              {t('policies.pageTitle', 'Policies & Terms')}
            </h1>
            <p
              className={`text-lg md:text-xl leading-relaxed max-w-2xl ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {t('policies.pageSubtitle')}
            </p>
          </div>

          {/* Warning banner */}
          <div
            className={`mt-10 max-w-3xl rounded-2xl border-2 p-5 flex gap-4 ${
              isDarkMode
                ? 'bg-rose-950/30 border-rose-900/60 text-rose-100'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div
              className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                isDarkMode ? 'bg-rose-900/50 text-rose-300' : 'bg-rose-100 text-rose-600'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold mb-1">{t('policies.violationWarningTitle')}</p>
              <p
                className={`text-sm leading-relaxed ${
                  isDarkMode ? 'text-rose-200/90' : 'text-rose-800/90'
                }`}
              >
                {t('policies.violationWarningText')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="container mx-auto px-4 pb-16 md:pb-24">
        {status === 'loading' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-64 rounded-2xl animate-pulse ${
                  isDarkMode ? 'bg-slate-900/50' : 'bg-slate-200/60'
                }`}
              />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div
            className={`rounded-2xl p-10 text-center ${
              isDarkMode ? 'bg-slate-900/40' : 'bg-white border border-slate-200'
            }`}
          >
            <p className="text-rose-500 font-medium">{t('policies.errorLoading')}</p>
          </div>
        )}

        {status === 'idle' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {policies.map((policy) => (
              <PolicyCard key={policy.policyId} policy={policy} />
            ))}
          </div>
        )}

        {/* Contact */}
        <div
          className={`mt-16 max-w-2xl mx-auto rounded-2xl p-8 text-center ${
            isDarkMode
              ? 'bg-slate-900/40 border border-slate-800'
              : 'bg-white border border-slate-200'
          }`}
        >
          <div
            className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4 ${
              isDarkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-600'
            }`}
          >
            <MailQuestion className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t('policies.needHelp')}</h3>
          <a
            href="mailto:support@quizmateai.io.vn"
            className={`inline-flex items-center gap-1 text-sm font-medium ${
              isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            {t('policies.contactUs')} → support@quizmateai.io.vn
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}

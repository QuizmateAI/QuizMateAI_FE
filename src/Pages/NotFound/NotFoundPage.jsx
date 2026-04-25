import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Button } from '@/Components/ui/button';
import LogoLight from '@/assets/LightMode_Logo.webp';
import LogoDark from '@/assets/DarkMode_Logo.webp';

function NotFoundPage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language?.startsWith('en') ? 'font-poppins' : 'font-sans';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-6 py-12 transition-colors duration-300 ${fontClass} ${
      isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-white text-[#313131]'
    }`}
    >
      <img
        src={isDarkMode ? LogoDark : LogoLight}
        alt={t('common.brandLogoAlt', { brandName: 'QuizMate AI' })}
        className="h-20 w-auto object-contain mb-8"
      />

      <div className="text-center max-w-xl space-y-4">
        <p className={`text-[128px] leading-none font-black tracking-tight ${
          isDarkMode ? 'text-blue-400' : 'text-[#2563EB]'
        }`}
        >
          404
        </p>
        <h1 className={`text-2xl md:text-3xl font-bold ${
          isDarkMode ? 'text-white' : 'text-[#12141D]'
        }`}
        >
          {t('notFoundPage.title', 'Page not found')}
        </h1>
        <p className={`text-base ${
          isDarkMode ? 'text-slate-400' : 'text-gray-500'
        }`}
        >
          {t('notFoundPage.description', 'The page you are looking for may have been removed, renamed, or is temporarily unavailable.')}
        </p>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link to="/" className="gap-2">
            <Home className="w-4 h-4" />
            {t('common.goHome')}
          </Link>
        </Button>
        <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          {t('common.back')}
        </Button>
      </div>
    </div>
  );
}

export default NotFoundPage;

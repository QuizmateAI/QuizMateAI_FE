import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Globe, Sun, Moon } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";

const Navbar = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'vi';
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';

  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  return (
    <nav className={`sticky top-0 z-[100] w-full transition-colors duration-300 ${fontClass} ${
      isDarkMode
        ? 'bg-slate-950 border-b border-slate-800'
        : 'bg-white border-b border-gray-100 shadow-sm'
    }`}
    >
      <div className="container mx-auto flex items-center justify-between h-20">
        <div className="flex items-center gap-x-12">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label={t('common.goHome')}
            className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
          >
            <img
              src={isDarkMode ? LogoDark : LogoLight}
              alt={t('common.brandLogoAlt', { brandName: 'QuizMate AI' })}
              className="h-[100px] w-[120px] object-contain"
            />
          </button>
          <div className={`hidden lg:flex items-center gap-x-8 text-sm font-bold uppercase tracking-widest ${
            isDarkMode ? 'text-slate-400' : 'text-gray-500'
          }`}
          >
            <a href="#features" className={`transition-colors ${isDarkMode ? 'hover:text-blue-400' : 'hover:text-[#2563EB]'}`}>{t('landingPage.nav.features')}</a>
            <a href="#features" className={`transition-colors ${isDarkMode ? 'hover:text-blue-400' : 'hover:text-[#2563EB]'}`}>{t('landingPage.nav.solutions')}</a>
            <a href="#pricing" className={`transition-colors ${isDarkMode ? 'hover:text-blue-400' : 'hover:text-[#2563EB]'}`}>{t('landingPage.nav.pricing')}</a>
          </div>
        </div>
        <div className="flex items-center gap-x-3">
          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label={isDarkMode ? t('common.lightMode') : t('common.darkMode')}
            className={`p-2.5 rounded-lg border transition-all duration-300 ${
              isDarkMode
                ? 'border-slate-700 hover:bg-slate-800 text-yellow-400'
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            }`}
            title={isDarkMode ? t('common.lightMode') : t('common.darkMode')}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label={t('common.switchLanguage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors text-sm font-medium ${
              isDarkMode
                ? 'border-slate-700 hover:bg-slate-800 text-slate-400'
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>{currentLang === 'vi' ? 'VI' : 'EN'}</span>
          </button>
          <Button
            variant="ghost"
            className={`font-bold min-w-[120px] justify-center border-2 ${
              isDarkMode ? 'text-slate-300 hover:text-white hover:bg-slate-800 border-slate-400' : 'text-gray-700 border-slate-600'
            }`}
            onClick={() => navigate('/login')}
          >
            {t('landingPage.nav.login')}
          </Button>
          <Button
            className={`font-bold px-8 rounded-xl transition-all active:scale-95 ${
              isDarkMode
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30'
                : 'bg-[#2563EB] hover:bg-blue-700 text-white shadow-lg shadow-blue-100'
            }`}
            onClick={() => navigate('/login', { state: { view: 'register' } })}
          >
            {t('landingPage.nav.signup')}
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

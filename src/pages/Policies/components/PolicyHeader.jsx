import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, Sun, Moon } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Button } from '@/components/ui/button';
import LogoLight from '@/assets/LightMode_Logo.webp';
import LogoDark from '@/assets/DarkMode_Logo.webp';

export default function PolicyHeader() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'vi';

  const toggleLanguage = () => {
    i18n.changeLanguage(currentLang === 'vi' ? 'en' : 'vi');
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full backdrop-blur-xl transition-colors ${
        isDarkMode
          ? 'bg-slate-950/80 border-b border-slate-800/60'
          : 'bg-white/80 border-b border-slate-200/70'
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Home"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <img
            src={isDarkMode ? LogoDark : LogoLight}
            alt="QuizMate AI"
            className="h-12 w-auto object-contain"
          />
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="h-9 px-2.5"
            aria-label="Toggle language"
          >
            <Globe className="w-4 h-4 mr-1.5" />
            <span className="text-xs font-semibold uppercase">{currentLang}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDarkMode}
            className="h-9 w-9 p-0"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}

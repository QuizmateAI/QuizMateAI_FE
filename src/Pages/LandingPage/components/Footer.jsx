import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Globe } from 'lucide-react';
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";

const Footer = () => {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  return (
    <footer className={`py-10 border-t transition-colors duration-300 ${fontClass} ${
      isDarkMode 
        ? 'bg-slate-950 border-slate-800 text-slate-400' 
        : 'bg-white border-gray-100'
    }`}>
      <div className="container mx-auto px-6 md:px-[100px] grid md:grid-cols-4 gap-12 mb-4">
        {/* Brand Column */}
        <div className="flex flex-col items-start space-y-1 mr-6">
          <img 
            src={isDarkMode ? LogoDark : LogoLight} 
            alt="QuizMate Logo" 
            className="h-[120px] w-auto object-contain" 
          />
          <p className={`font-medium text-sm leading-relaxed text-left max-w-xs ${
            isDarkMode ? 'text-slate-400' : 'text-gray-500'
          }`}>
            {t('landingPage.footer.brandDesc')}
          </p>
        </div>

        {/* Product Column */}
        <div className="pt-10 flex flex-col space-y-6 text-left">
          <h5 className={`font-black uppercase text-xs tracking-[0.2em] ${
            isDarkMode ? 'text-white' : 'text-[#12141D]'
          }`}>{t('landingPage.footer.product')}</h5>
          <ul className={`space-y-4 font-semibold text-sm ${
            isDarkMode ? 'text-slate-400' : 'text-gray-500'
          }`}>
            <li><a href="#" className={`transition-colors ${isDarkMode ? 'hover:text-blue-400' : 'hover:text-[#2563EB]'}`}>{t('landingPage.footer.productLinks.roadmap')}</a></li>
            <li><a href="#" className={`transition-colors ${isDarkMode ? 'hover:text-blue-400' : 'hover:text-[#2563EB]'}`}>{t('landingPage.footer.productLinks.quizzes')}</a></li>
            <li><a href="#" className={`transition-colors ${isDarkMode ? 'hover:text-blue-400' : 'hover:text-[#2563EB]'}`}>{t('landingPage.footer.productLinks.groups')}</a></li>
          </ul>
        </div>

        {/* Company Column */}
        <div className=" pt-10 flex flex-col space-y-6 text-left">
          <h5 className={`font-black uppercase text-xs tracking-[0.2em] ${
            isDarkMode ? 'text-white' : 'text-[#12141D]'
          }`}>{t('landingPage.footer.company')}</h5>
          <ul className={`space-y-4 font-semibold text-sm ${
            isDarkMode ? 'text-slate-400' : 'text-gray-500'
          }`}>
            <li><a href="#" className={`transition-colors ${isDarkMode ? 'hover:text-blue-400' : 'hover:text-[#2563EB]'}`}>{t('landingPage.footer.companyLinks.about')}</a></li>
            <li><a href="#" className={`transition-colors ${isDarkMode ? 'hover:text-blue-400' : 'hover:text-[#2563EB]'}`}>{t('landingPage.footer.companyLinks.privacy')}</a></li>
            <li><a href="#" className={`transition-colors ${isDarkMode ? 'hover:text-blue-400' : 'hover:text-[#2563EB]'}`}>{t('landingPage.footer.companyLinks.terms')}</a></li>
          </ul>
        </div>

        {/* Connect Column */}
        <div className="pt-10 flex flex-col space-y-6 text-left">
          <h5 className={`font-black uppercase text-xs tracking-[0.2em] ${
            isDarkMode ? 'text-white' : 'text-[#12141D]'
          }`}>{t('landingPage.footer.connect')}</h5>
          <div className="flex gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:-translate-y-1 shadow-sm border ${
                isDarkMode 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-blue-400 border-slate-700 hover:border-blue-500' 
                  : 'bg-gray-50 hover:bg-blue-50 hover:text-[#2563EB] border-transparent hover:border-blue-100'
              }`}>
                <Globe className="w-5 h-5" />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Copyright */}
      <div className={`border-t mt-8 ${isDarkMode ? 'border-slate-900' : 'border-gray-50'}`}>
        <div className={`container mx-auto px-6 text-right md:text-right text-xs font-bold uppercase tracking-widest ${
          isDarkMode ? 'text-slate-600' : 'text-gray-300'
        }`}>
          {t('landingPage.footer.copyright')}
        </div>
      </div>
    </footer>
  );
};

export default Footer;

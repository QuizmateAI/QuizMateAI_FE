import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Map, BrainCircuit, Mic } from 'lucide-react';

const FeaturesSection = () => {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  // Cấu hình màu sắc cho mỗi feature dựa trên dark mode
  const getFeatureColors = (color) => {
    if (isDarkMode) {
      return {
        rose: 'bg-rose-950/30 text-rose-400 group-hover:bg-rose-900/50',
        blue: 'bg-blue-950/30 text-blue-400 group-hover:bg-blue-900/50',
        emerald: 'bg-emerald-950/30 text-emerald-400 group-hover:bg-emerald-900/50'
      }[color];
    }
    return {
      rose: 'bg-rose-50 group-hover:bg-rose-100',
      blue: 'bg-blue-50 group-hover:bg-blue-100',
      emerald: 'bg-emerald-50 group-hover:bg-emerald-100'
    }[color];
  };

  const getIconColor = (color) => {
    if (isDarkMode) return ''; // Icon color đã được set trong getFeatureColors
    return {
      rose: 'text-rose-500',
      blue: 'text-blue-500',
      emerald: 'text-emerald-500'
    }[color];
  };

  return (
    <section id="features" className={`py-32 scroll-mt-20 transition-colors duration-300 ${fontClass} ${
        isDarkMode ? 'bg-slate-900' : 'bg-[#FAFAFA]'
      }`}>
      <div className="container mx-auto px-6 text-center max-w-6xl">
        <h2 className={`text-3xl font-black mb-24 tracking-tight ${
          isDarkMode ? 'text-white' : 'text-[#12141D]'
        }`}>
          {t('landingPage.features.title')}
        </h2>
        <div className="grid md:grid-cols-3 gap-16 lg:gap-24">
          {/* Feature 1 */}
          <div className="group space-y-6 flex flex-col items-center md:items-start text-center md:text-left transition-all">
            <div className={`w-20 h-20 rounded-[25px] flex items-center justify-center shadow-sm group-hover:rotate-6 transition-all duration-300 ${getFeatureColors('rose')}`}>
              <Map className={`w-10 h-10 ${getIconColor('rose')}`} />
            </div>
            <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-[#12141D]'}`}>{t('landingPage.features.roadmapTitle')}</h3>
            <p className={`font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('landingPage.features.roadmapDesc')}
            </p>
          </div>
          {/* Feature 2 */}
          <div className="group space-y-6 flex flex-col items-center md:items-start text-center md:text-left transition-all">
            <div className={`w-20 h-20 rounded-[25px] flex items-center justify-center shadow-sm group-hover:rotate-6 transition-all duration-300 ${getFeatureColors('blue')}`}>
              <BrainCircuit className={`w-10 h-10 ${getIconColor('blue')}`} />
            </div>
            <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-[#12141D]'}`}>{t('landingPage.features.quizTitle')}</h3>
            <p className={`font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('landingPage.features.quizDesc')}
            </p>
          </div>
          {/* Feature 3 */}
          <div className="group space-y-6 flex flex-col items-center md:items-start text-center md:text-left transition-all">
            <div className={`w-20 h-20 rounded-[25px] flex items-center justify-center shadow-sm group-hover:rotate-6 transition-all duration-300 ${getFeatureColors('emerald')}`}>
              <Mic className={`w-10 h-10 ${getIconColor('emerald')}`} />
            </div>
            <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-[#12141D]'}`}>{t('landingPage.features.companionTitle')}</h3>
            <p className={`font-medium leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
              {t('landingPage.features.companionDesc')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

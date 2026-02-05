import React from 'react';
import { Map, BrainCircuit, Mic } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

const FeaturesSection = () => {
    const { t, fontClass } = useLanguage();

  return (
    <section id="features" className={`py-32 bg-[#FAFAFA] ${fontClass}`}>
      <div className="container mx-auto px-6 text-center max-w-6xl">
        <h2 className="text-3xl font-black mb-24 tracking-tight text-[#12141D]">
          {t('landingPage.features.title')}
        </h2>
        <div className="grid md:grid-cols-3 gap-16 lg:gap-24">
          {/* Feature 1 */}
          <div className="group space-y-6 flex flex-col items-center md:items-start text-center md:text-left transition-all">
            <div className="w-20 h-20 bg-rose-50 rounded-[25px] flex items-center justify-center shadow-sm group-hover:bg-rose-100 group-hover:rotate-6 transition-all duration-300">
              <Map className="w-10 h-10 text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-[#12141D]">{t('landingPage.features.roadmapTitle')}</h3>
            <p className="text-gray-500 font-medium leading-relaxed">
              {t('landingPage.features.roadmapDesc')}
            </p>
          </div>
          {/* Feature 2 */}
          <div className="group space-y-6 flex flex-col items-center md:items-start text-center md:text-left transition-all">
            <div className="w-20 h-20 bg-blue-50 rounded-[25px] flex items-center justify-center shadow-sm group-hover:bg-blue-100 group-hover:rotate-6 transition-all duration-300">
              <BrainCircuit className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-black text-[#12141D]">{t('landingPage.features.quizTitle')}</h3>
            <p className="text-gray-500 font-medium leading-relaxed">
              {t('landingPage.features.quizDesc')}
            </p>
          </div>
          {/* Feature 3 */}
          <div className="group space-y-6 flex flex-col items-center md:items-start text-center md:text-left transition-all">
            <div className="w-20 h-20 bg-emerald-50 rounded-[25px] flex items-center justify-center shadow-sm group-hover:bg-emerald-100 group-hover:rotate-6 transition-all duration-300">
              <Mic className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-black text-[#12141D]">{t('landingPage.features.companionTitle')}</h3>
            <p className="text-gray-500 font-medium leading-relaxed">
              {t('landingPage.features.companionDesc')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

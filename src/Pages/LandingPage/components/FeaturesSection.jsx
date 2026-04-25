import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Sparkles, MonitorSmartphone, Users, CheckCircle2 } from 'lucide-react';
import { Card } from "@/Components/ui/card";

const FeaturesSection = () => {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language?.startsWith('en') ? 'font-poppins' : 'font-sans';

  const features = [
    {
      id: 'generation',
      icon: <Sparkles className="text-rose-500" />,
      title: t('landingPage.features.new.generation.title'),
      bullets: [
        t('landingPage.features.new.generation.bullet1'),
        t('landingPage.features.new.generation.bullet2'),
        t('landingPage.features.new.generation.bullet3')
      ]
    },
    {
      id: 'customization',
      icon: <MonitorSmartphone className="text-blue-500" />,
      title: t('landingPage.features.new.customization.title'),
      bullets: [
        t('landingPage.features.new.customization.bullet1'),
        t('landingPage.features.new.customization.bullet2'),
        t('landingPage.features.new.customization.bullet3')
      ]
    },
    {
      id: 'collaborative',
      icon: <Users className="text-emerald-500" />,
      title: t('landingPage.features.new.collaborative.title'),
      bullets: [
        t('landingPage.features.new.collaborative.bullet1'),
        t('landingPage.features.new.collaborative.bullet2'),
        t('landingPage.features.new.collaborative.bullet3')
      ]
    }
  ];

  return (
    <section id="features" className={`py-32 scroll-mt-20 transition-colors duration-300 ${fontClass} ${
        isDarkMode ? 'bg-slate-900' : 'bg-[#FAFAFA]'
      }`}>
      <div className="container mx-auto px-6 text-center space-y-6 mb-16 max-w-7xl">
        <h2 className={`text-4xl font-black tracking-tight ${
          isDarkMode ? 'text-white' : ''
        }`}>
          {t('landingPage.features.title')}
        </h2>
      </div>
      
      <div className="container mx-auto px-6 grid md:grid-cols-3 gap-12 max-w-7xl items-stretch pb-12">
        {features.map((feature, idx) => (
          <Card key={idx} className={`p-12 space-y-8 rounded-[40px] transition-all duration-500 border-2 flex flex-col items-center text-center ${
            isDarkMode
              ? 'bg-slate-950 border-slate-800 hover:border-slate-600 shadow-lg shadow-slate-950/50'
              : 'border-gray-100 shadow-sm hover:shadow-2xl bg-white'
          }`}>
            <div className={`w-24 h-24 rounded-[30px] flex items-center justify-center shadow-sm -rotate-3 hover:rotate-6 transition-all duration-300 ${
              isDarkMode ? 'bg-slate-900/80 border border-slate-800' : 'bg-slate-50 border border-slate-100'
            }`}>
              {React.cloneElement(feature.icon, { className: "w-12 h-12 m-0" })}
            </div>
            
            <div className="space-y-4 w-full">
              <h3 className={`text-2xl font-black ${
                isDarkMode ? 'text-white' : 'text-[#12141D]'
              }`}>
                {feature.title}
              </h3>
              <ul className={`space-y-5 text-left w-full text-sm font-bold ${
                isDarkMode ? 'text-slate-300' : 'text-gray-500'
              }`}>
                {feature.bullets.map((bullet, bIdx) => (
                  <li key={bIdx} className="flex items-start gap-4">
                    <CheckCircle2 className={`w-6 h-6 flex-shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                    <span className="leading-relaxed pt-0.5">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;

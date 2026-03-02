import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Card } from "@/Components/ui/card";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { Check, CheckCircle2 } from 'lucide-react';

const PricingSection = () => {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  return (
    <section id="pricing" className={`py-16 scroll-mt-20 transition-colors duration-300 ${fontClass} ${
        isDarkMode ? 'bg-slate-950' : 'bg-white'
      }`}>
      <div className="container mx-auto px-6 text-center space-y-6 mb-16">
        <h2 className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : ''}`}>
          {t('landingPage.pricing.titlePart1')} <span className={isDarkMode ? 'text-blue-500' : 'underline decoration-[#FACC15] decoration-8 underline-offset-8'}>{t('landingPage.pricing.titlePart2')}</span>
        </h2>
        <p className={`text-base font-bold uppercase tracking-widest ${
          isDarkMode ? 'text-slate-500' : 'text-gray-400'
        }`}>{t('landingPage.pricing.subtitle')}</p>
      </div>

      <div className="container mx-auto px-6 grid md:grid-cols-3 gap-12 max-w-7xl items-center pb-12">
        {/* Free Plan */}
        <Card className={`p-12 space-y-8 rounded-[40px] transition-all duration-500 border-2 ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-800 hover:border-slate-600 shadow-lg shadow-slate-900/50' 
            : 'border-gray-100 shadow-sm hover:shadow-2xl bg-white'
        }`}>
          <div className="space-y-3">
            <h4 className={`font-black uppercase tracking-widest text-sm ${
              isDarkMode ? 'text-slate-500' : 'text-gray-400'
            }`}>{t('landingPage.pricing.free')}</h4>
            <div className={`text-5xl font-black ${isDarkMode ? 'text-white' : 'text-[#12141D]'}`}>$0</div>
          </div>
          <ul className={`space-y-5 text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
            <li className="flex items-center gap-4"><CheckCircle2 className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} /> {t('landingPage.pricing.features.fiveRoadmaps')}</li>
            <li className="flex items-center gap-4"><CheckCircle2 className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} /> {t('landingPage.pricing.features.basicQuizzes')}</li>
            <li className={`flex items-center gap-4 line-through ${isDarkMode ? 'text-slate-600' : 'text-gray-300'}`}><CheckCircle2 className="w-6 h-6 opacity-30" /> {t('landingPage.pricing.features.voiceTutor')}</li>
          </ul>
          <Button variant="outline" className={`w-full h-14 font-black rounded-2xl text-base transition-all ${
            isDarkMode 
              ? 'border-2 border-slate-600 hover:bg-slate-400 hover:border-slate-500 text-black' 
              : 'border-4 hover:bg-gray-200'
          }`}>{t('landingPage.pricing.getStarted')}</Button>
        </Card>

        {/* Pro Plan - The Highlighted One */}
        <Card className={`text-white border-none scale-110 p-14 space-y-10 rounded-[50px] relative z-20 overflow-hidden ${
          isDarkMode 
            ? 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-2xl shadow-blue-500/30' 
            : 'bg-[#2c87ee] shadow-3xl'
        }`}>
          <Badge className={`absolute top-8 right-8 text-white border-none px-6 py-1.5 font-bold animate-pulse ${
            isDarkMode ? 'bg-blue-400/30 backdrop-blur-sm' : 'bg-[#2563EB]'
          }`}>{t('landingPage.pricing.mostPopular')}</Badge>
          <div className="space-y-3 text-center">
            <h4 className={`font-black uppercase tracking-widest text-sm ${isDarkMode ? 'text-blue-200' : 'opacity-60'}`}>{t('landingPage.pricing.pro')}</h4>
            <div className="text-6xl font-black">$11.99</div>
            <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-blue-200/60' : 'opacity-40'}`}>{t('landingPage.pricing.billedMonthly')}</p>
          </div>
          <ul className="space-y-6 text-sm font-bold">
            <li className="flex items-center gap-4"><Check className={`w-6 h-6 stroke-[4] ${isDarkMode ? 'text-blue-200' : 'text-blue-400'}`} /> {t('landingPage.pricing.features.unlimitedRoadmaps')}</li>
            <li className="flex items-center gap-4"><Check className={`w-6 h-6 stroke-[4] ${isDarkMode ? 'text-blue-200' : 'text-blue-400'}`} /> {t('landingPage.pricing.features.advancedVoice')}</li>
            <li className="flex items-center gap-4"><Check className={`w-6 h-6 stroke-[4] ${isDarkMode ? 'text-blue-200' : 'text-blue-400'}`} /> {t('landingPage.pricing.features.urlVideo')}</li>
          </ul>
          <Button className={`w-full font-black h-16 text-lg rounded-2xl shadow-2xl transition-all active:scale-95 ${
            isDarkMode 
              ? 'bg-white text-blue-600 hover:bg-gray-300 shadow-black/20' 
              : 'bg-[#e0e5ef] hover:bg-blue-600 shadow-blue-900/50 text-black hover:text-white'
          }`}>
            {t('landingPage.pricing.selectPro')}
          </Button>
        </Card>

        {/* Elite Plan */}
        <Card className={`p-12 space-y-8 rounded-[40px] transition-all duration-500 border-2 ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-800 hover:border-slate-600 shadow-lg shadow-slate-900/50' 
            : 'border-gray-100 shadow-sm hover:shadow-2xl bg-white'
        }`}>
          <div className="space-y-3">
            <h4 className={`font-black uppercase tracking-widest text-sm ${
              isDarkMode ? 'text-slate-500' : 'text-gray-400'
            }`}>{t('landingPage.pricing.elite')}</h4>
            <div className={`text-5xl font-black ${isDarkMode ? 'text-white' : 'text-[#12141D]'}`}>$49.99</div>
          </div>
          <ul className={`space-y-5 text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
            <li className="flex items-center gap-4"><CheckCircle2 className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} /> {t('landingPage.pricing.features.everythingPro')}</li>
            <li className="flex items-center gap-4"><CheckCircle2 className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} /> {t('landingPage.pricing.features.studyGroup')}</li>
            <li className="flex items-center gap-4"><CheckCircle2 className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} /> {t('landingPage.pricing.features.apiAccess')}</li>
          </ul>
          <Button variant="outline" className={`w-full h-14 font-black rounded-2xl text-base transition-all ${
            isDarkMode 
              ? 'border-2 border-slate-600 hover:bg-slate-400 hover:border-slate-500 text-black' 
              : 'border-4 hover:bg-gray-200'
          }`}>{t('landingPage.pricing.getStarted')}</Button>
        </Card>
      </div>
    </section>
  );
};

export default PricingSection;

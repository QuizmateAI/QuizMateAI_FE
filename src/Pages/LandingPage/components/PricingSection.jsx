import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

const PricingSection = () => {
    const { t, fontClass } = useLanguage();

  return (
    <section id="pricing" className={`py-32 bg-white ${fontClass}`}>
      <div className="container mx-auto px-6 text-center space-y-6 mb-24">
        <h2 className="text-4xl font-black tracking-tight">
          {t('landingPage.pricing.titlePart1')} <span className="underline decoration-[#FACC15] decoration-8 underline-offset-8">{t('landingPage.pricing.titlePart2')}</span>
        </h2>
        <p className="text-gray-400 text-base font-bold uppercase tracking-widest">{t('landingPage.pricing.subtitle')}</p>
      </div>

      <div className="container mx-auto px-6 grid md:grid-cols-3 gap-12 max-w-7xl items-center pb-12">
        {/* Free Plan */}
        <Card className="border-gray-100 shadow-sm p-12 space-y-8 rounded-[40px] hover:shadow-2xl transition-all duration-500 border-2">
          <div className="space-y-3">
            <h4 className="font-black text-gray-400 uppercase tracking-widest text-sm">{t('landingPage.pricing.free')}</h4>
            <div className="text-5xl font-black text-[#12141D]">$0</div>
          </div>
          <ul className="space-y-5 text-sm font-bold text-gray-500">
            <li className="flex items-center gap-4"><CheckCircle2 className="w-6 h-6 text-blue-500" /> {t('landingPage.pricing.features.fiveRoadmaps')}</li>
            <li className="flex items-center gap-4"><CheckCircle2 className="w-6 h-6 text-blue-500" /> {t('landingPage.pricing.features.basicQuizzes')}</li>
            <li className="flex items-center gap-4 text-gray-300 line-through"><CheckCircle2 className="w-6 h-6 opacity-30" /> {t('landingPage.pricing.features.voiceTutor')}</li>
          </ul>
          <Button variant="outline" className="w-full h-14 border-4 font-black rounded-2xl text-base hover:bg-gray-50">{t('landingPage.pricing.getStarted')}</Button>
        </Card>

        {/* Pro Plan - The Highlighted One */}
        <Card className="bg-[#042B59] text-white border-none shadow-3xl scale-110 p-14 space-y-10 rounded-[50px] relative z-20 overflow-hidden">
          <Badge className="absolute top-8 right-8 bg-[#2563EB] text-white border-none px-6 py-1.5 font-bold animate-pulse">{t('landingPage.pricing.mostPopular')}</Badge>
          <div className="space-y-3 text-center">
            <h4 className="font-black opacity-60 uppercase tracking-widest text-sm">{t('landingPage.pricing.pro')}</h4>
            <div className="text-6xl font-black">$11.99</div>
            <p className="opacity-40 text-xs font-bold uppercase tracking-widest">{t('landingPage.pricing.billedMonthly')}</p>
          </div>
          <ul className="space-y-6 text-sm font-bold">
            <li className="flex items-center gap-4"><Check className="w-6 h-6 text-blue-400 stroke-[4]" /> {t('landingPage.pricing.features.unlimitedRoadmaps')}</li>
            <li className="flex items-center gap-4"><Check className="w-6 h-6 text-blue-400 stroke-[4]" /> {t('landingPage.pricing.features.advancedVoice')}</li>
            <li className="flex items-center gap-4"><Check className="w-6 h-6 text-blue-400 stroke-[4]" /> {t('landingPage.pricing.features.urlVideo')}</li>
          </ul>
          <Button className="w-full bg-[#2563EB] hover:bg-blue-600 font-black h-16 text-lg rounded-2xl shadow-2xl shadow-blue-900/50 transition-all active:scale-95">
            {t('landingPage.pricing.selectPro')}
          </Button>
        </Card>

        {/* Elite Plan */}
        <Card className="border-gray-100 shadow-sm p-12 space-y-8 rounded-[40px] hover:shadow-2xl transition-all duration-500 border-2">
          <div className="space-y-3">
            <h4 className="font-black text-gray-400 uppercase tracking-widest text-sm">{t('landingPage.pricing.elite')}</h4>
            <div className="text-5xl font-black text-[#12141D]">$49.99</div>
          </div>
          <ul className="space-y-5 text-sm font-bold text-gray-500">
            <li className="flex items-center gap-4"><CheckCircle2 className="w-6 h-6 text-blue-500" /> {t('landingPage.pricing.features.everythingPro')}</li>
            <li className="flex items-center gap-4"><CheckCircle2 className="w-6 h-6 text-blue-500" /> {t('landingPage.pricing.features.studyGroup')}</li>
            <li className="flex items-center gap-4"><CheckCircle2 className="w-6 h-6 text-blue-500" /> {t('landingPage.pricing.features.apiAccess')}</li>
          </ul>
          <Button variant="outline" className="w-full h-14 border-4 font-black rounded-2xl text-base hover:bg-gray-50">{t('landingPage.pricing.getStarted')}</Button>
        </Card>
      </div>
    </section>
  );
};

export default PricingSection;

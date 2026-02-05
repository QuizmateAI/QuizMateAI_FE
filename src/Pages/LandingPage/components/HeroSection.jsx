import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle } from 'lucide-react';

const HeroSection = () => {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  return (
    <section className={`container mx-auto flex flex-col md:flex-row items-center lg:py-2 gap-8 ${fontClass}`}>
      <div className="flex-1 space-y-8 text-left animate-in slide-in-from-left-10 duration-700">
        <Badge className="bg-blue-50 text-[#2563EB] border-none hover:bg-blue-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
          {t('landingPage.hero.badge')}
        </Badge>
        <h1 className="text-4xl lg:text-6xl font-black leading-[1.1] text-[#12141D] tracking-tight">
          {t('landingPage.hero.titlePart1')} <span className="text-[#2563EB]">{t('landingPage.hero.titlePart2')}</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-lg leading-relaxed font-medium">
          {t('landingPage.hero.subtitle')}
        </p>
        <div className="flex flex-wrap gap-5 pt-4">
          <Button size="lg" className="bg-[#2563EB] hover:bg-blue-700 h-14 px-8 text-base font-black rounded-2xl shadow-2xl shadow-blue-200 transition-all hover:-translate-y-1">
            {t('landingPage.hero.startLearning')}
          </Button>
          <Button size="lg" variant="outline" className="h-14 px-8 text-base font-bold rounded-2xl border-2 gap-2 group bg-white">
            <PlayCircle className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" /> {t('landingPage.hero.watchDemo')}
          </Button>
        </div>
        
        <div className="flex items-center gap-6 pt-6 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-500 cursor-default">
          <div className="flex -space-x-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-md">
                <img src={`https://i.pravatar.cc/100?img=${i+15}`} alt="learner" />
              </div>
            ))}
          </div>
          <div className="text-sm font-bold">
            <p className="text-[#12141D] text-base">15,000+</p>
            <p className="text-gray-400 font-semibold uppercase tracking-tighter">{t('landingPage.hero.activeStudents')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 relative flex justify-center lg:justify-end animate-in zoom-in duration-1000 delay-300">
        {/* Decorative Yellow Circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] lg:w-[550px] lg:h-[550px] bg-[#FACC15] rounded-full -z-10 shadow-inner"></div>
        <div className="relative z-10 bg-white/20 backdrop-blur-sm p-4 rounded-[50px] shadow-3xl border border-white/30">
          <div className="bg-gray-50 w-full h-[450px] lg:w-[480px] lg:h-[600px] rounded-[40px] flex items-center justify-center overflow-hidden shadow-2xl border-8 border-white">
             <img src="/path-to-your-actual-app-mockup.png" alt="QuizMate Dashboard" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

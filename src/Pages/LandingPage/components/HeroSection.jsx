import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import { useDarkMode } from '@/hooks/useDarkMode';
import { ArrowUp, Map, BrainCircuit, Mic, Globe, PlayCircle, 
  Check, CheckCircle2, Sparkles, Menu, X  } from 'lucide-react';

const HeroSection = () => {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  return (
    <section className={`container mx-auto flex flex-col md:flex-row items-center lg:py-2 gap-8 ${fontClass}`}>
      <div className="flex-1 space-y-8 text-left animate-in slide-in-from-left-10 duration-700">
        <Badge className={`border-none px-4 py-1.5 text-xs font-bold uppercase tracking-widest ${
          isDarkMode 
            ? 'bg-blue-900/30 text-blue-400 border border-blue-800/50' 
            : 'bg-blue-50 text-[#2563EB] hover:bg-blue-100'
        }`}>
          {t('landingPage.hero.badge')}
        </Badge>
        <h1 className={`text-4xl lg:text-6xl font-black leading-[1.1] tracking-tight ${
          isDarkMode ? 'text-white' : 'text-[#12141D]'
        }`}>
          {t('landingPage.hero.titlePart1')} <span className={isDarkMode ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400' : 'text-[#2563EB]'}>{t('landingPage.hero.titlePart2')}</span>
        </h1>
        <p className={`text-lg max-w-lg leading-relaxed font-medium ${
          isDarkMode ? 'text-slate-400' : 'text-gray-500'
        }`}>
          {t('landingPage.hero.subtitle')}
        </p>
        <div className="flex flex-wrap gap-5 pt-4">
          <Button size="lg" className={`h-14 px-8 text-base font-black rounded-2xl transition-all hover:-translate-y-1 ${
            isDarkMode 
              ? 'bg-blue-600 hover:bg-blue-500 shadow-2xl shadow-blue-900/30' 
              : 'bg-[#2563EB] hover:bg-blue-700 shadow-2xl shadow-blue-200'
          }`}>
            {t('landingPage.hero.startLearning')}
          </Button>
          <Button size="lg" variant="outline" className={`h-14 px-8 text-base font-bold rounded-2xl border-2 gap-2 group ${
            isDarkMode 
              ? 'border-slate-700 bg-transparent hover:bg-slate-800 text-slate-100' 
              : 'bg-white'
          }`}>
            <PlayCircle className="w-6 h-6 text-red-500 group-hover:scale-110 transition-transform" /> {t('landingPage.hero.watchDemo')}
          </Button>
        </div>
        
        <div className={`flex items-center gap-6 pt-6 transition-all duration-500 cursor-default ${
          isDarkMode ? 'opacity-80' : 'grayscale opacity-70 hover:grayscale-0 hover:opacity-100'
        }`}>
          <div className="flex -space-x-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`w-12 h-12 rounded-full border-4 overflow-hidden shadow-md ${
                isDarkMode ? 'border-slate-950 bg-slate-800' : 'border-white bg-gray-200'
              }`}>
                <img src={`https://i.pravatar.cc/100?img=${i+15}`} alt="learner" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="text-sm font-bold">
            <p className={`text-base ${isDarkMode ? 'text-white' : 'text-[#12141D]'}`}>15,000+</p>
            <p className={`font-semibold uppercase tracking-tighter ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{t('landingPage.hero.activeStudents')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 relative flex justify-center lg:justify-end animate-in zoom-in duration-1000 delay-300">
        {/* 1. Decorative Glow */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] rounded-full blur-3xl -z-10 ${
          isDarkMode ? 'bg-yellow-500/10' : 'bg-yellow-400/20'
        }`}></div>
        
        {/* 2. Khung viền ngoài (Glass) */}
        <div className={`relative z-10 backdrop-blur-2xl p-4 rounded-[50px] border shadow-2xl ${
          isDarkMode 
            ? 'bg-slate-900/50 border-slate-700/50 shadow-slate-900/50' 
            : 'bg-slate-200/60 border-slate-300 shadow-slate-900/20'
        }`}>
          
          {/* 3. Bề mặt Mockup chính */}
          <div className={`w-full md:w-[450px] h-[550px] rounded-[40px] flex items-center justify-center overflow-hidden border-2 relative group shadow-inner ${
            isDarkMode 
              ? 'bg-slate-950 border-slate-800' 
              : 'bg-slate-100 border-slate-300'
          }`}>
            
            {/* 4. Placeholder UI Dashboard */}
            <div className={`absolute inset-0 flex flex-col p-8 space-y-6 ${
              isDarkMode 
                ? 'bg-gradient-to-br from-slate-900 to-slate-950' 
                : 'bg-gradient-to-br from-slate-200 to-slate-50'
            }`}>
              
              {/* Header Placeholder */}
              <div className={`h-8 w-1/3 rounded-xl animate-pulse ${isDarkMode ? 'bg-slate-800' : 'bg-slate-300'}`}/>
              
              <div className="flex gap-4">
                {/* Card chính màu xanh */}
                <div className={`h-36 w-1/2 rounded-3xl p-5 shadow-xl border ${
                  isDarkMode 
                    ? 'bg-blue-900/20 border-blue-900/50 shadow-blue-900/20' 
                    : 'bg-blue-600 border-blue-500 shadow-blue-900/30'
                }`}>
                  <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center backdrop-blur-md ${
                    isDarkMode ? 'bg-blue-600' : 'bg-white/20'
                  }`}>
                    <BrainCircuit className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-white'}`}/>
                  </div>
                  <div className={`h-3.5 w-20 rounded-full mb-2 ${isDarkMode ? 'bg-blue-900/50' : 'bg-white/50'}`}/>
                  <div className={`h-2.5 w-12 rounded-full ${isDarkMode ? 'bg-blue-900/30' : 'bg-white/30'}`}/>
                </div>

                {/* Card phụ */}
                <div className={`h-36 w-1/2 border-2 rounded-3xl ${
                  isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-300/40 border-slate-300'
                }`}/>
              </div>
              
              {/* Vùng nội dung */}
              <div className={`flex-1 border-2 rounded-3xl p-6 space-y-5 shadow-sm ${
                isDarkMode 
                  ? 'bg-slate-800/50 border-slate-700' 
                  : 'bg-white/80 border-slate-200'
              }`}>
                <div className={`h-4 w-full rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300/50'}`}/>
                <div className={`h-4 w-3/4 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300/50'}`}/>
                <div className={`h-4 w-5/6 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300/50'}`}/>
                <div className={`h-4 w-1/2 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300/50'}`}/>
                <div className={`h-4 w-2/3 rounded-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300/50'}`}/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

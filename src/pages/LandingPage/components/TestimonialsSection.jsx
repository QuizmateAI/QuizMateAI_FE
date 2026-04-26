import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Sparkles } from 'lucide-react';
import LocalAvatar from '@/components/ui/LocalAvatar';

const TestimonialsSection = () => {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language?.startsWith('en') ? 'font-poppins' : 'font-sans';
  const studentOneName = t('landingPage.testimonials.student1Name', 'Sarah Johnson');
  const studentTwoName = t('landingPage.testimonials.student2Name', 'Mark Thompson');

  return (
    <section className={`py-32 text-white overflow-hidden relative transition-colors duration-300 ${fontClass} ${
      isDarkMode 
        ? 'bg-blue-900/40 border-y border-slate-800' 
        : 'bg-[#2563EB]'
    }`}>
      {/* Background layer for dark mode */}
      {isDarkMode && <div className="absolute inset-0 bg-slate-950 -z-20" />}
      
      {/* Background Sparkles Decor */}
      <Sparkles className="absolute top-10 left-10 w-24 h-24 opacity-10 rotate-12" />
      <Sparkles className="absolute bottom-10 right-10 w-24 h-24 opacity-10 -rotate-12" />

      <div className="container mx-auto px-6 text-center space-y-20 relative z-10">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight">{t('landingPage.testimonials.title')}</h2>
        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div className={`text-left space-y-8 p-10 rounded-[40px] backdrop-blur-lg border transition-all ${
            isDarkMode 
              ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70' 
              : 'bg-white/10 border-white/20 hover:bg-white/15'
          }`}>
            <p className={`text-xl italic leading-relaxed font-medium ${
              isDarkMode ? 'text-slate-200' : ''
            }`}>
              {t('landingPage.testimonials.student1Quote')}
            </p>
            <div className="flex items-center gap-5">
              <div className={`w-16 h-16 rounded-2xl overflow-hidden border-4 rotate-3 ${
                isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-blue-300 border-white/30'
              }`}>
                <LocalAvatar
                  label={studentOneName}
                  initials="SJ"
                  tone="rose"
                  className="h-full w-full rounded-[10px]"
                  textClassName="text-sm tracking-wide"
                />
              </div>
              <div>
                <p className="font-black text-lg">{studentOneName}</p>
                <p className={`font-bold text-sm uppercase tracking-wider ${
                  isDarkMode ? 'text-slate-400' : 'text-blue-200'
                }`}>{t('landingPage.testimonials.student1Role')}</p>
              </div>
            </div>
          </div>
          <div className={`text-left space-y-8 p-10 rounded-[40px] backdrop-blur-lg border transition-all ${
            isDarkMode 
              ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70' 
              : 'bg-white/10 border-white/20 hover:bg-white/15'
          }`}>
            <p className={`text-xl italic leading-relaxed font-medium ${
              isDarkMode ? 'text-slate-200' : ''
            }`}>
              {t('landingPage.testimonials.student2Quote')}
            </p>
            <div className="flex items-center gap-5">
              <div className={`w-16 h-16 rounded-2xl overflow-hidden border-4 -rotate-3 ${
                isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-blue-300 border-white/30'
              }`}>
                <LocalAvatar
                  label={studentTwoName}
                  initials="MT"
                  tone="emerald"
                  className="h-full w-full rounded-[10px]"
                  textClassName="text-sm tracking-wide"
                />
              </div>
              <div>
                <p className="font-black text-lg">{studentTwoName}</p>
                <p className={`font-bold text-sm uppercase tracking-wider ${
                  isDarkMode ? 'text-slate-400' : 'text-blue-200'
                }`}>{t('landingPage.testimonials.student2Role')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

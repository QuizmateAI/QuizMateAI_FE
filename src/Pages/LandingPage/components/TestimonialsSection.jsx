import React from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';

const TestimonialsSection = () => {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  return (
    <section className={`bg-[#2563EB] py-32 text-white overflow-hidden relative ${fontClass}`}>
      {/* Background Sparkles Decor */}
      <Sparkles className="absolute top-10 left-10 w-24 h-24 opacity-10 rotate-12" />
      <Sparkles className="absolute bottom-10 right-10 w-24 h-24 opacity-10 -rotate-12" />

      <div className="container mx-auto px-6 text-center space-y-20 relative z-10">
        <h2 className="text-3xl md:text-4xl font-black tracking-tight">{t('landingPage.testimonials.title')}</h2>
        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div className="text-left space-y-8 bg-white/10 p-10 rounded-[40px] backdrop-blur-lg border border-white/20 hover:bg-white/15 transition-all">
            <p className="text-xl italic leading-relaxed font-medium">
              {t('landingPage.testimonials.student1Quote')}
            </p>
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-300 overflow-hidden border-4 border-white/30 rotate-3">
                <img src="https://i.pravatar.cc/100?img=32" alt="student" />
              </div>
              <div>
                <p className="font-black text-lg">Sarah Johnson</p>
                <p className="text-blue-200 font-bold text-sm uppercase tracking-wider">{t('landingPage.testimonials.student1Role')}</p>
              </div>
            </div>
          </div>
          <div className="text-left space-y-8 bg-white/10 p-10 rounded-[40px] backdrop-blur-lg border border-white/20 hover:bg-white/15 transition-all">
            <p className="text-xl italic leading-relaxed font-medium">
              {t('landingPage.testimonials.student2Quote')}
            </p>
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-300 overflow-hidden border-4 border-white/30 -rotate-3">
                <img src="https://i.pravatar.cc/100?img=44" alt="student" />
              </div>
              <div>
                <p className="font-black text-lg">Mark Thompson</p>
                <p className="text-blue-200 font-bold text-sm uppercase tracking-wider">{t('landingPage.testimonials.student2Role')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

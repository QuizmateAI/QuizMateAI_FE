import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import PricingSection from './components/PricingSection';
import TestimonialsSection from './components/TestimonialsSection';
import Footer from './components/Footer';

const LandingPageContent = () => {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language?.startsWith('en') ? 'font-poppins' : 'font-sans';
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    <div className={`min-h-screen ${fontClass} animate-in fade-in duration-500 transition-colors ${
      isDarkMode
        ? 'bg-slate-950 text-slate-50'
        : 'bg-white text-[#12141D]'
    }`}
    >
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <Footer />
      {isVisible && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`fixed bottom-8 right-8 p-3 rounded-full text-white shadow-lg transition-colors z-50 ${
            isDarkMode
              ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          title={t('common.scrollToTop')}
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

const LandingPage = () => <LandingPageContent />;

export default LandingPage;

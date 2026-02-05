import React, { useState, useEffect } from 'react'; // Thêm useState, useEffect
import { ArrowUp } from 'lucide-react'; // Thêm icon ArrowUp
import { DarkModeProvider, useDarkMode } from '@/hooks/useDarkMode';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import PricingSection from './components/PricingSection';
import TestimonialsSection from './components/TestimonialsSection';
import Footer from './components/Footer';

// Component nội bộ để sử dụng useDarkMode hook
const LandingPageContent = () => {
  const { isDarkMode } = useDarkMode();
  // Mặc định sử dụng tiếng Anh và font Poppins
  const fontClass = 'font-poppins'; 
  const [isVisible, setIsVisible] = useState(false);

  // logic kiểm soát hiển thị nút cuộn lên đầu trang
  useEffect(() => {
    const toggleVisibility = () => {
      // Nếu cuộn xuống quá 300px thì hiện nút
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
    }`}>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <Footer />
      {/* Nút cuộn lên đầu trang */}
      {isVisible && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`fixed bottom-8 right-8 p-3 rounded-full text-white shadow-lg transition-colors z-50 ${
            isDarkMode 
              ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/50' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
          title="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

// Component chính wrap với DarkModeProvider
const LandingPage = () => {
  return (
    <DarkModeProvider>
      <LandingPageContent />
    </DarkModeProvider>
  );
};

export default LandingPage;
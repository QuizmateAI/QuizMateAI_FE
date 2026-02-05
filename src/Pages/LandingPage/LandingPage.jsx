import React, { useState, useEffect } from 'react'; // Thêm useState, useEffect
import { ArrowUp } from 'lucide-react'; // Thêm icon ArrowUp
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import FeaturesSection from './components/FeaturesSection';
import PricingSection from './components/PricingSection';
import TestimonialsSection from './components/TestimonialsSection';
import Footer from './components/Footer';

const LandingPage = () => {
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

    // hàm cuộn lên đầu trang
    const scrollToTop = () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);



  return (
    <div className={`min-h-screen bg-white ${fontClass} text-[#12141D] animate-in fade-in duration-500`}>
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
          className="fixed bottom-8 right-8 p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors z-50 stroke-white/20"
          title="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default LandingPage;
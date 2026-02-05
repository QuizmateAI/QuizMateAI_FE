import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Globe } from 'lucide-react';
import LogoLight from "@/assets/LightMode_Logo.png";

const Navbar = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  // Lấy ngôn ngữ hiện tại và tính toán font class
  const currentLang = i18n.language;
  const fontClass = currentLang === 'en' ? 'font-poppins' : 'font-sans';

  // Hàm chuyển đổi ngôn ngữ
  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
  };

  return (
    // Thẻ nav bọc ngoài cùng: Luôn dính, có Z-index cao nhất, và có nền để không bị lẫn nội dung
    <nav className={`sticky top-0 z-[100] w-full bg-white border-b border-gray-100 shadow-sm ${fontClass}`}>
      <div className="container mx-auto flex items-center justify-between h-20">
        <div className="flex items-center gap-x-12">
          <img 
            src={LogoLight} 
            alt="QuizMate Logo" 
            className="h-[100px] w-[120px] cursor-pointer object-contain" 
            onClick={() => navigate('/')} 
          />
          <div className="hidden lg:flex items-center gap-x-8 text-sm font-bold text-gray-500 uppercase tracking-widest">
            <a href="#features" className="hover:text-[#2563EB] transition-colors">{t('landingPage.nav.features')}</a>
            <a href="#solutions" className="hover:text-[#2563EB] transition-colors">{t('landingPage.nav.solutions')}</a>
            <a href="#pricing" className="hover:text-[#2563EB] transition-colors">{t('landingPage.nav.pricing')}</a>
          </div>
        </div>
        <div className="flex items-center gap-x-4">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-600"
          >
            <Globe className="w-4 h-4" />
            <span>{currentLang === 'vi' ? 'VI' : 'EN'}</span>
          </button>
          <Button 
            variant="ghost" 
            className="font-bold text-gray-700"
            onClick={() => navigate('/login')}
          >
            {t('landingPage.nav.login')}
          </Button>
          <Button 
            className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold px-8 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-95"
            onClick={() => navigate('/register')}
          >
            {t('landingPage.nav.signup')}
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
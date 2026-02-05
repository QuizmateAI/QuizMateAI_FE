import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import LogoLight from "@/assets/LightMode_Logo.png";

const Footer = () => {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';

  return (
    <footer className={`py-10 border-t border-gray-100 bg-white ${fontClass}`}>
      <div className="container mx-auto px-6 md:px-[100px] grid md:grid-cols-4 gap-12 mb-4">
        {/* Brand Column */}
        <div className="flex flex-col items-start space-y-1 mr-6">
          <img src={LogoLight} alt="QuizMate Logo" className="h-[120px] w-auto object-contain" />
          <p className="text-gray-500 font-medium text-sm leading-relaxed text-left max-w-xs">
            {t('landingPage.footer.brandDesc')}
          </p>
        </div>

        {/* Product Column */}
        <div className="pt-10 flex flex-col space-y-6 text-left">
          <h5 className="font-black uppercase text-xs tracking-[0.2em] text-[#12141D]">{t('landingPage.footer.product')}</h5>
          <ul className="space-y-4 text-gray-500 font-semibold text-sm">
            <li><a href="#" className="hover:text-[#2563EB] transition-colors">{t('landingPage.footer.productLinks.roadmap')}</a></li>
            <li><a href="#" className="hover:text-[#2563EB] transition-colors">{t('landingPage.footer.productLinks.quizzes')}</a></li>
            <li><a href="#" className="hover:text-[#2563EB] transition-colors">{t('landingPage.footer.productLinks.groups')}</a></li>
          </ul>
        </div>

        {/* Company Column */}
        <div className=" pt-10 flex flex-col space-y-6 text-left">
          <h5 className="font-black uppercase text-xs tracking-[0.2em] text-[#12141D]">{t('landingPage.footer.company')}</h5>
          <ul className="space-y-4 text-gray-500 font-semibold text-sm">
            <li><a href="#" className="hover:text-[#2563EB] transition-colors">{t('landingPage.footer.companyLinks.about')}</a></li>
            <li><a href="#" className="hover:text-[#2563EB] transition-colors">{t('landingPage.footer.companyLinks.privacy')}</a></li>
            <li><a href="#" className="hover:text-[#2563EB] transition-colors">{t('landingPage.footer.companyLinks.terms')}</a></li>
          </ul>
        </div>

        {/* Connect Column */}
        <div className="pt-10 flex flex-col space-y-6 text-left">
          <h5 className="font-black uppercase text-xs tracking-[0.2em] text-[#12141D]">{t('landingPage.footer.connect')}</h5>
          <div className="flex gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center cursor-pointer hover:bg-blue-50 hover:text-[#2563EB] transition-all hover:-translate-y-1 shadow-sm border border-transparent hover:border-blue-100">
                <Globe className="w-5 h-5" />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Copyright */}
      <div className="border-t border-gray-50 mt-8">
        <div className="container mx-auto px-6 text-right md:text-right text-xs font-bold text-gray-300 uppercase tracking-widest">
          {t('landingPage.footer.copyright')}
        </div>
      </div>
    </footer>
  );
};

export default Footer;

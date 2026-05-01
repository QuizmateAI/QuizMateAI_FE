import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Facebook, Youtube, Linkedin, Mail, MapPin } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import LogoLight from '@/assets/LightMode_Logo.webp';
import LogoDark from '@/assets/DarkMode_Logo.webp';

const SOCIAL = [
  { Icon: Facebook, label: 'Facebook', href: 'https://facebook.com' },
  { Icon: Youtube, label: 'YouTube', href: 'https://youtube.com' },
  { Icon: Linkedin, label: 'LinkedIn', href: 'https://linkedin.com' },
];

const Footer = () => {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const fontClass = i18n.language?.startsWith('en') ? 'font-poppins' : 'font-sans';

  const linkClass = `block py-1 transition-colors ${
    isDarkMode
      ? 'text-slate-400 hover:text-white'
      : 'text-slate-600 hover:text-slate-900'
  }`;

  const headerClass = `text-[11px] font-bold uppercase tracking-[0.2em] mb-4 ${
    isDarkMode ? 'text-slate-500' : 'text-slate-400'
  }`;

  return (
    <footer
      className={`relative border-t transition-colors duration-300 ${fontClass} ${
        isDarkMode
          ? 'bg-slate-950 border-slate-800/70 text-slate-400'
          : 'bg-white border-slate-200/70'
      }`}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-px ${
          isDarkMode
            ? 'bg-gradient-to-r from-transparent via-slate-700 to-transparent'
            : 'bg-gradient-to-r from-transparent via-slate-300 to-transparent'
        }`}
      />

      <div className="container mx-auto px-6 lg:px-12 pt-14 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-x-8 gap-y-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-4">
            <Link to="/" className="inline-block">
              <img
                src={isDarkMode ? LogoDark : LogoLight}
                alt={t('common.brandLogoAlt', { brandName: 'QuizMate AI' })}
                className="h-20 w-auto object-contain"
              />
            </Link>
            <p
              className={`mt-3 text-sm leading-relaxed max-w-sm ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {t('landingPage.footer.brandDesc')}
            </p>
            <div className="mt-5 space-y-2 text-sm">
              <a
                href="mailto:support@quizmateai.io.vn"
                className={`inline-flex items-center gap-2 ${
                  isDarkMode
                    ? 'text-slate-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-4 h-4" />
                support@quizmateai.io.vn
              </a>
              <p
                className={`flex items-center gap-2 text-xs ${
                  isDarkMode ? 'text-slate-500' : 'text-slate-500'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                Đại học FPT, Khu CNC , Hồ Chí Minh
              </p>
            </div>
          </div>

          {/* Product */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2 lg:col-start-6">
            <h5
              className={`${headerClass} ${
                isDarkMode ? 'text-slate-200' : 'text-slate-700'
              }`}
            >
              {t('landingPage.footer.product')}
            </h5>
            <ul className="space-y-1 text-sm font-medium">
              <li><a href="/#features" className={linkClass}>{t('landingPage.footer.productLinks.roadmap')}</a></li>
              <li><a href="/#features" className={linkClass}>{t('landingPage.footer.productLinks.quizzes')}</a></li>
              <li><a href="/#features" className={linkClass}>{t('landingPage.footer.productLinks.flashcards', 'AI Flashcards')}</a></li>
              <li><a href="/#features" className={linkClass}>{t('landingPage.footer.productLinks.groups')}</a></li>
            </ul>
          </div>

          {/* Company */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <h5
              className={`${headerClass} ${
                isDarkMode ? 'text-slate-200' : 'text-slate-700'
              }`}
            >
              {t('landingPage.footer.company')}
            </h5>
            <ul className="space-y-1 text-sm font-medium">
              <li><a href="/#about" className={linkClass}>{t('landingPage.footer.companyLinks.about')}</a></li>
              <li><a href="mailto:support@quizmateai.io.vn" className={linkClass}>{t('landingPage.footer.companyLinks.support', 'Support')}</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="col-span-2 md:col-span-2 lg:col-span-2">
            <h5
              className={`${headerClass} ${
                isDarkMode ? 'text-slate-200' : 'text-slate-700'
              }`}
            >
              {t('landingPage.footer.legal', 'Legal')}
            </h5>
            <ul className="space-y-1 text-sm font-medium">
              <li><Link to="/policies/terms-of-service" className={linkClass}>{t('landingPage.footer.legalLinks.terms', t('landingPage.footer.companyLinks.terms'))}</Link></li>
              <li><Link to="/policies/privacy-policy" className={linkClass}>{t('landingPage.footer.legalLinks.privacy', t('landingPage.footer.companyLinks.privacy'))}</Link></li>
              <li><Link to="/policies/community-guidelines" className={linkClass}>{t('landingPage.footer.legalLinks.community', 'Community Guidelines')}</Link></li>
              <li><Link to="/policies/ai-usage-policy" className={linkClass}>{t('landingPage.footer.legalLinks.aiUsage', 'AI Usage')}</Link></li>
              <li><Link to="/policies/refund-policy" className={linkClass}>{t('landingPage.footer.legalLinks.refund', 'Refund')}</Link></li>
              <li>
                <Link
                  to="/policies"
                  className={`block py-1 font-semibold transition-colors ${
                    isDarkMode
                      ? 'text-blue-400 hover:text-blue-300'
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  {t('landingPage.footer.legalLinks.viewAll', 'View all policies')} →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className={`mt-12 pt-6 border-t flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
            isDarkMode ? 'border-slate-800/70' : 'border-slate-200/70'
          }`}
        >
          <p
            className={`text-xs font-medium ${
              isDarkMode ? 'text-slate-500' : 'text-slate-500'
            }`}
          >
            {t('landingPage.footer.copyright')}
            <span className="mx-2 opacity-50">·</span>
            <span className="opacity-80">{t('landingPage.footer.madeIn', 'Made in Vietnam')} 🇻🇳</span>
          </p>

          <div className="flex items-center gap-2">
            {SOCIAL.map(({ Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5 ${
                  isDarkMode
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

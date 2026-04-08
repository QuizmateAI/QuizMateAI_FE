import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  Globe,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import ListSpinner from '@/Components/ui/ListSpinner';
import UserProfilePopover from '@/Components/features/Users/UserProfilePopover';
import CreditIconImage from '@/Components/ui/CreditIconImage';
import LogoLight from '@/assets/LightMode_Logo.webp';
import LogoDark from '@/assets/DarkMode_Logo.webp';
import { getPurchaseableCreditPackages } from '@/api/ManagementSystemAPI';
import PaymentSidebar from './components/PaymentSidebar';
import { buildWalletsPath } from '@/lib/routePaths';

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(Number(value) || 0);
}

function formatVnd(value, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export default function CreditPaymentPage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const currentLang = i18n.language;
  const locale = currentLang === 'vi' ? 'vi-VN' : 'en-US';
  const creditPackageId = searchParams.get('creditPackageId');
  const workspaceId = searchParams.get('workspaceId') || location.state?.workspaceId || null;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [creditPackage, setCreditPackage] = useState(null);
  const [loading, setLoading] = useState(Boolean(creditPackageId));
  const [error, setError] = useState(null);
  const settingsRef = useRef(null);

  const walletsPath = buildWalletsPath();
  const backTo = location.state?.from || walletsPath;
  const bonusCredit = Number(creditPackage?.bonusCredit ?? 0);
  const baseCredit = Number(creditPackage?.baseCredit ?? 0);
  const totalCredit = baseCredit + bonusCredit;

  const toggleLanguage = () => {
    const newLang = currentLang === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(newLang);
    localStorage.setItem('app_language', newLang);
  };

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSettingsOpen]);

  useEffect(() => {
    if (!creditPackageId) return;

    let cancelled = false;

    getPurchaseableCreditPackages()
      .then((res) => {
        if (cancelled) return;
        const packages = res?.data ?? res;
        const matchedPackage = Array.isArray(packages)
          ? packages.find((item) => String(item.creditPackageId) === String(creditPackageId))
          : null;

        if (!matchedPackage) {
          setError(t('wallet.noPackage', { defaultValue: 'Không tìm thấy gói credit.' }));
        } else {
          setCreditPackage(matchedPackage);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(t('payment.fetchError'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [creditPackageId, t]);

  return (
    <div className={`min-h-screen ${fontClass} transition-colors ${
      isDarkMode
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50'
        : 'bg-gradient-to-br from-emerald-50 via-white to-blue-50 text-slate-900'
    }`}>
      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'
      }`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <img
              src={isDarkMode ? LogoDark : LogoLight}
              alt="QuizMateAI"
              className="hidden h-[120px] w-[120px] object-contain sm:block"
            />
            <button
              type="button"
              onClick={() => navigate(backTo, { replace: true })}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                isDarkMode
                  ? 'text-slate-300 hover:bg-slate-800 hover:text-slate-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              {t('wallet.back')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(walletsPath)}
              className={`flex h-10 items-center gap-2 rounded-full px-4 ${
                isDarkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="hidden text-sm sm:inline">{t('common.wallet')}</span>
            </Button>
            <div ref={settingsRef} className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className={`flex h-10 items-center gap-2 rounded-full px-4 ${
                  isDarkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'
                }`}
                aria-expanded={isSettingsOpen}
                aria-haspopup="menu"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden text-sm sm:inline">{t('common.settings')}</span>
              </Button>

              {isSettingsOpen && (
                <div
                  role="menu"
                  className={`absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border shadow-lg transition-colors duration-300 ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={toggleLanguage}
                    className={`flex w-full items-center justify-between px-4 py-3 text-sm transition-colors cursor-pointer ${
                      isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`flex items-center gap-2 ${fontClass}`}>
                      <Globe className="w-4 h-4" />
                      {t('common.language')}
                    </span>
                    <span className={`text-xs font-semibold ${fontClass}`}>{currentLang === 'vi' ? 'VI' : 'EN'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleDarkMode}
                    className={`flex w-full items-center justify-between px-4 py-3 text-sm transition-colors cursor-pointer ${
                      isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`flex items-center gap-2 ${fontClass}`}>
                      {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      {t('common.theme')}
                    </span>
                    <span className={`text-xs font-semibold ${fontClass}`}>
                      {isDarkMode ? t('common.dark') : t('common.light')}
                    </span>
                  </button>
                </div>
              )}
            </div>
            <UserProfilePopover isDarkMode={isDarkMode} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {!creditPackageId ? (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <AlertCircle className={`w-10 h-10 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
            <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('payment.noPlanId')}</p>
          </div>
        ) : loading ? (
          <ListSpinner variant="section" className="py-32" />
        ) : error || !creditPackage ? (
          <div className="flex flex-col items-center justify-center gap-4 py-32">
            <AlertCircle className={`w-10 h-10 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
            <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{error || t('payment.fetchError')}</p>
            <Button
              variant="outline"
              onClick={() => navigate(backTo, { replace: true })}
              className={isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}
            >
              <ArrowLeft className="mr-2 w-4 h-4" />
              {t('wallet.back')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-8 lg:flex-row">
            <div className="min-w-0 flex-1">
              <Card className={`overflow-hidden backdrop-blur-xl ${
                isDarkMode ? 'bg-slate-900/50 border-slate-700/50' : 'bg-white/80 border-white/70 shadow-slate-900/10'
              }`}>
                <CardHeader className="pb-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        <span className={`inline-flex items-center justify-center rounded-2xl ring-1 ring-inset ${
                          isDarkMode
                            ? 'bg-emerald-500/10 ring-emerald-400/25'
                            : 'bg-emerald-600/10 ring-emerald-600/20'
                        }`}>
                          <CreditIconImage alt="Quizmate Credit" className="w-10 h-10 rounded-2xl" />
                        </span>
                        <span>{t('wallet.buyTitle')}</span>
                      </CardTitle>
                      <CardDescription className={`mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {t('wallet.buySubtitle')}
                      </CardDescription>
                    </div>
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                      isDarkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      <Plus className="w-3.5 h-3.5" />
                      {t('wallet.creditsUnit')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-0">
                  <div className={`rounded-[28px] border p-5 sm:p-6 ${
                    isDarkMode
                      ? 'border-slate-700/60 bg-slate-950/40'
                      : 'border-slate-200 bg-white'
                  }`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className={`text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                          {formatNumber(totalCredit, locale)} {t('wallet.creditsUnit')}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {formatNumber(baseCredit, locale)} {t('wallet.regularCredits')}
                          </span>
                          {bonusCredit > 0 && (
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              isDarkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              +{formatNumber(bonusCredit, locale)} {t('wallet.bonus')}
                            </span>
                          )}
                        </div>
                        <p className={`mt-3 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {t('wallet.packageHint')}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {t('payment.total')}
                        </p>
                        <p className={`mt-1 text-3xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                          {formatVnd(creditPackage.price, locale)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className={`rounded-2xl p-4 ring-1 ring-inset ${
                      isDarkMode ? 'bg-slate-950/40 ring-slate-700/60' : 'bg-slate-50 ring-slate-200'
                    }`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t('wallet.totalAvailable')}
                      </p>
                      <p className={`mt-2 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                        {formatNumber(totalCredit, locale)}
                      </p>
                    </div>
                    <div className={`rounded-2xl p-4 ring-1 ring-inset ${
                      isDarkMode ? 'bg-slate-950/40 ring-slate-700/60' : 'bg-slate-50 ring-slate-200'
                    }`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t('wallet.regularCredits')}
                      </p>
                      <p className={`mt-2 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                        {formatNumber(baseCredit, locale)}
                      </p>
                    </div>
                    <div className={`rounded-2xl p-4 ring-1 ring-inset ${
                      isDarkMode ? 'bg-emerald-500/10 ring-emerald-400/25' : 'bg-emerald-50 ring-emerald-200'
                    }`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        {t('wallet.bonus')}
                      </p>
                      <p className={`mt-2 text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                        +{formatNumber(bonusCredit, locale)}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-2 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    <span>{t('payment.chooseMethod')}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="w-full shrink-0 lg:w-[400px]">
              <div className="lg:sticky lg:top-24">
                <PaymentSidebar creditPackage={creditPackage} workspaceId={workspaceId} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

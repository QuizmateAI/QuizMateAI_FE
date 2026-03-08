import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useTranslation } from 'react-i18next';
import { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Globe, Moon, Settings, Sun, CreditCard, Loader2, AlertCircle, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import ListSpinner from '@/Components/ui/ListSpinner';
import DarkLogo from '@/assets/DarkMode_Logo.webp';
import LightLogo from '@/assets/LightMode_Logo.webp';
import PlanInfoCard from './components/PlanInfoCard';
import PaymentSidebar from './components/PaymentSidebar';
import UserProfilePopover from '@/Components/features/Users/UserProfilePopover';
import { getPlanById } from '@/api/PaymentAPI';
import { useGroup } from '@/hooks/useGroup';

export default function PaymentPage() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const currentLang = i18n.language;

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const { groups } = useGroup({ enabled: true });
  const leaderGroups = groups.filter((g) => g.memberRole === 'LEADER');

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

  const planId = searchParams.get('planId');
  const groupId = searchParams.get('groupId') || selectedGroupId;
  const planTypeParam = searchParams.get('planType');

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    getPlanById(planId)
      .then((res) => {
        if (!cancelled) { setPlan(res.data); setLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setError(t('payment.fetchError')); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [planId, t]);

  const noPlanId = !planId;
  const isGroupPlan = plan?.type === 'GROUP' || planTypeParam === 'GROUP';
  const needGroupSelect = isGroupPlan && !searchParams.get('groupId');

  const selectedGroup = groups.find((g) => String(g.groupId) === String(groupId));

  return (
    <div className={`min-h-screen ${fontClass} transition-colors ${
      isDarkMode
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50'
        : 'bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 text-slate-900'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 backdrop-blur-xl border-b ${
        isDarkMode
          ? 'bg-slate-900/80 border-slate-800'
          : 'bg-white/80 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-20 px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
           
            <img
              src={isDarkMode ? DarkLogo : LightLogo}
              alt="QuizMateAI"
              className="h-[120px] w-[120px] object-contain hidden sm:block"
            />
             <button
              type="button"
              onClick={() => navigate('/profile', { state: { tab: 'subscription' } })}
              className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                isDarkMode
                  ? 'text-slate-300 hover:text-slate-100 hover:bg-slate-800'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              {t('payment.backToPlans')}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div ref={settingsRef} className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className={`flex items-center gap-2 rounded-full ${isDarkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'}`}
                aria-expanded={isSettingsOpen}
                aria-haspopup="menu"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">{t('common.settings')}</span>
              </Button>

              {isSettingsOpen && (
                <div
                  role="menu"
                  className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-lg overflow-hidden transition-colors duration-300 ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-gray-200 text-gray-800'
                  }`}
                >
                  <button
                    type="button"
                    onClick={toggleLanguage}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors cursor-pointer ${
                      isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`flex items-center gap-2 ${fontClass}`}>
                      <Globe className="w-4 h-4" />
                      {t('common.language')}
                    </span>
                    <span className={`text-xs font-semibold ${fontClass}`}>
                      {currentLang === 'vi' ? 'VI' : 'EN'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleDarkMode}
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors cursor-pointer ${
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
                  <div className={`h-px w-full ${isDarkMode ? 'bg-slate-800' : 'bg-gray-100'}`} />
                  <button
                    type="button"
                    onClick={() => { setIsSettingsOpen(false); navigate('/profile', { state: { tab: 'subscription' } }); }}
                    className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors cursor-pointer ${
                      isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`flex items-center gap-2 ${fontClass}`}>
                      <CreditCard className="w-4 h-4" />
                      {t('common.subscription')}
                    </span>
                  </button>
                </div>
              )}
            </div>
            
            <UserProfilePopover isDarkMode={isDarkMode} />
          </div>
        </div>
      </header>

      {/* Two-column layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {noPlanId ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <AlertCircle className={`w-10 h-10 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
            <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{t('payment.noPlanId')}</p>
            <Button variant="outline" onClick={() => navigate('/profile', { state: { tab: 'subscription' } })}
              className={isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}>
              <ArrowLeft className="w-4 h-4 mr-2" />{t('payment.backToPlans')}
            </Button>
          </div>
        ) : loading ? (
          <ListSpinner variant="section" className="py-32" />
        ) : error || !plan ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <AlertCircle className={`w-10 h-10 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`} />
            <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{error || t('payment.fetchError')}</p>
            <Button variant="outline" onClick={() => navigate('/profile', { state: { tab: 'subscription' } })}
              className={isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}>
              <ArrowLeft className="w-4 h-4 mr-2" />{t('payment.backToPlans')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0">
              <PlanInfoCard plan={plan} />

              {/* Group selector — khi mua gói GROUP mà chưa chọn nhóm */}
              {needGroupSelect && (
                <div className={`mt-6 rounded-2xl p-6 ${
                  isDarkMode ? 'bg-slate-900 ring-1 ring-slate-700/50' : 'bg-white ring-1 ring-slate-200 shadow-lg shadow-slate-300/30'
                }`}>
                  <div className="flex items-center gap-3 mb-4">
                    <Users className={`w-5 h-5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                    <h3 className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {t('payment.selectGroup')}
                    </h3>
                  </div>
                  <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t('payment.selectGroupDesc')}
                  </p>
                  {leaderGroups.length === 0 ? (
                    <p className={`text-sm py-4 text-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {t('upgradePlan.noLeaderGroups')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {leaderGroups.map((g) => (
                        <button
                          key={g.groupId}
                          type="button"
                          onClick={() => setSelectedGroupId((prev) => prev === g.groupId ? null : g.groupId)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                            selectedGroupId === g.groupId
                              ? isDarkMode
                                ? 'bg-blue-600/20 border-blue-500 border ring-1 ring-blue-500/30'
                                : 'bg-blue-50 border-blue-300 border ring-1 ring-blue-200'
                              : isDarkMode
                                ? 'bg-slate-800 border border-slate-700 hover:border-slate-600'
                                : 'bg-slate-50 border border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Users className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                          <span className="flex-1 text-left truncate font-medium">{g.groupName}</span>
                          <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {g.memberCount || 0} {t('home.labels.membersUnit')}
                          </span>
                          {selectedGroupId === g.groupId && (
                            <ChevronRight className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Hiển thị nhóm đã chọn */}
              {isGroupPlan && groupId && selectedGroup && (
                <div className={`mt-6 rounded-2xl p-4 flex items-center gap-3 ${
                  isDarkMode ? 'bg-slate-800/60 ring-1 ring-slate-700' : 'bg-blue-50 ring-1 ring-blue-200'
                }`}>
                  <Users className={`w-5 h-5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {selectedGroup.groupName}
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {selectedGroup.memberCount || 0} {t('home.labels.membersUnit')}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="w-full lg:w-[400px] shrink-0">
              <div className="lg:sticky lg:top-24">
                <PaymentSidebar plan={plan} groupId={groupId} needGroupSelect={needGroupSelect && !selectedGroupId} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

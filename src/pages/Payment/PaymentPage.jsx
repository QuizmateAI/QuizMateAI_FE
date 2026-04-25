import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useTranslation } from 'react-i18next';
import { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Globe, Moon, Settings, Sun, CreditCard, AlertCircle, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ListSpinner from '@/components/ui/ListSpinner';
import DarkLogo from '@/assets/DarkMode_Logo.webp';
import LightLogo from '@/assets/LightMode_Logo.webp';
import PlanInfoCard from './components/PlanInfoCard';
import PaymentSidebar from './components/PaymentSidebar';
import PaymentMethods from './components/PaymentMethods';
import usePaymentCheckout from './hooks/usePaymentCheckout';
import UserProfilePopover from '@/components/features/users/UserProfilePopover';
import { getPlanById, getWorkspaceSlotInfo } from '@/api/PaymentAPI';
import { useGroup } from '@/hooks/useGroup';
import { useCurrentSubscription } from '@/hooks/useCurrentSubscription';

/** Chuẩn hóa plan-catalog API response sang format PlanInfoCard / PaymentSidebar / PlanDetails */
function mapPlanCatalogToPaymentPlan(raw) {
  if (!raw) return null;
  const e = raw.entitlement ?? {};
  const type = raw.planScope === 'USER' ? 'INDIVIDUAL' : (raw.planScope === 'WORKSPACE' || raw.planScope === 'GROUP_WORKSPACE' || raw.planScope === 'GROUP' ? 'GROUP' : raw.planScope);
  return {
    planId: raw.planCatalogId,
    planName: raw.displayName ?? raw.code,
    price: raw.price ?? 0,
    type,
    status: raw.status ?? 'ACTIVE',
    durationInDay: Number(raw.durationInDay) || 0,
    planLimit: {
      maxWorkspace: e.maxIndividualWorkspace,
      maxMaterialPerWorkspace: e.maxMaterialInWorkspace,
    },
    planFeature: {
      processPdf: e.canProcessPdf,
      processWord: e.canProcessWord,
      processSlide: e.canProcessSlide,
      processExcel: e.canProcessExcel,
      processText: e.canProcessText,
      processImage: e.canProcessImage,
      processVideo: e.canProcessVideo,
      processAudio: e.canProcessAudio,
      canCreateRoadMap: e.canCreateRoadMap,
      hasAiCompanionMode: e.hasAiCompanionMode,
      hasAiContentStructuring: e.hasWorkspaceAnalytics,
      hasPersonalizedLearningAnalytic: e.hasWorkspaceAnalytics,
      hasAiTextReadingAndSummarization: e.hasAiSummaryAndTextReading,
      hasAdvancedAiConfiguration: e.hasAdvanceQuizConfig,
    },
    bonusCreditOnPlanPurchase: e.bonusCreditOnPlanPurchase ?? 0,
  };
}

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
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [slotInfo, setSlotInfo] = useState(null);
  const [extraSlotCount, setExtraSlotCount] = useState(0);

  const { groups } = useGroup({ enabled: true });
  const { summary: currentPlanSummary } = useCurrentSubscription();
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
  const workspaceId = searchParams.get('workspaceId') || selectedWorkspaceId;
  const planTypeParam = searchParams.get('planType');
  const backToPlansQuery = new URLSearchParams();

  if ((plan?.type === 'GROUP' || planTypeParam === 'GROUP') && workspaceId) {
    backToPlansQuery.set('planType', 'GROUP');
    backToPlansQuery.set('workspaceId', String(workspaceId));
  }

  const backToPlansUrl = backToPlansQuery.toString()
    ? `/plans?${backToPlansQuery.toString()}`
    : '/plans';

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    getPlanById(planId)
      .then((res) => {
        if (!cancelled) {
          setPlan(mapPlanCatalogToPaymentPlan(res.data) ?? res.data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) { setError(t('payment.fetchError')); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [planId, t]);

  const noPlanId = !planId;
  const isGroupPlan = plan?.type === 'GROUP' || planTypeParam === 'GROUP';
  const needGroupSelect = isGroupPlan && !searchParams.get('workspaceId');

  useEffect(() => {
    let cancelled = false;
    const shouldFetch = isGroupPlan && Boolean(workspaceId);

    if (!shouldFetch) {
      // Đưa việc reset state sang microtask để không cascade render trong effect.
      Promise.resolve().then(() => {
        if (cancelled) return;
        setSlotInfo(null);
        setExtraSlotCount((prev) => (prev === 0 ? prev : 0));
      });
      return () => { cancelled = true; };
    }

    getWorkspaceSlotInfo(workspaceId)
      .then((res) => {
        if (cancelled) return;
        const data = res?.data ?? res;
        setSlotInfo(data || null);
        setExtraSlotCount((prev) => (prev === 0 ? prev : 0));
      })
      .catch(() => {
        if (!cancelled) {
          setSlotInfo(null);
          setExtraSlotCount((prev) => (prev === 0 ? prev : 0));
        }
      });

    return () => { cancelled = true; };
  }, [isGroupPlan, workspaceId]);

  const selectedGroup = groups.find((g) => String(g.workspaceId) === String(workspaceId));
  const {
    clearPaymentError,
    handlePay,
    isPaying,
    paymentError,
  } = usePaymentCheckout({
    paymentType: 'plan',
    planId: plan?.planId,
    planName: plan?.planName,
    planType: plan?.type,
    workspaceId,
    extraSlotCount,
  });

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
              onClick={() => navigate(backToPlansUrl)}
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(backToPlansUrl)}
              className={`flex items-center gap-2 rounded-full h-10 px-4 ${isDarkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-sm hidden max-w-[180px] truncate sm:inline">
                {currentPlanSummary?.planName || t('common.plan')}
              </span>
            </Button>
            <div ref={settingsRef} className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className={`flex items-center gap-2 rounded-full h-10 px-4 ${isDarkMode ? 'text-slate-200 hover:bg-slate-800' : 'text-gray-700 hover:bg-gray-100'}`}
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
            <Button variant="outline" onClick={() => navigate(backToPlansUrl)}
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
            <Button variant="outline" onClick={() => navigate(backToPlansUrl)}
              className={isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : ''}>
              <ArrowLeft className="w-4 h-4 mr-2" />{t('payment.backToPlans')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
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
                          key={g.workspaceId}
                          type="button"
                          onClick={() => setSelectedWorkspaceId((prev) => prev === g.workspaceId ? null : g.workspaceId)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                            selectedWorkspaceId === g.workspaceId
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
                          {selectedWorkspaceId === g.workspaceId && (
                            <ChevronRight className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Nhóm áp dụng gói (từ URL khi mua từ trong group, hoặc sau khi chọn tay) */}
              {isGroupPlan && workspaceId && (
                <div className={`mt-6 rounded-2xl p-4 flex items-center gap-3 ${
                  isDarkMode ? 'bg-slate-800/60 ring-1 ring-slate-700' : 'bg-blue-50 ring-1 ring-blue-200'
                }`}>
                  <Users className={`w-5 h-5 shrink-0 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium uppercase tracking-wide ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                      {t('payment.appliedGroup')}
                    </p>
                    <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {selectedGroup?.groupName || `#${workspaceId}`}
                    </p>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {selectedGroup
                        ? `${selectedGroup.memberCount || 0} ${t('home.labels.membersUnit')}`
                        : t('payment.appliedGroupLoading')}
                    </p>
                  </div>
                </div>
              )}

              {/* Mua thêm slot — chỉ hiện khi mua group plan và đã chọn workspace */}
              {isGroupPlan && workspaceId && slotInfo && (
                <div className={`mt-6 rounded-2xl p-6 ${
                  isDarkMode ? 'bg-slate-900 ring-1 ring-slate-700/50' : 'bg-white ring-1 ring-slate-200 shadow-lg shadow-slate-300/30'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <Users className={`w-5 h-5 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    <h3 className={`text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {t('payment.extraSlots.title', 'Mua thêm slot thành viên')}
                    </h3>
                  </div>
                  <p className={`text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {t(
                      'payment.extraSlots.description',
                      'Slot mua thêm được cộng vĩnh viễn vào giới hạn thành viên của group, thanh toán cùng lúc với gói.',
                    )}
                  </p>
                  <div className={`grid grid-cols-2 gap-3 text-xs mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    <div>
                      <span className="block opacity-70">{t('payment.extraSlots.currentMax', 'Slot hiện tại')}</span>
                      <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {slotInfo.currentMaxSlots} / {slotInfo.maxSlotsPerWorkspace}
                      </span>
                    </div>
                    <div>
                      <span className="block opacity-70">{t('payment.extraSlots.unitPrice', 'Giá 1 slot')}</span>
                      <span className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {new Intl.NumberFormat('vi-VN').format(slotInfo.unitPriceVnd || 0)}₫
                      </span>
                    </div>
                  </div>
                  {slotInfo.remainingPurchasableSlots > 0 ? (
                    <div className="flex items-center gap-3">
                      <label className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`} htmlFor="extraSlotCount">
                        {t('payment.extraSlots.inputLabel', 'Số slot cần mua')}
                      </label>
                      <input
                        id="extraSlotCount"
                        type="number"
                        min={0}
                        max={slotInfo.remainingPurchasableSlots}
                        value={extraSlotCount}
                        onChange={(e) => {
                          const raw = Number(e.target.value);
                          if (!Number.isFinite(raw) || raw < 0) {
                            setExtraSlotCount(0);
                            return;
                          }
                          setExtraSlotCount(Math.min(raw, slotInfo.remainingPurchasableSlots));
                        }}
                        className={`w-24 rounded-lg border px-3 py-2 text-sm ${
                          isDarkMode
                            ? 'border-slate-600 bg-slate-800 text-slate-100'
                            : 'border-slate-300 bg-white text-slate-800'
                        }`}
                      />
                      <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                        {t('payment.extraSlots.maxAvailable', 'Tối đa {{count}}', { count: slotInfo.remainingPurchasableSlots })}
                      </span>
                    </div>
                  ) : (
                    <p className={`text-xs ${isDarkMode ? 'text-amber-200/90' : 'text-amber-700'}`}>
                      {t('payment.extraSlots.capReached', 'Group đã đạt số slot tối đa theo cấu hình hệ thống, không thể mua thêm.')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="w-full shrink-0 xl:row-span-2">
              <div className="xl:sticky xl:top-24">
                <PaymentSidebar
                  plan={plan}
                  selectedMethod={selectedMethod}
                  onPay={() => handlePay(selectedMethod)}
                  isPaying={isPaying}
                  paymentError={paymentError}
                  needGroupSelect={needGroupSelect && !selectedWorkspaceId}
                  extraSlotCount={extraSlotCount}
                  slotUnitPrice={slotInfo?.unitPriceVnd ?? 0}
                />
              </div>
            </div>

            {!needGroupSelect || selectedWorkspaceId ? (
              <div className="min-w-0">
                <PaymentMethods
                  selectedMethod={selectedMethod}
                  onSelectMethod={(methodId) => {
                    setSelectedMethod(methodId);
                    clearPaymentError();
                  }}
                  disabled={isPaying}
                />
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}

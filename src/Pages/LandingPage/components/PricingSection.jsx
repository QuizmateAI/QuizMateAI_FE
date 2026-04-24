import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Card } from "@/Components/ui/card";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { CheckCircle2 } from 'lucide-react';
import { baseURL } from '@/api/api';

const MATERIAL_FORMATS = [
  { key: 'canProcessPdf', labelKey: 'pdf' },
  { key: 'canProcessWord', labelKey: 'word' },
  { key: 'canProcessSlide', labelKey: 'slide' },
  { key: 'canProcessExcel', labelKey: 'excel' },
  { key: 'canProcessText', labelKey: 'text' },
  { key: 'canProcessImage', labelKey: 'image' },
  { key: 'canProcessVideo', labelKey: 'video' },
  { key: 'canProcessAudio', labelKey: 'audio' },
];

function formatPlanPrice(price, locale) {
  const amount = Number(price) || 0;
  if (amount <= 0) return locale === 'vi' ? '0 ₫' : '$0';

  try {
    return new Intl.NumberFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} VND`;
  }
}

function formatList(items, locale) {
  if (!items.length) return '';
  try {
    return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(items);
  } catch {
    return items.join(', ');
  }
}

function getPlanTierKey({ plan, index, totalPlans }) {
  if (Number(plan.price) === 0 || index === 0) return 'FREE';
  if (index === totalPlans - 1) return 'TITANIUM';
  return 'PRO';
}

function getSupportedFormatLabels(plan, t) {
  const entitlement = plan?.entitlement ?? {};
  return MATERIAL_FORMATS
    .filter(({ key }) => Boolean(entitlement[key]))
    .map(({ labelKey }) => t(`plan.formats.${labelKey}`));
}

function buildFormatSummary(plan, t, locale) {
  const labels = getSupportedFormatLabels(plan, t);

  if (labels.length === 0) return null;
  if (labels.length === 1) {
    return t('plan.bullets.singleFormat', { format: labels[0] });
  }
  if (labels.length <= 3) {
    return t('plan.bullets.multiFormat', { formats: formatList(labels, locale) });
  }

  return t('plan.bullets.multiFormatMore', {
    formats: formatList(labels.slice(0, 3), locale),
    count: labels.length - 3,
  });
}

function getPlanFeatureCatalog(plan, t, locale) {
  const entitlement = plan?.entitlement ?? {};
  const items = [];
  const formatSummary = buildFormatSummary(plan, t, locale);

  if (formatSummary) items.push({ key: 'formats', bullet: formatSummary });
  if (entitlement.canCreateRoadMap) items.push({ key: 'roadmaps', bullet: t('plan.bullets.roadmaps') });
  if (entitlement.hasAiCompanionMode) items.push({ key: 'companion', bullet: t('plan.bullets.companion') });
  if (entitlement.hasAiSummaryAndTextReading) items.push({ key: 'summaries', bullet: t('plan.bullets.summaries') });
  if (entitlement.hasWorkspaceAnalytics) items.push({ key: 'analytics', bullet: t('plan.bullets.analytics') });
  if (entitlement.hasAdvanceQuizConfig) items.push({ key: 'advancedQuiz', bullet: t('plan.bullets.advancedQuiz') });
  if (Number(plan?.bonusCreditOnPlanPurchase) > 0) {
    items.push({
      key: 'bonus',
      bullet: t('plan.bullets.bonusCredits', { count: plan.bonusCreditOnPlanPurchase }),
    });
  }

  return items;
}

function pickCatalogItems(catalog, priorityKeys, limit) {
  const catalogMap = new Map(catalog.map((item) => [item.key, item]));
  return priorityKeys.map((key) => catalogMap.get(key)).filter(Boolean).slice(0, limit);
}

function buildPlanHighlights(plan, index, plans, t, locale) {
  const tierKey = getPlanTierKey({ plan, index, totalPlans: plans.length });
  const catalog = getPlanFeatureCatalog(plan, t, locale);
  const previousPlan = index > 0 ? plans[index - 1] : null;

  const priorityMap = {
    FREE: ['formats', 'roadmaps', 'companion', 'summaries'],
    PRO: ['roadmaps', 'companion', 'summaries', 'formats', 'analytics', 'advancedQuiz', 'bonus'],
    TITANIUM: ['analytics', 'advancedQuiz', 'bonus', 'summaries', 'companion', 'roadmaps', 'formats'],
  };

  const highlights = [];

  if (previousPlan) {
    highlights.push(t('plan.bullets.includesPrevious', { planName: previousPlan.displayName }));
  }

  pickCatalogItems(catalog, priorityMap[tierKey] ?? [], tierKey === 'FREE' ? 3 : 4)
    .forEach((item) => highlights.push(item.bullet));

  if (highlights.length === 0) {
    return [t('plan.bullets.coreAi')];
  }

  return Array.from(new Set(highlights)).slice(0, tierKey === 'FREE' ? 3 : 5);
}

const PricingSection = () => {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const fontClass = i18n.language === 'en' ? 'font-poppins' : 'font-sans';
  const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US';
  const [plans, setPlans] = useState([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadActivePlans = async () => {
      setIsLoadingPlans(true);

      try {
        const response = await fetch(`${baseURL}/plan-catalog/active/user?ts=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Unable to load plans: ${response.status}`);
        }

        const payload = await response.json();
        const list = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

        const normalized = list
          .filter((item) => String(item?.planScope || '').toUpperCase() === 'USER')
          .filter((item) => String(item?.status || '').toUpperCase() === 'ACTIVE')
          .sort((a, b) => (Number(a?.planLevel) || 0) - (Number(b?.planLevel) || 0))
          .map((item, index) => ({
            ...item,
            planLevel: Number(item?.planLevel) || index,
            displayName: String(item?.displayName || item?.code || `PLAN ${index + 1}`),
            description: String(item?.description || ''),
            price: Number(item?.price) || 0,
            priceLabel: formatPlanPrice(item?.price, i18n.language),
            bonusCreditOnPlanPurchase:
              Number(item?.bonusCreditOnPlanPurchase ?? item?.entitlement?.bonusCreditOnPlanPurchase) || 0,
          }));

        if (!controller.signal.aborted) {
          setPlans(normalized);
          setIsLoadingPlans(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setPlans([]);
          setIsLoadingPlans(false);
        }
      }
    };

    loadActivePlans();

    return () => {
      controller.abort();
    };
  }, [i18n.language, t]);

  const renderedPlans = plans;
  const recommendedIndex = useMemo(() => {
    if (renderedPlans.length === 0) return -1;
    const firstPaid = renderedPlans.findIndex((plan) => Number(plan?.price) > 0);
    return firstPaid >= 0 ? firstPaid : Math.min(1, renderedPlans.length - 1);
  }, [renderedPlans]);

  return (
    <section id="pricing" className={`py-16 scroll-mt-20 transition-colors duration-300 ${fontClass} ${
      isDarkMode ? 'bg-slate-950' : 'bg-white'
    }`}>
      <div className="container mx-auto px-6 text-center space-y-6 mb-16">
        <h2 className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : ''}`}>
          {t('landingPage.pricing.titlePart1')} <span className={isDarkMode ? 'text-blue-500' : 'underline decoration-[#FACC15] decoration-8 underline-offset-8'}>{t('landingPage.pricing.titlePart2')}</span>
        </h2>
        <p className={`text-base font-bold uppercase tracking-widest ${
          isDarkMode ? 'text-slate-500' : 'text-gray-400'
        }`}>{t('landingPage.pricing.subtitle')}</p>
        <div className="flex justify-center">
          <Button
            variant="outline"
            className={`rounded-full px-6 font-bold ${
              isDarkMode
                ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800'
                : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
            }`}
            onClick={() => navigate('/pricing')}
          >
            Pricing Guide
          </Button>
        </div>
      </div>

      <div className={`container mx-auto px-6 grid gap-12 max-w-7xl items-center pb-12 ${
        renderedPlans.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'
      }`}>
        {isLoadingPlans
          ? Array.from({ length: 3 }).map((_, index) => (
              <Card
                key={`pricing-empty-${index}`}
                className={`p-12 rounded-[40px] border-2 min-h-[420px] ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-white border-gray-100'
                }`}
              />
            ))
          : renderedPlans.map((plan, index) => {
              const isPopular = index === recommendedIndex;
              const features = buildPlanHighlights(plan, index, renderedPlans, t, locale);

              if (isPopular) {
                return (
                  <Card
                    key={plan.planCatalogId ?? plan.code ?? `${plan.displayName}-${index}`}
                    className={`relative z-20 overflow-hidden transform md:-translate-y-4 p-12 space-y-10 rounded-[50px] shadow-2xl transition-all duration-500 border-2 ${
                      isDarkMode
                        ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white border-blue-500 shadow-blue-500/30'
                        : 'bg-gradient-to-b from-blue-500 to-[#2c87ee] text-white border-blue-400 shadow-blue-500/40'
                    }`}
                  >
                    <Badge className={`absolute top-8 right-8 text-white border-none px-6 py-1.5 font-bold animate-pulse ${
                      isDarkMode ? 'bg-blue-400/30 backdrop-blur-sm' : 'bg-[#2563EB]'
                    }`}>
                      {t('landingPage.pricing.mostPopular')}
                    </Badge>
                    <div className="space-y-3 text-center">
                      <h4 className={`font-black uppercase tracking-widest text-sm ${isDarkMode ? 'text-blue-200' : 'opacity-60'}`}>
                        {plan.displayName}
                      </h4>
                      <p className={`text-sm leading-6 ${isDarkMode ? 'text-blue-100/80' : 'opacity-80'}`}>
                        {plan.description}
                      </p>
                      <div className="text-4xl md:text-5xl font-black break-words">{plan.priceLabel}</div>
                      <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-blue-200/60' : 'opacity-40'}`}>
                        / {t('plan.durationDays', { count: Number(plan.durationInDay) || 30 })}
                      </p>
                    </div>
                    <ul className="space-y-6 text-sm font-bold">
                      {features.map((feature, featureIndex) => (
                        <li key={`${feature}-${featureIndex}`} className="flex items-center gap-4">
                          <CheckCircle2 className={`w-6 h-6 ${isDarkMode ? 'text-blue-200' : 'text-blue-400'}`} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full font-black h-16 text-lg rounded-2xl shadow-2xl transition-all active:scale-95 ${
                        isDarkMode
                          ? 'bg-white text-blue-600 hover:bg-gray-300 shadow-black/20'
                          : 'bg-[#e0e5ef] hover:bg-blue-600 shadow-blue-900/50 text-black hover:text-white'
                      }`}
                      onClick={() => navigate('/plans')}
                    >
                      {t('landingPage.pricing.getStarted')}
                    </Button>
                  </Card>
                );
              }

              return (
                <Card
                  key={plan.planCatalogId ?? plan.code ?? `${plan.displayName}-${index}`}
                  className={`p-12 space-y-8 rounded-[40px] transition-all duration-500 border-2 ${
                    isDarkMode
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-600 shadow-lg shadow-slate-900/50'
                      : 'border-gray-100 shadow-sm hover:shadow-2xl bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    <h4 className={`font-black uppercase tracking-widest text-sm ${
                      isDarkMode ? 'text-slate-500' : 'text-gray-400'
                    }`}>
                      {plan.displayName}
                    </h4>
                    <p className={`text-sm leading-6 ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                      {plan.description}
                    </p>
                    <div className={`text-4xl md:text-5xl font-black break-words ${isDarkMode ? 'text-white' : 'text-[#12141D]'}`}>
                      {plan.priceLabel}
                    </div>
                    <p className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-gray-400'}`}>
                      / {t('plan.durationDays', { count: Number(plan.durationInDay) || 30 })}
                    </p>
                  </div>
                  <ul className={`space-y-5 text-sm font-bold ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                    {features.map((feature, featureIndex) => (
                      <li key={`${feature}-${featureIndex}`} className="flex items-center gap-4">
                        <CheckCircle2 className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="outline"
                    className={`w-full h-14 font-black rounded-2xl text-base transition-all active:scale-95 ${
                      isDarkMode
                        ? 'border-2 border-slate-600 hover:bg-slate-400 hover:border-slate-500 text-black'
                        : 'border-4 hover:bg-gray-200'
                    }`}
                    onClick={() => navigate('/plans')}
                  >
                    {t('landingPage.pricing.getStarted')}
                  </Button>
                </Card>
              );
            })}
      </div>
    </section>
  );
};

export default PricingSection;

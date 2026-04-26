import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
  Layers, FileText, Users, Sparkles, Image, FileSpreadsheet, Presentation, CheckCircle2, Map, Gift,
} from 'lucide-react';

const LIMIT_ICONS = {
  maxWorkspace: Layers,
  maxMaterialPerWorkspace: FileText,
  maxMaterialInGroup: FileText,
  maxAiCreateQuizPerDay: Sparkles,
  maxMemberSlot: Users,
};

const FEATURE_ICONS = {
  processPdf: FileText,
  processWord: FileSpreadsheet,
  processSlide: Presentation,
  processImage: Image,
  canCreateRoadMap: Map,
  hasAiCompanionMode: Sparkles,
  hasAiContentStructuring: Sparkles,
};

export default function PlanDetails({ plan }) {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();

  const limits = useMemo(
    () => Object.entries(plan.planLimit ?? {}).filter(
      ([k, v]) => v != null && k !== 'planLimitId'
    ),
    [plan.planLimit]
  );

  const features = useMemo(
    () => Object.entries(plan.planFeature ?? {}).filter(
      ([k, v]) => v === true && k !== 'planFeatureId'
    ),
    [plan.planFeature]
  );

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Limits */}
      <div className={`rounded-2xl p-4 ${
        isDarkMode ? 'bg-slate-800/60' : 'bg-slate-50 ring-1 ring-slate-100'
      }`}>
        <h3 className={`text-xs font-bold mb-3 uppercase tracking-widest ${
          isDarkMode ? 'text-slate-500' : 'text-slate-400'
        }`}>
          {t('payment.limits')}
        </h3>
        <ul className="space-y-2.5">
          {limits.map(([key, value]) => {
            const Icon = LIMIT_ICONS[key] || Layers;
            return (
              <li key={key} className="flex items-center gap-2.5 text-sm">
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${
                  isDarkMode ? 'bg-blue-500/15' : 'bg-blue-100'
                }`}>
                  <Icon className={`w-3.5 h-3.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
                  {t(`payment.limitKeys.${key}`)}
                </span>
                <strong className={`ml-auto tabular-nums ${
                  isDarkMode ? 'text-slate-100' : 'text-slate-800'
                }`}>{value}</strong>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Features */}
      <div className={`rounded-2xl p-4 ${
        isDarkMode ? 'bg-slate-800/60' : 'bg-slate-50 ring-1 ring-slate-100'
      }`}>
        <h3 className={`text-xs font-bold mb-3 uppercase tracking-widest ${
          isDarkMode ? 'text-slate-500' : 'text-slate-400'
        }`}>
          {t('payment.features')}
        </h3>
        <ul className="space-y-2.5">
          {features.map(([key]) => {
            const Icon = FEATURE_ICONS[key] || Sparkles;
            return (
              <li key={key} className="flex items-center gap-2.5 text-sm">
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${
                  isDarkMode ? 'bg-emerald-500/15' : 'bg-emerald-100'
                }`}>
                  <Icon className={`w-3.5 h-3.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
                  {t(`payment.featureKeys.${key}`)}
                </span>
                <CheckCircle2 className={`w-4 h-4 ml-auto shrink-0 ${
                  isDarkMode ? 'text-emerald-500' : 'text-emerald-500'
                }`} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>

    {/* Bonus credit on plan purchase */}
    {Number(plan.bonusCreditOnPlanPurchase) > 0 && (
      <div className={`flex items-center gap-3 rounded-2xl p-4 mt-4 ring-1 ring-inset ${
        isDarkMode ? 'bg-amber-500/10 ring-amber-500/20' : 'bg-amber-50 ring-amber-200'
      }`}>
        <Gift className={`w-5 h-5 shrink-0 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
        <span className={`text-sm font-semibold ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>
          {t('payment.bonusCredit', {
            count: plan.bonusCreditOnPlanPurchase,
            defaultValue: `Tặng ${plan.bonusCreditOnPlanPurchase} credit khi mua gói này`,
          })}
        </span>
      </div>
    )}
    </>
  );
}

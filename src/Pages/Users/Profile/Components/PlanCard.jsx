import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import PayButton from "@/Components/ui/PayButton";
import { Badge } from "@/Components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";

const isForeverDuration = (durationInDay) => {
  const n = Number(durationInDay);
  return Number.isFinite(n) && n >= 999999;
};

const formatVnd = (amount, locale) =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "VND" }).format(amount);

export default function PlanCard({
  plan,
  highlight,
  onUpgrade,
  disabled = false,
  dictionaryNamespace = "profile.subscription",
}) {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const locale = i18n.language === "vi" ? "vi-VN" : "en-US";

  const limits = useMemo(
    () =>
      Object.entries(plan.planLimit ?? {}).filter(
        ([k, v]) => v !== null && k !== "planLimitId",
      ),
    [plan.planLimit],
  );

  const features = useMemo(
    () =>
      Object.entries(plan.planFeature ?? {}).filter(
        ([k, v]) => v === true && k !== "planFeatureId",
      ),
    [plan.planFeature],
  );

  /** Gói mặc định (giá 0): user đã có khi tạo tài khoản, không cần mua */
  const isDefaultPlan = Number(plan.price) === 0;

  const ringClass = highlight
    ? isDarkMode
      ? "border-blue-500/50 ring-2 ring-blue-500/30 hover:ring-blue-500/50 shadow-blue-900/20"
      : "border-blue-300 ring-2 ring-blue-200 hover:ring-blue-300 shadow-blue-900/10"
    : isDarkMode
      ? "border-slate-700/50 hover:border-slate-600"
      : "border-white/60 hover:border-slate-300 shadow-slate-900/10";

  return (
    <Card className={`relative flex h-full flex-col backdrop-blur-xl transition-all hover:shadow-lg ${isDarkMode ? "bg-slate-900/50" : "bg-white/70"} ${ringClass}`}>
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-blue-600 text-white text-xs px-3 py-0.5">
            {t(`${dictionaryNamespace}.mostPopular`)}
          </Badge>
        </div>
      )}

      <CardHeader className={`shrink-0 text-center pb-2 ${highlight ? "pt-8" : "pt-6"}`}>
        <CardTitle className="text-lg">{plan.planName}</CardTitle>
        <div className="mt-2">
          <span className="text-3xl font-bold">{formatVnd(plan.price, locale)}</span>
          <span className={`text-sm ml-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            / {isForeverDuration(plan.durationInDay)
              ? t(`${dictionaryNamespace}.durationForever`)
              : t(`${dictionaryNamespace}.durationDays`, { count: plan.durationInDay })}
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col pt-4">
        <div className={`h-px w-full shrink-0 ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`} />

        <div className="min-h-0 flex-1 space-y-2.5 pt-4">
          {/* Limits */}
          {limits.map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <Check className={`w-4 h-4 flex-shrink-0 ${highlight ? "text-blue-500" : isDarkMode ? "text-blue-400" : "text-emerald-500"}`} />
              <span className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {t(`payment.limitKeys.${key}`)}: <strong>{value}</strong>
              </span>
            </div>
          ))}

          {/* Features */}
          {features.map(([key]) => (
            <div key={key} className="flex items-center gap-2">
              <Check className={`w-4 h-4 flex-shrink-0 ${highlight ? "text-blue-500" : isDarkMode ? "text-blue-400" : "text-emerald-500"}`} />
              <span className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {t(`payment.featureKeys.${key}`)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-auto w-full shrink-0 rounded-lg overflow-hidden">
          {isDefaultPlan ? (
            <div
              className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-medium cursor-default ${
                isDarkMode
                  ? "bg-slate-700/60 text-slate-400 ring-1 ring-slate-600/50"
                  : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
              }`}
            >
              {t(`${dictionaryNamespace}.defaultPlan`, { defaultValue: t('plan.defaultPlan') })}
            </div>
          ) : (
            <PayButton
              onClick={() => onUpgrade(plan)}
              disabled={disabled}
              highlight={highlight}
              dark={isDarkMode}
            >
              {t(`${dictionaryNamespace}.thanhToan`, { defaultValue: t(`${dictionaryNamespace}.upgrade`) })}
            </PayButton>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

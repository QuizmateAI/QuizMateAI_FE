import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";

const formatPrice = (price) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

export default function PlanCard({ plan, highlight, onUpgrade }) {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();

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

  const ringClass = highlight
    ? isDarkMode
      ? "border-blue-500/50 ring-2 ring-blue-500/30 hover:ring-blue-500/50 shadow-blue-900/20"
      : "border-blue-300 ring-2 ring-blue-200 hover:ring-blue-300 shadow-blue-900/10"
    : isDarkMode
      ? "border-slate-700/50 hover:border-slate-600"
      : "border-white/60 hover:border-slate-300 shadow-slate-900/10";

  return (
    <Card className={`relative backdrop-blur-xl transition-all hover:shadow-lg ${isDarkMode ? "bg-slate-900/50" : "bg-white/70"} ${ringClass}`}>
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-blue-600 text-white text-xs px-3 py-0.5">
            {t("profile.subscription.mostPopular")}
          </Badge>
        </div>
      )}

      <CardHeader className={`text-center pb-2 ${highlight ? "pt-8" : ""}`}>
        <CardTitle className="text-lg">{plan.planName}</CardTitle>
        <div className="mt-2">
          <span className="text-3xl font-bold">{formatPrice(plan.price)}</span>
          <span className={`text-sm ml-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            / {t("profile.subscription.durationDays", { count: plan.durationInDay })}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 pt-4">
        <div className={`h-px w-full ${isDarkMode ? "bg-slate-700" : "bg-slate-200"}`} />

        {/* Limits */}
        {limits.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <Check className={`w-4 h-4 flex-shrink-0 ${highlight ? "text-blue-500" : isDarkMode ? "text-emerald-400" : "text-emerald-500"}`} />
            <span className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              {t(`payment.limitKeys.${key}`)}: <strong>{value}</strong>
            </span>
          </div>
        ))}

        {/* Features */}
        {features.map(([key]) => (
          <div key={key} className="flex items-center gap-2">
            <Check className={`w-4 h-4 flex-shrink-0 ${highlight ? "text-blue-500" : isDarkMode ? "text-emerald-400" : "text-emerald-500"}`} />
            <span className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              {t(`payment.featureKeys.${key}`)}
            </span>
          </div>
        ))}

        <Button
          onClick={() => onUpgrade(plan)}
          className={`w-full mt-4 rounded-full transition-all active:scale-95 cursor-pointer ${
            highlight
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : isDarkMode
                ? "bg-slate-700 hover:bg-slate-600 text-slate-200"
                : "bg-slate-800 hover:bg-slate-900 text-white"
          }`}
        >
          {t("profile.subscription.upgrade")}
        </Button>
      </CardContent>
    </Card>
  );
}

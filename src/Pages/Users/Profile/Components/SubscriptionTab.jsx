import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Crown, Shield, AlertCircle } from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { getPurchasablePlans } from "@/api/PaymentAPI";
import { Badge } from "@/Components/ui/badge";
import ListSpinner from "@/Components/ui/ListSpinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/Components/ui/card";
import PlanCard from "./PlanCard";

export default function SubscriptionTab() {
  const { t } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();

  const [planType, setPlanType] = useState("INDIVIDUAL");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const switchPlanType = (type) => {
    setPlanType(type);
    setLoading(true);
    setError(null);
  };

  useEffect(() => {
    let cancelled = false;
    getPurchasablePlans(planType)
      .then((res) => {
        if (!cancelled) { setPlans(res.data ?? []); setLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setError(t("profile.subscription.loadError")); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [planType, t]);

  const handleUpgrade = useCallback(
    (plan) => {
      // Gói GROUP → PaymentPage sẽ yêu cầu chọn nhóm
      const url = plan.type === "GROUP"
        ? `/payment?planId=${plan.planId}&planType=GROUP`
        : `/payment?planId=${plan.planId}`;
      navigate(url);
    },
    [navigate],
  );

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <Card className={`backdrop-blur-xl ${isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white/70 border-white/60"}`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? "bg-blue-950/50" : "bg-blue-100"}`}>
              <Crown className={`w-5 h-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
            </div>
            <div>
              <CardTitle>{t("profile.subscription.currentPlan")}</CardTitle>
              <CardDescription className={isDarkMode ? "text-slate-400" : ""}>{t("profile.subscription.currentPlanDesc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`flex items-center justify-between p-4 rounded-xl border ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-blue-50 border-blue-200"}`}>
            <div className="flex items-center gap-3">
              <Badge className="text-sm px-3 py-1 bg-blue-600 text-white">Free</Badge>
              <span className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>{t("profile.subscription.freeDesc")}</span>
            </div>
            <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{t("profile.subscription.activeStatus")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Type toggle */}
      <div className="flex justify-center">
        <div className={`inline-flex rounded-full p-1 ${isDarkMode ? "bg-slate-800" : "bg-slate-200"}`}>
          {["INDIVIDUAL", "GROUP"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => switchPlanType(type)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all cursor-pointer ${
                planType === type
                  ? isDarkMode
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-white text-slate-900 shadow"
                  : isDarkMode
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t(`profile.subscription.${type === "INDIVIDUAL" ? "individual" : "group"}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      {loading ? (
        <ListSpinner variant="section" />
      ) : error ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <AlertCircle className={`w-8 h-8 ${isDarkMode ? "text-red-400" : "text-red-500"}`} />
          <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{error}</p>
        </div>
      ) : plans.length === 0 ? (
        <p className={`text-center py-16 text-sm ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{t("profile.subscription.noPlans")}</p>
      ) : (
        <div className={`grid gap-6 ${plans.length === 1 ? "grid-cols-1 max-w-md mx-auto" : plans.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
          {plans.map((plan, idx) => (
            <PlanCard key={plan.planId} plan={plan} highlight={idx === 0 && plans.length > 1} onUpgrade={handleUpgrade} />
          ))}
        </div>
      )}

      {/* Guarantee */}
      <Card className={`backdrop-blur-xl ${isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white/70 border-white/60"}`}>
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <Shield className={`w-5 h-5 flex-shrink-0 ${isDarkMode ? "text-green-400" : "text-green-600"}`} />
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? "text-white" : "text-slate-900"}`}>{t("profile.subscription.guaranteeTitle")}</p>
              <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{t("profile.subscription.guaranteeDesc")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

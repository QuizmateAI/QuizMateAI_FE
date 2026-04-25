import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/hooks/useDarkMode";
import { getPurchasablePlans } from "@/api/PaymentAPI";
import { AlertCircle, Crown, Users, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ListSpinner from "@/components/ui/ListSpinner";
import PlanCard from "@/pages/Users/Profile/Components/PlanCard";
import { buildPaymentsPath, withQueryParams } from "@/lib/routePaths";

/**
 * Dialog nâng cấp gói đăng ký, dùng chung cho cả Individual và Group.
 *
 * Props:
 *  - open / onOpenChange: điều khiển dialog
 *  - planType: "INDIVIDUAL" | "GROUP"
 *  - groups: danh sách nhóm mà user là LEADER (chỉ cần khi planType === "GROUP")
 *  - preSelectedWorkspaceId: nếu đã biết workspaceId (từ GroupWorkspace)
 */
export default function UpgradePlanDialog({
  open,
  onOpenChange,
  planType = "INDIVIDUAL",
  groups = [],
  preSelectedWorkspaceId = null,
}) {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(preSelectedWorkspaceId);

  const isGroup = planType === "GROUP";
  const needGroupSelect = isGroup && !preSelectedWorkspaceId;

  // Fetch plans khi mở dialog
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const prepTimer = setTimeout(() => {
      if (!cancelled) {
        setLoading(true);
        setError(null);

        getPurchasablePlans(planType)
          .then((res) => {
            if (!cancelled) { setPlans(res.data ?? []); setLoading(false); }
          })
          .catch(() => {
            if (!cancelled) { setError(t("profile.subscription.loadError")); setLoading(false); }
          });
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(prepTimer);
    };
  }, [open, planType, t]);

  // Reset group selection khi mở / đổi type
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedWorkspaceId(preSelectedWorkspaceId);
    }, 0);

    return () => clearTimeout(timer);
  }, [open, preSelectedWorkspaceId]);

  const leaderGroups = useMemo(
    () => groups.filter((g) => g.memberRole === "LEADER"),
    [groups],
  );

  const handleUpgrade = useCallback(
    (plan) => {
      const groupParam = isGroup ? selectedWorkspaceId : null;
      const url = withQueryParams(buildPaymentsPath(), {
        planId: plan.planId,
        workspaceId: groupParam,
      });
      onOpenChange(false);
      navigate(url);
    },
    [isGroup, selectedWorkspaceId, navigate, onOpenChange],
  );

  const titleIcon = isGroup
    ? <Users className={`w-5 h-5 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
    : <Crown className={`w-5 h-5 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={`max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border ${fontClass} ${
          isDarkMode
            ? "bg-slate-900 border-slate-700 text-slate-50"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isDarkMode ? "bg-slate-800" : "bg-slate-100"
          }`}>
            {titleIcon}
          </div>
          <div>
            <h2 className="text-lg font-bold">{t("upgradePlan.title")}</h2>
            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              {isGroup ? t("upgradePlan.groupDesc") : t("upgradePlan.individualDesc")}
            </p>
          </div>
        </div>

        {/* Group selector (chỉ hiện khi cần chọn nhóm) */}
        {needGroupSelect && (
          <div className="mb-4">
            <p className={`text-sm font-medium mb-2 ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
              {t("upgradePlan.selectGroup")}
            </p>
            {leaderGroups.length === 0 ? (
              <p className={`text-sm py-4 text-center ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                {t("upgradePlan.noLeaderGroups")}
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {leaderGroups.map((g) => (
                  <button
                    key={g.workspaceId}
                    type="button"
                    onClick={() => setSelectedWorkspaceId(g.workspaceId)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                      selectedWorkspaceId === g.workspaceId
                        ? isDarkMode
                          ? "bg-blue-600/20 border-blue-500 border ring-1 ring-blue-500/30"
                          : "bg-blue-50 border-blue-300 border ring-1 ring-blue-200"
                        : isDarkMode
                          ? "bg-slate-800 border border-slate-700 hover:border-slate-600"
                          : "bg-slate-50 border border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <Users className={`w-4 h-4 flex-shrink-0 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
                    <span className="flex-1 text-left truncate font-medium">{g.groupName}</span>
                    <span className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                      {g.memberCount || 0} {t("home.labels.membersUnit")}
                    </span>
                    {selectedWorkspaceId === g.workspaceId && (
                      <ChevronRight className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Plan cards */}
        {loading ? (
          <ListSpinner variant="section" />
        ) : error ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <AlertCircle className={`w-8 h-8 ${isDarkMode ? "text-red-400" : "text-red-500"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{error}</p>
          </div>
        ) : plans.length === 0 ? (
          <p className={`text-center py-12 text-sm ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
            {t("profile.subscription.noPlans")}
          </p>
        ) : (
          <div className={`grid gap-4 ${
            plans.length === 1 ? "grid-cols-1 max-w-sm mx-auto" : "grid-cols-1 md:grid-cols-2"
          }`}>
            {plans.map((plan, idx) => (
              <PlanCard
                key={plan.planId}
                plan={plan}
                highlight={idx === 0 && plans.length > 1}
                onUpgrade={handleUpgrade}
                disabled={needGroupSelect && !selectedWorkspaceId}
              />
            ))}
          </div>
        )}

        {/* Close button */}
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              isDarkMode
                ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            }`}
          >
            {t("common.cancel")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

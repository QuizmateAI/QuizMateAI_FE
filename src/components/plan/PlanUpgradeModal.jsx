import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Crown, Sparkles } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * Lightweight modal shown when a user tries to access a feature not included
 * in their current plan.
 *
 * Props:
 *  - open / onOpenChange: dialog visibility control
 *  - featureName: optional display name of the locked feature
 *  - isDarkMode: boolean for theme
 *  - upgradePath: optional route used for the upgrade CTA
 *  - upgradeState: optional router state for the upgrade CTA
 */
export default function PlanUpgradeModal({
  open,
  onOpenChange,
  featureName,
  isDarkMode = false,
  upgradePath = "/plans",
  upgradeState,
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate(upgradePath, upgradeState ? { state: upgradeState } : undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={`max-w-sm rounded-2xl border p-6 font-sans ${
          isDarkMode
            ? "bg-slate-900 border-slate-700 text-slate-50"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Icon */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            isDarkMode ? "bg-amber-500/15" : "bg-amber-50"
          }`}>
            <Crown className={`w-7 h-7 ${isDarkMode ? "text-amber-400" : "text-amber-500"}`} />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <h2 className="text-base font-bold">
              {t("planUpgradeModal.title")}
            </h2>
            <p className={`text-sm leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              {featureName
                ? t("planUpgradeModal.descriptionWithFeature", { featureName })
                : t("planUpgradeModal.descriptionDefault")}
              <br />
              {t("planUpgradeModal.upgradeHint")}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 w-full pt-1">
            <button
              type="button"
              onClick={handleUpgrade}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                isDarkMode
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-900"
                  : "bg-amber-500 hover:bg-amber-600 text-white"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {t("planUpgradeModal.upgradeNow")}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={`w-full px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                isDarkMode
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
              }`}
            >
              {t("planUpgradeModal.later")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

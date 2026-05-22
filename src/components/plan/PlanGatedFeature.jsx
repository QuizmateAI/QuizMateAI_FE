import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { buildPlansPath } from "@/lib/routePaths";

export default function PlanGatedFeature({
  allowed,
  children,
  featureName,
  isDarkMode = false,
  className = "",
  toastTitle = "",
  toastDescription = "",
  toastMeta = "",
  upgradePath = buildPlansPath(),
  upgradeState,
  upgradeLabel = "Upgrade",
  badgeLabel = "VIP",
  fullWidth = false,
  badgeInset = false,
}) {
  const navigate = useNavigate();
  const { showWarning } = useToast();
  const resolvedToastTitle = String(toastTitle || "").trim() || "Feature locked";
  const resolvedToastDescription = String(toastDescription || "").trim()
    || (featureName
      ? `The feature "${featureName}" is not included in the current plan.`
      : "The current plan does not include this feature.");
  const resolvedToastMeta = String(toastMeta || "").trim();
  const resolvedUpgradeLabel = String(upgradeLabel || "").trim() || "Upgrade";
  const resolvedBadgeLabel = String(badgeLabel || "").trim() || "VIP";

  const handleLockedClick = useCallback(() => {
    showWarning(
      {
        title: resolvedToastTitle,
        description: resolvedToastDescription,
        meta: resolvedToastMeta,
        action: {
          label: resolvedUpgradeLabel,
          onClick: () => navigate(upgradePath, upgradeState ? { state: upgradeState } : undefined),
        },
      },
      { duration: 7000 },
    );
  }, [
    navigate,
    resolvedToastDescription,
    resolvedToastMeta,
    resolvedToastTitle,
    resolvedUpgradeLabel,
    showWarning,
    upgradePath,
    upgradeState,
  ]);

  if (allowed) {
    return <>{children}</>;
  }

  const wrapperDisplayClass = fullWidth ? "flex w-full" : "inline-flex max-w-full";
  const badgePositionClass = badgeInset
    ? "absolute right-2 top-2 z-10 pointer-events-none"
    : "absolute -right-2 -top-2 z-10 pointer-events-none";

  return (
    <div
      className={`relative ${wrapperDisplayClass} ${className}`}
      onClick={handleLockedClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleLockedClick();
        }
      }}
      aria-label={featureName ? `Feature "${featureName}" requires a higher plan` : "Feature requires a higher plan"}
    >
      <div className={`pointer-events-none select-none opacity-50 grayscale-[0.35] ${fullWidth ? "w-full" : ""}`}>
        {children}
      </div>

      <div className={badgePositionClass}>
        <div
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-sm ${
            isDarkMode
              ? "border-amber-300/50 bg-amber-400 text-slate-950"
              : "border-amber-300 bg-amber-300 text-slate-950"
          }`}
        >
          <Crown className="h-3 w-3" />
          <span>{resolvedBadgeLabel}</span>
        </div>
      </div>
      <div className="absolute inset-0 z-20 cursor-pointer rounded-[inherit]" />
    </div>
  );
}

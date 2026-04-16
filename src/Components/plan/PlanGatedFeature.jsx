import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { buildPlansPath } from "@/lib/routePaths";

/**
 * Wrapper that locks UI elements behind a plan entitlement.
 *
 * When `allowed` is false:
 *  - The child element is rendered with reduced opacity and pointer events disabled
 *  - A gold Crown badge is overlaid in the top-right corner
 *  - Clicking anywhere on the element opens the PlanUpgradeModal
 *
 * When `allowed` is true, children render normally with no overhead.
 *
 * Props:
 *  - allowed: boolean — whether the feature is available in the current plan
 *  - children: ReactNode
 *  - featureName: optional label shown inside the upgrade modal
 *  - isDarkMode: boolean for modal theming
 *  - className: additional class applied to the outer wrapper when locked
 */
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

  return (
    <div
      className={`relative inline-flex max-w-full ${className}`}
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
      <div className="pointer-events-none select-none opacity-50 grayscale-[0.35]">
        {children}
      </div>

      <div className="absolute -right-2 -top-2 z-10 pointer-events-none">
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

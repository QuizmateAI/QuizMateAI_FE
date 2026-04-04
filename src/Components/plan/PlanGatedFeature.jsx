import { useState } from "react";
import { Crown } from "lucide-react";
import PlanUpgradeModal from "./PlanUpgradeModal";

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
}) {
  const [modalOpen, setModalOpen] = useState(false);

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        className={`relative inline-block ${className}`}
        onClick={() => setModalOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setModalOpen(true);
        }}
        aria-label={featureName ? `Tính năng "${featureName}" yêu cầu nâng cấp gói` : "Tính năng yêu cầu nâng cấp gói"}
      >
        {/* Locked children — dimmed, not interactive */}
        <div className="opacity-50 pointer-events-none select-none">
          {children}
        </div>

        {/* Crown badge — top-right corner */}
        <div className="absolute -top-1.5 -right-1.5 z-10 pointer-events-none">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-md ${
            isDarkMode ? "bg-amber-500" : "bg-amber-400"
          }`}>
            <Crown className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Invisible full-coverage click target */}
        <div className="absolute inset-0 z-20 cursor-pointer" />
      </div>

      <PlanUpgradeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        featureName={featureName}
        isDarkMode={isDarkMode}
      />
    </>
  );
}

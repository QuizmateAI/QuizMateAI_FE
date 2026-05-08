import React from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

function InlineSpinner({ className = "", label }) {
  const { t } = useTranslation();
  const spinnerLabel = label ?? t("common.loadingSpinner.inlineLabel", "Loading");

  return (
    <span
      aria-hidden="true"
      title={spinnerLabel}
      className={cn(
        "inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
    />
  );
}

export default InlineSpinner;

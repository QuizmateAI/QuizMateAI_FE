import React from "react";

import { cn } from "@/lib/utils";

function InlineSpinner({ className = "", label = "Loading" }) {
  return (
    <span
      aria-hidden="true"
      title={label}
      className={cn(
        "inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
    />
  );
}

export default InlineSpinner;

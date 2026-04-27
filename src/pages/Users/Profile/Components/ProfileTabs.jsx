import React from "react";
import { cn } from "@/lib/utils";

export function ProfileTabs({ children, className }) {
  return <div className={className}>{children}</div>;
}

export function ProfileTabsList({ children, className, isDarkMode }) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full border p-1 shadow-sm",
        isDarkMode
          ? "border-slate-800 bg-slate-900"
          : "border-slate-200 bg-white",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ProfileTabsTrigger({ active, onClick, children, className, isDarkMode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-all active:scale-[0.98]",
        active
          ? isDarkMode
            ? "bg-slate-100 text-slate-950 shadow-sm"
            : "bg-slate-950 text-white shadow-sm"
          : isDarkMode
            ? "text-slate-400 hover:text-slate-100"
            : "text-slate-500 hover:text-slate-950",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ProfileTabsContent({ active, children, className }) {
  if (!active) return null;

  return (
    <div className={cn("mt-5 animate-in fade-in-50 duration-300", className)}>
      {children}
    </div>
  );
}

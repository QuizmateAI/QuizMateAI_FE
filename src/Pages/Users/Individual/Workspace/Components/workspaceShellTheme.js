import { cn } from "@/lib/utils";

export const workspaceShellTheme = {
  page: "bg-[#f5f7fb] dark:bg-slate-950 text-slate-900 dark:text-white",
  canvas: "bg-[#f5f7fb] dark:bg-slate-950",
  border: "border-slate-200/80 dark:border-slate-800/80",
  text: "text-slate-900 dark:text-slate-100",
  mutedText: "text-slate-500 dark:text-slate-400",
  softText: "text-slate-600 dark:text-slate-300",
  surface: "border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.05)] dark:shadow-[0_18px_40px_rgba(37,99,235,0.05)]",
  surfaceAlt: "border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/90 dark:bg-slate-900/90",
  surfaceMuted: "border border-slate-200/70 dark:border-slate-800/70 bg-[#f8fafc] dark:bg-slate-950",
  overlay: "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl",
  input: "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-emerald-400 dark:focus-visible:border-emerald-500 focus-visible:ring-emerald-100 dark:focus-visible:ring-emerald-900",
  iconWrap: "border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  accentWrap: "border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  primaryButton: "bg-emerald-600 dark:bg-emerald-600 text-white hover:bg-emerald-700 dark:hover:bg-emerald-700",
  outlineButton: "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
  activeChip: "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900",
  mutedChip: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700",
};

export function workspaceSurface(className) {
  return cn(workspaceShellTheme.surface, className);
}

export function workspaceSurfaceAlt(className) {
  return cn(workspaceShellTheme.surfaceAlt, className);
}

export function workspaceMutedPanel(className) {
  return cn(workspaceShellTheme.surfaceMuted, className);
}

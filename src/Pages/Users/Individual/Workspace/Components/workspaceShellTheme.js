import { cn } from "@/lib/utils";

export const workspaceShellTheme = {
  page: "bg-[#f5f7fb] text-slate-900",
  canvas: "bg-[#f5f7fb]",
  border: "border-slate-200/80",
  text: "text-slate-900",
  mutedText: "text-slate-500",
  softText: "text-slate-600",
  surface: "border border-slate-200/80 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.05)]",
  surfaceAlt: "border border-slate-200/70 bg-slate-50/90",
  surfaceMuted: "border border-slate-200/70 bg-[#f8fafc]",
  overlay: "bg-white/90 backdrop-blur-xl",
  input: "border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-400 focus-visible:ring-emerald-100",
  iconWrap: "border border-slate-200/80 bg-slate-50 text-slate-700",
  accentWrap: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  primaryButton: "bg-emerald-600 text-white hover:bg-emerald-700",
  outlineButton: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  activeChip: "bg-slate-900 text-white",
  mutedChip: "bg-slate-100 text-slate-500 hover:bg-slate-200",
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

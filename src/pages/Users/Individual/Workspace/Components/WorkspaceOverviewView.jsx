import React from "react";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Clock3,
  Compass,
  Files,
  GraduationCap,
  Route,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { workspaceSurface } from "./workspaceShellTheme";

function formatSourceType(source) {
  const type = String(source?.type ?? source?.materialType ?? "").toLowerCase();
  if (type.includes("pdf")) return "PDF";
  if (type.includes("doc")) return "DOCX";
  if (type.includes("sheet") || type.includes("excel")) return "XLSX";
  if (type.includes("image")) return "IMAGE";
  return "FILE";
}

function formatRelativeTime(value, language) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMinutes = Math.max(
    0,
    Math.round((Date.now() - date.getTime()) / 60000),
  );
  const locale = language === "en" ? "en-US" : "vi-VN";
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (diffMinutes < 60) return formatter.format(-diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return formatter.format(-diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  return formatter.format(-diffDays, "day");
}

function WorkspaceOverviewView({
  workspaceTitle = "",
  workspacePurpose = "",
  sources = [],
  accessHistory = [],
  selectedSourceIds = [],
  onNavigate,
  onUploadClick,
  shouldDisableRoadmap = false,
  shouldDisableQuiz = false,
  shouldDisableFlashcard = false,
  roadmapHasPhases = false,
  completedQuizCount = 0,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const activeSourceCount = sources.filter(
    (source) => String(source?.status || "").toUpperCase() === "ACTIVE",
  ).length;
  const recentSources = sources.slice(0, 4);
  const recentActivity = accessHistory.slice(0, 5);
  const quickActions = [
    {
      key: "roadmap",
      icon: Route,
      disabled: shouldDisableRoadmap,
      title: t("workspace.shell.quickActions.roadmap", "Open roadmap"),
      description: roadmapHasPhases
        ? t("workspace.shell.quickActionHints.roadmapReady", "Continue the current learning path.")
        : t("workspace.shell.quickActionHints.roadmapSetup", "Set up the new fishbone roadmap."),
    },
    {
      key: "quiz",
      icon: GraduationCap,
      disabled: shouldDisableQuiz,
      title: t("workspace.shell.quickActions.quiz", "Create quiz"),
      description: t("workspace.shell.quickActionHints.quiz", "Generate practice or exam-style quizzes from your sources."),
    },
    {
      key: "flashcard",
      icon: Sparkles,
      disabled: shouldDisableFlashcard,
      title: t("workspace.shell.quickActions.flashcard", "Build flashcards"),
      description: t("workspace.shell.quickActionHints.flashcard", "Turn selected materials into fast review cards."),
    },
  ];

  const statCards = [
    {
      key: "sources",
      icon: Files,
      value: sources.length,
      label: t("workspace.shell.stats.sources", "Sources"),
      hint: `${activeSourceCount} ${t("workspace.shell.activeLabel", "active")}`,
    },
    {
      key: "selected",
      icon: Compass,
      value: selectedSourceIds.length,
      label: t("workspace.shell.stats.selected", "Selected"),
      hint: t("workspace.shell.statsHints.selected", "Ready for generation"),
    },
    {
      key: "roadmap",
      icon: Route,
      value: roadmapHasPhases ? "Live" : "Draft",
      label: t("workspace.shell.stats.roadmap", "Roadmap"),
      hint: roadmapHasPhases
        ? t("workspace.shell.statsHints.roadmapReady", "Phases available")
        : t("workspace.shell.statsHints.roadmapEmpty", "Needs setup"),
    },
    {
      key: "quizzes",
      icon: BarChart3,
      value: completedQuizCount,
      label: t("workspace.shell.stats.completedQuizzes", "Completed quizzes"),
      hint: t("workspace.shell.statsHints.completedQuizzes", "Used for analytics unlock"),
    },
  ];

  return (
    <section className="h-full overflow-y-auto p-4 sm:p-5 lg:p-7">
      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-5">
          <section className={workspaceSurface("rounded-[28px] p-5")}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={`text-base font-semibold ${fontClass}`}>
                  {t("workspace.shell.recentSourcesTitle", "Recent sources")}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {t("workspace.shell.recentSourcesHint", "Upload, review, then select the sources you want to generate from.")}
                </p>
              </div>
              <Button type="button" variant="outline" className="rounded-2xl" onClick={() => onNavigate?.("sources")}>
                {t("workspace.shell.manageSources", "Manage sources")}
              </Button>
            </div>

            {recentSources.length > 0 ? (
              <div className="mt-4 space-y-3">
                {recentSources.map((source, index) => {
                  const sourceId = Number(source?.id ?? source?.materialId);
                  const isSelected = Number.isInteger(sourceId)
                    ? selectedSourceIds.includes(sourceId)
                    : false;

                  return (
                    <button
                      key={source?.id ?? source?.materialId ?? `source:${index}`}
                      type="button"
                      onClick={() => onNavigate?.("sources")}
                      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-white"
                    >
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold ${fontClass}`}>
                          {source?.name || source?.title || t("workspace.shell.untitledSource", "Untitled source")}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatSourceType(source)} • {String(source?.status || "ACTIVE")}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          isSelected
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-white text-slate-600"
                        }`}
                      >
                        {isSelected
                          ? t("workspace.shell.selectedBadge", "Selected")
                          : t("workspace.shell.readyBadge", "Ready")}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-5 py-6 text-sm text-slate-500">
                {t("workspace.shell.noSourcesYet", "No sources yet. Upload material to unlock roadmap, quiz, and flashcard generation.")}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className={workspaceSurface("rounded-[28px] p-5")}>
            <p className={`text-base font-semibold ${fontClass}`}>
              {t("workspace.shell.recentOutputsTitle", "Recent outputs")}
            </p>
            <div className="mt-4 grid gap-3">
              {[
                {
                  key: "quiz",
                  label: t("workspace.shell.nav.quiz", "Quiz"),
                  hint: shouldDisableQuiz
                    ? t("workspace.shell.outputHints.quizLocked", "Need active sources before generating new quizzes.")
                    : t("workspace.shell.outputHints.quizReady", "Ready for practice and exam flows."),
                },
                {
                  key: "flashcard",
                  label: t("workspace.shell.nav.flashcard", "Flashcard"),
                  hint: shouldDisableFlashcard
                    ? t("workspace.shell.outputHints.flashcardLocked", "Need active sources before generating flashcards.")
                    : t("workspace.shell.outputHints.flashcardReady", "Use selected materials for spaced review."),
                },
                {
                  key: "questionStats",
                  label: t("workspace.shell.nav.questionStats", "Stats"),
                  hint: t("workspace.shell.outputHints.stats", "Unlock deeper analytics after enough completed quizzes."),
                },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNavigate?.(item.key)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-white"
                >
                  <p className={`text-sm font-semibold ${fontClass}`}>{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {item.hint}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className={workspaceSurface("rounded-[28px] p-5")}>
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              <p className={`text-base font-semibold ${fontClass}`}>
                {t("workspace.shell.activityTitle", "Recent activity")}
              </p>
            </div>

            {recentActivity.length > 0 ? (
              <div className="mt-4 space-y-3">
                {recentActivity.map((activity, index) => (
                  <div
                    key={`${activity?.actionKey || activity?.type || "activity"}:${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-sm font-semibold ${fontClass}`}>
                        {activity?.name || t("workspace.shell.unknownActivity", "Unknown activity")}
                      </p>
                      <span className="text-[11px] text-slate-500">
                        {formatRelativeTime(activity?.accessedAt, i18n.language)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                      {activity?.type || activity?.actionKey || "workspace"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-5 py-6 text-sm text-slate-500">
                {t("workspace.shell.noActivityYet", "No recent activity yet. Open a section to start building history.")}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

export default WorkspaceOverviewView;

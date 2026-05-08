import React, { useEffect, useState, startTransition } from "react";
import { ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getBloomSkillLabel, getQuizDifficultyLabel } from "@/lib/quizQuestionTypes";
import {
  WORKSPACE_QUIZ_ADV_BLOOM_SKILLS,
  WORKSPACE_QUIZ_ADV_FILTER_ATTEMPT,
  WORKSPACE_QUIZ_ADV_FILTER_TIMER,
  createDefaultWorkspaceQuizAdvFilters,
  normalizeWorkspaceQuizAdvFilters,
} from "@/utils/workspaceQuizListAdvancedFilters";

const SNAPSHOT_DEFAULT_FILTERS = createDefaultWorkspaceQuizAdvFilters();

function FilterShell({ className, isDarkMode, children: selectInner, ...selectProps }) {
  return (
    <div className="group relative">
      <select {...selectProps} className={cn(className, "pr-10")}>
        {selectInner}
      </select>
      <ChevronDown
        aria-hidden
        strokeWidth={2.25}
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 opacity-75 transition-opacity",
          "group-hover:opacity-100",
          isDarkMode ? "text-slate-400" : "text-slate-500",
        )}
      />
    </div>
  );
}

function FilterPanel({ isDarkMode, children, className }) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 sm:p-5",
        "transition-shadow duration-200",
        isDarkMode
          ? [
              "border border-slate-700/85 bg-gradient-to-br from-slate-900/80 to-slate-950/60",
              "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
            ]
          : [
              "border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/90",
              "shadow-[0_1px_2px_rgba(15,23,42,0.05),inset_0_1px_0_0_rgba(255,255,255,0.85)]",
              "ring-1 ring-slate-900/[0.04]",
            ],
        className,
      )}
    >
      {children}
    </div>
  );
}

export default function QuizWorkspaceAdvancedFilterDialog({
  open,
  onOpenChange,
  digest,
  appliedFiltersSnapshot,
  onApply,
  isDarkMode = false,
  t,
}) {
  const [draft, setDraft] = useState(() =>
    normalizeWorkspaceQuizAdvFilters(appliedFiltersSnapshot ?? SNAPSHOT_DEFAULT_FILTERS),
  );

  useEffect(() => {
    if (!open) return;
    startTransition(() => {
      setDraft(normalizeWorkspaceQuizAdvFilters(appliedFiltersSnapshot ?? SNAPSHOT_DEFAULT_FILTERS));
    });
  }, [open, digest, appliedFiltersSnapshot]);

  const mutedHint = cn("leading-relaxed", isDarkMode ? "text-slate-400" : "text-slate-600");

  const labelCls = cn(
    "mb-2 block text-[13px] font-semibold tracking-tight",
    isDarkMode ? "text-slate-200" : "text-slate-800",
  );

  const fieldTransition = "transition-[border-color,box-shadow,background-color] duration-150 ease-out";

  const selectCls = cn(
    "flex h-11 w-full cursor-pointer rounded-xl border px-3.5 py-2 text-sm outline-none",
    fieldTransition,
    "[&::-ms-expand]:hidden appearance-none",
    isDarkMode
      ? "border-slate-600/90 bg-slate-950/90 text-slate-100 shadow-sm shadow-black/15 focus:border-blue-400/55 focus:ring-[3px] focus:ring-blue-500/15"
      : cn(
          "border-slate-200/90 bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
          "hover:border-slate-300 hover:bg-slate-50/80",
          "focus:border-blue-400 focus:ring-[3px] focus:ring-blue-500/16",
        ),
  );

  const numberInputCls = cn(
    "h-11 rounded-xl border px-3.5 text-sm tabular-nums",
    fieldTransition,
    isDarkMode
      ? "border-slate-600/90 bg-slate-950/90 text-slate-100 placeholder:text-slate-500 shadow-sm shadow-black/15 focus-visible:border-blue-400/55 focus-visible:ring-[3px] focus-visible:ring-blue-500/15"
      : cn(
          "border-slate-200/90 bg-white text-slate-900 placeholder:text-slate-400 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
          "hover:border-slate-300 hover:bg-slate-50/80",
          "focus-visible:border-blue-400 focus-visible:ring-[3px] focus-visible:ring-blue-500/16",
        ),
  );

  const update = (partial) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  const handleApply = () => {
    onApply?.(normalizeWorkspaceQuizAdvFilters(draft));
    onOpenChange?.(false);
  };

  const handleClear = () => {
    const cleared = createDefaultWorkspaceQuizAdvFilters();
    setDraft(cleared);
    onApply?.(cleared);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden p-0 sm:rounded-[1.35rem]",
          "max-h-[min(600px,calc(100vh-88px))]",
          "sm:max-w-[500px]",
          "shadow-[0_25px_50px_-12px_rgba(15,23,42,0.22)]",
          isDarkMode
            ? "border-slate-700/90 bg-slate-950 text-slate-100 ring-1 ring-white/[0.06]"
            : "border-slate-200/80 bg-white ring-1 ring-slate-900/[0.05]",
        )}
      >
        <DialogHeader
          className={cn(
            "relative space-y-2.5 border-b px-6 pb-5 pt-6 text-left sm:text-left",
            "pr-14",
            isDarkMode
              ? "border-slate-800/90 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950"
              : "border-slate-200/70 bg-gradient-to-br from-slate-50/90 via-white to-blue-50/35",
          )}
        >
          <div
            className={cn(
              "absolute left-0 top-5 h-10 w-1 rounded-r-full",
              isDarkMode ? "bg-blue-500/70" : "bg-blue-600",
            )}
            aria-hidden
          />
          <DialogTitle
            className={cn(
              "pl-3 text-[1.35rem] font-bold leading-snug tracking-tight",
              isDarkMode ? "text-slate-50" : "text-slate-900",
            )}
          >
            {t("quizListView.workspaceFilterDialog.title", "Filter quizzes")}
          </DialogTitle>
          <DialogDescription
            className={cn(
              "pl-3 text-[13px] font-normal leading-relaxed",
              isDarkMode ? "text-slate-400" : "text-slate-600",
            )}
          >
            {t(
              "quizListView.workspaceFilterDialog.subtitle",
              "These filters apply to the quiz list already loaded in this view.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "max-h-[min(400px,calc(100vh-268px))] space-y-4 overflow-y-auto px-5 py-5 sm:px-6",
            "[scrollbar-width:thin]",
            isDarkMode ? "[scrollbar-color:rgb(51_65_85)_transparent]" : "[scrollbar-color:rgb(203_213_225)_transparent]",
          )}
        >
          <FilterPanel isDarkMode={isDarkMode}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className={labelCls}>{t("quizListView.workspaceFilterDialog.questionMin", "Min questions")}</Label>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="—"
                  value={draft.questionMin}
                  onChange={(e) => update({ questionMin: e.target.value })}
                  className={numberInputCls}
                />
              </div>
              <div>
                <Label className={labelCls}>{t("quizListView.workspaceFilterDialog.questionMax", "Max questions")}</Label>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="—"
                  value={draft.questionMax}
                  onChange={(e) => update({ questionMax: e.target.value })}
                  className={numberInputCls}
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2 border-slate-200/70 dark:border-slate-700/70">
              <div>
                <Label className={labelCls}>{t("quizListView.workspaceFilterDialog.attempt", "Attempts")}</Label>
                <FilterShell
                  isDarkMode={isDarkMode}
                  className={selectCls}
                  value={draft.attempt}
                  onChange={(e) => update({ attempt: e.target.value })}
                >
                  <option value={WORKSPACE_QUIZ_ADV_FILTER_ATTEMPT.ANY}>{t("quizListView.workspaceFilterDialog.attemptAny", "Any")}</option>
                  <option value={WORKSPACE_QUIZ_ADV_FILTER_ATTEMPT.ATTEMPTED}>{t("quizListView.workspaceFilterDialog.attempted", "Attempted")}</option>
                  <option value={WORKSPACE_QUIZ_ADV_FILTER_ATTEMPT.NOT_ATTEMPTED}>{t("quizListView.workspaceFilterDialog.notAttempted", "Not attempted")}</option>
                </FilterShell>
              </div>
              <div>
                <Label className={labelCls}>{t("quizListView.workspaceFilterDialog.difficulty", "Difficulty")}</Label>
                <FilterShell
                  isDarkMode={isDarkMode}
                  className={selectCls}
                  value={draft.difficulty}
                  onChange={(e) => update({ difficulty: e.target.value })}
                >
                  <option value="ANY">{t("quizListView.workspaceFilterDialog.difficultyAny", "Any")}</option>
                  {["EASY", "MEDIUM", "HARD", "CUSTOM"].map((d) => (
                    <option key={d} value={d}>
                      {getQuizDifficultyLabel(d, t)}
                    </option>
                  ))}
                </FilterShell>
              </div>
            </div>
          </FilterPanel>

          <FilterPanel isDarkMode={isDarkMode}>
            <Label className={labelCls}>{t("quizListView.workspaceFilterDialog.bloom", "Bloom level")}</Label>
            <FilterShell
              isDarkMode={isDarkMode}
              className={selectCls}
              value={draft.bloomSkill}
              onChange={(e) => update({ bloomSkill: e.target.value })}
            >
              <option value="ANY">{t("quizListView.workspaceFilterDialog.bloomAny", "Any")}</option>
              {WORKSPACE_QUIZ_ADV_BLOOM_SKILLS.map((b) => (
                <option key={b} value={b}>
                  {getBloomSkillLabel(b, t)}
                </option>
              ))}
            </FilterShell>
            <div
              className={cn(
                "mt-3 flex gap-3 rounded-xl border px-3.5 py-3 text-[12px] sm:text-[13px]",
                isDarkMode
                  ? "border-slate-700/80 bg-slate-950/50 text-slate-400"
                  : "border-blue-100/90 bg-blue-50/55 text-slate-600",
              )}
            >
              <Info
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  isDarkMode ? "text-blue-400" : "text-blue-600",
                )}
                aria-hidden
              />
              <p className={cn("min-w-0 flex-1", mutedHint)}>
                {t(
                  "quizListView.workspaceFilterDialog.bloomHint",
                  "Matches only when the quiz payload includes Bloom metadata (some items may omit it).",
                )}
              </p>
            </div>
          </FilterPanel>

          <FilterPanel isDarkMode={isDarkMode}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label className={labelCls}>{t("quizListView.workspaceFilterDialog.durationMin", "Min duration (minutes)")}</Label>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="—"
                  value={draft.durationMinMinutes}
                  onChange={(e) => update({ durationMinMinutes: e.target.value })}
                  className={numberInputCls}
                />
              </div>
              <div>
                <Label className={labelCls}>{t("quizListView.workspaceFilterDialog.durationMax", "Max duration (minutes)")}</Label>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="—"
                  value={draft.durationMaxMinutes}
                  onChange={(e) => update({ durationMaxMinutes: e.target.value })}
                  className={numberInputCls}
                />
              </div>
            </div>
            <div className="mt-4 border-t pt-4 border-slate-200/70 dark:border-slate-700/70">
              <Label className={labelCls}>{t("quizListView.workspaceFilterDialog.timerMode", "Timer mode")}</Label>
              <FilterShell
                isDarkMode={isDarkMode}
                className={selectCls}
                value={draft.timerMode}
                onChange={(e) => update({ timerMode: e.target.value })}
              >
                <option value={WORKSPACE_QUIZ_ADV_FILTER_TIMER.ANY}>{t("quizListView.workspaceFilterDialog.timerAny", "Any")}</option>
                <option value={WORKSPACE_QUIZ_ADV_FILTER_TIMER.TOTAL}>{t("quizListView.workspaceFilterDialog.timerTotal", "Total time limit")}</option>
                <option value={WORKSPACE_QUIZ_ADV_FILTER_TIMER.PER_QUESTION}>{t("quizListView.workspaceFilterDialog.timerPerQuestion", "Per question")}</option>
              </FilterShell>
            </div>
          </FilterPanel>
        </div>

        <DialogFooter
          className={cn(
            "gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6",
            isDarkMode
              ? "border-slate-800/90 bg-slate-950/95 shadow-[0_-12px_32px_-16px_rgba(0,0,0,0.45)]"
              : "border-slate-200/80 bg-gradient-to-t from-slate-50/95 to-white/90 shadow-[0_-10px_40px_-20px_rgba(15,23,42,0.12)]",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            className={cn(
              "-ml-1 h-10 rounded-xl px-3 text-[13px] font-semibold",
              isDarkMode ? "text-slate-300 hover:bg-slate-800/90 hover:text-white" : "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900",
            )}
            onClick={handleClear}
          >
            {t("quizListView.workspaceFilterDialog.clearAll", "Clear all filters")}
          </Button>
          <div className="flex flex-wrap justify-end gap-2.5 sm:flex-nowrap">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-10 min-w-[5.5rem] rounded-xl text-[13px] font-semibold",
                isDarkMode ? "border-slate-600 bg-slate-900/50 hover:bg-slate-800" : "border-slate-200/90 bg-white hover:bg-slate-50",
              )}
              onClick={() => onOpenChange?.(false)}
            >
              {t("quizListView.workspaceFilterDialog.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              className={cn(
                "h-10 min-w-[5.5rem] rounded-xl text-[13px] font-semibold",
                "shadow-md shadow-blue-600/22 transition-[box-shadow,transform] duration-150 hover:shadow-lg hover:shadow-blue-600/28 active:scale-[0.98]",
              )}
              onClick={handleApply}
            >
              {t("quizListView.workspaceFilterDialog.apply", "Apply")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

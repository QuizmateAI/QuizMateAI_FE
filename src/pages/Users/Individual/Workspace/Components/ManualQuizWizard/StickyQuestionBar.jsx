import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Download,
  SlidersHorizontal,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCardStatus } from "./QuestionCard";

function StickyQuestionBar({
  config,
  questions,
  onBack,
  onSubmit,
  submitLabel = "Tạo Quiz",
  submittingLabel = "Đang tạo...",
  submitting,
  onAddQuestion,
  onOpenImport,
  onJumpTo,
  onDistributeEvenly,
  barRef,
  isDarkMode = false,
  surface = "quiz",
}) {
  const { t } = useTranslation();
  const isChallengeSurface = surface === "challenge";
  const bubblesRef = useRef(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  const [filterMode, setFilterMode] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const errorCount = questions.filter((question) => getCardStatus(question) === "error").length;
  const warnCount = questions.filter((question) => getCardStatus(question) === "warning").length;
  const emptyCount = questions.filter((question) => getCardStatus(question) === "empty").length;

  const visibleQuestions = questions.filter((question) => {
    if (filterMode === "all") return true;
    const status = getCardStatus(question);
    if (filterMode === "incomplete") return status === "empty" || status === "warning";
    if (filterMode === "error") return status === "error";
    return true;
  });

  const handleMouseDown = (event) => {
    isDragging.current = true;
    dragStartX.current = event.pageX;
    dragScrollLeft.current = bubblesRef.current?.scrollLeft ?? 0;
    bubblesRef.current?.classList.add("cursor-grabbing");
  };

  const handleMouseMove = (event) => {
    if (!isDragging.current || !bubblesRef.current) return;
    event.preventDefault();
    bubblesRef.current.scrollLeft = dragScrollLeft.current - (event.pageX - dragStartX.current);
  };

  const stopDrag = () => {
    isDragging.current = false;
    bubblesRef.current?.classList.remove("cursor-grabbing");
  };

  const scrollBubbles = (direction) => {
    bubblesRef.current?.scrollBy({ left: direction * 110, behavior: "smooth" });
  };

  const barBase = cn(
    "shrink-0 z-20 border-b",
    isDarkMode
      ? "bg-slate-950/95 border-slate-700 backdrop-blur-sm"
      : "bg-white/95 border-gray-200 backdrop-blur-sm",
  );

  const iconBtn = cn(
    "shrink-0 p-1.5 rounded-lg transition-colors",
    isDarkMode
      ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
      : "text-gray-400 hover:bg-gray-100 hover:text-gray-700",
  );

  const summaryChip = cn(
    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
    isDarkMode ? "bg-slate-800 text-slate-300" : "bg-gray-100 text-gray-600",
  );

  const actionPillBase = "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all shadow-sm";
  const addActionCls = cn(
    actionPillBase,
    "border",
    isChallengeSurface
      ? isDarkMode
        ? "border-orange-400/30 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25"
        : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
      : isDarkMode
        ? "border-blue-400/30 bg-blue-500/15 text-blue-200 hover:bg-blue-500/25"
        : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100",
  );
  const importActionCls = cn(
    actionPillBase,
    "border",
    isDarkMode
      ? "border-amber-400/30 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
      : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  );
  const miniTagCls = cn(
    "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
    isDarkMode ? "bg-white/10 text-white/80" : "bg-white/80 text-current",
  );

  const filterLabel = filterMode === "all"
    ? t("workspace.quiz.manualWizard.stickyBar.filterAll", "Tất cả")
    : filterMode === "error"
      ? t("workspace.quiz.manualWizard.stickyBar.filterError", "Chỉ lỗi")
      : t("workspace.quiz.manualWizard.stickyBar.filterIncomplete", "Chưa xong");

  return (
    <div ref={barRef} className={cn(barBase, "sticky top-0")}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          className={cn(
            "shrink-0 flex items-center gap-1 text-xs font-medium transition-colors",
            isDarkMode ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700",
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {t("workspace.quiz.manualWizard.stickyBar.backToConfig", "Cấu hình")}
        </button>

        <span className={isDarkMode ? "text-slate-700" : "text-gray-200"}>|</span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn("text-sm font-semibold truncate", isDarkMode ? "text-slate-100" : "text-gray-800")}>
              {config.title || (isChallengeSurface
                ? t("challengeManualMatchEditor.wizard.stickyBar.untitledMatch", "Đề challenge thủ công")
                : t("workspace.quiz.manualWizard.stickyBar.untitledQuiz", "Quiz thủ công"))}
            </span>
            <span className={summaryChip}>
              {t("workspace.quiz.manualWizard.stickyBar.questionsCount", {
                count: questions.length,
                defaultValue: `${questions.length} câu`,
              })}
            </span>
            <span className={cn(summaryChip, "hidden sm:inline-flex")}>
              {config.timerMode
                ? t("workspace.quiz.manualWizard.stickyBar.durationMinutes", {
                    count: config.duration || 0,
                    defaultValue: `${config.duration || 0} phút`,
                  })
                : t("workspace.quiz.manualWizard.stickyBar.perQuestionMode", "Từng câu")}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 mt-1">
            {errorCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500">
                {t("workspace.quiz.manualWizard.stickyBar.errorCount", {
                  count: errorCount,
                  defaultValue: `${errorCount} lỗi`,
                })}
              </span>
            )}
            {warnCount > 0 && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                {t("workspace.quiz.manualWizard.stickyBar.warningCount", {
                  count: warnCount,
                  defaultValue: `${warnCount} chưa xong`,
                })}
              </span>
            )}
            {emptyCount > 0 && (
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500",
              )}>
                {t("workspace.quiz.manualWizard.stickyBar.emptyCount", {
                  count: emptyCount,
                  defaultValue: `${emptyCount} rỗng`,
                })}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!config.timerMode && (
            <button
              type="button"
              onClick={onDistributeEvenly}
              title={t("workspace.quiz.manualWizard.stickyBar.distributeTime", "Phân bổ thời gian đều")}
              aria-label={t("workspace.quiz.manualWizard.stickyBar.distributeTime", "Phân bổ thời gian đều")}
              className={iconBtn}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}

          <Button
            onClick={onSubmit}
            disabled={submitting}
            size="sm"
            className={cn(
              "rounded-full text-white gap-1.5 px-4 h-8 text-xs",
              isChallengeSurface ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-600 hover:bg-blue-700",
            )}
          >
            {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
            {submitting ? submittingLabel : submitLabel}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 pb-2">
        <button
          type="button"
          onClick={() => scrollBubbles(-1)}
          className={cn(iconBtn, "p-1")}
          aria-label={t("workspace.quiz.manualWizard.stickyBar.scrollLeft", "Cuộn trái")}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div
          ref={bubblesRef}
          className="flex-1 flex items-center gap-1 overflow-x-auto select-none cursor-grab"
          style={{ scrollbarWidth: "none" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
        >
          {visibleQuestions.map((question) => {
            const realIdx = questions.indexOf(question) + 1;
            const status = getCardStatus(question);

            return (
              <button
                key={question.id}
                type="button"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => onJumpTo?.(question.id)}
                title={t("workspace.quiz.manualWizard.stickyBar.questionTitle", {
                  number: realIdx,
                  defaultValue: `Câu ${realIdx}`,
                })}
                className={cn(
                  "shrink-0 min-w-[22px] h-6 px-1 rounded-full flex items-center justify-center text-[10px] font-bold transition-all hover:scale-110",
                  status === "ok"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                    : status === "warning"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      : status === "error"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                        : isDarkMode
                          ? "bg-slate-800 text-slate-400"
                          : "bg-gray-100 text-gray-500",
                )}
              >
                {realIdx}
              </button>
            );
          })}

          {visibleQuestions.length === 0 && (
            <span className={cn("text-xs px-1", isDarkMode ? "text-slate-600" : "text-gray-400")}>
              {t("workspace.quiz.manualWizard.stickyBar.noQuestions", "Không có câu nào")}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => scrollBubbles(1)}
          className={cn(iconBtn, "p-1")}
          aria-label={t("workspace.quiz.manualWizard.stickyBar.scrollRight", "Cuộn phải")}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setFilterOpen((value) => !value)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors",
              filterMode !== "all"
                ? isChallengeSurface
                  ? "bg-orange-500/10 text-orange-500"
                  : "bg-blue-500/10 text-blue-500"
                : isDarkMode
                  ? "text-slate-400 hover:bg-slate-800"
                  : "text-gray-500 hover:bg-gray-100",
            )}
          >
            <Filter className="w-3 h-3" />
            {filterLabel}
          </button>

          {filterOpen && (
            <div className={cn(
              "absolute right-0 top-full mt-1 rounded-xl border shadow-xl py-1 z-50 w-36",
              isDarkMode ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200",
            )}>
              {[
                { key: "all", label: t("workspace.quiz.manualWizard.stickyBar.filterAll", "Tất cả") },
                { key: "incomplete", label: t("workspace.quiz.manualWizard.stickyBar.filterIncomplete", "Chưa xong") },
                { key: "error", label: t("workspace.quiz.manualWizard.stickyBar.filterError", "Chỉ lỗi") },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setFilterMode(key);
                    setFilterOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs transition-colors",
                    filterMode === key
                      ? isChallengeSurface
                        ? isDarkMode ? "text-orange-300 bg-orange-500/10" : "text-orange-600 bg-orange-50"
                        : isDarkMode ? "text-blue-400 bg-blue-500/10" : "text-blue-600 bg-blue-50"
                      : isDarkMode ? "text-slate-300 hover:bg-slate-700" : "text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onAddQuestion}
          disabled={questions.length >= 100}
          title={t("workspace.quiz.manualWizard.stickyBar.addQuestion", "Thêm câu")}
          aria-label={t("workspace.quiz.manualWizard.stickyBar.addQuestion", "Thêm câu")}
          className={cn(addActionCls, "disabled:opacity-40")}
        >
          <span className={miniTagCls}>
            {t("workspace.quiz.manualWizard.stickyBar.addQuestionBadge", "Mới")}
          </span>
          <Plus className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">{t("workspace.quiz.manualWizard.stickyBar.addQuestion", "Thêm câu")}</span>
        </button>

        {onOpenImport ? (
          <button
            type="button"
            onClick={onOpenImport}
            title={t("workspace.quiz.manualWizard.stickyBar.importQuestions", "Import câu")}
            aria-label={t("workspace.quiz.manualWizard.stickyBar.importQuestions", "Import câu")}
            className={importActionCls}
          >
            <span className={miniTagCls}>
              {t("workspace.quiz.manualWizard.stickyBar.importQuestionsBadge", "Quiz khác")}
            </span>
            <Download className="w-3.5 h-3.5" />
            <span className="whitespace-nowrap">{t("workspace.quiz.manualWizard.stickyBar.importQuestions", "Import câu")}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default StickyQuestionBar;

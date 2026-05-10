import React, { useState } from "react";
import { ChevronUp, Plus, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getCardStatus } from "./QuestionCard";

const STATUS_ICON = {
  ok: { icon: "ok", cls: "text-emerald-500" },
  warning: { icon: "!", cls: "text-amber-500" },
  error: { icon: "x", cls: "text-red-500" },
  empty: { icon: "o", cls: "text-slate-400" },
};

function QuestionNav({
  questions,
  onJumpTo,
  onAddQuestion,
  onOpenImport,
  maxQuestions = 100,
  isDarkMode = false,
}) {
  const { t } = useTranslation();
  const [filterMode, setFilterMode] = useState("all");
  const [jumpInput, setJumpInput] = useState("");
  const navKey = "quiz.manualWizard.questionNavigator";

  const filteredQuestions = questions.filter((question) => {
    if (filterMode === "all") return true;
    const status = getCardStatus(question);
    if (filterMode === "incomplete") return status === "empty" || status === "warning";
    if (filterMode === "error") return status === "error";
    return true;
  });

  const handleJump = (event) => {
    event.preventDefault();
    const questionNumber = parseInt(jumpInput, 10);
    if (!Number.isFinite(questionNumber) || questionNumber < 1 || questionNumber > questions.length) return;
    onJumpTo?.(questions[questionNumber - 1]?.id);
    setJumpInput("");
  };

  const errorCount = questions.filter((question) => getCardStatus(question) === "error").length;
  const incompleteCount = questions.filter((question) => ["empty", "warning"].includes(getCardStatus(question))).length;

  return (
    <aside className={cn(
      "flex flex-col h-full rounded-2xl border p-3 gap-2",
      isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-gray-200 bg-gray-50",
    )}>
      <div className="flex items-center gap-2 flex-wrap text-[11px] font-medium">
        <span className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
          {t(`${navKey}.countLabel`, { count: questions.length, max: maxQuestions })}
        </span>
        {errorCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500">
            {t(`${navKey}.errorCount`, { count: errorCount })}
          </span>
        )}
        {incompleteCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
            {t(`${navKey}.incompleteCount`, { count: incompleteCount })}
          </span>
        )}
      </div>

      <div className="flex gap-1">
        {[
          { key: "all", label: t(`${navKey}.all`) },
          { key: "incomplete", label: t(`${navKey}.incomplete`) },
          { key: "error", label: t(`${navKey}.error`) },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterMode(key)}
            className={cn(
              "flex-1 rounded-lg py-1 text-[11px] font-medium transition-colors",
              filterMode === key
                ? "bg-blue-600 text-white"
                : isDarkMode
                  ? "text-slate-400 hover:bg-slate-800"
                  : "text-gray-500 hover:bg-gray-200",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {filteredQuestions.map((question) => {
          const realIndex = questions.indexOf(question) + 1;
          const status = getCardStatus(question);
          const { icon, cls } = STATUS_ICON[status];

          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onJumpTo?.(question.id)}
              className={cn(
                "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                isDarkMode
                  ? "text-slate-300 hover:bg-slate-800"
                  : "text-gray-700 hover:bg-gray-200",
              )}
            >
              <span className={cn("shrink-0 w-5 text-center font-bold text-[11px]", cls)}>{icon}</span>
              <span className="shrink-0 w-5 text-center font-medium opacity-60">{realIndex}</span>
              <span className="truncate">
                {String(question.content || "").trim() || t(`${navKey}.emptyQuestion`)}
              </span>
            </button>
          );
        })}

        {filteredQuestions.length === 0 && (
          <p className={cn("text-center text-xs py-4", isDarkMode ? "text-slate-500" : "text-gray-400")}>
            {t(`${navKey}.noQuestions`)}
          </p>
        )}
      </div>

      <form onSubmit={handleJump} className="flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          max={questions.length}
          value={jumpInput}
          onChange={(event) => setJumpInput(event.target.value)}
          placeholder={t(`${navKey}.jumpTo`)}
          className={cn(
            "flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none transition-all",
            isDarkMode
              ? "border-slate-600 bg-slate-800 text-white placeholder:text-slate-500 focus:border-blue-500"
              : "border-gray-200 bg-white text-gray-700 placeholder:text-gray-400 focus:border-blue-400",
          )}
        />
        <button
          type="submit"
          className={cn(
            "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
            isDarkMode
              ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300",
          )}
        >
          {t(`${navKey}.jumpButton`)}
        </button>
      </form>

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-colors",
          isDarkMode
            ? "text-slate-400 hover:bg-slate-800"
            : "text-gray-500 hover:bg-gray-200",
        )}
      >
        <ChevronUp className="w-3.5 h-3.5" /> {t(`${navKey}.scrollTop`)}
      </button>

      <hr className={isDarkMode ? "border-slate-700" : "border-gray-200"} />

      <button
        type="button"
        onClick={onAddQuestion}
        disabled={questions.length >= maxQuestions}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors disabled:opacity-40",
          isDarkMode
            ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
            : "bg-blue-50 text-blue-600 hover:bg-blue-100",
        )}
      >
        <Plus className="w-3.5 h-3.5" /> {t(`${navKey}.addQuestion`)}
      </button>

      <button
        type="button"
        onClick={onOpenImport}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors",
          isDarkMode
            ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
            : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-100",
        )}
      >
        <Download className="w-3.5 h-3.5" /> {t(`${navKey}.importQuestions`)}
      </button>
    </aside>
  );
}

export default QuestionNav;

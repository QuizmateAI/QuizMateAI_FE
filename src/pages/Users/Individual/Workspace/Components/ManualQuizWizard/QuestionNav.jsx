import React, { useState } from "react";
import { ChevronUp, Plus, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getCardStatus } from "./QuestionCard";

const STATUS_ICON = {
  ok: { icon: "✓", cls: "text-emerald-500" },
  warning: { icon: "⚠", cls: "text-amber-500" },
  error: { icon: "✗", cls: "text-red-500" },
  empty: { icon: "○", cls: "text-slate-400" },
};

/**
 * Navigation panel bên trái trong Step 2 — danh sách câu + jump/filter/thêm.
 */
function QuestionNav({
  questions,
  onJumpTo,
  onAddQuestion,
  onOpenImport,
  maxQuestions = 100,
  isDarkMode = false,
}) {
  const { t } = useTranslation();
  const [filterMode, setFilterMode] = useState("all"); // all | incomplete | error
  const [jumpInput, setJumpInput] = useState("");

  const filteredQuestions = questions.filter((q) => {
    if (filterMode === "all") return true;
    const s = getCardStatus(q);
    if (filterMode === "incomplete") return s === "empty" || s === "warning";
    if (filterMode === "error") return s === "error";
    return true;
  });

  const handleJump = (e) => {
    e.preventDefault();
    const n = parseInt(jumpInput, 10);
    if (!Number.isFinite(n) || n < 1 || n > questions.length) return;
    onJumpTo?.(questions[n - 1]?.id);
    setJumpInput("");
  };

  const errorCount = questions.filter((q) => getCardStatus(q) === "error").length;
  const incompleteCount = questions.filter((q) => ["empty", "warning"].includes(getCardStatus(q))).length;

  return (
    <aside className={cn(
      "flex flex-col h-full rounded-2xl border p-3 gap-2",
      isDarkMode ? "border-slate-700 bg-slate-900/60" : "border-gray-200 bg-gray-50",
    )}>
      {/* Summary badges */}
      <div className="flex items-center gap-2 flex-wrap text-[11px] font-medium">
        <span className={isDarkMode ? "text-slate-300" : "text-slate-600"}>
          {questions.length}/{maxQuestions} câu
        </span>
        {errorCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500">
            {errorCount} lỗi
          </span>
        )}
        {incompleteCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
            {incompleteCount} chưa xong
          </span>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-1">
        {[
          { key: "all", label: "Tất cả" },
          { key: "incomplete", label: "Chưa xong" },
          { key: "error", label: "Lỗi" },
        ].map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterMode(key)}
            className={cn(
              "flex-1 rounded-lg py-1 text-[11px] font-medium transition-colors",
              filterMode === key
                ? isDarkMode
                  ? "bg-blue-600 text-white"
                  : "bg-blue-600 text-white"
                : isDarkMode
                  ? "text-slate-400 hover:bg-slate-800"
                  : "text-gray-500 hover:bg-gray-200",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {filteredQuestions.map((q, idx) => {
          const realIdx = questions.indexOf(q) + 1;
          const status = getCardStatus(q);
          const { icon, cls } = STATUS_ICON[status];

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onJumpTo?.(q.id)}
              className={cn(
                "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                isDarkMode
                  ? "text-slate-300 hover:bg-slate-800"
                  : "text-gray-700 hover:bg-gray-200",
              )}
            >
              <span className={cn("shrink-0 w-5 text-center font-bold text-[11px]", cls)}>
                {icon}
              </span>
              <span className="shrink-0 w-5 text-center font-medium opacity-60">
                {realIdx}
              </span>
              <span className="truncate">
                {String(q.content || "").trim() || "(Chưa nhập)"}
              </span>
            </button>
          );
        })}

        {filteredQuestions.length === 0 && (
          <p className={cn("text-center text-xs py-4", isDarkMode ? "text-slate-500" : "text-gray-400")}>
            Không có câu nào.
          </p>
        )}
      </div>

      {/* Jump to */}
      <form onSubmit={handleJump} className="flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          max={questions.length}
          value={jumpInput}
          onChange={(e) => setJumpInput(e.target.value)}
          placeholder={t("quiz.manualWizard.questionNavigator.jumpTo")}
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
          Đến
        </button>
      </form>

      {/* Scroll to top */}
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
        <ChevronUp className="w-3.5 h-3.5" /> Lên đầu
      </button>

      <hr className={isDarkMode ? "border-slate-700" : "border-gray-200"} />

      {/* Add question */}
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
        <Plus className="w-3.5 h-3.5" /> Thêm câu
      </button>

      {/* Import questions */}
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
        <Download className="w-3.5 h-3.5" /> Nhập từ quiz khác
      </button>
    </aside>
  );
}

export default QuestionNav;

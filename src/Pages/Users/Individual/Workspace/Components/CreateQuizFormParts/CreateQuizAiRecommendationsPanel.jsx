import { Button } from "@/Components/ui/button";
import { Loader2, Rocket, Sparkles } from "lucide-react";

function CreateQuizAiRecommendationsPanel({
  activeRecommendation,
  expandedRecId,
  fontClass,
  inlineRecommendations,
  inlineRecError,
  inlineRecGeneratingId,
  inlineRecLoading,
  isDarkMode,
  onGenerateRecommendation,
  onToggleRecommendation,
  t,
}) {
  return (
    <div className={`rounded-2xl border p-4 md:p-5 ${isDarkMode ? "border-violet-700/50 bg-gradient-to-br from-violet-950/35 to-slate-900" : "border-violet-200 bg-gradient-to-br from-violet-50 to-white"}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-base font-semibold ${isDarkMode ? "text-violet-200" : "text-violet-800"} ${fontClass}`}>
            {t("workspace.quiz.aiRecommendations.inlineTitle")}
          </p>
          <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
            {t("workspace.quiz.aiRecommendations.inlineDesc")}
          </p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isDarkMode ? "bg-violet-500/20" : "bg-violet-100"}`}>
          <Sparkles className={`h-4.5 w-4.5 ${isDarkMode ? "text-violet-300" : "text-violet-600"}`} />
        </div>
      </div>

      {inlineRecLoading && (
        <div className={`flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-300" : "text-gray-600"} ${fontClass}`}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("workspace.quiz.aiRecommendations.loading")}
        </div>
      )}

      {!inlineRecLoading && inlineRecError && (
        <div className={`rounded-lg px-2.5 py-2 text-xs ${isDarkMode ? "border border-red-900/40 bg-red-950/25 text-red-300" : "border border-red-200 bg-red-50 text-red-600"} ${fontClass}`}>
          {inlineRecError}
        </div>
      )}

      {!inlineRecLoading && !inlineRecError && inlineRecommendations.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {inlineRecommendations.map((recommendation) => {
              const isActive = expandedRecId === recommendation.assessmentId;

              return (
                <button
                  key={recommendation.assessmentId}
                  type="button"
                  onClick={() => onToggleRecommendation(isActive ? null : recommendation.assessmentId)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition-all active:scale-95 ${
                    isActive
                      ? (isDarkMode
                          ? "border-violet-500 bg-violet-600/25 text-violet-100 shadow-sm shadow-violet-900/30"
                          : "border-violet-300 bg-violet-100 text-violet-700")
                      : (isDarkMode
                          ? "border-slate-700 bg-slate-800 text-slate-200 hover:border-violet-500/40"
                          : "border-gray-200 bg-white text-gray-700 hover:border-violet-300")
                  } ${fontClass}`}
                >
                  {recommendation.displayTitle}
                </button>
              );
            })}
          </div>

          {activeRecommendation && (
            <div className={`mt-4 rounded-xl border p-4 ${isDarkMode ? "border-slate-700 bg-slate-900/70" : "border-gray-200 bg-white"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className={`text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
                  {activeRecommendation.displayTitle}
                </p>
                <button
                  type="button"
                  onClick={() => onToggleRecommendation(null)}
                  className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${isDarkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800" : "border-gray-200 text-gray-600 hover:bg-gray-100"} ${fontClass}`}
                >
                  {t("workspace.quiz.aiRecommendations.hideDetail")}
                </button>
              </div>

              {activeRecommendation.displayReason && (
                <p className={`mt-2 text-sm leading-relaxed ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
                  {activeRecommendation.displayReason}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                  {activeRecommendation.questionCount} {t("workspace.quiz.questions")}
                </span>
              </div>

              {Array.isArray(activeRecommendation.focusTopics) && activeRecommendation.focusTopics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {activeRecommendation.focusTopics.map((topic, index) => (
                    <span
                      key={`${activeRecommendation.assessmentId}-${index}`}
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${isDarkMode ? "border-slate-700 bg-slate-800 text-slate-300" : "border-gray-200 bg-gray-50 text-gray-600"}`}
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3">
                <Button
                  type="button"
                  onClick={() => onGenerateRecommendation(activeRecommendation.assessmentId)}
                  disabled={inlineRecGeneratingId !== null}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
                >
                  {inlineRecGeneratingId === activeRecommendation.assessmentId ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("workspace.quiz.aiRecommendations.inlineGenerating")}
                    </>
                  ) : (
                    <>
                      <Rocket className="mr-2 h-4 w-4" />
                      {t("workspace.quiz.aiRecommendations.inlineCreateQuiz")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {!inlineRecLoading && !inlineRecError && inlineRecommendations.length === 0 && (
        <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
          {t("workspace.quiz.aiRecommendations.empty")}
        </p>
      )}
    </div>
  );
}

export default CreateQuizAiRecommendationsPanel;

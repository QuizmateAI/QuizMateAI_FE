import { Button } from "@/components/ui/button";
import { Loader2, Rocket, Sparkles, X } from "lucide-react";
import { getBloomSkillLabel, getQuizDifficultyLabel, getQuizQuestionTypeLabel } from "@/lib/quizQuestionTypes";

function CreateQuizAiRecommendationsPanel({
  activeRecommendation,
  expandedRecId,
  fontClass,
  inlineRecommendations,
  inlineRecError,
  inlineRecGeneratingId,
  inlineRecDismissingId,
  inlineRecLoading,
  isDarkMode,
  onGenerateRecommendation,
  onDismissRecommendation,
  onToggleRecommendation,
  t,
}) {
  const getDifficultyLabel = (difficulty) => getQuizDifficultyLabel(difficulty, t);
  const getQuestionTypeLabel = (questionType) => getQuizQuestionTypeLabel(questionType, t);
  const getBloomLabel = (bloomSkill) => getBloomSkillLabel(bloomSkill, t);
  const hasRecommendations = Array.isArray(inlineRecommendations) && inlineRecommendations.length > 0;
  const activeStructure = Array.isArray(activeRecommendation?.structure) ? activeRecommendation.structure : [];
  const activeFocusLabels = Array.isArray(activeRecommendation?.focusTopics) ? activeRecommendation.focusTopics : [];
  const focusLabels = activeFocusLabels
    .map((label) => String(label || "").trim())
    .filter(Boolean);

  if (!inlineRecError && !hasRecommendations) {
    return null;
  }

  return (
    <div className={`border-b pb-5 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-base font-semibold ${isDarkMode ? "text-violet-200" : "text-slate-900"} ${fontClass}`}>
            {t("workspace.quiz.aiRecommendations.inlineTitle")}
          </p>
          <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${fontClass}`}>
            {t("workspace.quiz.aiRecommendations.inlineDesc")}
          </p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isDarkMode ? "bg-violet-500/20" : "bg-violet-100"}`}>
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

      {!inlineRecLoading && !inlineRecError && hasRecommendations && (
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
            <div className={`mt-4 rounded-2xl border p-4 ${isDarkMode ? "border-slate-700 bg-slate-900/70" : "border-slate-200 bg-slate-50/70"}`}>
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

              {focusLabels.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {focusLabels.map((label) => (
                    <span
                      key={label}
                      className={`rounded-md border px-2 py-1 text-[11px] font-medium ${isDarkMode
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        } ${fontClass}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}

              {activeStructure.length > 0 && (
                <div className={`mt-3 rounded-lg border overflow-hidden ${isDarkMode ? "border-slate-700" : "border-gray-200"}`}>
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className={isDarkMode ? "bg-slate-800/80" : "bg-gray-50"}>
                        <th className={`px-2.5 py-1.5 text-left font-medium ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>{t("workspace.quiz.aiRecommendations.difficulty")}</th>
                        <th className={`px-2.5 py-1.5 text-left font-medium ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>{t("workspace.quiz.aiRecommendations.type")}</th>
                        <th className={`px-2.5 py-1.5 text-left font-medium ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>{t("workspace.quiz.aiRecommendations.bloom")}</th>
                        <th className={`px-2.5 py-1.5 text-right font-medium ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>{t("workspace.quiz.aiRecommendations.quantity")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeStructure.map((item, sIdx) => (
                        <tr key={sIdx} className={`border-t ${isDarkMode ? "border-slate-700/50" : "border-gray-100"}`}>
                          <td className={`px-2.5 py-1.5 ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>{getDifficultyLabel(item.difficulty)}</td>
                          <td className={`px-2.5 py-1.5 ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>{getQuestionTypeLabel(item.questionType)}</td>
                          <td className={`px-2.5 py-1.5 ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>{getBloomLabel(item.bloomSkill)}</td>
                          <td className={`px-2.5 py-1.5 text-right font-medium ${isDarkMode ? "text-slate-200" : "text-gray-800"}`}>{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  onClick={() => onGenerateRecommendation(activeRecommendation.assessmentId)}
                  disabled={inlineRecGeneratingId !== null || inlineRecDismissingId !== null}
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700 sm:flex-initial"
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onDismissRecommendation(activeRecommendation.assessmentId)}
                  disabled={inlineRecGeneratingId !== null || inlineRecDismissingId !== null}
                  className={`text-xs ${isDarkMode
                    ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                    : "border-gray-200 text-gray-500 hover:bg-gray-100"
                    }`}
                >
                  {inlineRecDismissingId === activeRecommendation.assessmentId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="mr-1 h-4 w-4" />
                      {t("workspace.quiz.aiRecommendations.dismiss")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}

export default CreateQuizAiRecommendationsPanel;

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Loader2, Sparkles, BookOpen, Target, HelpCircle, Rocket, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getPendingRecommendations, generateQuizFromWorkspaceAssessment } from "@/api/QuizAPI";

/**
 * AIRecommendationsDialog — popup hiển thị danh sách gợi ý quiz AI (tối đa 5 cards)
 * @param {boolean} open
 * @param {function} onOpenChange
 * @param {boolean} isDarkMode
 * @param {string|number} workspaceId
 * @param {function} onCreateQuiz - callback khi quiz được tạo thành công
 */
function AIRecommendationsDialog({ open, onOpenChange, isDarkMode = false, workspaceId, onCreateQuiz }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatingId, setGeneratingId] = useState(null);

  // Fetch recommendations khi dialog mở
  useEffect(() => {
    if (!open || !workspaceId) return;
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError("");
      setRecommendations([]);
      try {
        const res = await getPendingRecommendations(workspaceId);
        if (cancelled) return;
        const data = res?.data || res || [];
        setRecommendations(Array.isArray(data) ? data.slice(0, 5) : []);
      } catch (e) {
        if (cancelled) return;
        console.error("Failed to fetch AI recommendations:", e);
        setError(e?.message || t("workspace.quiz.aiRecommendations.loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [open, workspaceId, t]);

  // Xử lý tạo quiz từ recommendation
  const handleGenerate = async (assessmentId) => {
    setGeneratingId(assessmentId);
    setError("");
    try {
      const result = await generateQuizFromWorkspaceAssessment(assessmentId);
      const quizData = result?.data || result;
      onCreateQuiz?.(quizData);
      onOpenChange(false);
    } catch (e) {
      console.error("Failed to generate quiz from recommendation:", e);
      setError(e?.message || t("workspace.quiz.aiRecommendations.generateFailed"));
    } finally {
      setGeneratingId(null);
    }
  };

  // Gradient colors cho cards (cycle qua 5 màu)
  const cardGradients = [
    { border: "from-violet-500 to-purple-600", bg: isDarkMode ? "bg-violet-950/20" : "bg-violet-50/80", accent: "text-violet-500" },
    { border: "from-blue-500 to-cyan-500", bg: isDarkMode ? "bg-blue-950/20" : "bg-blue-50/80", accent: "text-blue-500" },
    { border: "from-emerald-500 to-teal-500", bg: isDarkMode ? "bg-emerald-950/20" : "bg-emerald-50/80", accent: "text-emerald-500" },
    { border: "from-amber-500 to-orange-500", bg: isDarkMode ? "bg-amber-950/20" : "bg-amber-50/80", accent: "text-amber-500" },
    { border: "from-rose-500 to-pink-500", bg: isDarkMode ? "bg-rose-950/20" : "bg-rose-50/80", accent: "text-rose-500" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`sm:max-w-lg max-h-[85vh] overflow-y-auto ${isDarkMode
          ? "bg-slate-900 border-slate-700 text-white"
          : "bg-white border-gray-200 text-gray-900"
          }`}
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 text-lg ${fontClass}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            {t("workspace.quiz.aiRecommendations.title")}
          </DialogTitle>
          <DialogDescription className={`${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
            {t("workspace.quiz.aiRecommendations.desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-pulse">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                {t("workspace.quiz.aiRecommendations.loading")}
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className={`flex items-start gap-2 text-xs px-3 py-3 rounded-lg ${isDarkMode
              ? "bg-red-950/30 text-red-400 border border-red-900/30"
              : "bg-red-50 text-red-600 border border-red-200"
              }`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className={fontClass}>{error}</span>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && recommendations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode
                ? "bg-slate-800"
                : "bg-gray-100"
                }`}>
                <HelpCircle className={`w-7 h-7 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
              </div>
              <p className={`text-sm text-center ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                {t("workspace.quiz.aiRecommendations.empty")}
              </p>
            </div>
          )}

          {/* Recommendation Cards */}
          {!loading && recommendations.map((rec, idx) => {
            const gradient = cardGradients[idx % cardGradients.length];
            const isGenerating = generatingId === rec.assessmentId;

            return (
              <div
                key={rec.assessmentId}
                className="relative group"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                {/* Gradient border effect */}
                <div className={`absolute -inset-[1px] rounded-xl bg-gradient-to-r ${gradient.border} opacity-30 group-hover:opacity-60 transition-opacity duration-300`} />

                <div className={`relative rounded-xl p-4 space-y-3 transition-all duration-300 ${isDarkMode
                  ? "bg-slate-900 hover:bg-slate-800/80"
                  : "bg-white hover:bg-gray-50/80"
                  }`}>
                  {/* Title + Question count */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient.border} flex items-center justify-center shrink-0 mt-0.5`}>
                        <BookOpen className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h4 className={`text-sm font-semibold leading-snug ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
                          {rec.displayTitle}
                        </h4>
                      </div>
                    </div>
                    <span className={`shrink-0 text-[11px] font-medium px-2 py-1 rounded-full ${isDarkMode
                      ? "bg-slate-800 text-slate-300"
                      : "bg-gray-100 text-gray-600"
                      }`}>
                      {rec.questionCount} {t("workspace.quiz.questions")}
                    </span>
                  </div>

                  {/* Reason */}
                  <p className={`text-xs leading-relaxed ${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
                    {rec.displayReason}
                  </p>

                  {/* Focus Topics */}
                  {Array.isArray(rec.focusTopics) && rec.focusTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {rec.focusTopics.map((topic, tIdx) => (
                        <span
                          key={tIdx}
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium transition-colors ${isDarkMode
                            ? "bg-slate-800 text-slate-300 border border-slate-700"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                            }`}
                        >
                          <Target className="w-2.5 h-2.5 shrink-0" />
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Generate Button */}
                  <Button
                    size="sm"
                    onClick={() => handleGenerate(rec.assessmentId)}
                    disabled={!!generatingId}
                    className={`w-full mt-1 text-xs font-medium bg-gradient-to-r ${gradient.border} hover:opacity-90 text-white border-0 transition-all duration-300 active:scale-[0.98]`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        {t("workspace.quiz.aiRecommendations.generating")}
                      </>
                    ) : (
                      <>
                        <Rocket className="w-3.5 h-3.5 mr-1.5" />
                        {t("workspace.quiz.aiRecommendations.createQuiz")}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AIRecommendationsDialog;

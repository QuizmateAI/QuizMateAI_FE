import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  Award, 
  Zap,
  TrendingUp,
  AlertTriangle,
  Target,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Calendar,
  AlertCircle
} from "lucide-react";
import { getRoadmapReview } from "@/api/RoadmapAPI";

/**
 * Maps the backend rating string to a friendly format and color
 */
function getRatingMeta(rating, isDarkMode) {
  const norm = String(rating || "").toUpperCase();
  switch (norm) {
    case "EXCELLENT":
    case "STRONG":
    case "GOOD":
      return { label: norm === "EXCELLENT" ? "Xuất sắc" : (norm === "STRONG" ? "Rất tốt" : "Tốt"), color: "emerald", bg: isDarkMode ? "bg-emerald-900/30" : "bg-emerald-100", text: isDarkMode ? "text-emerald-400" : "text-emerald-700" };
    case "ADEQUATE":
    case "FAIR":
      return { label: norm === "ADEQUATE" ? "Đạt yêu cầu" : "Khá", color: "sky", bg: isDarkMode ? "bg-sky-900/30" : "bg-sky-100", text: isDarkMode ? "text-sky-400" : "text-sky-700" };
    case "NEEDS_IMPROVEMENT":
    case "POOR":
    case "WEAK":
      return { label: "Cần cải thiện", color: "rose", bg: isDarkMode ? "bg-rose-900/30" : "bg-rose-100", text: isDarkMode ? "text-rose-400" : "text-rose-700" };
    default:
      return { label: rating || "Chưa rõ", color: "slate", bg: isDarkMode ? "bg-slate-800" : "bg-slate-100", text: isDarkMode ? "text-slate-400" : "text-slate-600" };
  }
}

/**
 * Renders a list of chips for a mastery category
 */
function TopicList({ title, topics, icon: Icon, colorTheme, isDarkMode, fontClass }) {
  if (!topics || topics.length === 0) return null;
  
  const colors = {
    emerald: isDarkMode ? "bg-emerald-900/30 text-emerald-300 border-emerald-800" : "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose: isDarkMode ? "bg-rose-900/30 text-rose-300 border-rose-800" : "bg-rose-50 text-rose-700 border-rose-200",
    sky: isDarkMode ? "bg-sky-900/30 text-sky-300 border-sky-800" : "bg-sky-50 text-sky-700 border-sky-200",
    amber: isDarkMode ? "bg-amber-900/30 text-amber-300 border-amber-800" : "bg-amber-50 text-amber-700 border-amber-200",
  };

  const titleColors = {
    emerald: isDarkMode ? "text-emerald-400" : "text-emerald-600",
    rose: isDarkMode ? "text-rose-400" : "text-rose-600",
    sky: isDarkMode ? "text-sky-400" : "text-sky-600",
    amber: isDarkMode ? "text-amber-400" : "text-amber-600",
  };

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wider ${titleColors[colorTheme]} ${fontClass}`}>
        <Icon className="w-4 h-4" />
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic, i) => (
          <span 
            key={i} 
            className={`inline-flex items-center px-2.5 py-1.5 rounded-lg border text-xs font-medium ${colors[colorTheme]} ${fontClass}`}
          >
            {topic}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RoadmapReviewPanel({ roadmapId, isDarkMode = false }) {
  const { i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!roadmapId) {
      setReviewData(null);
      setError(true);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(false);

    getRoadmapReview(roadmapId)
      .then((res) => {
        if (isMounted) {
          const data = res?.data?.data ?? res?.data ?? null;
          setReviewData(data || null);
          setLoading(false);
          if (!data) setError(true);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch roadmap review", err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [roadmapId]);

  if (loading) {
    return (
      <div className={`mt-8 w-full p-6 sm:p-8 rounded-[22px] border ${isDarkMode ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-slate-50/50"} flex items-center justify-center animate-pulse`}>
        <div className="h-6 w-6 border-2 border-t-transparent border-slate-400 rounded-full animate-spin mr-3"></div>
        <span className={`text-slate-500 text-sm ${fontClass}`}>Đang tính toán kết quả tổng kết lộ trình...</span>
      </div>
    );
  }

  if (error || !reviewData) {
    return (
      <div className={`mt-8 w-full rounded-[24px] border p-5 sm:p-6 ${isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-indigo-100 bg-white"}`}>
        <div className="flex items-start gap-3">
          <AlertCircle className={`mt-0.5 h-5 w-5 ${isDarkMode ? "text-amber-300" : "text-amber-600"}`} />
          <div>
            <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-100" : "text-slate-800"} ${fontClass}`}>
              Chưa có dữ liệu tổng kết roadmap
            </p>
            <p className={`mt-1 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"} ${fontClass}`}>
              Hoàn thành thêm phase/quiz và thử tải lại để xem báo cáo tổng kết chi tiết.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const {
    summary,
    confidenceScore,
    learningJourney,
    masteryReport,
    phaseInsights,
    nextStep,
  } = reviewData;

  const ratingMeta = getRatingMeta(learningJourney?.overallRating, isDarkMode);

  return (
    <div className={`mt-8 w-full rounded-[24px] border overflow-hidden ${isDarkMode ? "border-slate-800 bg-slate-950/60" : "border-indigo-100 bg-white"}`}>
      {/* HEADER */}
      <div className={`relative px-6 py-5 sm:px-8 sm:py-6 border-b ${isDarkMode ? "border-slate-800 bg-slate-900" : "border-indigo-50 bg-gradient-to-r from-indigo-50/50 to-white"}`}>
        <div className="flex items-start gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <Award className={`w-5 h-5 ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`} />
              <h4 className={`text-lg font-bold ${isDarkMode ? "text-slate-100" : "text-slate-900"} ${fontClass}`}>
                Tổng Kết Lộ Trình
              </h4>
            </div>
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"} ${fontClass}`}>
              Đánh giá toàn diện năng lực và hành trình học tập dựa trên kết quả của bạn.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-8">
        
        {/* SUMMARY BLOCK */}
        {summary && (
          <div className={`p-4 sm:p-5 rounded-2xl ${isDarkMode ? "bg-slate-900/60" : "bg-slate-50"} border-l-4 ${isDarkMode ? "border-indigo-500" : "border-indigo-500"}`}>
            <p className={`text-sm sm:text-base leading-relaxed ${isDarkMode ? "text-slate-300" : "text-slate-700"} ${fontClass}`}>
              {summary}
            </p>
          </div>
        )}

        {/* HIGHLIGHTS & LEARNING PACE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
             <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${isDarkMode ? "text-amber-400" : "text-amber-500"}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>Tốc độ hoàn thành</span>
                </div>
                <p className={`text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-slate-800"} ${fontClass}`}>
                    {learningJourney?.completionPace === "FAST" ? "Nhanh chóng" : 
                     learningJourney?.completionPace === "STEADY" ? "Ổn định" : 
                     learningJourney?.completionPace || "Bình thường"}
                </p>
             </div>
          </div>
          <div className={`p-4 rounded-2xl border ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
             <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${isDarkMode ? "text-indigo-400" : "text-indigo-500"}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>Ghi chú quá trình</span>
                </div>
                <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"} ${fontClass} line-clamp-2`}>
                    {learningJourney?.consistencyNote || "Không có ghi chú đặc biệt."}
                </p>
             </div>
          </div>
        </div>

        {/* MASTERY REPORT GRID */}
        {(masteryReport?.strongTopics?.length > 0 || masteryReport?.weakTopics?.length > 0 || masteryReport?.improvedTopics?.length > 0 || masteryReport?.persistentWeaknesses?.length > 0) && (
          <div className={`pt-6 border-t ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
            <h5 className={`mb-6 text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
              Báo cáo năng lực
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <TopicList 
                title="Điểm mạnh kiến thức" 
                topics={masteryReport.strongTopics} 
                icon={CheckCircle2} 
                colorTheme="emerald" 
                isDarkMode={isDarkMode} 
                fontClass={fontClass} 
              />
              <TopicList 
                title="Cần củng cố" 
                topics={masteryReport.weakTopics} 
                icon={AlertTriangle} 
                colorTheme="rose" 
                isDarkMode={isDarkMode} 
                fontClass={fontClass} 
              />
              <TopicList 
                title="Đã cải thiện" 
                topics={masteryReport.improvedTopics} 
                icon={TrendingUp} 
                colorTheme="sky" 
                isDarkMode={isDarkMode} 
                fontClass={fontClass} 
              />
              <TopicList 
                title="Sai sót lặp lại" 
                topics={masteryReport.persistentWeaknesses} 
                icon={AlertCircle} 
                colorTheme="amber" 
                isDarkMode={isDarkMode} 
                fontClass={fontClass} 
              />
            </div>
          </div>
        )}

        {/* PHASE INSIGHTS */}
        {phaseInsights && phaseInsights.length > 0 && (
          <div className={`pt-6 border-t ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
            <h5 className={`mb-5 text-base font-semibold ${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
              Chi tiết từng Giai đoạn
            </h5>
            <div className="space-y-3">
              {phaseInsights.map((phase) => {
                const phaseRating = getRatingMeta(phase.rating, isDarkMode);
                return (
                  <div key={phase.phaseId} className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"} flex flex-col sm:flex-row gap-4 sm:items-start`}>
                    <div className="flex-1 min-w-0">
                      <h6 className={`text-sm font-semibold truncate mb-1 ${isDarkMode ? "text-slate-200" : "text-slate-800"} ${fontClass}`}>
                        {phase.phaseTitle}
                      </h6>
                      <p className={`text-xs sm:text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"} ${fontClass}`}>
                        {phase.remark}
                      </p>
                    </div>
                    <div className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${phaseRating.bg} ${phaseRating.text} ${fontClass}`}>
                      {phaseRating.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* NEXT STEPS */}
        {(nextStep?.recommendations?.length > 0 || nextStep?.suggestedReviewTopics?.length > 0) && (
          <div className={`p-5 sm:p-6 rounded-2xl ${isDarkMode ? "bg-indigo-950/20 border border-indigo-900/50" : "bg-[#f5f7ff] border border-indigo-100"} mt-4`}>
            <div className="flex items-center gap-2 mb-4">
              <Target className={`w-5 h-5 ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`} />
              <h5 className={`text-base font-bold ${isDarkMode ? "text-indigo-100" : "text-indigo-900"} ${fontClass}`}>
                Khuyến nghị tiếp theo
              </h5>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {nextStep?.recommendations?.length > 0 && (
                <div>
                  <div className={`flex items-center gap-1.5 mb-3 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-indigo-400" : "text-indigo-600"} ${fontClass}`}>
                    <Lightbulb className="w-3.5 h-3.5" /> Lời khuyên
                  </div>
                  <ul className="space-y-2">
                    {nextStep.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ArrowRight className={`w-4 h-4 shrink-0 mt-0.5 ${isDarkMode ? "text-indigo-400" : "text-indigo-500"}`} />
                        <span className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-700"} ${fontClass}`}>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {nextStep?.suggestedReviewTopics?.length > 0 && (
                <div>
                  <div className={`flex items-center gap-1.5 mb-3 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? "text-indigo-400" : "text-indigo-600"} ${fontClass}`}>
                    <Target className="w-3.5 h-3.5" /> Chủ đề nên ôn tập
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {nextStep.suggestedReviewTopics.map((topic, i) => (
                      <span key={i} className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-medium border ${isDarkMode ? "bg-indigo-900/30 text-indigo-300 border-indigo-800" : "bg-white text-indigo-700 border-indigo-200"} ${fontClass}`}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

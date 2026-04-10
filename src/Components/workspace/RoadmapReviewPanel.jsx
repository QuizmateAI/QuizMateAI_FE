import React from "react";
import { Brain, TrendingUp, BarChart2, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";

function RatingBadge({ rating, isDarkMode, fontClass }) {
  if (!rating) return null;
  const upper = rating.toUpperCase();
  const styles = upper === "EXCELLENT"
    ? (isDarkMode ? "bg-emerald-900/50 text-emerald-300" : "bg-emerald-100 text-emerald-700")
    : upper === "GOOD"
    ? (isDarkMode ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700")
    : upper === "FAIR"
    ? (isDarkMode ? "bg-amber-900/50 text-amber-300" : "bg-amber-100 text-amber-700")
    : (isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600");
  return (
    <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${styles} ${fontClass}`}>
      {rating}
    </span>
  );
}

function TopicGroup({ label, labelColor, topics, pillStyle }) {
  if (!topics?.length) return null;
  return (
    <div>
      <p className={`text-[11px] font-semibold mb-1.5 ${labelColor}`}>{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {topics.map((topic, idx) => (
          <span key={idx} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-medium leading-tight ${pillStyle}`}>
            {topic}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RoadmapReviewPanel({ review, isDarkMode = false }) {
  const { i18n } = useTranslation();
  const isEn = i18n.language === "en";
  const fontClass = isEn ? "font-poppins" : "font-sans";
  const [expanded, setExpanded] = React.useState(true);

  if (!review) return null;

  const assessedAtLabel = review.assessedAt
    ? new Date(review.assessedAt).toLocaleString(isEn ? "en-US" : "vi-VN", {
        hour: "2-digit", minute: "2-digit",
        day: "numeric", month: "numeric", year: "numeric",
      })
    : null;

  return (
    <div className={`border-b ${isDarkMode ? "border-slate-800" : "border-gray-100"}`}>
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors duration-150 ${
          isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full ${isDarkMode ? "bg-emerald-900/60" : "bg-emerald-100"}`}>
            <Brain className={`w-3 h-3 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />
          </div>
          <span className={`text-[13px] font-semibold ${isDarkMode ? "text-slate-200" : "text-slate-700"} ${fontClass}`}>
            {isEn ? "AI Roadmap Review" : "Đánh giá AI toàn bộ roadmap"}
          </span>
          {assessedAtLabel ? (
            <span className={`text-[11px] hidden sm:inline ${isDarkMode ? "text-slate-500" : "text-slate-400"} ${fontClass}`}>
              · {assessedAtLabel}
            </span>
          ) : null}
        </div>
        {expanded
          ? <ChevronUp className={`w-4 h-4 flex-shrink-0 ml-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
          : <ChevronDown className={`w-4 h-4 flex-shrink-0 ml-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
        }
      </button>

      {/* Body */}
      {expanded ? (
        <div className={`px-4 pb-5 pt-1 space-y-3.5 overflow-y-auto max-h-[45vh] ${fontClass}`}>

          {/* Summary */}
          {review.summary ? (
            <p className={`text-[13px] leading-[1.8] ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
              {review.summary}
            </p>
          ) : null}

          {/* Learning Journey */}
          {review.learningJourney ? (
            <div className={`rounded-xl px-4 py-3 ${isDarkMode ? "bg-slate-800/50 border border-slate-700/50" : "bg-white border border-slate-200"}`}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className={`w-3.5 h-3.5 flex-shrink-0 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`} />
                <span className={`text-[12px] font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  {isEn ? "Learning Journey" : "Hành trình học"}
                </span>
                <RatingBadge rating={review.learningJourney.overallRating} isDarkMode={isDarkMode} fontClass={fontClass} />
              </div>
              <div className="space-y-1">
                {review.learningJourney.completionPace ? (
                  <p className={`text-[12.5px] leading-relaxed font-medium ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                    {review.learningJourney.completionPace}
                  </p>
                ) : null}
                {review.learningJourney.consistencyNote ? (
                  <p className={`text-[12px] leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {review.learningJourney.consistencyNote}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Mastery Report */}
          {review.masteryReport ? (
            <div className={`rounded-xl px-4 py-3 ${isDarkMode ? "bg-slate-800/50 border border-slate-700/50" : "bg-white border border-slate-200"}`}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className={`w-3.5 h-3.5 flex-shrink-0 ${isDarkMode ? "text-purple-400" : "text-purple-500"}`} />
                <span className={`text-[12px] font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                  {isEn ? "Mastery Report" : "Báo cáo thành thạo"}
                </span>
              </div>
              <div className="space-y-3">
                <TopicGroup
                  label={isEn ? "Strong topics" : "Nắm vững"}
                  labelColor={isDarkMode ? "text-amber-400" : "text-amber-600"}
                  topics={review.masteryReport.strongTopics}
                  pillStyle={isDarkMode ? "bg-amber-900/40 text-amber-300 border border-amber-700/40" : "bg-amber-50 text-amber-700 border border-amber-200"}
                />
                <TopicGroup
                  label={isEn ? "Needs improvement" : "Cần cải thiện"}
                  labelColor={isDarkMode ? "text-rose-400" : "text-rose-600"}
                  topics={review.masteryReport.weakTopics}
                  pillStyle={isDarkMode ? "bg-rose-900/40 text-rose-300 border border-rose-700/40" : "bg-rose-50 text-rose-700 border border-rose-200"}
                />
                <TopicGroup
                  label={isEn ? "Improved" : "Đã tiến bộ"}
                  labelColor={isDarkMode ? "text-teal-400" : "text-teal-600"}
                  topics={review.masteryReport.improvedTopics}
                  pillStyle={isDarkMode ? "bg-teal-900/40 text-teal-300 border border-teal-700/40" : "bg-teal-50 text-teal-700 border border-teal-200"}
                />
                <TopicGroup
                  label={isEn ? "Persistent weaknesses" : "Chưa cải thiện"}
                  labelColor={isDarkMode ? "text-orange-400" : "text-orange-600"}
                  topics={review.masteryReport.persistentWeaknesses}
                  pillStyle={isDarkMode ? "bg-orange-900/40 text-orange-300 border border-orange-700/40" : "bg-orange-50 text-orange-700 border border-orange-200"}
                />
              </div>
            </div>
          ) : null}

          {/* Next Steps */}
          {review.nextStep?.recommendations?.length > 0 ? (
            <div className={`rounded-xl px-4 py-3 ${isDarkMode ? "bg-emerald-950/50 border border-emerald-800/30" : "bg-emerald-50 border border-emerald-100"}`}>
              <div className="flex items-center gap-2 mb-2.5">
                <Lightbulb className={`w-3.5 h-3.5 flex-shrink-0 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                <span className={`text-[12px] font-semibold ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>
                  {isEn ? "Next Steps" : "Bước tiếp theo"}
                </span>
              </div>
              <ul className="space-y-2">
                {review.nextStep.recommendations.map((rec, idx) => (
                  <li key={idx} className={`flex items-start gap-2.5 text-[12.5px] leading-[1.7] ${isDarkMode ? "text-emerald-200/85" : "text-emerald-800"}`}>
                    <span className={`mt-[7px] h-1.5 w-1.5 rounded-full flex-shrink-0 ${isDarkMode ? "bg-emerald-500" : "bg-emerald-500"}`} />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

        </div>
      ) : null}
    </div>
  );
}

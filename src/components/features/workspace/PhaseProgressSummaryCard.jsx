import React from "react";
import { useTranslation } from "react-i18next";

const PACE_FALLBACK = {
  FAST: "Học nhanh hơn kế hoạch",
  ON_TRACK: "Bám sát kế hoạch",
  SLOW: "Chậm hơn kế hoạch",
  UNKNOWN: "Chưa đủ dữ liệu",
};

const paceBadgeClass = (paceLabel, isDarkMode) => {
  const base = "rounded-full px-3 py-1 text-xs font-semibold";
  switch (paceLabel) {
    case "FAST":
      return `${base} ${isDarkMode ? "bg-emerald-800/40 text-emerald-200" : "bg-emerald-100 text-emerald-800"}`;
    case "ON_TRACK":
      return `${base} ${isDarkMode ? "bg-sky-800/40 text-sky-200" : "bg-sky-100 text-sky-800"}`;
    case "SLOW":
      return `${base} ${isDarkMode ? "bg-amber-800/40 text-amber-200" : "bg-amber-100 text-amber-800"}`;
    default:
      return `${base} ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`;
  }
};

const PhaseProgressSummaryCard = ({ data, isDarkMode = false, fontClass = "" }) => {
  const { t } = useTranslation();
  if (!data) return null;

  const paceLabel = data.paceLabel || "UNKNOWN";
  const paceText = t(
    `workspace.roadmap.phaseSummary.pace.${paceLabel}`,
    PACE_FALLBACK[paceLabel] || PACE_FALLBACK.UNKNOWN
  );

  const dayDelta = data.dayDelta;
  let deltaText = null;
  if (typeof dayDelta === "number") {
    if (dayDelta < 0) {
      deltaText = t(
        "workspace.roadmap.phaseSummary.deltaEarly",
        "Hoàn thành sớm {{count}} ngày so với kế hoạch",
        { count: Math.abs(dayDelta) }
      );
    } else if (dayDelta > 0) {
      deltaText = t(
        "workspace.roadmap.phaseSummary.deltaLate",
        "Trễ {{count}} ngày so với kế hoạch",
        { count: dayDelta }
      );
    }
  }

  const hasDayProgress =
    typeof data.actualDays === "number" && typeof data.estimatedDays === "number";

  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        isDarkMode ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-slate-50"
      }`}
    >
      <p
        className={`text-sm font-semibold ${
          isDarkMode ? "text-slate-200" : "text-slate-800"
        } ${fontClass}`}
      >
        {t("workspace.roadmap.phaseSummary.title", "Tốc độ học phase")}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`${paceBadgeClass(paceLabel, isDarkMode)} ${fontClass}`}>{paceText}</span>
        {hasDayProgress ? (
          <span
            className={`text-xs ${isDarkMode ? "text-slate-300" : "text-slate-600"} ${fontClass}`}
          >
            {t(
              "workspace.roadmap.phaseSummary.daysProgress",
              "Đã học {{actual}} ngày / dự kiến {{estimated}} ngày",
              { actual: data.actualDays, estimated: data.estimatedDays }
            )}
          </span>
        ) : null}
      </div>
      {deltaText ? (
        <p
          className={`mt-2 text-xs ${
            isDarkMode ? "text-slate-400" : "text-slate-500"
          } ${fontClass}`}
        >
          {deltaText}
        </p>
      ) : null}
    </div>
  );
};

export default PhaseProgressSummaryCard;

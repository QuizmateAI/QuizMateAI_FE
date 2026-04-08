import React from "react";
import { useTranslation } from "react-i18next";
import { BrainCircuit, CalendarDays, ChevronRight, ClipboardList, Clock3, MapPinned, RefreshCw } from "lucide-react";
import { Button } from "@/Components/ui/button";

function parseDueAt(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getStageBadge(stage) {
  const normalizedStage = Number.isInteger(Number(stage)) ? Number(stage) : 0;
  return `S${Math.max(0, Math.min(normalizedStage, 2))}`;
}

function getDueLabel(dueAt, t) {
  const parsedDate = parseDueAt(dueAt);
  if (!parsedDate) {
    return t("workspace.personalization.reviewQueue.unscheduled", "Chưa có lịch");
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDueDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  const diffDays = Math.round((startOfDueDay.getTime() - startOfToday.getTime()) / 86400000);

  if (parsedDate.getTime() < now.getTime()) {
    return t("workspace.personalization.reviewQueue.overdue", "Quá hạn");
  }
  if (diffDays <= 0) {
    return t("workspace.personalization.reviewQueue.today", "Đến hạn hôm nay");
  }
  if (diffDays === 1) {
    return t("workspace.personalization.reviewQueue.tomorrow", "Đến hạn ngày mai");
  }

  return t("workspace.personalization.reviewQueue.later", "Sắp tới");
}

function getTaskIcon(type) {
  switch (String(type || "").toUpperCase()) {
    case "REVIEW_QUEUE":
      return RefreshCw;
    case "TAKE_QUIZ":
      return ClipboardList;
    case "ROADMAP":
      return MapPinned;
    case "MOCK_TEST":
      return Clock3;
    default:
      return CalendarDays;
  }
}

export default function PersonalizedNextStepCard({
  isDarkMode = false,
  personalization = null,
  onTaskAction,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const dailyPlan = personalization?.dailyPlan || null;
  const tasks = Array.isArray(dailyPlan?.tasks) ? dailyPlan.tasks.slice(0, 3) : [];
  const reviewQueue = Array.isArray(personalization?.reviewQueue) ? personalization.reviewQueue.slice(0, 3) : [];
  const quizTask = tasks.find((task) => String(task?.type || "").toUpperCase() === "TAKE_QUIZ") || null;
  const whyThisQuiz = quizTask?.reason || null;

  if (!dailyPlan || tasks.length === 0) {
    return null;
  }

  return (
    <section
      className={`rounded-3xl border p-5 transition-colors duration-300 ${
        isDarkMode
          ? "border-slate-800 bg-slate-950/90 text-slate-100"
          : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]">
              <BrainCircuit className="h-3.5 w-3.5" />
              <span className={fontClass}>
                {t("workspace.personalization.title", "Personalized Next Step")}
              </span>
            </div>
            <h2 className={`text-lg font-semibold ${fontClass}`}>
              {t("workspace.personalization.todayHeading", "Hôm nay nên làm gì tiếp theo?")}
            </h2>
            {dailyPlan?.summary ? (
              <p className={`text-sm ${isDarkMode ? "text-slate-300" : "text-slate-600"} ${fontClass}`}>
                {dailyPlan.summary}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div>
              <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
                {t("workspace.personalization.today", "Today")}
              </p>
              <div className="grid gap-3">
                {tasks.map((task) => {
                  const TaskIcon = getTaskIcon(task?.type);
                  return (
                    <div
                      key={task?.taskId || task?.title}
                      className={`rounded-2xl border p-4 ${
                        isDarkMode ? "border-slate-800 bg-slate-900/70" : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className={`rounded-xl p-2 ${isDarkMode ? "bg-slate-800 text-cyan-300" : "bg-white text-cyan-700"}`}>
                              <TaskIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-semibold ${fontClass}`}>{task?.title}</p>
                              <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
                                {task?.effortMinutes
                                  ? t("workspace.personalization.effort", "{{minutes}} phút", { minutes: task.effortMinutes })
                                  : t("workspace.personalization.effortUnknown", "Thời lượng linh hoạt")}
                              </p>
                            </div>
                          </div>
                          <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-300" : "text-slate-600"} ${fontClass}`}>
                            {task?.reason}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onTaskAction?.(task)}
                          className="gap-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <span className={fontClass}>{task?.ctaLabel || t("workspace.personalization.open", "Mở")}</span>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
                {t("workspace.personalization.whyThisQuiz", "Why this quiz?")}
              </p>
              <div className={`rounded-2xl border p-4 ${isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-slate-50"}`}>
                <p className={`text-sm leading-6 ${isDarkMode ? "text-slate-200" : "text-slate-700"} ${fontClass}`}>
                  {whyThisQuiz || t("workspace.personalization.whyThisQuizFallback", "Hệ thống sẽ giải thích lý do khi có đề xuất quiz phù hợp.")}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.14em] ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
              {t("workspace.personalization.reviewQueue", "Review queue")}
            </p>
            <div className="space-y-3">
              {reviewQueue.length > 0 ? reviewQueue.map((item) => (
                <div
                  key={`${item?.topic}-${item?.dueAt}`}
                  className={`rounded-2xl border p-4 ${isDarkMode ? "border-slate-800 bg-slate-900/60" : "border-slate-200 bg-slate-50"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className={`text-sm font-semibold ${fontClass}`}>{item?.topic}</p>
                      <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
                        {item?.reason || t("workspace.personalization.reviewQueueFallback", "Hệ thống sẽ nhắc lại chủ đề này theo lịch ôn tập.")}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${isDarkMode ? "border-slate-700 text-slate-200" : "border-slate-300 text-slate-700"}`}>
                      {getStageBadge(item?.stage)}
                    </span>
                  </div>
                  <div className={`mt-3 flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"} ${fontClass}`}>
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>{getDueLabel(item?.dueAt, t)}</span>
                  </div>
                </div>
              )) : (
                <div className={`rounded-2xl border border-dashed p-4 text-sm ${isDarkMode ? "border-slate-800 bg-slate-900/40 text-slate-400" : "border-slate-200 bg-slate-50 text-slate-500"} ${fontClass}`}>
                  {t("workspace.personalization.reviewQueueEmpty", "Chưa có chủ đề nào cần ôn lại ngay lúc này.")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

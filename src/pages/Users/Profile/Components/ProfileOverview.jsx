import React from "react";
import {
  BookOpen,
  Clock,
  Plus,
  Shield,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import CreditIconImage from "@/components/ui/CreditIconImage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  formatLearningDuration,
  formatNumber,
  formatRelativeTime,
  formatWalletDateTime,
  getPlanLabel,
  getPlanTone,
} from "./profileHelpers";

function SectionHeader({ eyebrow, title, action }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#ff7373]">
            {eyebrow}
          </div>
        )}
        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function MetricTile({ icon: Icon, label, value, sub, accentClassName }) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <CardContent className="p-5">
        <div className={cn("mb-4 flex h-10 w-10 items-center justify-center rounded-xl", accentClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black leading-none tracking-tight text-slate-950 dark:text-white">
            {value}
          </span>
          {sub && <span className="text-xs font-bold text-slate-400">{sub}</span>}
        </div>
        <div className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </div>
      </CardContent>
    </Card>
  );
}

function getActivityIcon(activity) {
  return activity?.practiceMode ? Trophy : BookOpen;
}

function getActivityBadge(activity, currentLang, t) {
  const accuracyPercent = Number(activity?.accuracyPercent);
  if (Number.isFinite(accuracyPercent)) {
    const value = formatNumber(Math.round(accuracyPercent), currentLang);
    return t("profile.recentActivityAccuracy", {
      value,
      defaultValue: currentLang === "vi" ? `${value}% đúng` : `${value}% correct`,
    });
  }

  const score = Number(activity?.score);
  if (Number.isFinite(score)) {
    const value = formatNumber(Math.round(score), currentLang);
    return t("profile.recentActivityScore", {
      value,
      defaultValue: currentLang === "vi" ? `${value} điểm` : `${value} pts`,
    });
  }

  return null;
}

export default function ProfileOverview({
  currentLang,
  currentPlanSummary,
  isDarkMode,
  learningSummary,
  loadingLearningSummary,
  loadingWallet,
  onTopUp,
  onUpgrade,
  walletSummary,
}) {
  const { t } = useTranslation();
  const planTone = getPlanTone(currentPlanSummary);
  const recentActivity = Array.isArray(learningSummary?.recentActivities) ? learningSummary.recentActivities : [];
  const learningDuration = formatLearningDuration(learningSummary?.learningTimeMinutes, currentLang);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader className="pb-3">
            <SectionHeader
              eyebrow={currentLang === "vi" ? "Số dư hiện tại" : "Current balance"}
              title={t("common.wallet")}
              action={
                <button
                  type="button"
                  onClick={onTopUp}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("wallet.buyTitle")}
                </button>
              }
            />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:ring-blue-400/20">
                  <CreditIconImage
                    alt={t("common.creditIconAlt", { brandName: "QuizMate AI" })}
                    className="h-10 w-10 rounded-xl"
                  />
                </span>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black tracking-tight text-blue-700 dark:text-blue-300">
                      {loadingWallet ? "..." : formatNumber(walletSummary.totalAvailableCredits, currentLang)}
                    </span>
                    <span className="text-sm font-bold uppercase text-slate-400">CR</span>
                  </div>
                  {walletSummary.planCreditExpiresAt && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t("wallet.expiresAt")}: {formatWalletDateTime(walletSummary.planCreditExpiresAt, currentLang)}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid min-w-[220px] gap-2 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">{t("wallet.regularCredits")}</span>
                  <span className="font-black text-slate-950 dark:text-white">
                    {formatNumber(walletSummary.regularCreditBalance, currentLang)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">{t("wallet.planCredits")}</span>
                  <span className="font-black text-slate-950 dark:text-white">
                    {formatNumber(walletSummary.planCreditBalance, currentLang)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", planTone.tier === "pro" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300")}>
                <Sparkles className="h-5 w-5" />
              </span>
              {t("profile.subscription.currentPlan")}
            </CardTitle>
            <CardDescription className={isDarkMode ? "text-slate-400" : ""}>
              {t("profile.subscription.currentPlanDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <Badge className={cn("rounded-full px-3 py-1 text-xs uppercase tracking-wide", planTone.className)}>
                {getPlanLabel(currentPlanSummary, t)}
              </Badge>
              <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                {currentPlanSummary?.status || t("profile.subscription.activeStatus")}
              </p>
            </div>
            <button
              type="button"
              onClick={onUpgrade}
              className="inline-flex items-center justify-center rounded-full bg-[#ff7373] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#f45f5f]"
            >
              {t("profile.subscription.upgrade")}
            </button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <MetricTile
          icon={Clock}
          label={t("profile.stats.learningTime")}
          value={loadingLearningSummary ? "..." : learningDuration.value}
          sub={loadingLearningSummary ? "" : learningDuration.unit}
          accentClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
        />
        <MetricTile
          icon={Shield}
          label={t("profile.stats.dayStreak")}
          value={loadingLearningSummary ? "..." : formatNumber(learningSummary?.dayStreak, currentLang)}
          accentClassName="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
        />
      </div>

      <Card className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CardHeader>
          <SectionHeader
            eyebrow={currentLang === "vi" ? "Mới nhất" : "Latest"}
            title={t("profile.recentActivity")}
          />
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {loadingLearningSummary ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-400 dark:border-slate-800">
              {currentLang === "vi" ? "Đang cập nhật hoạt động..." : "Updating activity..."}
            </div>
          ) : recentActivity.length > 0 ? (
            recentActivity.map((activity) => {
              const ActivityIcon = getActivityIcon(activity);
              const badge = getActivityBadge(activity, currentLang, t);
              const activityMode = activity.practiceMode
                ? t("profile.recentActivityPractice", { defaultValue: currentLang === "vi" ? "Luyện tập" : "Practice" })
                : t("profile.recentActivityQuiz", { defaultValue: "Quiz" });
              const timeLabel = formatRelativeTime(activity.completedAt, currentLang);

              return (
                <div key={activity.id || activity.attemptId} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0 dark:border-slate-800">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                      <ActivityIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                        {activity.title || t("profile.recentQuizCompleted", { defaultValue: currentLang === "vi" ? "Hoàn thành quiz" : "Completed quiz" })}
                      </p>
                      <p className="text-xs text-slate-400">
                        {timeLabel ? `${activityMode} • ${timeLabel}` : activityMode}
                      </p>
                    </div>
                  </div>
                  {badge && (
                    <Badge variant="secondary" className="shrink-0 rounded-full text-xs">
                      {badge}
                    </Badge>
                  )}
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm font-semibold text-slate-400 dark:border-slate-800">
              {t("profile.recentActivityEmpty", {
                defaultValue: currentLang === "vi" ? "Chưa có hoạt động học tập gần đây." : "No recent learning activity yet.",
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

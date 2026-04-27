import React from "react";
import {
  BadgeCheck,
  Camera,
  CalendarCheck2,
  Crown,
  Gem,
  Pencil,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  formatLearningDuration,
  formatNumber,
  formatProfileDate,
  getDisplayName,
  getPlanLabel,
  getPlanTone,
} from "./profileHelpers";

function PlanChip({ currentPlanSummary }) {
  const { t } = useTranslation();
  const tone = getPlanTone(currentPlanSummary);
  const Icon = tone.tier === "elite" ? Gem : tone.tier === "pro" ? Crown : null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] shadow-sm",
        tone.className,
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {getPlanLabel(currentPlanSummary, t)}
    </span>
  );
}

function StatCell({ label, value, sub, accentClassName }) {
  return (
    <div className="min-w-0 flex-1 px-3 py-1 first:pl-0 last:pr-0 sm:px-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={cn("text-2xl font-black leading-none tracking-tight sm:text-[28px]", accentClassName || "text-slate-950 dark:text-white")}>
          {value}
        </span>
        {sub && (
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ProfileHero({
  avatarLetter,
  currentLang,
  currentPlanSummary,
  fileInputRef,
  isDarkMode,
  learningSummary,
  loadingLearningSummary,
  loadingWallet,
  onAvatarChange,
  onAvatarClick,
  onEdit,
  onTopUp,
  onUpgrade,
  profile,
  uploadingAvatar,
  walletSummary,
}) {
  const { t } = useTranslation();
  const displayName = getDisplayName(profile);
  const lastLoginLabel = profile.lastLoginAt
    ? formatProfileDate(profile.lastLoginAt, currentLang)
    : t("profile.hero.thisYear", { defaultValue: currentLang === "vi" ? "Năm nay" : "This year" });
  const learningDuration = formatLearningDuration(learningSummary?.learningTimeMinutes, currentLang);

  const stats = [
    {
      label: t("profile.stats.dayStreak"),
      value: loadingLearningSummary ? "..." : formatNumber(learningSummary?.dayStreak, currentLang),
      sub: loadingLearningSummary ? "" : currentLang === "vi" ? "ngày" : "days",
      accentClassName: "text-[#ff7373]",
    },
    {
      label: t("profile.hero.completedQuizzes", { defaultValue: currentLang === "vi" ? "Quiz đã hoàn thành" : "Quizzes done" }),
      value: loadingLearningSummary ? "..." : formatNumber(learningSummary?.completedQuizCount, currentLang),
    },
    {
      label: t("profile.stats.learningTime"),
      value: loadingLearningSummary ? "..." : learningDuration.value,
      sub: loadingLearningSummary ? "" : learningDuration.unit,
    },
    {
      label: t("profile.hero.credit", { defaultValue: "Credit" }),
      value: loadingWallet ? "..." : formatNumber(walletSummary.totalAvailableCredits, currentLang),
      accentClassName: "text-[#0455bf] dark:text-blue-300",
    },
  ];

  return (
    <section className={cn("relative overflow-hidden rounded-xl border shadow-sm", isDarkMode ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-white")}>
      <div
        className="relative h-[230px] overflow-hidden md:h-[300px]"
        style={{
          background:
            "linear-gradient(110deg, #0455bf 0%, #2563eb 38%, #6366f1 64%, #ff8682 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.75) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.75) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="absolute left-5 top-5 flex items-center gap-3 text-white/85 md:left-8">
          <span className="text-[11px] font-black uppercase tracking-[0.28em]">
            QuizMate Profile
          </span>
          <span className="hidden h-px w-8 bg-white/40 sm:block" />
          <span className="hidden text-[11px] font-bold uppercase tracking-[0.16em] sm:inline">
            Vol. {new Date().getFullYear()}
          </span>
        </div>

        <div className="absolute right-5 top-5 flex items-center gap-2 text-white/85 md:right-8">
          <CalendarCheck2 className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
            {profile.lastLoginAt
              ? t("profile.hero.lastLogin", { defaultValue: currentLang === "vi" ? "Hoạt động" : "Active" })
              : t("profile.hero.profileSeason", { defaultValue: currentLang === "vi" ? "Hồ sơ" : "Profile" })}{" "}
            {lastLoginLabel}
          </span>
        </div>
      </div>

      <div className="relative px-5 pb-6 md:px-8" style={{ marginTop: -82 }}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
          <div className="relative flex shrink-0">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-white p-1.5 shadow-2xl md:h-40 md:w-40">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-600 to-blue-800">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-5xl font-black leading-none text-white md:text-6xl">
                    {avatarLetter}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onAvatarClick}
              disabled={uploadingAvatar}
              className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-700 shadow-lg transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={t("profile.avatarUpload", { defaultValue: currentLang === "vi" ? "Cập nhật ảnh đại diện" : "Update avatar" })}
            >
              <Camera className={cn("h-4 w-4", uploadingAvatar && "animate-pulse")} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="hidden"
            />
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <PlanChip currentPlanSummary={currentPlanSummary} />
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-300">
                <BadgeCheck className="h-3 w-3" />
                {t("profile.hero.verified", { defaultValue: currentLang === "vi" ? "Đã xác minh" : "Verified" })}
              </span>
            </div>

            <h1 className="truncate text-3xl font-black leading-tight tracking-tight text-slate-950 dark:text-white md:text-5xl">
              {displayName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 md:text-base">
              {profile.username && <span>@{profile.username}</span>}
              {profile.username && profile.email && <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />}
              {profile.email && <span className="truncate">{profile.email}</span>}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 pb-1 sm:flex-row lg:flex-col xl:flex-row">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
            >
              <Pencil className="h-4 w-4" />
              {t("profile.edit")}
            </button>
            <button
              type="button"
              onClick={onUpgrade}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ff7373] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-[#f45f5f] active:scale-[0.98]"
            >
              <Sparkles className="h-4 w-4" />
              {t("profile.subscription.upgrade")}
            </button>
            <button
              type="button"
              onClick={onTopUp}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0455bf] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-700/20 transition-all hover:bg-blue-700 active:scale-[0.98]"
            >
              <PlusCircle className="h-4 w-4" />
              {t("wallet.buyTitle")}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-y-4 rounded-xl border border-slate-200 bg-white px-4 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2 sm:divide-x sm:divide-slate-200 md:grid-cols-4 dark:sm:divide-slate-800">
          {stats.map((stat) => (
            <StatCell key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}

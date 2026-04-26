import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Brain,
  ChevronRight,
  Heart,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function pickGreetingByDays(daysInactive, t) {
  if (daysInactive >= 30) {
    return {
      emoji: "✨",
      tagline: t("home.welcomeBackModal.greetings.long"),
    };
  }
  if (daysInactive >= 14) {
    return {
      emoji: "🌟",
      tagline: t("home.welcomeBackModal.greetings.mid"),
    };
  }
  return {
    emoji: "👋",
    tagline: t("home.welcomeBackModal.greetings.short"),
  };
}

function buildLongCopy(daysInactive, t) {
  if (daysInactive >= 30) {
    return t("home.welcomeBackModal.messages.long");
  }
  if (daysInactive >= 14) {
    return t("home.welcomeBackModal.messages.mid");
  }
  return t("home.welcomeBackModal.messages.short");
}

export default function WelcomeBackModal({
  open,
  onOpenChange,
  isDarkMode = false,
  info,
}) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const daysInactive = Number(info?.daysInactive ?? 0);
  const greeting = useMemo(() => pickGreetingByDays(daysInactive, t), [daysInactive, t]);
  const longCopy = useMemo(() => buildLongCopy(daysInactive, t), [daysInactive, t]);

  const userName = info?.userName || t("home.welcomeBackModal.userFallback");
  const hasResume = Boolean(info?.knowledgeTitle && info?.resumeUrl);
  const hasRoadmap = Boolean(info?.roadmapTitle);
  const fontClass = i18n.language?.startsWith("en") ? "font-poppins" : "font-sans";

  const handleResume = () => {
    onOpenChange(false);
    if (info?.resumeUrl) {
      navigate(info.resumeUrl);
    }
  };

  const handleDismiss = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={`max-w-md overflow-hidden rounded-2xl border p-0 ${fontClass} ${
          isDarkMode
            ? "border-slate-700 bg-slate-900 text-slate-50"
            : "border-slate-200 bg-white text-slate-900"
        }`}
      >
        <div
          className={`relative px-7 pt-8 pb-6 ${
            isDarkMode
              ? "bg-gradient-to-br from-violet-900/60 via-indigo-900/40 to-slate-900"
              : "bg-gradient-to-br from-violet-50 via-indigo-50 to-white"
          }`}
        >
          <div className="absolute top-4 right-4 opacity-60">
            <Sparkles
              className={`h-5 w-5 ${
                isDarkMode ? "text-violet-300" : "text-violet-500"
              }`}
            />
          </div>
          <div className="text-center">
            <div className="mb-3 text-5xl leading-none" aria-hidden>
              {greeting.emoji}
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              {greeting.tagline}
            </h2>
            <p
              className={`mt-1 text-sm font-medium ${
                isDarkMode ? "text-violet-200" : "text-violet-600"
              }`}
            >
              {t("home.welcomeBackModal.inactiveLine", { name: userName, count: daysInactive })}
            </p>
          </div>
        </div>

        <div className="space-y-5 px-7 py-6">
          <p
            className={`text-sm leading-relaxed ${
              isDarkMode ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {longCopy}
          </p>

          {hasResume ? (
            <div
              className={`rounded-xl border p-4 ${
                isDarkMode
                  ? "border-violet-900/50 bg-slate-950/60"
                  : "border-violet-200 bg-violet-50/60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                    isDarkMode
                      ? "bg-violet-500/20 text-violet-300"
                      : "bg-violet-100 text-violet-600"
                  }`}
                >
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[11px] font-semibold uppercase tracking-wider ${
                      isDarkMode ? "text-violet-300" : "text-violet-600"
                    }`}
                  >
                    {t("home.welcomeBackModal.resumeCardEyebrow")}
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-snug line-clamp-2">
                    {info.knowledgeTitle}
                  </p>
                  {hasRoadmap ? (
                    <p
                      className={`mt-1 text-xs ${
                        isDarkMode ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {t("home.welcomeBackModal.resumeCardRoadmap", {
                        title: info.roadmapTitle,
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
              <div
                className={`mt-3 flex items-center gap-2 text-xs leading-relaxed ${
                  isDarkMode ? "text-slate-400" : "text-slate-500"
                }`}
              >
                <Brain className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{t("home.welcomeBackModal.resumeCardHint")}</span>
              </div>
            </div>
          ) : (
            <div
              className={`rounded-xl border p-4 ${
                isDarkMode
                  ? "border-slate-800 bg-slate-950/60"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                    isDarkMode
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "bg-indigo-100 text-indigo-600"
                  }`}
                >
                  <Heart className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">
                    {t("home.welcomeBackModal.emptyCardTitle")}
                  </p>
                  <p
                    className={`mt-1 text-xs leading-relaxed ${
                      isDarkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {t("home.welcomeBackModal.emptyCardBody")}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            {hasResume ? (
              <button
                type="button"
                onClick={handleResume}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors cursor-pointer ${
                  isDarkMode
                    ? "bg-violet-500 text-white hover:bg-violet-400"
                    : "bg-violet-600 text-white hover:bg-violet-700"
                }`}
              >
                <Sparkles className="h-4 w-4" />
                {t("home.welcomeBackModal.resumeAction")}
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDismiss}
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                isDarkMode
                  ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              {hasResume
                ? t("home.welcomeBackModal.dismissLater")
                : t("home.welcomeBackModal.dismissExplore")}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

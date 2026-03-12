import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Globe,
  Moon,
  Settings,
  Sparkles,
  Sun,
  AlertCircle,
} from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import ListSpinner from "@/Components/ui/ListSpinner";
import { Card, CardContent } from "@/Components/ui/card";
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import QuizmateCreditIcon from "@/assets/Quizmate-Credit.png";
import UserProfilePopover from "@/Components/features/Users/UserProfilePopover";
import PlanCard from "@/Pages/Users/Profile/Components/PlanCard";
import { getPurchasablePlans } from "@/api/PaymentAPI";

function useSettingsMenu({ fontClass, isDarkMode, toggleDarkMode, toggleLanguage }) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const settingsRef = useRef(null);
  const currentLang = i18n.language;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const menu = (
    <div ref={settingsRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 rounded-full ${isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Settings className="w-4 h-4" />
        <span className="text-sm hidden sm:inline">{t("common.settings")}</span>
      </Button>

      {isOpen && (
        <div
          role="menu"
          className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-lg overflow-hidden transition-colors duration-300 ${
            isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-gray-200 text-gray-800"
          }`}
        >
          <button
            type="button"
            onClick={() => { setIsOpen(false); toggleLanguage(); }}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors cursor-pointer ${
              isDarkMode ? "hover:bg-slate-900" : "hover:bg-gray-50"
            }`}
          >
            <span className={`flex items-center gap-2 ${fontClass}`}>
              <Globe className="w-4 h-4" />
              {t("common.language")}
            </span>
            <span className={`text-xs font-semibold ${fontClass}`}>{currentLang === "vi" ? "VI" : "EN"}</span>
          </button>
          <button
            type="button"
            onClick={() => { setIsOpen(false); toggleDarkMode(); }}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors cursor-pointer ${
              isDarkMode ? "hover:bg-slate-900" : "hover:bg-gray-50"
            }`}
          >
            <span className={`flex items-center gap-2 ${fontClass}`}>
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {t("common.theme")}
            </span>
            <span className={`text-xs font-semibold ${fontClass}`}>{isDarkMode ? t("common.dark") : t("common.light")}</span>
          </button>
          <div className={`h-px w-full ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`} />
        </div>
      )}
    </div>
  );

  return { menu };
}

export default function PlanPage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const currentLang = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLang === "vi" ? "en" : "vi";
    i18n.changeLanguage(newLang);
  };

  const [planType, setPlanType] = useState("INDIVIDUAL");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const switchPlanType = (type) => {
    setPlanType(type);
    setLoading(true);
    setError(null);
  };

  useEffect(() => {
    let cancelled = false;
    getPurchasablePlans(planType)
      .then((res) => {
        if (!cancelled) { setPlans(res.data ?? []); setLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setError(t("plan.loadError")); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [planType, t]);

  const heroBadges = useMemo(
    () => ([
      { key: "permanent", label: t("plan.badges.permanent"), icon: Sparkles },
      { key: "credits", label: t("plan.badges.credits"), icon: "credit" },
      { key: "transparent", label: t("plan.badges.transparent"), icon: CreditCard },
    ]),
    [t],
  );

  const handleUpgrade = useCallback((plan) => {
    const url = plan.type === "GROUP"
      ? `/payment?planId=${plan.planId}&planType=GROUP`
      : `/payment?planId=${plan.planId}`;
    navigate(url);
  }, [navigate]);

  const { menu: settingsMenu } = useSettingsMenu({
    fontClass,
    isDarkMode,
    toggleDarkMode,
    toggleLanguage,
  });

  const backTo = location.state?.from || "/home";

  return (
    <div className={`min-h-screen ${fontClass} transition-colors ${
      isDarkMode
        ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50"
        : "bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-slate-900"
    }`}>
      {/* subtle animated blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-30 animate-floaty animate-in fade-in duration-700 ${
          isDarkMode ? "bg-blue-700/40" : "bg-blue-400/40"
        }`} />
        <div className={`absolute top-24 -right-24 h-80 w-80 rounded-full blur-3xl opacity-30 animate-floaty animate-in fade-in duration-700 delay-150 ${
          isDarkMode ? "bg-indigo-700/40" : "bg-indigo-400/40"
        }`} />
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-30 backdrop-blur-xl border-b ${
        isDarkMode ? "bg-slate-900/80 border-slate-800" : "bg-white/80 border-slate-200"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="w-[110px] md:w-[130px] flex items-center cursor-pointer"
              aria-label="Go to Home"
            >
              <img
                src={isDarkMode ? LogoDark : LogoLight}
                alt="QuizMate AI Logo"
                className="w-full h-auto object-contain"
              />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/wallet", { state: { from: "/plan" } })}
              className={`flex items-center gap-2 rounded-full cursor-pointer h-10 px-4 ${
                isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className={`inline-flex items-center justify-center rounded-full ring-1 ring-inset ${
                isDarkMode ? "bg-blue-500/10 ring-blue-400/25" : "bg-blue-600/10 ring-blue-600/20"
              }`}>
                <img
                  src={QuizmateCreditIcon}
                  alt="Quizmate Credit"
                  className="w-6 h-6 rounded-full"
                />
              </span>
              <span className="text-sm hidden sm:inline">{t("common.wallet")}</span>
            </Button>
            {settingsMenu}
            <UserProfilePopover isDarkMode={isDarkMode} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => navigate(backTo, { replace: true })}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ring-inset transition-colors cursor-pointer ${
                    isDarkMode
                      ? "bg-slate-800/60 text-slate-200 ring-slate-700/60 hover:bg-slate-800"
                      : "bg-white/70 text-slate-700 ring-slate-200 hover:bg-white"
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {t("plan.back")}
                </button>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ring-inset bg-white/60 text-slate-700 ring-slate-200 dark:bg-slate-800/60 dark:text-slate-200 dark:ring-slate-700/60">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t("plan.heroBadge")}
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {t("plan.title")}
              </h1>
              <p className={`mt-2 text-sm sm:text-base max-w-2xl ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                {t("plan.subtitle")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
              {heroBadges.map((b) => (
                <Badge
                  key={b.key}
                  variant="secondary"
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    isDarkMode ? "bg-slate-800/70 text-slate-200" : "bg-white/70 text-slate-700"
                  }`}
                >
                  {b.icon === "credit" ? (
                    <img
                      src={QuizmateCreditIcon}
                      alt="Quizmate Credit"
                      className="w-5 h-5 mr-1.5 rounded-md shadow-[0_0_0_4px_rgba(99,102,241,0.10)]"
                    />
                  ) : (
                    <b.icon className="w-3.5 h-3.5 mr-1.5" />
                  )}
                  {b.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Type toggle */}
        <div className="flex justify-center mb-6">
          <div className={`inline-flex rounded-full p-1 shadow-sm ring-1 ring-inset ${
            isDarkMode ? "bg-slate-800/70 ring-slate-700" : "bg-white/70 ring-slate-200"
          }`}>
            {["INDIVIDUAL", "GROUP"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => switchPlanType(type)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                  planType === type
                    ? isDarkMode
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-slate-900 text-white shadow"
                    : isDarkMode
                      ? "text-slate-300 hover:text-white hover:bg-slate-700/60"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                {t(`plan.types.${type === "INDIVIDUAL" ? "individual" : "group"}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Info strip */}
        <div className={`mb-6 rounded-2xl p-4 sm:p-5 ring-1 ring-inset animate-in fade-in duration-500 ${
          isDarkMode ? "bg-slate-900/60 ring-slate-700/60" : "bg-white/70 ring-slate-200"
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isDarkMode ? "bg-blue-600/15 text-blue-300" : "bg-blue-600/10 text-blue-700"
            }`}>
              <img src={QuizmateCreditIcon} alt="Quizmate Credit" className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">{t("plan.creditModel.title")}</p>
              <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                {t("plan.creditModel.desc")}
              </p>
            </div>
            <Button
              onClick={() => navigate("/wallet")}
              className="rounded-full bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              {t("plan.creditModel.cta")}
            </Button>
          </div>
        </div>

        {/* Plan grid */}
        {loading ? (
          <ListSpinner variant="section" className="py-16" />
        ) : error ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <AlertCircle className={`w-8 h-8 ${isDarkMode ? "text-red-400" : "text-red-500"}`} />
            <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{error}</p>
          </div>
        ) : plans.length === 0 ? (
          <p className={`text-center py-16 text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            {t("plan.noPlans")}
          </p>
        ) : (
          <div className={`grid gap-6 animate-in fade-in duration-500 ${
            plans.length === 1
              ? "grid-cols-1 max-w-md mx-auto"
              : plans.length === 2
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          }`}>
            {plans.map((plan, idx) => (
              <PlanCard
                key={plan.planId}
                plan={plan}
                highlight={idx === 0 && plans.length > 1}
                onUpgrade={handleUpgrade}
                dictionaryNamespace="plan"
              />
            ))}
          </div>
        )}

        {/* FAQ / notes */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { title: t("plan.notes.permanentTitle"), desc: t("plan.notes.permanentDesc") },
            { title: t("plan.notes.creditsTitle"), desc: t("plan.notes.creditsDesc") },
            { title: t("plan.notes.refundTitle"), desc: t("plan.notes.refundDesc") },
          ].map((n) => (
            <Card
              key={n.title}
              className={`backdrop-blur-xl transition-all hover:shadow-lg ${
                isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white/70 border-white/60 shadow-slate-900/10"
              }`}
            >
              <CardContent className="p-6">
                <p className="font-bold text-sm">{n.title}</p>
                <p className={`mt-1.5 text-xs leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{n.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}


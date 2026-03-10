import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Globe,
  Moon,
  Settings,
  Sun,
  Sparkles,
  Plus,
  Receipt,
} from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/Components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import QuizmateCreditIcon from "@/assets/Quizmate-Credit.png";
import UserProfilePopover from "@/Components/features/Users/UserProfilePopover";
import { useToast } from "@/context/ToastContext";

function formatNumber(n, locale) {
  return new Intl.NumberFormat(locale).format(n);
}

function formatVnd(amount, locale) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "VND" }).format(amount);
}

function formatTime(iso, locale = "vi") {
  try {
    return new Date(iso).toLocaleString(locale === "vi" ? "vi-VN" : "en-US");
  } catch {
    return iso;
  }
}

export default function WalletPage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess } = useToast();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const currentLang = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLang === "vi" ? "en" : "vi";
    i18n.changeLanguage(newLang);
  };

  // UI-first: fallback mock data. When BE endpoints are ready, replace with real API calls.
  const [balance, setBalance] = useState(1200);
  const [transactions, setTransactions] = useState(() => ([
    { id: "TXN-10021", time: "2026-03-09T10:12:00.000Z", amount: 500, type: "TOPUP", method: "MoMo", status: "SUCCESS" },
    { id: "TXN-10010", time: "2026-03-07T08:42:00.000Z", amount: 1000, type: "TOPUP", method: "VNPAY", status: "SUCCESS" },
    { id: "TXN-09991", time: "2026-03-05T09:05:00.000Z", amount: -300, type: "USAGE", method: "AI", status: "SUCCESS" },
  ]));

  const packages = useMemo(() => ([
    { credits: 500, price: 49000, bonus: 0 },
    { credits: 1200, price: 99000, bonus: 50 },
    { credits: 3000, price: 199000, bonus: 200 },
  ]), []);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) setIsSettingsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSettingsOpen]);

  const buyCredits = (pkg) => {
    // Placeholder action for now (UI only)
    const gained = pkg.credits + (pkg.bonus || 0);
    setBalance((b) => b + gained);
    setTransactions((prev) => ([
      { id: `TXN-${Math.floor(10000 + Math.random() * 90000)}`, time: new Date().toISOString(), amount: gained, type: "TOPUP", method: "UI", status: "SUCCESS" },
      ...prev,
    ]));
    showSuccess(t("wallet.toastAdded", { amount: gained }));
  };

  const backTo = location.state?.from || "/plan";

  return (
    <div className={`min-h-screen ${fontClass} transition-colors ${
      isDarkMode
        ? "bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50"
        : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-slate-900"
    }`}>
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
            <div ref={settingsRef} className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className={`flex items-center gap-2 rounded-full ${isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"}`}
                aria-expanded={isSettingsOpen}
                aria-haspopup="menu"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">{t("common.settings")}</span>
              </Button>

              {isSettingsOpen && (
                <div
                  role="menu"
                  className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-lg overflow-hidden transition-colors duration-300 ${
                    isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white border-gray-200 text-gray-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => { setIsSettingsOpen(false); toggleLanguage(); }}
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
                    onClick={() => { setIsSettingsOpen(false); toggleDarkMode(); }}
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
                </div>
              )}
            </div>
            <UserProfilePopover isDarkMode={isDarkMode} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Back */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => navigate(backTo, { replace: true })}
            className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer ${
              isDarkMode
                ? "text-slate-300 hover:text-slate-100 hover:bg-slate-800"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            {t("wallet.back")}
          </button>
        </div>

        {/* Top summary */}
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <Card className={`flex-1 overflow-hidden backdrop-blur-xl ${
            isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white/70 border-white/60 shadow-slate-900/10"
          }`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center rounded-2xl ring-1 ring-inset ${
                      isDarkMode
                        ? "bg-blue-500/10 ring-blue-400/25 shadow-[0_0_0_6px_rgba(99,102,241,0.10)]"
                        : "bg-blue-600/10 ring-blue-600/20 shadow-[0_0_0_6px_rgba(99,102,241,0.12)]"
                    }`}>
                      <img src={QuizmateCreditIcon} alt="Quizmate Credit" className="w-9 h-9 rounded-2xl animate-floaty" />
                    </span>
                    {t("wallet.title")}
                  </CardTitle>
                  <CardDescription className={isDarkMode ? "text-slate-400" : ""}>
                    {t("wallet.subtitle")}
                  </CardDescription>
                </div>
                <Badge className="rounded-full px-3 py-1 bg-blue-600 text-white">
                  {t("wallet.badge")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`rounded-2xl p-5 ring-1 ring-inset ${
                isDarkMode ? "bg-slate-950/40 ring-slate-700/60" : "bg-slate-50 ring-slate-200"
              }`}>
                <p className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>{t("wallet.balance")}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-4xl font-extrabold tracking-tight ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                    {formatNumber(balance, currentLang === "vi" ? "vi-VN" : "en-US")}
                  </span>
                  <span className={`text-sm font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-600"}`}>
                    {t("wallet.creditsUnit")}
                  </span>
                </div>
                <div className={`mt-3 inline-flex items-center gap-2 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  {t("wallet.hint")}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`w-full lg:w-[420px] backdrop-blur-xl ${
            isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white/70 border-white/60 shadow-slate-900/10"
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-500" />
                {t("wallet.buyTitle")}
              </CardTitle>
              <CardDescription className={isDarkMode ? "text-slate-400" : ""}>
                {t("wallet.buySubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {packages.map((pkg) => (
                <button
                  key={pkg.credits}
                  type="button"
                  onClick={() => buyCredits(pkg)}
                  className={`w-full text-left rounded-2xl p-4 ring-1 ring-inset transition-all active:scale-[0.99] cursor-pointer ${
                    isDarkMode
                      ? "bg-slate-950/30 ring-slate-700/60 hover:bg-slate-800/60"
                      : "bg-white ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">
                        {formatNumber(pkg.credits, currentLang === "vi" ? "vi-VN" : "en-US")} {t("wallet.creditsUnit")}
                        {pkg.bonus ? (
                          <span className={`ml-2 text-xs font-semibold ${
                            isDarkMode ? "text-emerald-400" : "text-emerald-700"
                          }`}>
                            +{formatNumber(pkg.bonus, currentLang === "vi" ? "vi-VN" : "en-US")} {t("wallet.bonus")}
                          </span>
                        ) : null}
                      </p>
                      <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        {t("wallet.packageHint")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-extrabold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                        {formatVnd(pkg.price, currentLang === "vi" ? "vi-VN" : "en-US")}
                      </p>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${
                        isDarkMode ? "bg-blue-600/15 text-blue-300" : "bg-blue-50 text-blue-700"
                      }`}>
                        {t("wallet.buyNow")}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <Card className={`backdrop-blur-xl ${
          isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white/70 border-white/60 shadow-slate-900/10"
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-500" />
              {t("wallet.historyTitle")}
            </CardTitle>
            <CardDescription className={isDarkMode ? "text-slate-400" : ""}>
              {t("wallet.historySubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl overflow-hidden ring-1 ring-inset dark:ring-slate-700/60 ring-slate-200">
              <Table className={isDarkMode ? "text-slate-100" : "text-slate-900"}>
                <TableHeader className={isDarkMode ? "bg-slate-950/40" : "bg-slate-50"}>
                  <TableRow className={isDarkMode ? "border-slate-800" : "border-slate-200"}>
                    <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>{t("wallet.table.id")}</TableHead>
                    <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>{t("wallet.table.time")}</TableHead>
                    <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>{t("wallet.table.type")}</TableHead>
                    <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>{t("wallet.table.amount")}</TableHead>
                    <TableHead className={isDarkMode ? "text-slate-300" : "text-slate-600"}>{t("wallet.table.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className={`py-10 text-center text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        {t("wallet.noHistory")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id} className={isDarkMode ? "border-slate-800" : "border-slate-200"}>
                        <TableCell className="font-semibold">{tx.id}</TableCell>
                        <TableCell className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                          {formatTime(tx.time, currentLang)}
                        </TableCell>
                        <TableCell className={isDarkMode ? "text-slate-300" : "text-slate-700"}>
                          {t(`wallet.types.${tx.type}`)}
                        </TableCell>
                        <TableCell className={`font-bold tabular-nums ${tx.amount >= 0 ? (isDarkMode ? "text-emerald-400" : "text-emerald-700") : (isDarkMode ? "text-amber-400" : "text-amber-700")}`}>
                          {tx.amount >= 0 ? "+" : ""}{formatNumber(tx.amount, currentLang === "vi" ? "vi-VN" : "en-US")}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            tx.status === "SUCCESS"
                              ? isDarkMode ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : isDarkMode ? "bg-slate-700/40 text-slate-300 ring-1 ring-slate-600/50" : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                          }`}>
                            {t(`wallet.status.${tx.status}`)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}


import { useEffect, useRef, useState } from "react";
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
import UserProfilePopover from "@/Components/features/Users/UserProfilePopover";
import CreditIconImage from "@/Components/ui/CreditIconImage";
import { useToast } from "@/context/ToastContext";
import { getErrorMessage } from "@/Utils/getErrorMessage";
import {
  getMyWallet,
  getPurchaseableCreditPackages,
  getUserPayments,
} from "@/api/ManagementSystemAPI";
import { createMomoCreditPayment } from "@/api/PaymentAPI";

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
  const { showSuccess, showError } = useToast();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const currentLang = i18n.language;

  const toggleLanguage = () => {
    const newLang = currentLang === "vi" ? "en" : "vi";
    i18n.changeLanguage(newLang);
  };

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [buyingPackageId, setBuyingPackageId] = useState(null);

  const getFriendlyError = (err) => {
    const mapped = getErrorMessage(t, err);
    return mapped && mapped !== "error.unknown" ? mapped : t("error.unknown");
  };

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

  useEffect(() => {
    let cancelled = false;

    const fetchWalletData = async () => {
      setIsLoadingWallet(true);
      setIsLoadingTransactions(true);
      setIsLoadingPackages(true);
      try {
        const [walletRes, packagesRes, paymentsRes] = await Promise.all([
          getMyWallet(),
          getPurchaseableCreditPackages(),
          getUserPayments(0, 10),
        ]);

        if (cancelled) return;

        const walletData = walletRes?.data ?? walletRes;
        setBalance(walletData?.balance ?? 0);

        const pkgData = packagesRes?.data ?? packagesRes;
        setPackages(Array.isArray(pkgData) ? pkgData : []);

        const page = paymentsRes?.data ?? paymentsRes;
        const content = page?.content ?? [];
        const mappedTx = Array.isArray(content)
          ? content.map((p) => {
              const statusRaw = (p.paymentStatus || "").toUpperCase();
              let status = "PENDING";
              if (statusRaw === "COMPLETED") status = "SUCCESS";
              else if (statusRaw === "FAILED" || statusRaw === "CANCELLED") status = "FAILED";

              return {
                id: p.orderId || `PAY-${p.paymentId}`,
                time: p.paidAt || p.expiresAt,
                amount: p.amount ?? 0,
                type: "TOPUP",
                status,
              };
            })
          : [];
        setTransactions(mappedTx);
      } catch (err) {
        if (!cancelled) {
          showError(getFriendlyError(err));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWallet(false);
          setIsLoadingTransactions(false);
          setIsLoadingPackages(false);
        }
      }
    };

    fetchWalletData();
    return () => {
      cancelled = true;
    };
  }, [showError, t]);

  const buyCredits = async (pkg) => {
    if (!pkg?.creditPackageId) return;
    try {
      setBuyingPackageId(pkg.creditPackageId);
      const res = await createMomoCreditPayment(pkg.creditPackageId);
      const data = res?.data ?? res;
      const payUrl = data?.payUrl;
      if (payUrl) {
        window.location.href = payUrl;
      } else {
        showError(t("error.unknown"));
      }
    } catch (err) {
      showError(getFriendlyError(err));
    } finally {
      setBuyingPackageId(null);
    }
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
        {/* Back button bình thường, cuộn cùng nội dung */}
        <div className="mb-4">
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
                      <CreditIconImage alt="Quizmate Credit" className="w-9 h-9 rounded-2xl animate-floaty" />
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
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/pricing")}
                    className={`rounded-full cursor-pointer ${
                      isDarkMode ? "border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    Pricing Guide
                  </Button>
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
              {isLoadingPackages && packages.length === 0 && (
                <p className={isDarkMode ? "text-slate-400 text-sm" : "text-slate-600 text-sm"}>
                  ...
                </p>
              )}
              {packages.map((pkg) => {
                const base = pkg.baseCredit ?? 0;
                const bonus = pkg.bonusCredit ?? 0;
                const totalCredits = base + bonus;
                return (
                <button
                  key={pkg.creditPackageId ?? totalCredits}
                  type="button"
                  onClick={() => buyCredits(pkg)}
                  disabled={buyingPackageId === pkg.creditPackageId}
                  className={`w-full text-left rounded-2xl p-4 ring-1 ring-inset transition-all active:scale-[0.99] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${
                    isDarkMode
                      ? "bg-slate-950/30 ring-slate-700/60 hover:bg-slate-800/60"
                      : "bg-white ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">
                        {formatNumber(totalCredits, currentLang === "vi" ? "vi-VN" : "en-US")} {t("wallet.creditsUnit")}
                        {bonus ? (
                          <span className={`ml-2 text-xs font-semibold ${
                            isDarkMode ? "text-emerald-400" : "text-emerald-700"
                          }`}>
                            +{formatNumber(bonus, currentLang === "vi" ? "vi-VN" : "en-US")} {t("wallet.bonus")}
                          </span>
                        ) : null}
                      </p>
                      <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        {t("wallet.packageHint")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-extrabold ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                        {formatVnd(pkg.price ?? 0, currentLang === "vi" ? "vi-VN" : "en-US")}
                      </p>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${
                        isDarkMode ? "bg-blue-600/15 text-blue-300" : "bg-blue-50 text-blue-700"
                      }`}>
                        {buyingPackageId === pkg.creditPackageId ? t("payment.processing") : t("wallet.buyNow")}
                      </span>
                    </div>
                  </div>
                </button>
              );})}
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
                  {isLoadingTransactions && (
                    <TableRow>
                      <TableCell colSpan={5} className={`py-10 text-center text-sm ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        ...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoadingTransactions && transactions.length === 0 ? (
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


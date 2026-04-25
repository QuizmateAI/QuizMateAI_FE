import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import {
  Camera, User, Mail, Calendar, Lock, Loader2, Check, X, Eye, EyeOff,
  Settings, Globe, Moon, Sun, LogOut, Shield, Zap, Award, TrendingUp,
  BookOpen, Clock, Star, Edit3, CreditCard
} from "lucide-react";
import { useDarkMode } from "@/hooks/useDarkMode";
import LoadingSpinner from "@/Components/ui/LoadingSpinner";
import { updateUserProfile, changePassword, uploadAvatar } from "@/api/ProfileAPI";
import { getMyWallet } from "@/api/ManagementSystemAPI";
import { logout } from "@/api/Authentication";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/Components/ui/card";
import { Badge } from "@/Components/ui/badge";
import { useNavigateWithLoading } from "@/hooks/useNavigateWithLoading";
import { useCurrentSubscription } from "@/hooks/useCurrentSubscription";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/Components/ui/dialog";
import { useUserProfile } from "@/context/UserProfileContext";
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import CreditIconImage from "@/Components/ui/CreditIconImage";

// --- Custom Tab Components ---
const Tabs = ({ children, className }) => <div className={className}>{children}</div>;
const TabsList = ({ children, className, isDarkMode }) => (
  <div className={`flex space-x-1 rounded-xl p-1 ${isDarkMode ? "bg-slate-800" : "bg-slate-100"} ${className}`}>
    {children}
  </div>
);
const TabsTrigger = ({ active, onClick, children, className, isDarkMode }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all ${
      active
        ? isDarkMode
          ? "bg-slate-950 text-white shadow-sm"
          : "bg-white text-slate-900 shadow-sm"
        : isDarkMode
        ? "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
        : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-900"
    } ${className}`}
  >
    {children}
  </button>
);
const TabsContent = ({ active, children, className }) =>
  active ? <div className={`mt-6 animate-in fade-in-50 duration-300 ${className}`}>{children}</div> : null;

const EMPTY_WALLET_SUMMARY = {
  balance: 0,
  totalAvailableCredits: 0,
  regularCreditBalance: 0,
  planCreditBalance: 0,
  hasActivePlan: false,
  planCreditExpiresAt: null,
};

const formatWalletDateTime = (iso, lang) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(lang === "vi" ? "vi-VN" : "en-US");
  } catch {
    return iso;
  }
};

// --- Skill Radar Chart Component ---
const SkillRadarChart = ({ skills, isDarkMode }) => {
  const levels = [1, 2, 3, 4, 5];
  const angleSlice = (Math.PI * 2) / skills.length;

  const getCoordinates = (value, index, maxVal = 100) => {
    const angle = index * angleSlice - Math.PI / 2;
    const radius = (value / maxVal) * 80;
    return {
      x: 100 + radius * Math.cos(angle),
      y: 100 + radius * Math.sin(angle),
    };
  };

  const points = skills
    .map((skill, i) => {
      const coords = getCoordinates(skill.value, i);
      return `${coords.x},${coords.y}`;
    })
    .join(" ");

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative h-[220px] w-[220px]">
        <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
          {levels.map((level) => (
            <circle
              key={level}
              cx="100"
              cy="100"
              r={level * 16}
              className={`fill-none ${isDarkMode ? "stroke-slate-700" : "stroke-slate-200"}`}
              strokeWidth="1"
            />
          ))}
          {skills.map((_, i) => {
            const coords = getCoordinates(100, i);
            return (
              <line
                key={i}
                x1="100"
                y1="100"
                x2={coords.x}
                y2={coords.y}
                className={isDarkMode ? "stroke-slate-700" : "stroke-slate-200"}
                strokeWidth="1"
              />
            );
          })}
          <polygon points={points} className="fill-blue-500/20 stroke-blue-500" strokeWidth="2" />
          {skills.map((skill, i) => {
            const coords = getCoordinates(115, i);
            return (
              <text
                key={i}
                x={coords.x}
                y={coords.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`text-[10px] font-medium ${isDarkMode ? "fill-slate-300" : "fill-slate-600"}`}
              >
                {skill.name}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigateWithLoading();
  const location = useLocation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const currentLang = i18n.language;
  const fileInputRef = useRef(null);
  const settingsRef = useRef(null);
  const { summary: currentPlanSummary } = useCurrentSubscription();

  // State cho profile data
  const { profile: contextProfile, setProfile: setContextProfile, loading: profileLoading } = useUserProfile();
  const [profile, setProfile] = useState({
    email: "",
    username: "",
    fullName: "",
    avatarUrl: "",
    birthday: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // State cho form chỉnh sửa
  const [editForm, setEditForm] = useState({ fullName: "", birthday: "" });
  const [isEditing, setIsEditing] = useState(false);

  // State cho tabs và settings menu
  const [activeTab, setActiveTab] = useState("overview");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // State cho dialog đổi mật khẩu
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false });
  const [changingPassword, setChangingPassword] = useState(false);

  // State cho thông báo
  const [message, setMessage] = useState({ type: "", text: "" });

  // Ví Credit
  const [walletSummary, setWalletSummary] = useState(EMPTY_WALLET_SUMMARY);
  const [loadingWallet, setLoadingWallet] = useState(true);

  // Mock data cho analytics
  const skills = [
    { name: "Logic", value: 80 },
    { name: "Memory", value: 65 },
    { name: "Speed", value: 90 },
    { name: "Focus", value: 75 },
    { name: "Creativity", value: 60 },
  ];

  const badges = [
    { id: 1, name: t("profile.badges.quizMaster"), icon: Award, bg: "bg-yellow-100 dark:bg-yellow-900/30", color: "text-yellow-600 dark:text-yellow-400" },
    { id: 2, name: t("profile.badges.streakKeeper"), icon: TrendingUp, bg: "bg-green-100 dark:bg-green-900/30", color: "text-green-600 dark:text-green-400" },
    { id: 3, name: t("profile.badges.speedster"), icon: Zap, bg: "bg-red-100 dark:bg-red-900/30", color: "text-red-600 dark:text-red-400" },
  ];

  // Đồng bộ profile từ context + load wallet
  useEffect(() => {
    if (contextProfile) {
      setProfile((prev) => ({
        ...prev,
        ...contextProfile,
      }));
      setEditForm({
        fullName: contextProfile.fullName || "",
        birthday: contextProfile.birthday || "",
      });
      setLoading(false);
    } else if (!profileLoading) {
      setLoading(false);
    }
    loadWallet();
  }, [contextProfile, profileLoading]);

  // Xử lý chuyển tab từ trang khác (ví dụ: từ HomePage settings)
  useEffect(() => {
    if (location.state?.tab) {
      // Subscription đã tách ra trang /plans
      if (location.state.tab === "subscription") {
        navigate("/plans", { replace: true });
        return;
      }
      setActiveTab(location.state.tab);
      // Xóa state sau khi đã xử lý
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // Click outside để đóng settings menu
  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSettingsOpen]);

  const loadWallet = async () => {
    try {
      setLoadingWallet(true);
      const res = await getMyWallet();
      const data = res?.data ?? res;
      setWalletSummary({
        ...EMPTY_WALLET_SUMMARY,
        ...data,
        totalAvailableCredits: data?.totalAvailableCredits ?? data?.balance ?? 0,
        regularCreditBalance: data?.regularCreditBalance ?? 0,
        planCreditBalance: data?.planCreditBalance ?? 0,
        hasActivePlan: Boolean(data?.hasActivePlan),
        planCreditExpiresAt: data?.planCreditExpiresAt ?? null,
      });
    } catch {
      setWalletSummary(EMPTY_WALLET_SUMMARY);
    } finally {
      setLoadingWallet(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 4000);
  };

  const toggleLanguage = () => {
    const newLang = currentLang === "vi" ? "en" : "vi";
    i18n.changeLanguage(newLang);
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true, state: { fromLogout: true } });
  };

  // Xử lý upload avatar
  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showMessage("error", t("profile.invalidFileType"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", t("profile.fileTooLarge"));
      return;
    }

    try {
      setUploadingAvatar(true);
      const avatarUrl = await uploadAvatar(file);
      setProfile((prev) => ({ ...prev, avatarUrl }));
      showMessage("success", t("profile.avatarSuccess"));
    } catch (error) {
      showMessage("error", error.message || t("profile.avatarError"));
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  // Xử lý cập nhật profile
  const handleSaveProfile = async () => {
    if (!editForm.fullName.trim()) {
      showMessage("error", t("profile.fullNameRequired"));
      return;
    }

    try {
      setSaving(true);
      await updateUserProfile({
        fullName: editForm.fullName,
        birthday: editForm.birthday || null,
        avatar: profile.avatarUrl,
      });
      setProfile((prev) => ({ ...prev, fullName: editForm.fullName, birthday: editForm.birthday }));
      setIsEditing(false);
      showMessage("success", t("profile.updateSuccess"));
    } catch (error) {
      showMessage("error", error.message || t("profile.updateError"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditForm({ fullName: profile.fullName || "", birthday: profile.birthday || "" });
    setIsEditing(false);
  };

  // Xử lý đổi mật khẩu
  const handleChangePassword = async () => {
    const { oldPassword, newPassword, confirmNewPassword } = passwordForm;

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      showMessage("error", t("profile.passwordFieldsRequired"));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showMessage("error", t("profile.passwordMismatch"));
      return;
    }

    if (newPassword.length < 6) {
      showMessage("error", t("profile.passwordTooShort"));
      return;
    }

    try {
      setChangingPassword(true);
      await changePassword({ oldPassword, newPassword, confirmNewPassword });
      setPasswordDialog(false);
      setPasswordForm({ oldPassword: "", newPassword: "", confirmNewPassword: "" });
      showMessage("success", t("profile.passwordSuccess"));
    } catch (error) {
      showMessage("error", error.message || t("profile.passwordError"));
    } finally {
      setChangingPassword(false);
    }
  };

  const avatarLetter = profile.fullName?.charAt(0)?.toUpperCase() || profile.username?.charAt(0)?.toUpperCase() || "U";

  // Settings Menu Component
  const settingsMenu = (
    <div ref={settingsRef} className="relative">
      <button
        type="button"
        onClick={() => setIsSettingsOpen((prev) => !prev)}
        className={`flex items-center justify-center gap-2 rounded-full h-9 w-9 md:w-auto md:px-4 text-sm border transition-all active:scale-95 ${
          isDarkMode
            ? "border-slate-700 text-slate-200 hover:bg-slate-800"
            : "border-gray-200 text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Settings className="w-4 h-4" />
        <span className={`hidden md:inline ${fontClass}`}>{t("common.settings")}</span>
      </button>

      {isSettingsOpen && (
        <div
          className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-lg overflow-hidden z-[60] ${
            isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-gray-200 text-gray-800"
          }`}
        >
          <button
            type="button"
            onClick={toggleLanguage}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
              isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-50"
            }`}
          >
            <span className={`flex items-center gap-2 ${fontClass}`}>
              <Globe className="w-4 h-4" />
              {t("common.language")}
            </span>
            <span className="text-xs font-semibold">{currentLang === "vi" ? "VI" : "EN"}</span>
          </button>
          <button
            type="button"
            onClick={toggleDarkMode}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${
              isDarkMode ? "hover:bg-slate-800" : "hover:bg-gray-50"
            }`}
          >
            <span className={`flex items-center gap-2 ${fontClass}`}>
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {t("common.theme")}
            </span>
            <span className="text-xs font-semibold">{isDarkMode ? t("common.dark") : t("common.light")}</span>
          </button>
          <div className={`h-px w-full ${isDarkMode ? "bg-slate-700" : "bg-gray-100"}`} />
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 px-4 py-3 text-sm text-red-500 transition-colors ${
              isDarkMode ? "hover:bg-slate-800" : "hover:bg-red-50"
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span className={fontClass}>{t("profile.signOut")}</span>
          </button>
        </div>
      )}
    </div>
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? "bg-slate-950 text-white" : "bg-[#F7FBFF] text-slate-900"} ${fontClass}`}>
      {/* Header */}
      <header className={`w-full h-16 border-b sticky top-0 z-50 backdrop-blur-md ${isDarkMode ? "bg-slate-950/80 border-slate-800" : "bg-white/80 border-gray-200"}`}>
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <button
            type="button"
            className="flex w-[100px] items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:w-[130px] dark:focus-visible:ring-offset-slate-950"
            onClick={() => navigate("/home")}
            aria-label={t("common.goHome")}
          >
            <img src={isDarkMode ? LogoDark : LogoLight} alt={t("common.brandLogoAlt", { brandName: "QuizMate AI" })} className="w-full h-auto object-contain" />
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/plans", { state: { from: "/profiles" } })}
              className={`h-10 px-4 rounded-full flex items-center gap-2 transition-colors ${
                isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span className="text-sm hidden max-w-[180px] truncate sm:inline">
                {currentPlanSummary?.planName || t("common.plan")}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/wallets", { state: { from: "/profiles" } })}
              className={`h-10 px-4 rounded-full flex items-center gap-2 transition-colors ${
                isDarkMode ? "text-slate-200 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className={`inline-flex items-center justify-center rounded-full ring-1 ring-inset ${
                isDarkMode ? "bg-blue-500/10 ring-blue-400/25" : "bg-blue-600/10 ring-blue-600/20"
              }`}>
                <CreditIconImage alt={t("common.creditIconAlt", { brandName: "QuizMate AI" })} className="w-6 h-6 rounded-full" />
              </span>
              <span className="text-sm hidden sm:inline">{t("common.wallet")}</span>
            </Button>
            {settingsMenu}
            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white dark:ring-slate-800">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                  {avatarLetter}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 w-full overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 pb-24 md:pb-6">
          {/* Thông báo */}
          {message.text && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                message.type === "success"
                  ? isDarkMode ? "bg-green-900/30 text-green-300 border border-green-700/50" : "bg-green-50 text-green-700 border border-green-200"
                  : isDarkMode ? "bg-red-900/30 text-red-300 border border-red-700/50" : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.type === "success" ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Page Title */}
          <div className="mb-6 md:mb-8 flex flex-col items-center text-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("profile.title")}</h1>
            <p className={`text-sm md:text-base ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
              {t("profile.description")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
            {/* Left Column: Identity Card */}
            <div className="space-y-6 lg:col-span-4 xl:col-span-3">
              {/* Identity Card */}
              <Card className={`shadow-2xl backdrop-blur-xl ${isDarkMode ? "bg-slate-900/50 border-slate-700/50 shadow-blue-900/20" : "bg-white/70 border-white/60 shadow-slate-900/10"}`}>
                <CardContent className="flex flex-col items-center pt-8">
                  {/* Avatar với nút upload */}
                  <div className="relative mb-4">
                    <div className={`h-32 w-32 overflow-hidden rounded-full border-4 shadow-xl ${isDarkMode ? "border-slate-800" : "border-white"}`}>
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt={profile.fullName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-blue-600 text-white flex items-center justify-center text-4xl font-bold">
                          {avatarLetter}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAvatarClick}
                      disabled={uploadingAvatar}
                      className={`absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-all active:scale-95 ${
                        isDarkMode ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"
                      } ${uploadingAvatar ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </div>

                  <h2 className="text-xl font-bold">{profile.fullName || profile.username}</h2>
                  <p className={`text-sm font-medium mb-1 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>@{profile.username}</p>
                  <p className={`text-xs mb-4 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{profile.email}</p>

                  {/* Credit Wallet summary */}
                  <div className="w-full px-4 mb-4">
                    <div
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 border ${
                        isDarkMode
                          ? "bg-slate-950/60 border-slate-800"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center justify-center rounded-2xl ring-1 ring-inset ${
                            isDarkMode
                              ? "bg-blue-500/10 ring-blue-400/25"
                              : "bg-blue-600/10 ring-blue-600/20"
                          }`}
                        >
                          <CreditIconImage alt={t("common.creditIconAlt", { brandName: "QuizMate AI" })} className="w-8 h-8 rounded-2xl" />
                        </span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide">
                            {t("common.wallet")}
                          </p>
                          <p
                            className={`text-xs ${
                              isDarkMode ? "text-slate-400" : "text-slate-500"
                            }`}
                          >
                            {t("wallet.totalAvailable")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold tabular-nums">
                          {loadingWallet
                            ? "..."
                            : new Intl.NumberFormat(
                                currentLang === "vi" ? "vi-VN" : "en-US"
                              ).format(walletSummary.totalAvailableCredits ?? 0)}
                        </p>
                        {!loadingWallet && (
                          <div className={`mt-1 space-y-1 text-[11px] ${
                            isDarkMode ? "text-slate-400" : "text-slate-500"
                          }`}>
                            <p>
                              {t("wallet.regularCredits")}:{" "}
                              {new Intl.NumberFormat(
                                currentLang === "vi" ? "vi-VN" : "en-US"
                              ).format(walletSummary.regularCreditBalance ?? 0)}
                            </p>
                            {walletSummary.hasActivePlan && (
                              <>
                                <p>
                                  {t("wallet.planCredits")}:{" "}
                                  {new Intl.NumberFormat(
                                    currentLang === "vi" ? "vi-VN" : "en-US"
                                  ).format(walletSummary.planCreditBalance ?? 0)}
                                </p>
                                {walletSummary.planCreditExpiresAt && (
                                  <p>
                                    {t("wallet.expiresAt")}:{" "}
                                    {formatWalletDateTime(walletSummary.planCreditExpiresAt, currentLang)}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            navigate("/wallets", { state: { from: "/profiles" } })
                          }
                          className={`mt-1 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full cursor-pointer ${
                            isDarkMode
                              ? "bg-blue-600/20 text-blue-200"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {t("wallet.buyTitle")}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full gap-2 px-4">
                    <Button
                      variant="outline"
                      onClick={() => { setActiveTab("settings"); setIsEditing(true); }}
                      className={`flex-1 transition-all active:scale-95 ${isDarkMode ? "border-slate-700 hover:bg-slate-800" : ""}`}
                    >
                      <Edit3 className="mr-2 h-4 w-4" /> {t("profile.edit")}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Badges Card */}
              <Card className={`shadow-lg backdrop-blur-xl ${isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white/70 border-white/60"}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{t("profile.achievements")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {badges.map((badge) => (
                      <div
                        key={badge.id}
                        className={`flex items-center gap-4 rounded-lg border p-3 ${
                          isDarkMode ? "border-slate-800 bg-slate-950" : "border-slate-100 bg-white"
                        }`}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${badge.bg} ${badge.color}`}>
                          <badge.icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{badge.name}</p>
                          <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                            {t("profile.unlockedDaysAgo", { days: 2 })}
                          </p>
                        </div>
                      </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Tabs */}
            <div className="lg:col-span-8 xl:col-span-9">
              <Tabs className="w-full">
                <TabsList isDarkMode={isDarkMode} className="grid w-full max-w-[380px] grid-cols-2">
                  <TabsTrigger active={activeTab === "overview"} onClick={() => setActiveTab("overview")} isDarkMode={isDarkMode}>
                    {t("profile.tabs.overview")}
                  </TabsTrigger>
                  <TabsTrigger active={activeTab === "settings"} onClick={() => setActiveTab("settings")} isDarkMode={isDarkMode}>
                    {t("profile.tabs.settings")}
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent active={activeTab === "overview"} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Skill Radar Chart */}
                    <Card className={`shadow-2xl backdrop-blur-xl ${isDarkMode ? "bg-slate-900/50 border-slate-700/50 shadow-blue-900/10" : "bg-white/70 border-white/60 shadow-slate-900/10"}`}>
                      <CardHeader>
                        <CardTitle>{t("profile.skillMatrix.title")}</CardTitle>
                        <CardDescription className={isDarkMode ? "text-slate-400" : ""}>{t("profile.skillMatrix.desc")}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <SkillRadarChart skills={skills} isDarkMode={isDarkMode} />
                      </CardContent>
                    </Card>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <Card className={`flex flex-col justify-center p-4 text-center shadow-lg ${isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white/70 border-white/60"}`}>
                        <BookOpen className="mx-auto mb-2 h-6 w-6 text-blue-500" />
                        <span className="text-2xl font-bold">42</span>
                        <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{t("profile.stats.topicsMastered")}</span>
                      </Card>
                      <Card className={`flex flex-col justify-center p-4 text-center shadow-lg ${isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white/70 border-white/60"}`}>
                        <Clock className="mx-auto mb-2 h-6 w-6 text-green-500" />
                        <span className="text-2xl font-bold">{t("profile.stats.learningTimeValue")}</span>
                        <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{t("profile.stats.learningTime")}</span>
                      </Card>
                      <Card className={`flex flex-col justify-center p-4 text-center shadow-lg ${isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white/70 border-white/60"}`}>
                        <Shield className="mx-auto mb-2 h-6 w-6 text-orange-500" />
                        <span className="text-2xl font-bold">15</span>
                        <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{t("profile.stats.dayStreak")}</span>
                      </Card>
                      <Card className={`flex flex-col justify-center p-4 text-center shadow-lg ${isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white/70 border-white/60"}`}>
                        <Star className="mx-auto mb-2 h-6 w-6 text-yellow-500" />
                        <span className="text-2xl font-bold">98%</span>
                        <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{t("profile.stats.avgScore")}</span>
                      </Card>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <Card className={`p-6 backdrop-blur-xl ${isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white/70 border-white/60"}`}>
                    <CardTitle className="mb-4">{t("profile.recentActivity")}</CardTitle>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className={`flex items-center justify-between border-b pb-2 last:border-0 ${isDarkMode ? "border-slate-800" : "border-slate-100"}`}>
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <div>
                              <p className="text-sm font-medium">{t("profile.recentActivityItemTitle")}</p>
                              <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>{t("profile.recentActivityItemTimeAgo")}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs">{t("profile.recentActivityItemXp")}</Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent active={activeTab === "settings"} className="space-y-6">
                  {/* Personal Info Card */}
                  <Card className={`backdrop-blur-xl ${isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white/70 border-white/60"}`}>
                    <CardHeader>
                      <CardTitle>{t("profile.personalInfo")}</CardTitle>
                      <CardDescription className={isDarkMode ? "text-slate-400" : ""}>{t("profile.personalInfoDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* Email (readonly) */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-2 w-32">
                          <Mail className={`w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`} />
                          <Label className={isDarkMode ? "text-slate-300" : "text-gray-700"}>{t("profile.email")}</Label>
                        </div>
                        <div className={`flex-1 px-4 py-2.5 rounded-lg ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                          {profile.email}
                        </div>
                      </div>

                      {/* Họ tên */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-2 w-32">
                          <User className={`w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`} />
                          <Label className={isDarkMode ? "text-slate-300" : "text-gray-700"}>{t("profile.fullName")}</Label>
                        </div>
                        {isEditing ? (
                          <Input
                            value={editForm.fullName}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
                            placeholder={t("profile.fullNamePlaceholder")}
                            className={`flex-1 ${isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" : "bg-white border-slate-300"}`}
                          />
                        ) : (
                          <div className={`flex-1 px-4 py-2.5 rounded-lg ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                            {profile.fullName || "-"}
                          </div>
                        )}
                      </div>

                      {/* Ngày sinh */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-2 w-32">
                          <Calendar className={`w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`} />
                          <Label className={isDarkMode ? "text-slate-300" : "text-gray-700"}>{t("profile.birthday")}</Label>
                        </div>
                        {isEditing ? (
                          <Input
                            type="date"
                            value={editForm.birthday || ""}
                            onChange={(e) => setEditForm((prev) => ({ ...prev, birthday: e.target.value }))}
                            className={`flex-1 ${isDarkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300"}`}
                          />
                        ) : (
                          <div className={`flex-1 px-4 py-2.5 rounded-lg ${isDarkMode ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
                            {profile.birthday ? new Date(profile.birthday).toLocaleDateString(i18n.language === "vi" ? "vi-VN" : "en-US") : "-"}
                          </div>
                        )}
                      </div>

                      {/* Nút hành động */}
                      <div className={`flex flex-wrap gap-3 pt-4 border-t ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}>
                        {isEditing ? (
                          <>
                            <Button onClick={handleSaveProfile} disabled={saving} className="min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95">
                              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t("profile.saving")}</> : t("profile.save")}
                            </Button>
                            <Button variant="outline" onClick={handleCancelEdit} disabled={saving} className={`min-w-[100px] transition-all active:scale-95 ${isDarkMode ? "border-slate-600 text-slate-300 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-100"}`}>
                              {t("profile.cancel")}
                            </Button>
                          </>
                        ) : (
                          <Button onClick={() => setIsEditing(true)} className="min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95">
                            <Edit3 className="w-4 h-4 mr-2" /> {t("profile.edit")}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Security Card */}
                  <Card className={`backdrop-blur-xl ${isDarkMode ? "bg-slate-900/50 border-slate-700/50" : "bg-white/70 border-white/60"}`}>
                    <CardHeader>
                      <CardTitle>{t("profile.security")}</CardTitle>
                      <CardDescription className={isDarkMode ? "text-slate-400" : ""}>{t("profile.securityDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => setPasswordDialog(true)}
                        variant="outline"
                        className={`min-w-[160px] transition-all active:scale-95 ${isDarkMode ? "border-slate-600 text-slate-300 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-100"}`}
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        {t("profile.changePassword")}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog đổi mật khẩu */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent className={`${fontClass} ${isDarkMode ? "bg-slate-900 border-slate-700 text-white" : "bg-white"}`}>
          <DialogHeader>
            <DialogTitle className={isDarkMode ? "text-white" : "text-slate-900"}>{t("profile.changePassword")}</DialogTitle>
            <DialogDescription className={isDarkMode ? "text-slate-400" : "text-gray-500"}>{t("profile.changePasswordDesc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Mật khẩu cũ */}
            <div className="space-y-2">
              <Label className={isDarkMode ? "text-slate-300" : "text-gray-700"}>{t("profile.oldPassword")}</Label>
              <div className="relative">
                <Input
                  type={showPasswords.old ? "text" : "password"}
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))}
                  placeholder="••••••••"
                  className={`pr-10 ${isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" : "bg-white border-slate-300"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, old: !prev.old }))}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {showPasswords.old ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Mật khẩu mới */}
            <div className="space-y-2">
              <Label className={isDarkMode ? "text-slate-300" : "text-gray-700"}>{t("profile.newPassword")}</Label>
              <div className="relative">
                <Input
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="••••••••"
                  className={`pr-10 ${isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" : "bg-white border-slate-300"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, new: !prev.new }))}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu mới */}
            <div className="space-y-2">
              <Label className={isDarkMode ? "text-slate-300" : "text-gray-700"}>{t("profile.confirmNewPassword")}</Label>
              <div className="relative">
                <Input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirmNewPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmNewPassword: e.target.value }))}
                  placeholder="••••••••"
                  className={`pr-10 ${isDarkMode ? "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" : "bg-white border-slate-300"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? "text-slate-400 hover:text-slate-300" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setPasswordDialog(false); setPasswordForm({ oldPassword: "", newPassword: "", confirmNewPassword: "" }); }}
              disabled={changingPassword}
              className={`min-w-[100px] transition-all active:scale-95 ${isDarkMode ? "border-slate-600 text-slate-300 hover:bg-slate-800" : "border-slate-300 hover:bg-slate-100"}`}
            >
              {t("profile.cancel")}
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPassword} className="min-w-[120px] bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95">
              {changingPassword ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t("profile.saving")}</> : t("profile.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProfilePage;

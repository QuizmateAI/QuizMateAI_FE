import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { logout } from "@/api/Authentication";
import { useWallet } from "@/hooks/useWallet";
import {
  changePassword,
  getProfileLearningSummary,
  updateUserProfile,
  uploadAvatar,
} from "@/api/ProfileAPI";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useUserProfile } from "@/context/UserProfileContext";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useCurrentSubscription } from "@/hooks/useCurrentSubscription";
import { useNavigateWithLoading } from "@/hooks/useNavigateWithLoading";
import ProfileHero from "./Components/ProfileHero";
import ProfileOverview from "./Components/ProfileOverview";
import ProfilePasswordDialog from "./Components/ProfilePasswordDialog";
import ProfileSettings from "./Components/ProfileSettings";
import ProfileSettingsMenu from "./Components/ProfileSettingsMenu";
import {
  ProfileTabs,
  ProfileTabsContent,
  ProfileTabsList,
  ProfileTabsTrigger,
} from "./Components/ProfileTabs";
import ProfileTopbar from "./Components/ProfileTopbar";
import { getAvatarLetter } from "./Components/profileHelpers";

const DEFAULT_PROFILE = {
  email: "",
  username: "",
  fullName: "",
  avatarUrl: "",
  birthday: "",
  lastLoginAt: null,
};

const DEFAULT_PASSWORD_FORM = {
  oldPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

const EMPTY_LEARNING_SUMMARY = {
  completedQuizCount: 0,
  learningTimeMinutes: 0,
  dayStreak: 0,
  lastActivityDate: null,
  recentActivities: [],
};

const LEARNING_SUMMARY_REFRESH_MS = 30000;

function resolveAvatarUrl(uploadResult) {
  if (typeof uploadResult === "string") return uploadResult;

  return (
    uploadResult?.avatarUrl
    || uploadResult?.avatar
    || uploadResult?.url
    || uploadResult?.data
    || ""
  );
}

function normalizeLearningSummary(data) {
  return {
    ...EMPTY_LEARNING_SUMMARY,
    ...(data || {}),
    completedQuizCount: data?.completedQuizCount ?? 0,
    learningTimeMinutes: data?.learningTimeMinutes ?? 0,
    dayStreak: data?.dayStreak ?? 0,
    recentActivities: Array.isArray(data?.recentActivities) ? data.recentActivities : [],
  };
}

function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  const navigate = useNavigateWithLoading();
  const location = useLocation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const currentLang = i18n.language;
  const fileInputRef = useRef(null);
  const settingsRef = useRef(null);
  const messageTimerRef = useRef(null);
  const { summary: currentPlanSummary } = useCurrentSubscription();
  const { profile: contextProfile, setProfile: setContextProfile, loading: profileLoading } = useUserProfile();

  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({ fullName: "", birthday: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState(DEFAULT_PASSWORD_FORM);
  const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false });
  const [message, setMessage] = useState({ type: "", text: "" });

  const { wallet: walletSummary, isLoading: loadingWallet } = useWallet();

  const learningSummaryQuery = useQuery({
    queryKey: ['user', 'learningSummary'],
    queryFn: async () => normalizeLearningSummary(await getProfileLearningSummary()),
    refetchInterval: LEARNING_SUMMARY_REFRESH_MS,
  });
  const learningSummary = learningSummaryQuery.data ?? EMPTY_LEARNING_SUMMARY;
  const loadingLearningSummary = learningSummaryQuery.isLoading;

  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });

    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }

    messageTimerRef.current = setTimeout(() => {
      setMessage({ type: "", text: "" });
    }, 4000);
  }, []);

  const updateProfileState = useCallback((patch) => {
    setProfile((prev) => ({ ...prev, ...patch }));
    setContextProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }, [setContextProfile]);

  useEffect(() => {
    if (contextProfile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from context
      setProfile((prev) => ({ ...prev, ...contextProfile }));
      setEditForm({
        fullName: contextProfile.fullName || "",
        birthday: contextProfile.birthday || "",
      });
      setLoading(false);
    } else if (!profileLoading) {
      setLoading(false);
    }
  }, [contextProfile, profileLoading]);

  useEffect(() => {
    if (!location.state?.tab) return;

    if (location.state.tab === "subscription") {
      navigate("/plans", { replace: true });
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync tab from navigation state
    setActiveTab(location.state.tab);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!isSettingsOpen) return undefined;

    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isSettingsOpen]);

  useEffect(() => () => {
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate("/login", { replace: true, state: { fromLogout: true } });
  }, [navigate]);

  const handleToggleLanguage = useCallback(() => {
    const nextLang = currentLang === "vi" ? "en" : "vi";
    i18n.changeLanguage(nextLang);
  }, [currentLang, i18n]);

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const avatarMutation = useMutation({
    mutationFn: (file) => uploadAvatar(file),
    onSuccess: (uploaded) => {
      const avatarUrl = resolveAvatarUrl(uploaded);
      if (!avatarUrl) {
        showMessage("error", t("profile.avatarError"));
        return;
      }
      updateProfileState({ avatarUrl });
      showMessage("success", t("profile.avatarSuccess"));
    },
    onError: (error) => {
      showMessage("error", error.message || t("profile.avatarError"));
    },
  });
  const uploadingAvatar = avatarMutation.isPending;

  const handleAvatarChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showMessage("error", t("profile.invalidFileType"));
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showMessage("error", t("profile.fileTooLarge"));
      event.target.value = "";
      return;
    }

    avatarMutation.mutate(file, {
      onSettled: () => {
        event.target.value = "";
      },
    });
  }, [avatarMutation, showMessage, t]);

  const saveProfileMutation = useMutation({
    mutationFn: (payload) => updateUserProfile(payload),
    onSuccess: (_resp, variables) => {
      updateProfileState({
        fullName: variables.fullName,
        birthday: variables.birthday || "",
      });
      setIsEditing(false);
      showMessage("success", t("profile.updateSuccess"));
    },
    onError: (error) => showMessage("error", error.message || t("profile.updateError")),
  });
  const saving = saveProfileMutation.isPending;

  const handleSaveProfile = useCallback(() => {
    if (!editForm.fullName.trim()) {
      showMessage("error", t("profile.fullNameRequired"));
      return;
    }
    saveProfileMutation.mutate({
      fullName: editForm.fullName,
      birthday: editForm.birthday || null,
      avatar: profile.avatarUrl,
    });
  }, [editForm.birthday, editForm.fullName, profile.avatarUrl, saveProfileMutation, showMessage, t]);

  const handleCancelEdit = useCallback(() => {
    setEditForm({ fullName: profile.fullName || "", birthday: profile.birthday || "" });
    setIsEditing(false);
  }, [profile.birthday, profile.fullName]);

  const passwordMutation = useMutation({
    mutationFn: (payload) => changePassword(payload),
    onSuccess: () => {
      setPasswordDialog(false);
      setPasswordForm(DEFAULT_PASSWORD_FORM);
      showMessage("success", t("profile.passwordSuccess"));
    },
    onError: (error) => showMessage("error", error.message || t("profile.passwordError")),
  });
  const changingPassword = passwordMutation.isPending;

  const handleChangePassword = useCallback(() => {
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

    passwordMutation.mutate({ oldPassword, newPassword, confirmNewPassword });
  }, [passwordForm, passwordMutation, showMessage, t]);

  const handlePasswordDialogOpenChange = useCallback((open) => {
    setPasswordDialog(open);
    if (!open) {
      setPasswordForm(DEFAULT_PASSWORD_FORM);
      setShowPasswords({ old: false, new: false, confirm: false });
    }
  }, []);

  const handleEditProfile = useCallback(() => {
    setActiveTab("settings");
    setIsEditing(true);
  }, []);

  const handleNavigatePlans = useCallback(() => {
    navigate("/plans", { state: { from: "/profiles" } });
  }, [navigate]);

  const handleNavigateWallet = useCallback(() => {
    navigate("/wallets", { state: { from: "/profiles" } });
  }, [navigate]);

  const avatarLetter = getAvatarLetter(profile);
  const settingsMenu = (
    <ProfileSettingsMenu
      currentLang={currentLang}
      fontClass={fontClass}
      isDarkMode={isDarkMode}
      isOpen={isSettingsOpen}
      onLogout={handleLogout}
      onThemeToggle={toggleDarkMode}
      onToggle={() => setIsSettingsOpen((prev) => !prev)}
      onToggleLanguage={handleToggleLanguage}
      settingsRef={settingsRef}
    />
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={`min-h-screen bg-[#f7fbff] text-slate-950 transition-colors duration-300 dark:bg-slate-950 dark:text-white ${fontClass}`}>
      <ProfileTopbar
        avatarLetter={avatarLetter}
        currentPlanSummary={currentPlanSummary}
        fontClass={fontClass}
        isDarkMode={isDarkMode}
        navigate={navigate}
        profile={profile}
        settingsMenu={settingsMenu}
      />

      <main className="mx-auto w-full max-w-[1600px] px-4 py-5 pb-24 md:px-6 md:py-6">
        {message.text && (
          <div
            role="status"
            className={`mb-5 flex items-center gap-3 rounded-xl border p-4 text-sm font-medium ${
              message.type === "success"
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-700/50 dark:bg-green-900/30 dark:text-green-300"
                : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/50 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {message.type === "success" ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
            <span>{message.text}</span>
          </div>
        )}

        <ProfileHero
          avatarLetter={avatarLetter}
          currentLang={currentLang}
          currentPlanSummary={currentPlanSummary}
          fileInputRef={fileInputRef}
          isDarkMode={isDarkMode}
          learningSummary={learningSummary}
          loadingLearningSummary={loadingLearningSummary}
          loadingWallet={loadingWallet}
          onAvatarChange={handleAvatarChange}
          onAvatarClick={handleAvatarClick}
          onEdit={handleEditProfile}
          onTopUp={handleNavigateWallet}
          onUpgrade={handleNavigatePlans}
          profile={profile}
          uploadingAvatar={uploadingAvatar}
          walletSummary={walletSummary}
        />

        <ProfileTabs className="mt-6">
          <ProfileTabsList isDarkMode={isDarkMode}>
            <ProfileTabsTrigger
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              isDarkMode={isDarkMode}
            >
              {t("profile.tabs.overview")}
            </ProfileTabsTrigger>
            <ProfileTabsTrigger
              active={activeTab === "settings"}
              onClick={() => setActiveTab("settings")}
              isDarkMode={isDarkMode}
            >
              {t("profile.tabs.settings")}
            </ProfileTabsTrigger>
          </ProfileTabsList>

          <ProfileTabsContent active={activeTab === "overview"}>
            <ProfileOverview
              currentLang={currentLang}
              currentPlanSummary={currentPlanSummary}
              isDarkMode={isDarkMode}
              learningSummary={learningSummary}
              loadingLearningSummary={loadingLearningSummary}
              loadingWallet={loadingWallet}
              onTopUp={handleNavigateWallet}
              onUpgrade={handleNavigatePlans}
              walletSummary={walletSummary}
            />
          </ProfileTabsContent>

          <ProfileTabsContent active={activeTab === "settings"}>
            <ProfileSettings
              currentLang={currentLang}
              editForm={editForm}
              isDarkMode={isDarkMode}
              isEditing={isEditing}
              onCancelEdit={handleCancelEdit}
              onChangeEditForm={(patch) => setEditForm((prev) => ({ ...prev, ...patch }))}
              onChangePassword={() => setPasswordDialog(true)}
              onSaveProfile={handleSaveProfile}
              onStartEdit={() => setIsEditing(true)}
              profile={profile}
              saving={saving}
            />
          </ProfileTabsContent>
        </ProfileTabs>
      </main>

      <ProfilePasswordDialog
        changingPassword={changingPassword}
        fontClass={fontClass}
        isDarkMode={isDarkMode}
        onCancel={() => handlePasswordDialogOpenChange(false)}
        onChangePasswordForm={(patch) => setPasswordForm((prev) => ({ ...prev, ...patch }))}
        onConfirm={handleChangePassword}
        onOpenChange={handlePasswordDialogOpenChange}
        onTogglePassword={(field) => setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))}
        open={passwordDialog}
        passwordForm={passwordForm}
        showPasswords={showPasswords}
      />
    </div>
  );
}

export default ProfilePage;

import React, { useEffect, useRef, useState } from "react";
import { LogOut, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { logout } from "@/api/Authentication";
import { useNavigateWithLoading } from "@/hooks/useNavigateWithLoading";
import { useUserProfile } from "@/context/UserProfileContext";
import { getUserDisplayName } from "@/Utils/userProfile";
import { preloadProfilePage } from "@/lib/routeLoaders";

function UserProfilePopover({ isDarkMode = false }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigateWithLoading();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState("");
  const { profile } = useUserProfile();
  const profileRef = useRef(null);
  const displayName = getUserDisplayName(profile);
  const displayEmail = profile?.email || "";
  const avatarUrl = (profile?.avatarUrl || "").trim();
  const displayAvatar = failedAvatarUrl === avatarUrl ? "" : avatarUrl;
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const handleGoToProfile = () => {
    // Logic nghiệp vụ: điều hướng sang trang profile từ popover user.
    setIsProfileOpen(false);
    navigate("/profiles");
  };

  const handleLogout = () => {
    // Logic nghiệp vụ: đăng xuất người dùng, xóa phiên và quay về trang đăng nhập.
    logout();
    setIsProfileOpen(false);
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileOpen && profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    // Logic nghiệp vụ: đóng popover profile khi người dùng click ra ngoài.
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  return (
    <div ref={profileRef} className="relative">
      <button
        type="button"
        onClick={() => setIsProfileOpen((prev) => !prev)}
        onMouseEnter={preloadProfilePage}
        onFocus={preloadProfilePage}
        className="relative w-9 h-9 rounded-full overflow-hidden border border-transparent hover:border-blue-400 transition-colors"
        aria-expanded={isProfileOpen}
        aria-haspopup="menu"
      >
        {displayAvatar ? (
          <img
            src={displayAvatar}
            alt={displayName}
            className="w-full h-full object-cover"
            onError={() => setFailedAvatarUrl(avatarUrl)}
          />
        ) : (
          <div className="w-full h-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center">
            {avatarLetter || "U"}
          </div>
        )}
      </button>

      {isProfileOpen ? (
        <div
          className={`absolute right-0 mt-2 w-[320px] rounded-2xl border shadow-xl overflow-hidden transition-colors duration-300 z-40 ${
            isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-gray-200 text-gray-800"
          }`}
        >
          <div className="px-4 pt-3 pb-2 relative">
            <p className={`text-center text-sm font-semibold ${fontClass} ${isDarkMode ? "text-slate-100" : "text-gray-800"}`}>
              {displayEmail}
            </p>
            <button
              type="button"
              onClick={() => setIsProfileOpen(false)}
              className={`absolute right-3 top-2 p-1 rounded-full ${
                isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-500"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 pb-3">
            <div className="flex flex-col items-center justify-center text-center gap-2">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-300/50">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={() => setFailedAvatarUrl(avatarUrl)}
                  />
                ) : (
                  <div className="w-full h-full bg-blue-600 text-white text-xl font-semibold flex items-center justify-center">
                    {avatarLetter || "U"}
                  </div>
                )}
              </div>
              <p className={`text-xl leading-tight font-medium ${isDarkMode ? "text-white" : "text-gray-800"} ${fontClass}`}>
                {t("home.profile.greeting", { name: displayName })}
              </p>
              <button
                type="button"
                onClick={handleGoToProfile}
                onMouseEnter={preloadProfilePage}
                onFocus={preloadProfilePage}
                className={`mt-1 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${fontClass} ${
                  isDarkMode
                    ? "border-blue-400 text-blue-300 hover:bg-blue-950/40"
                    : "border-blue-600 text-blue-700 hover:bg-blue-50"
                }`}
              >
                {t("home.profile.manageAccount")}
              </button>
            </div>
          </div>

          <div className="px-4 pb-4">
            <button
              type="button"
              onClick={handleLogout}
              className={`w-full rounded-2xl px-4 py-4 flex items-center gap-3 text-left ${
                isDarkMode ? "bg-slate-950 text-slate-100 hover:bg-black/40" : "bg-gray-100 text-gray-900 hover:bg-gray-200"
              }`}
            >
              <LogOut className="w-5 h-5" />
              <span className={`text-[15px] font-medium ${fontClass}`}>{t("home.profile.logout")}</span>
            </button>
          </div>

          <div className={`pb-3 text-center text-xs ${isDarkMode ? "text-slate-300" : "text-gray-500"} ${fontClass}`}>
            <button type="button" className="hover:underline">
              {t("home.profile.privacyPolicy")}
            </button>
            <span className="mx-2">•</span>
            <button type="button" className="hover:underline">
              {t("home.profile.termsOfService")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default UserProfilePopover;

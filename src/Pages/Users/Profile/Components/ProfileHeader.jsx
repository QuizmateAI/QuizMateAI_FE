import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import { useDarkMode } from "@/hooks/useDarkMode";
import UserProfilePopover from "@/Components/features/Users/UserProfilePopover";

function ProfileHeader() {
  const { t, i18n } = useTranslation();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <header
      className={`h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50 backdrop-blur-md transition-colors ${
        isDarkMode
          ? "bg-slate-900/80 border-b border-slate-800"
          : "bg-[#F0F4F9]/80 border-b border-slate-200"
      }`}
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleBack}
          className={`p-2 rounded-full transition-all active:scale-95 ${
            isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-200 text-gray-600"
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <img
            src={isDarkMode ? LogoDark : LogoLight}
            alt="Logo"
            className="h-5 w-auto object-contain"
          />
          <span
            className={`text-xl font-medium ${fontClass} ${
              isDarkMode ? "text-slate-200" : "text-gray-600"
            }`}
          >
            {t("profile.personalInfo")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <UserProfilePopover isDarkMode={isDarkMode} />
      </div>
    </header>
  );
}

export default ProfileHeader;

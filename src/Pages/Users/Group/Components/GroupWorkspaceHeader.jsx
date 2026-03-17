import React from "react";
import { Button } from "@/Components/ui/button";
import { UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import { useNavigate } from "react-router-dom";
import UserProfilePopover from "@/Components/features/Users/UserProfilePopover";
import WebSocketStatus from "@/Components/features/WebSocketStatus";
// import UpgradePlanDialog from "@/Pages/Payment/components/UpgradePlanDialog";

// Header cho Group Workspace - hiển thị tên nhóm và các hành động đặc thù
function GroupWorkspaceHeader({ 
  groupId = null,
  groupName = "", 
  settingsMenu = null, 
  isDarkMode = false,
  onOpenInvite = () => {},
  wsConnected = false,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const navigate = useNavigate();
  // const [upgradeOpen, setUpgradeOpen] = useState(false);

 

  return (
    <>
    <header className={`w-full h-16 border-b transition-colors duration-300 ${isDarkMode ? "bg-slate-950 border-slate-800" : "bg-white border-gray-200"}`}>
      <div className="max-w-[1740px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-[130px] flex items-center justify-center cursor-pointer"
            onClick={() => navigate("/home")}
          >
            <img src={isDarkMode ? LogoDark : LogoLight} alt="QuizMate AI Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>
              {groupName || t("groupManage.title")}
            </p>
            <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-500"} ${fontClass}`}>
              {t("workspace.header.groupSubtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <WebSocketStatus isConnected={wsConnected} isDarkMode={isDarkMode} compact />
          {/* <Button
            onClick={() => setUpgradeOpen(true)}
            variant="outline"
            className={`rounded-full h-9 px-4 flex items-center gap-2 ${
              isDarkMode ? "border-slate-700 text-amber-400 hover:bg-slate-800" : "border-gray-200 text-amber-600 hover:bg-amber-50"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span className={fontClass}>{t("upgradePlan.upgradeBtn")}</span>
          </Button> */}

          <Button
            onClick={onOpenInvite}
            variant="outline"
            className={`rounded-full h-9 px-4 flex items-center gap-2 ${
              isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-900" : "border-gray-200"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span className={fontClass}>{t("workspace.header.invite")}</span>
          </Button>
          {settingsMenu}
          <UserProfilePopover isDarkMode={isDarkMode} />
        </div>
      </div>
    </header>

    {/* <UpgradePlanDialog
      open={upgradeOpen}
      onOpenChange={setUpgradeOpen}
      planType="GROUP"
      preSelectedGroupId={groupId}
    /> */}
    </>
  );
}

export default GroupWorkspaceHeader;

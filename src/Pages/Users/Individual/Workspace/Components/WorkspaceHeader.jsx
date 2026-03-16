import React, { useState } from "react";
import { Button } from "@/Components/ui/button";
import { Pencil, Settings, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import LogoLight from "@/assets/LightMode_Logo.webp";
import LogoDark from "@/assets/DarkMode_Logo.webp";
import { useNavigate } from "react-router-dom";
import UserProfilePopover from "@/Components/features/Users/UserProfilePopover";
import WebSocketStatus from "@/Components/features/WebSocketStatus";
// import UpgradePlanDialog from "@/Pages/Payment/components/UpgradePlanDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";

function WorkspaceHeader({
  settingsMenu = null,
  isDarkMode = false,
  workspaceTitle = "",
  workspaceName = "",
  workspaceSubtitle = "",
  workspaceDescription = "",
  onEditWorkspace,
  wsConnected = false,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const navigate = useNavigate();

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  // const [upgradeOpen, setUpgradeOpen] = useState(false);

  const openEditDialog = () => {
    setEditTitle(workspaceName || workspaceTitle || "");
    setEditDescription(workspaceDescription || "");
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!onEditWorkspace) return;
    setSaving(true);
    try {
      await onEditWorkspace({ name: editTitle, description: editDescription });
      setEditOpen(false);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
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
            <div className="flex items-center gap-1.5">
              <p className={`text-sm font-semibold ${isDarkMode ? "text-slate-200" : "text-gray-800"} ${fontClass}`}>
                {workspaceTitle || t("workspace.header.title")}
              </p>
              {onEditWorkspace && (
                <button
                  type="button"
                  onClick={openEditDialog}
                  className={`p-1 rounded-md transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-400 hover:text-slate-200" : "hover:bg-gray-100 text-gray-400 hover:text-gray-700"}`}
                  aria-label="Edit workspace"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {workspaceSubtitle ? (
              <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-500"} ${fontClass}`}>
                {workspaceSubtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <WebSocketStatus isConnected={wsConnected} isDarkMode={isDarkMode} compact />
    
          {/* <Button className={`rounded-full text-white h-9 px-4 flex items-center gap-2 ${
            isDarkMode ? "bg-blue-600 hover:bg-blue-500" : "bg-[#2563EB] hover:bg-gray-800"
          }`}>
            <Plus className="w-4 h-4" />
            <span className={fontClass}>{t("workspace.header.create")}</span>
          </Button> */}
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
            variant="outline"
            className={`rounded-full h-9 px-4 flex items-center gap-2 ${
              isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-900" : "border-gray-200"
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span className={fontClass}>{t("workspace.header.share")}</span>
          </Button>
          {settingsMenu ? (
            settingsMenu
          ) : (
            <Button
              variant="outline"
              className={`rounded-full h-9 px-4 flex items-center gap-2 ${
                isDarkMode ? "border-slate-700 text-slate-200 hover:bg-slate-900" : "border-gray-200"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className={fontClass}>{t("workspace.header.settings")}</span>
            </Button>
          )}
          <UserProfilePopover isDarkMode={isDarkMode} />
        </div>
      </div>

      {/* Dialog chỉnh sửa workspace */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className={`sm:max-w-md ${isDarkMode ? "bg-slate-950 border-slate-800 text-slate-100" : "bg-white"}`}>
          <DialogHeader>
            <DialogTitle className={`${isDarkMode ? "text-slate-100" : "text-gray-900"} ${fontClass}`}>
              {t("home.workspace.editTitle")}
            </DialogTitle>
            <DialogDescription className={`${isDarkMode ? "text-slate-400" : "text-gray-500"} ${fontClass}`}>
              {t("home.workspace.editDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <label className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-gray-700"} ${fontClass}`}>
                {t("home.workspace.titleLabel")}
              </label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={`${isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-slate-100 border-slate-300"}`}
                placeholder={t("home.workspace.titlePlaceholder")}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-gray-700"} ${fontClass}`}>
                {t("home.workspace.descriptionLabel")}
              </label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className={`${isDarkMode ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-slate-100 border-slate-300"}`}
                placeholder={t("home.workspace.descriptionPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              className={`${isDarkMode ? "border-slate-700 text-slate-300 hover:bg-slate-900" : ""} ${fontClass}`}
            >
              {t("home.workspace.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className={`${isDarkMode ? "bg-blue-600 hover:bg-blue-500" : "bg-[#2563EB] hover:bg-blue-700"} text-white ${fontClass}`}
            >
              {saving ? t("home.workspace.saving") : t("home.workspace.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* <UpgradePlanDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        planType="INDIVIDUAL"
      /> */}
    </header>
  );
}

export default WorkspaceHeader;

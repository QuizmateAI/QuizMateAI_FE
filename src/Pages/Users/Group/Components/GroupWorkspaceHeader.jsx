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
  workspaceId = null,
  groupName = "", 
  settingsMenu = null, 
  isDarkMode = false,
  onOpenInvite = () => {},
  inviteDisabled = false,
  wsConnected = false,
  roleLabel = "",
  memberCount = 0,
  sourceCount = 0,
  selectedCount = 0,
  activeViewLabel = "",
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const navigate = useNavigate();
  // const [upgradeOpen, setUpgradeOpen] = useState(false);

  const currentLang = i18n.language;
  const statItems = [
    {
      label: currentLang === "en" ? "Collective" : "Thành viên",
      value: memberCount || 0,
      suffix: currentLang === "en" ? "members" : "người",
    },
    {
      label: currentLang === "en" ? "Source vault" : "Kho tư liệu",
      value: sourceCount || 0,
      suffix: currentLang === "en" ? "assets" : "nguồn",
    },
    {
      label: currentLang === "en" ? "Focus picks" : "Nguồn đang chọn",
      value: selectedCount || 0,
      suffix: currentLang === "en" ? "selected" : "mục",
    },
    {
      label: currentLang === "en" ? "Current scene" : "Chế độ hiện tại",
      value: activeViewLabel || (currentLang === "en" ? "Conversation" : "Trò chuyện"),
      suffix: "",
      isText: true,
    },
  ];

  const roleBadgeClass = isDarkMode
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
    : "border-emerald-200 bg-emerald-50 text-emerald-700";
  const shellClass = isDarkMode
    ? "border-white/10 bg-[#08141c]/95 text-white shadow-[0_32px_90px_rgba(0,0,0,0.45)]"
    : "border-[#eadfce] bg-[linear-gradient(135deg,rgba(255,250,240,0.98),rgba(244,250,246,0.96),rgba(239,246,255,0.96))] text-slate-900 shadow-[0_28px_80px_rgba(160,112,56,0.14)]";
  const subtleTextClass = isDarkMode ? "text-slate-300" : "text-slate-600";
  const mutedTextClass = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardClass = isDarkMode
    ? "border-white/10 bg-white/[0.045]"
    : "border-white/70 bg-white/70";
  const pillClass = isDarkMode
    ? "border-white/10 bg-white/[0.06] text-slate-200"
    : "border-white/80 bg-white/80 text-slate-700";
  const inviteButtonClass = isDarkMode
    ? "border-emerald-400/30 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/20"
    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";

  return (
    <>
    <header className="relative z-10 px-5 pt-5">
      <div className={`relative mx-auto max-w-[1760px] overflow-hidden rounded-[34px] border ${shellClass}`}>
        <div
          className={`pointer-events-none absolute inset-0 ${
            isDarkMode
              ? "bg-[radial-gradient(circle_at_top_left,rgba(22,163,74,0.22),transparent_28%),radial-gradient(circle_at_85%_18%,rgba(245,158,11,0.20),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_55%)]"
              : "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_84%_18%,rgba(249,115,22,0.16),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.72),transparent_60%)]"
          }`}
        />
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-px ${isDarkMode ? "bg-white/20" : "bg-white/80"}`} />

        <div className="relative px-6 py-6 lg:px-8 lg:py-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={`flex items-center gap-3 rounded-full border px-3 py-2 transition-all ${pillClass}`}
                  onClick={() => navigate("/home")}
                >
                  <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white/90">
                    <img src={isDarkMode ? LogoDark : LogoLight} alt="QuizMate AI Logo" className="h-6 w-6 object-contain" />
                  </span>
                  <span className={`text-xs font-semibold uppercase tracking-[0.24em] ${fontClass}`}>
                    {currentLang === "en" ? "Collective Atelier" : "Phong cộng tác"}
                  </span>
                </button>

                {workspaceId ? (
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${pillClass}`}>
                    {currentLang === "en" ? `Studio #${workspaceId}` : `Không gian #${workspaceId}`}
                  </span>
                ) : null}

                {roleLabel ? (
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${roleBadgeClass}`}>
                    {roleLabel}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className={`min-w-0 text-3xl font-black tracking-[-0.03em] sm:text-4xl ${fontClass}`}>
                    {groupName || t("groupManage.title")}
                  </h1>
                  <span className={`inline-flex h-2.5 w-2.5 rounded-full ${wsConnected ? "bg-emerald-400" : "bg-amber-400"}`} />
                </div>
                <p className={`max-w-3xl text-sm leading-6 sm:text-[15px] ${subtleTextClass} ${fontClass}`}>
                  {currentLang === "en"
                    ? "Built for collective study rituals: gather source packs, shape discussions, and launch shared learning experiments from one room."
                    : "Thiết kế cho học nhóm hiện đại: gom nguồn tư liệu, dẫn dắt thảo luận và khởi chạy các hoạt động học tập chung trong cùng một không gian."}
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                {statItems.map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-[24px] border px-4 py-3 backdrop-blur ${cardClass}`}
                  >
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${mutedTextClass} ${fontClass}`}>
                      {item.label}
                    </p>
                    <div className="mt-2 flex items-end gap-2">
                      <span className={`text-2xl font-black tracking-[-0.04em] ${fontClass}`}>
                        {item.value}
                      </span>
                      {item.suffix ? (
                        <span className={`pb-1 text-xs ${mutedTextClass} ${fontClass}`}>
                          {item.suffix}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="xl:w-[360px] xl:flex-none">
              <div className="flex h-full flex-col gap-4">
                <div className={`rounded-[26px] border px-4 py-4 backdrop-blur ${cardClass}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${mutedTextClass} ${fontClass}`}>
                        {currentLang === "en" ? "Realtime bridge" : "Cầu nối realtime"}
                      </p>
                      <p className={`mt-2 text-sm leading-6 ${subtleTextClass} ${fontClass}`}>
                        {wsConnected
                          ? (currentLang === "en" ? "Presence, uploads, and team actions are flowing live." : "Tài liệu, trạng thái và hoạt động nhóm đang đồng bộ trực tiếp.")
                          : (currentLang === "en" ? "The room is still available, but live sync is reconnecting." : "Không gian vẫn hoạt động, nhưng đồng bộ trực tiếp đang kết nối lại.")}
                      </p>
                    </div>
                    <div className="pt-0.5">
                      <WebSocketStatus isConnected={wsConnected} isDarkMode={isDarkMode} compact />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={onOpenInvite}
                    variant="outline"
                    disabled={inviteDisabled}
                    className={`h-11 rounded-full border px-5 text-sm font-semibold shadow-none ${inviteButtonClass}`}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span className={fontClass}>{t("workspace.header.invite")}</span>
                  </Button>
                  {settingsMenu}
                  <div className="ml-auto">
                    <UserProfilePopover isDarkMode={isDarkMode} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    {/* <UpgradePlanDialog
      open={upgradeOpen}
      onOpenChange={setUpgradeOpen}
      planType="GROUP"
      preSelectedWorkspaceId={workspaceId}
    /> */}
    </>
  );
}

export default GroupWorkspaceHeader;

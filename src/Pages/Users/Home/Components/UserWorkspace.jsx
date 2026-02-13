import React from "react";
import { useNavigate } from "react-router-dom";
import { MoreVertical, Plus } from "lucide-react";
import workspaceData from "@/Pages/Users/Home/Components/workspaceData";
import { formatDate, formatUpdatedTime } from "@/Pages/Users/Home/Components/workspaceData";
import { useTranslation } from "react-i18next";

function UserWorkspace({ viewMode, isDarkMode }) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  function getWorkspaceCardColorByOrder(orderNumber, darkModeEnabled) {
    // Logic nghiệp vụ: gán màu theo vòng lặp xanh lá -> cam -> xanh biển khi tạo workspace mới.
    const colorCycle = [
      { light: "bg-green-50", dark: "bg-green-950/60" },
      { light: "bg-orange-50", dark: "bg-orange-950/60" },
      { light: "bg-blue-50", dark: "bg-blue-950/60" },
    ];

    const safeOrder = Number.isFinite(Number(orderNumber)) ? Number(orderNumber) : 1;
    const colorIndex = (Math.max(safeOrder, 1) - 1) % colorCycle.length;
    const selectedColor = colorCycle[colorIndex];

    return darkModeEnabled ? selectedColor.dark : selectedColor.light;
  }

  // Logic nghiệp vụ: chuyển đổi hiển thị giữa lưới và danh sách
  const isList = viewMode === "list";
  const workspaces = [...workspaceData].sort(
    (a, b) => new Date(b.dateAt).getTime() - new Date(a.dateAt).getTime()
  );

  return (
    <section className={fontClass}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-medium transition-colors duration-300 ${isDarkMode ? "text-white" : "text-[#303030]"}`}>{t("home.sections.myWorkspaces")}</h2>
      </div>

      {isList ? (
        <div className={`rounded-2xl border transition-colors duration-300 ${isDarkMode ? "border-slate-800 bg-slate-900" : "border-gray-200 bg-white"}`}>
          <div className={`grid grid-cols-[minmax(240px,2fr)_minmax(110px,0.7fr)_minmax(140px,0.8fr)_minmax(120px,0.6fr)_32px] gap-4 px-4 py-3 text-xs font-semibold ${
            isDarkMode ? "text-slate-500" : "text-gray-500"
          }`}>
            <span>{t("home.table.title")}</span>
            <span>{t("home.table.sources")}</span>
            <span>{t("home.table.created")}</span>
            <span>{t("home.table.role")}</span>
            <span />
          </div>
          <div className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-gray-200"}`}>
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className={`grid grid-cols-[minmax(240px,2fr)_minmax(110px,0.7fr)_minmax(140px,0.8fr)_minmax(120px,0.6fr)_32px] gap-4 px-4 py-3 text-sm ${
                  isDarkMode ? "text-slate-300" : "text-gray-700"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">{workspace.emoji}</span>
                  <span className={`truncate font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>{workspace.title}</span>
                </div>
                <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{workspace.sources} {t("home.labels.sourcesUnit")}</span>
                <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{formatDate(workspace.dateAt)}</span>
                <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{t("home.labels.owner")}</span>
                <button className={isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600"}>
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <div
            className={`rounded-xl border-2 border-dashed h-56 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all overflow-hidden ${
              isDarkMode
                ? "border-slate-700 hover:border-blue-500 hover:bg-blue-950/30"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
            }`}
            onClick={() => navigate("/workspace")}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
              isDarkMode ? "bg-blue-950/50" : "bg-blue-100"
            }`}>
              <Plus className={`w-6 h-6 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
            </div>
            <p className={`font-medium text-sm text-center px-4 ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>
              {t("home.actions.createWorkspace")}
            </p>
          </div>

          {workspaces.map((workspace) => {
            // Logic nghiệp vụ: ưu tiên thứ tự tạo (id) để gán màu tự động theo vòng lặp.
            const cardBg = getWorkspaceCardColorByOrder(workspace.id, isDarkMode);

            return (
              <div
                key={workspace.id}
                className={`${cardBg} rounded-xl h-56 p-6 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between relative group border ${
                  isDarkMode ? "border-slate-800" : "border-gray-200"
                } overflow-hidden`}
              >
                <div className="flex items-start justify-between">
                  <div className="text-3xl shrink-0">{workspace.emoji}</div>
                  <button className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/5 rounded-full">
                    <MoreVertical className={`w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-600"}`} />
                  </button>
                </div>

                <div className="flex-1 min-w-0 mt-2">
                  <h3 className={`font-medium text-base line-clamp-2 leading-snug ${isDarkMode ? "text-white" : "text-[#1F1F1F]"}`}>
                    {workspace.title}
                  </h3>
                  <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{workspace.description}</p>
                  <div className={`text-xs mt-2 flex items-center gap-2 ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                    <span className="truncate">{formatUpdatedTime(workspace.updatedAt)}</span>
                    <span className={`w-1 h-1 rounded-full ${isDarkMode ? "bg-slate-600" : "bg-gray-300"}`} />
                    <span className="truncate">{workspace.count}</span>
                  </div>
                </div>

                <div className={`flex items-center justify-between text-sm mt-3 pt-3 border-t ${
                  isDarkMode ? "text-slate-400 border-slate-700/50" : "text-gray-600 border-gray-200/50"
                }`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs truncate">{formatDate(workspace.dateAt)}</span>
                    <span className="text-xs">·</span>
                    <span className="text-xs truncate">{workspace.sources} {t("home.labels.sourcesUnit")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default UserWorkspace;

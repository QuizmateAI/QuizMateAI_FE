
import React from "react";
import { MoreVertical } from "lucide-react";
import workspaceData from "@/Pages/Users/Home/Components/workspaceData";
import { formatDate, formatUpdatedTime } from "@/Pages/Users/Home/Components/workspaceData";
import { useTranslation } from "react-i18next";

function WorkspaceCard({ workspace, isList, isDarkMode }) {
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

  // Logic nghiệp vụ: chọn màu card theo id để không phụ thuộc dữ liệu màu trong mock data.
  const cardBg = getWorkspaceCardColorByOrder(workspace.id, isDarkMode);

  return (
    <div
      className={`${cardBg} rounded-xl ${
        isList ? "h-24" : "h-56"
      } p-6 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between relative group border ${
        isDarkMode ? "border-slate-800" : "border-gray-200"
      } overflow-hidden`}
    >
      <div className="flex items-start justify-between">
        <div className="text-3xl shrink-0">{workspace.emoji}</div>
        <button className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/5 rounded-full">
          <MoreVertical className={`w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-600"}`} />
        </button>
      </div>

      <div className={`flex-1 min-w-0 ${isList ? "mt-1" : "mt-2"}`}>
        <h3
          className={`font-medium text-base leading-snug ${
            isDarkMode ? "text-white" : "text-[#1F1F1F]"
          } ${isList ? "line-clamp-1" : "line-clamp-2"}`}
        >
          {workspace.title}
        </h3>
        <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"} ${isList ? "line-clamp-1" : ""}`}>
          {workspace.description}
        </p>
        <div className={`text-xs flex items-center gap-2 ${isDarkMode ? "text-slate-500" : "text-gray-500"} ${isList ? "mt-1" : "mt-2"}`}>
          <span className="truncate">{formatUpdatedTime(workspace.updatedAt)}</span>
          <span className={`w-1 h-1 rounded-full ${isDarkMode ? "bg-slate-600" : "bg-gray-300"}`} />
          <span className="truncate">{workspace.count}</span>
        </div>
      </div>

      <div
        className={`flex items-center justify-between text-sm ${
          isDarkMode ? "text-slate-400" : "text-gray-600"
        } ${isList ? "mt-1 pt-0 border-t-0" : "mt-3 pt-3 border-t"} ${
          isDarkMode ? "border-slate-700/50" : "border-gray-200/50"
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs truncate">{formatDate(workspace.dateAt)}</span>
          <span className="text-xs">·</span>
          <span className="text-xs truncate">{workspace.sources} nguồn</span>
        </div>
      </div>
    </div>
  );
}

function HomeContent({ viewMode, isDarkMode }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  // Logic nghiệp vụ: đổi layout theo chế độ xem
  const isList = viewMode === "list";
  const recentWorkspaces = [...workspaceData]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const featuredNotes = [
    { id: 1, title: "Featured 1", color: "bg-purple-50", darkColor: "bg-purple-950/60" },
    { id: 2, title: "Featured 2", color: "bg-yellow-50", darkColor: "bg-yellow-950/60" },
    { id: 3, title: "Featured 3", color: "bg-blue-50", darkColor: "bg-blue-950/60" },
    { id: 4, title: "Featured 4", color: "bg-green-50", darkColor: "bg-green-950/60" },
    { id: 5, title: "Featured 5", color: "bg-pink-50", darkColor: "bg-pink-950/60" },
  ];

  return (
    <div className={`space-y-10 ${fontClass}`}>
      <section className="mb-10">
        <h2 className={`text-xl font-medium mb-4 transition-colors duration-300 ${isDarkMode ? "text-white" : "text-[#303030]"}`}>{t("home.sections.featured")}</h2>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
          {featuredNotes.map((note) => (
            <div
              key={note.id}
              className={`${isDarkMode ? note.darkColor : note.color} rounded-xl min-w-[280px] h-56 flex-shrink-0 cursor-pointer hover:shadow-md transition-all border ${
                isDarkMode ? "border-slate-800" : "border-gray-200"
              }`}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-medium transition-colors duration-300 ${isDarkMode ? "text-white" : "text-[#303030]"}`}>{t("home.sections.recent")}</h2>
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
              {recentWorkspaces.map((workspace) => (
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
            {recentWorkspaces.map((workspace) => (
              <WorkspaceCard key={workspace.id} workspace={workspace} isList={isList} isDarkMode={isDarkMode} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default HomeContent;
import React from "react";
import { Users, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

const groups = [
  {
    id: 1,
    name: "Front-end Bootcamp",
    membersCount: 12,
    updates: "2 thông báo mới",
    hasUpdates: true,
  },
  {
    id: 2,
    name: "AI Companion Study",
    membersCount: 7,
    updates: "1 bài tập mới",
    hasUpdates: true,
  },
  {
    id: 3,
    name: "Product Design",
    membersCount: 9,
    updates: "Không có cập nhật",
    hasUpdates: false,
  },
];

function UserGroup({ viewMode, isDarkMode }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";

  // Logic nghiệp vụ: hiển thị badge khi có thông báo
  const isList = viewMode === "list";

  return (
    <section className={fontClass}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-medium transition-colors duration-300 ${isDarkMode ? "text-white" : "text-[#303030]"}`}>{t("home.sections.myGroups")}</h2>
        <button className={`text-sm ${isDarkMode ? "text-slate-400 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}>{t("home.actions.createGroup")}</button>
      </div>

      {isList ? (
        <div className={`rounded-2xl border transition-colors duration-300 ${isDarkMode ? "border-slate-800 bg-slate-900" : "border-gray-200 bg-white"}`}>
          <div className={`grid grid-cols-[minmax(240px,2fr)_minmax(140px,0.8fr)_minmax(160px,1fr)_minmax(120px,0.6fr)_32px] gap-4 px-4 py-3 text-xs font-semibold ${
            isDarkMode ? "text-slate-500" : "text-gray-500"
          }`}>
            <span>{t("home.table.title")}</span>
            <span>{t("home.table.members")}</span>
            <span>{t("home.table.updates")}</span>
            <span>{t("home.table.role")}</span>
            <span />
          </div>
          <div className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-gray-200"}`}>
            {groups.map((group) => (
              <div
                key={group.id}
                className={`grid grid-cols-[minmax(240px,2fr)_minmax(140px,0.8fr)_minmax(160px,1fr)_minmax(120px,0.6fr)_32px] gap-4 px-4 py-3 text-sm ${
                  isDarkMode ? "text-slate-300" : "text-gray-700"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">👥</span>
                  <span className={`truncate font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>{group.name}</span>
                </div>
                <span className={`text-xs truncate ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{group.membersCount} {t("home.labels.membersUnit")}</span>
                <span className={`text-xs truncate ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{group.updates}</span>
                <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{t("home.labels.owner")}</span>
                <button className={isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600"}>⋮</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className={`rounded-2xl border p-5 flex items-start gap-4 hover:shadow-sm transition-all overflow-hidden min-h-[160px] ${
                isDarkMode ? "border-slate-800 bg-slate-900" : "border-gray-200 bg-white"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDarkMode ? "bg-amber-950/50" : "bg-amber-50"
              }`}>
                <Users className={`w-5 h-5 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold truncate ${isDarkMode ? "text-white" : "text-zinc-900"}`}>{group.name}</p>
                  {group.hasUpdates && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                      isDarkMode ? "bg-amber-950/50 text-amber-400" : "bg-amber-100 text-amber-700"
                    }`}>
                      <Bell className="w-3 h-3" />
                      {group.updates}
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-1 truncate ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{group.membersCount} {t("home.labels.membersUnit")}</p>
                <p className={`text-xs mt-2 truncate ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>{group.hasUpdates ? group.updates : t("home.group.noUpdates")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default UserGroup;

import React from "react";
import { Users, Loader2, FolderOpen, Plus, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// Component hiển thị danh sách nhóm từ API
function UserGroup({ viewMode, isDarkMode, groups = [], loading, onOpenCreate }) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const navigate = useNavigate();
  const isList = viewMode === "list";

  // Chuyển sang trang group workspace khi click vào nhóm
  const handleNavigateGroup = (group) => {
    navigate(`/group-workspace/${group.groupId}`);
  };

  // Hiển thị vai trò dạng tiếng Việt/Anh
  const getRoleLabel = (role) => {
    if (role === 'LEADER') return t('home.group.leader');
    if (role === 'CONTRIBUTOR') return t('home.group.contributor');
    return t('home.group.member');
  };

  const getRoleBadgeClass = (role) => {
    if (role === 'LEADER') {
      return isDarkMode ? 'bg-blue-950/50 text-blue-400' : 'bg-blue-100 text-blue-700';
    }
    if (role === 'CONTRIBUTOR') {
      return isDarkMode ? 'bg-purple-950/50 text-purple-400' : 'bg-purple-100 text-purple-700';
    }
    return isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-gray-100 text-gray-600';
  };

  // Trạng thái loading
  if (loading) {
    return (
      <section className={fontClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-medium transition-colors duration-300 ${isDarkMode ? "text-white" : "text-[#303030]"}`}>{t("home.sections.myGroups")}</h2>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className={`w-6 h-6 animate-spin ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
        </div>
      </section>
    );
  }

  return (
    <section className={fontClass}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-medium transition-colors duration-300 ${isDarkMode ? "text-white" : "text-[#303030]"}`}>{t("home.sections.myGroups")}</h2>
        <button
          onClick={onOpenCreate}
          className={`text-sm transition-all active:scale-95 ${isDarkMode ? "text-slate-400 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
        >
          {t("home.actions.createGroup")}
        </button>
      </div>

      {/* Trạng thái rỗng */}
      {groups.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${isDarkMode ? "border-slate-800 bg-slate-900" : "border-gray-200 bg-white"}`}>
          <FolderOpen className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? "text-slate-600" : "text-gray-300"}`} />
          <p className={`text-sm font-medium ${isDarkMode ? "text-slate-300" : "text-gray-700"}`}>{t("home.group.noGroups")}</p>
          <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>{t("home.group.noGroupsDesc")}</p>
          <button
            onClick={onOpenCreate}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2563EB] text-white text-sm font-medium hover:bg-blue-700 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            {t("home.actions.createGroup")}
          </button>
        </div>
      ) : isList ? (
        /* Chế độ xem danh sách */
        <div className={`rounded-2xl border transition-colors duration-300 ${isDarkMode ? "border-slate-800 bg-slate-900" : "border-gray-200 bg-white"}`}>
          <div className={`grid grid-cols-[minmax(240px,2fr)_minmax(140px,0.8fr)_minmax(120px,0.6fr)_minmax(100px,0.5fr)] gap-4 px-4 py-3 text-xs font-semibold ${
            isDarkMode ? "text-slate-500" : "text-gray-500"
          }`}>
            <span>{t("home.table.title")}</span>
            <span>{t("home.table.members")}</span>
            <span>{t("home.table.role")}</span>
            <span />
          </div>
          <div className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-gray-200"}`}>
            {groups.map((group) => (
              <div
                key={group.groupId}
                onClick={() => handleNavigateGroup(group)}
                className={`grid grid-cols-[minmax(240px,2fr)_minmax(140px,0.8fr)_minmax(120px,0.6fr)_minmax(100px,0.5fr)] gap-4 px-4 py-3 text-sm cursor-pointer transition-colors ${
                  isDarkMode ? "text-slate-300 hover:bg-slate-800/50" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? "bg-amber-950/50" : "bg-amber-50"}`}>
                    <Users className={`w-4 h-4 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
                  </div>
                  <span className={`truncate font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>{group.groupName}</span>
                </div>
                <span className={`text-xs truncate flex items-center ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                  {group.memberCount || 0} {t("home.labels.membersUnit")}
                </span>
                <span className={`inline-flex items-center`}>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeClass(group.memberRole)}`}>
                    {getRoleLabel(group.memberRole)}
                  </span>
                </span>
                <span className="flex items-center justify-end">
                  <ExternalLink className={`w-4 h-4 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Chế độ xem lưới */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card tạo nhóm mới */}
          <button
            onClick={onOpenCreate}
            className={`rounded-2xl border-2 border-dashed p-5 flex flex-col items-center justify-center gap-3 min-h-[160px] transition-all active:scale-95 cursor-pointer ${
              isDarkMode
                ? "border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50 text-slate-400"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 text-gray-500"
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}>
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">{t("home.actions.createGroup")}</span>
          </button>

          {groups.map((group) => (
            <div
              key={group.groupId}
              onClick={() => handleNavigateGroup(group)}
              className={`rounded-2xl border p-5 flex items-start gap-4 hover:shadow-sm transition-all overflow-hidden min-h-[160px] cursor-pointer ${
                isDarkMode ? "border-slate-800 bg-slate-900 hover:bg-slate-800/70" : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isDarkMode ? "bg-amber-950/50" : "bg-amber-50"
              }`}>
                <Users className={`w-5 h-5 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold truncate ${isDarkMode ? "text-white" : "text-zinc-900"}`}>{group.groupName}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${getRoleBadgeClass(group.memberRole)}`}>
                    {getRoleLabel(group.memberRole)}
                  </span>
                </div>
                <p className={`text-xs mt-1 truncate ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                  {group.memberCount || 0} {t("home.labels.membersUnit")}
                </p>
                {group.description && (
                  <p className={`text-xs mt-2 truncate ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                    {group.description}
                  </p>
                )}
                {group.topicTitle && (
                  <p className={`text-xs mt-1 truncate ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                    {group.topicTitle}{group.subjectTitle ? ` · ${group.subjectTitle}` : ''}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default UserGroup;

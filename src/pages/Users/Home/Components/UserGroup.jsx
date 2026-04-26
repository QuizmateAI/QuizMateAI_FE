import React, { useState } from "react";
import {
  Crown,
  ExternalLink,
  FolderOpen,
  Globe,
  Lock,
  Plus,
  Search,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import ListSpinner from "@/components/ui/ListSpinner";
import { useNavigateWithLoading } from "@/hooks/useNavigateWithLoading";
import { buildGroupWorkspacePath } from "@/lib/routePaths";

const ROLE_THEMES = {
  LEADER: {
    Icon: Crown,
    strip: "bg-amber-400",
    rowLight: "hover:bg-amber-50/80",
    rowDark: "hover:bg-amber-500/5",
    iconWrapLight: "bg-amber-100 border border-amber-200",
    iconWrapDark: "bg-amber-500/10 border border-amber-400/20",
    iconColorLight: "text-amber-700",
    iconColorDark: "text-amber-300",
    badgeLight: "bg-amber-50 text-amber-700 border border-amber-200",
    badgeDark: "bg-amber-500/10 text-amber-200 border border-amber-400/30",
    metricLight: "bg-white/85 text-amber-800 border border-amber-200/80",
    metricDark: "bg-slate-950/70 text-amber-200 border border-amber-400/20",
    orbLight: "bg-amber-200/80",
    orbDark: "bg-amber-400/15",
    cardBorderLight: "border-amber-200/90 hover:border-amber-300",
    cardBorderDark: "border-amber-400/20 hover:border-amber-300/40",
  },
  CONTRIBUTOR: {
    Icon: Sparkles,
    strip: "bg-cyan-400",
    rowLight: "hover:bg-cyan-50/80",
    rowDark: "hover:bg-cyan-500/5",
    iconWrapLight: "bg-cyan-100 border border-cyan-200",
    iconWrapDark: "bg-cyan-500/10 border border-cyan-400/20",
    iconColorLight: "text-cyan-700",
    iconColorDark: "text-cyan-300",
    badgeLight: "bg-cyan-50 text-cyan-700 border border-cyan-200",
    badgeDark: "bg-cyan-500/10 text-cyan-200 border border-cyan-400/30",
    metricLight: "bg-white/85 text-cyan-800 border border-cyan-200/80",
    metricDark: "bg-slate-950/70 text-cyan-200 border border-cyan-400/20",
    orbLight: "bg-cyan-200/80",
    orbDark: "bg-cyan-400/15",
    cardBorderLight: "border-cyan-200/90 hover:border-cyan-300",
    cardBorderDark: "border-cyan-400/20 hover:border-cyan-300/40",
  },
  MEMBER: {
    Icon: Shield,
    strip: "bg-emerald-400",
    rowLight: "hover:bg-emerald-50/80",
    rowDark: "hover:bg-emerald-500/5",
    iconWrapLight: "bg-emerald-100 border border-emerald-200",
    iconWrapDark: "bg-emerald-500/10 border border-emerald-400/20",
    iconColorLight: "text-emerald-700",
    iconColorDark: "text-emerald-300",
    badgeLight: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    badgeDark: "bg-emerald-500/10 text-emerald-200 border border-emerald-400/30",
    metricLight: "bg-white/85 text-emerald-800 border border-emerald-200/80",
    metricDark: "bg-slate-950/70 text-emerald-200 border border-emerald-400/20",
    orbLight: "bg-emerald-200/80",
    orbDark: "bg-emerald-400/15",
    cardBorderLight: "border-emerald-200/90 hover:border-emerald-300",
    cardBorderDark: "border-emerald-400/20 hover:border-emerald-300/40",
  },
};

const getNormalizedRole = (role) => {
  const normalizedRole = String(role || "MEMBER").toUpperCase();
  return ROLE_THEMES[normalizedRole] ? normalizedRole : "MEMBER";
};

const getRoleLabel = (role, t) => {
  const normalizedRole = getNormalizedRole(role);
  if (normalizedRole === "LEADER") return t("home.group.leader");
  if (normalizedRole === "CONTRIBUTOR") return t("home.group.contributor");
  return t("home.group.member");
};

const getGroupTitle = (group, currentLang) =>
  group?.displayTitle ||
  group?.groupName ||
  group?.name ||
  (currentLang === "en" ? "Untitled group" : "Nhóm chưa có tên");

const formatDateLabel = (value, currentLang) => {
  if (!value) return null;

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(currentLang === "en" ? "en-US" : "vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

export function GroupFilterControls({ searchQuery, onSearchQueryChange, isDarkMode }) {
  const { t } = useTranslation();

  return (
    <div className="relative w-full sm:w-80">
      <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
      <input
        type="text"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        placeholder={t("home.search.groupPlaceholder")}
        className={`h-10 w-full rounded-xl border pl-9 pr-9 text-sm outline-none transition-colors ${
          isDarkMode
            ? "border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:border-blue-500"
            : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
        }`}
      />
      {searchQuery ? (
        <button
          type="button"
          onClick={() => onSearchQueryChange("")}
          className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg transition-colors ${
            isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          }`}
          aria-label={t("home.search.clear")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function UserGroup({
  viewMode,
  isDarkMode,
  groups = [],
  loading,
  onOpenCreate,
  searchQuery: controlledSearchQuery,
  onSearchQueryChange,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const currentLang = i18n.language === "en" ? "en" : "vi";
  const navigate = useNavigateWithLoading();
  const isList = viewMode === "list";
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const searchQuery = controlledSearchQuery ?? internalSearchQuery;
  const setSearchQuery = onSearchQueryChange ?? setInternalSearchQuery;

  const filteredGroups = searchQuery.trim()
    ? groups.filter((group) => {
        const q = searchQuery.toLowerCase();
        const searchableText = [
          getGroupTitle(group, currentLang),
          group?.topicName,
          group?.topicTitle,
          group?.fieldName,
          group?.memberRole,
          getRoleLabel(group?.memberRole, t),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(q);
      })
    : groups;

  const handleNavigateGroup = (group) => {
    navigate(buildGroupWorkspacePath(group.workspaceId));
  };

  const renderMetaPill = (theme, content, className = "") => (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium ${className} ${
        isDarkMode ? theme.metricDark : theme.metricLight
      }`}
    >
      {content}
    </span>
  );

  if (loading) {
    return (
      <section className={fontClass}>
        <ListSpinner variant="section" />
      </section>
    );
  }

  return (
    <section className={fontClass}>
      {filteredGroups.length === 0 && groups.length === 0 ? (
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
        <div className={`rounded-3xl border transition-colors duration-300 overflow-hidden ${isDarkMode ? "border-slate-800 bg-slate-900" : "border-gray-200 bg-white"}`}>
          <div className={`grid grid-cols-[minmax(260px,2fr)_minmax(140px,0.9fr)_minmax(120px,0.7fr)_minmax(100px,0.7fr)_minmax(90px,auto)_40px] gap-4 px-5 py-3 text-xs font-semibold ${
            isDarkMode ? "text-slate-500" : "text-gray-500"
          }`}>
            <span>{t("home.table.title")}</span>
            <span>{t("home.table.role")}</span>
            <span>{t("home.group.members")}</span>
            <span>{t("home.table.created")}</span>
            <span>{currentLang === "en" ? "Visibility" : "Hiển thị"}</span>
            <span />
          </div>
          <div className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-gray-200"}`}>
            {filteredGroups.length === 0 && searchQuery && (
              <div className={`px-4 py-8 text-center ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{t("home.search.noResults")}</p>
              </div>
            )}

            {filteredGroups.map((group) => {
              const normalizedRole = getNormalizedRole(group.memberRole);
              const theme = ROLE_THEMES[normalizedRole];
              const RoleIcon = theme.Icon;
              const roleLabel = getRoleLabel(group.memberRole, t);
              const createdAtLabel = formatDateLabel(group.joinedAt || group.createdAt, currentLang) || "—";

              return (
                <div
                  key={group.workspaceId}
                  onClick={() => handleNavigateGroup(group)}
                  className={`relative grid grid-cols-[minmax(260px,2fr)_minmax(140px,0.9fr)_minmax(120px,0.7fr)_minmax(100px,0.7fr)_minmax(90px,auto)_40px] gap-4 px-5 py-4 text-sm cursor-pointer transition-colors ${
                    isDarkMode ? `text-slate-300 ${theme.rowDark}` : `text-gray-700 ${theme.rowLight}`
                  }`}
                >
                  <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${theme.strip}`} />

                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      isDarkMode ? theme.iconWrapDark : theme.iconWrapLight
                    }`}>
                      <RoleIcon className={`w-5 h-5 ${isDarkMode ? theme.iconColorDark : theme.iconColorLight}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate font-semibold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                        {getGroupTitle(group, currentLang)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                      isDarkMode ? theme.badgeDark : theme.badgeLight
                    }`}>
                      {roleLabel}
                    </span>
                  </div>

                  <span className={`flex items-center text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                    {group.memberCount ?? 0} {t("home.labels.membersUnit")}
                  </span>

                  <span className={`flex items-center text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                    {createdAtLabel}
                  </span>

                  <span className="flex items-center">
                    {group.isPublic !== undefined && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                          group.isPublic
                            ? (isDarkMode
                                ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-300"
                                : "bg-emerald-50 border-emerald-200 text-emerald-700")
                            : (isDarkMode
                                ? "bg-slate-800 border-slate-700 text-slate-400"
                                : "bg-gray-50 border-gray-200 text-gray-500")
                        }`}
                      >
                        {group.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {group.isPublic
                          ? (currentLang === "en" ? "Public" : "Công khai")
                          : (currentLang === "en" ? "Private" : "Riêng tư")}
                      </span>
                    )}
                  </span>

                  <span className="flex items-center justify-end gap-2">
                    <ExternalLink className={`w-4 h-4 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <button
            onClick={onOpenCreate}
            className={`rounded-[28px] border-2 border-dashed p-5 flex flex-col items-center justify-center gap-3 min-h-[190px] transition-all active:scale-95 cursor-pointer ${
              isDarkMode
                ? "border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50 text-slate-400"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 text-gray-500"
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDarkMode ? "bg-slate-800" : "bg-gray-100"}`}>
              <Plus className="w-5 h-5" />
            </div>
          </button>

          {filteredGroups.length === 0 && searchQuery && (
            <div className={`col-span-full flex flex-col items-center justify-center py-12 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">{t("home.search.noResults")}</p>
            </div>
          )}

          {filteredGroups.map((group) => {
            const normalizedRole = getNormalizedRole(group.memberRole);
            const theme = ROLE_THEMES[normalizedRole];
            const RoleIcon = theme.Icon;
            const roleLabel = getRoleLabel(group.memberRole, t);
            const joinedDate = formatDateLabel(group.joinedAt || group.createdAt, currentLang);

            return (
              <div
                key={group.workspaceId}
                onClick={() => handleNavigateGroup(group)}
                className={`relative rounded-[28px] border py-5 pl-7 pr-5 overflow-hidden min-h-[132px] cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
                  isDarkMode
                    ? `bg-slate-900 ${theme.cardBorderDark}`
                    : `bg-white ${theme.cardBorderLight} shadow-[0_18px_45px_-38px_rgba(15,23,42,0.35)]`
                }`}
              >
                <div className={`absolute inset-x-0 top-0 h-1 ${theme.strip}`} />
                <div className={`absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl ${isDarkMode ? theme.orbDark : theme.orbLight}`} />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isDarkMode ? theme.iconWrapDark : theme.iconWrapLight
                    }`}>
                      <RoleIcon className={`w-5 h-5 ${isDarkMode ? theme.iconColorDark : theme.iconColorLight}`} />
                    </div>
                    <p className={`min-w-0 truncate text-base font-semibold ${isDarkMode ? "text-white" : "text-slate-900"}`}>
                      {getGroupTitle(group, currentLang)}
                    </p>
                  </div>
                </div>

                <div className="relative mt-5 grid max-w-[14rem] grid-cols-2 items-center gap-2">
                  <div>
                    {renderMetaPill(
                      theme,
                      <>
                        <Users className="w-3.5 h-3.5" />
                        <span>
                          {group.memberCount ?? 0} {t("home.labels.membersUnit")}
                        </span>
                      </>,
                      "w-full"
                    )}
                  </div>

                  <div>
                    {joinedDate ? (
                      renderMetaPill(
                        theme,
                        <span>{joinedDate}</span>,
                        "w-full"
                      )
                    ) : null}
                  </div>

                  <div>
                    <span className={`inline-flex w-full items-center rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                      isDarkMode ? theme.badgeDark : theme.badgeLight
                    }`}>
                      {roleLabel}
                    </span>
                  </div>

                  <div>
                    {group.isPublic !== undefined && (
                      <span
                        className={`inline-flex w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium border ${
                          group.isPublic
                            ? (isDarkMode
                                ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-300"
                                : "bg-emerald-50 border-emerald-200 text-emerald-700")
                            : (isDarkMode
                                ? "bg-slate-800 border-slate-700 text-slate-400"
                                : "bg-gray-50 border-gray-200 text-gray-500")
                        }`}
                      >
                        {group.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {group.isPublic
                          ? (currentLang === "en" ? "Public" : "Công khai")
                        : (currentLang === "en" ? "Private" : "Riêng tư")}
                      </span>
                    )}
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

export default UserGroup;

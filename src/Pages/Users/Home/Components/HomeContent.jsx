
import React, { useState, useRef, useEffect } from "react";
import { MoreVertical, Pencil, Trash2, FolderOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import ListSpinner from "@/Components/ui/ListSpinner";
import { useNavigateWithLoading } from "@/hooks/useNavigateWithLoading";

// Hiển thị ngày tạo workspace theo locale
function formatDate(dateAt, locale = "vi-VN") {
  if (!dateAt) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateAt));
}

// Gán màu card theo vòng lặp
function getCardColor(index, isDark) {
  const colors = [
    { light: "bg-green-50", dark: "bg-green-950/60" },
    { light: "bg-orange-50", dark: "bg-orange-950/60" },
    { light: "bg-blue-50", dark: "bg-blue-950/60" },
  ];
  const c = colors[index % colors.length];
  return isDark ? c.dark : c.light;
}

// Menu dropdown cho workspace card
function CardMenu({ onEdit, onDelete, isDarkMode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Logic nghiệp vụ: đóng menu khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p); }}
        className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/5 rounded-full"
      >
        <MoreVertical className={`w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-600"}`} />
      </button>
      {open && (
        <div className={`absolute right-0 top-8 z-20 w-36 rounded-lg border shadow-lg py-1 ${isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`}>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-50"}`}
          >
            <Pencil className="w-3.5 h-3.5" />
            {t("home.workspace.edit")}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t("home.workspace.delete")}
          </button>
        </div>
      )}
    </div>
  );
}

function HomeContent({ viewMode, isDarkMode, workspaces, loading, onOpenEdit, onOpenDelete }) {
  const navigate = useNavigateWithLoading();
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";
  const untitledTitle = t("home.workspace.untitledTitle");
  const noDescription = t("home.workspace.noDescription");
  const workspaceList = Array.isArray(workspaces) ? workspaces : [];

  const isList = viewMode === "list";

  // Logic nghiệp vụ: hiển thị 5 workspace gần nhất
  const recentWorkspaces = [...workspaceList]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className={`space-y-10 ${fontClass}`}>
      {/* Section: Workspace gần đây */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`text-xl font-medium transition-colors duration-300 ${isDarkMode ? "text-white" : "text-[#303030]"}`}>
            {t("home.sections.recent")}
          </h2>
        </div>

        {loading ? (
          <ListSpinner variant="section" />
        ) : recentWorkspaces.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-16 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
            <FolderOpen className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">{t("home.workspace.noWorkspaces")}</p>
            <p className="text-xs mt-1">{t("home.workspace.noWorkspacesDesc")}</p>
          </div>
        ) : isList ? (
          <div className={`rounded-2xl border transition-colors duration-300 ${isDarkMode ? "border-slate-800 bg-slate-900" : "border-gray-200 bg-white"}`}>
            <div className={`grid grid-cols-[minmax(260px,2fr)_minmax(220px,1.2fr)_minmax(140px,0.8fr)_minmax(100px,0.5fr)_40px] gap-4 px-4 py-3 text-xs font-semibold ${
              isDarkMode ? "text-slate-500" : "text-gray-500"
            }`}>
              <span>{t("home.table.title")}</span>
              <span>{t("home.workspace.descriptionLabel")}</span>
              <span>{t("home.table.created")}</span>
              <span>{t("home.workspace.status")}</span>
              <span />
            </div>
            <div className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-gray-200"}`}>
              {recentWorkspaces.map((ws) => (
                <div
                  key={ws.workspaceId}
                  onClick={() => navigate(`/workspace/${ws.workspaceId}`)}
                  className={`grid grid-cols-[minmax(260px,2fr)_minmax(220px,1.2fr)_minmax(140px,0.8fr)_minmax(100px,0.5fr)_40px] gap-4 px-4 py-3 text-sm cursor-pointer group transition-colors ${
                    isDarkMode ? "text-slate-300 hover:bg-slate-800/50" : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">📝</span>
                    <span className={`truncate font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>{ws.displayTitle ?? ws.title ?? ws.name ?? untitledTitle}</span>
                  </div>
                  <span className={`text-xs truncate ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{ws.description || noDescription}</span>
                  <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{formatDate(ws.createdAt, locale)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${
                    ws.status === "ACTIVE"
                      ? isDarkMode ? "bg-green-950/50 text-green-400" : "bg-green-50 text-green-700"
                      : isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"
                  }`}>{ws.status}</span>
                  <CardMenu isDarkMode={isDarkMode} onEdit={() => onOpenEdit(ws)} onDelete={() => onOpenDelete(ws)} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {recentWorkspaces.map((ws, idx) => {
              const cardBg = getCardColor(idx, isDarkMode);
              return (
                <div
                  key={ws.workspaceId}
                  onClick={() => navigate(`/workspace/${ws.workspaceId}`)}
                  className={`${cardBg} rounded-xl h-56 p-5 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between relative group border ${
                    isDarkMode ? "border-slate-800" : "border-gray-200"
                  } overflow-hidden`}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-3xl shrink-0">📝</div>
                    <CardMenu isDarkMode={isDarkMode} onEdit={() => onOpenEdit(ws)} onDelete={() => onOpenDelete(ws)} />
                  </div>

                  <div className="flex-1 min-w-0 mt-2">
                    <h3 className={`font-medium text-base line-clamp-2 leading-snug ${isDarkMode ? "text-white" : "text-[#1F1F1F]"}`}>
                      {ws.displayTitle ?? ws.title ?? ws.name ?? untitledTitle}
                    </h3>
                    <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{ws.description || noDescription}</p>
                    <div className={`text-xs mt-1 flex items-center gap-2 ${isDarkMode ? "text-slate-500" : "text-gray-500"}`}>
                      <span className="truncate">{ws.subject?.title}</span>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between text-sm mt-3 pt-3 border-t ${
                    isDarkMode ? "text-slate-400 border-slate-700/50" : "text-gray-600 border-gray-200/50"
                  }`}>
                    <span className="text-xs truncate">{formatDate(ws.createdAt, locale)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      ws.status === "ACTIVE"
                        ? isDarkMode ? "bg-green-950/50 text-green-400" : "bg-green-100 text-green-700"
                        : isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"
                    }`}>{ws.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default HomeContent;

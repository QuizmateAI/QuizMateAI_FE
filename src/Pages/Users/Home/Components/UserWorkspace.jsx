import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { MoreVertical, Plus, Pencil, Trash2, Loader2, FolderOpen, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import Pagination from "./Pagination";
import ListSpinner from "@/Components/ui/ListSpinner";
import { useNavigateWithLoading } from "@/hooks/useNavigateWithLoading";

const DEFAULT_UNTITLED = "Không gian không có tiêu đề";

// Bổ sung displayTitle cho workspace không có tiêu đề: đầu tiên = "Không gian không có tiêu đề", thứ 2 = "(1)", thứ 3 = "(2)"...
function enrichWorkspacesWithDisplayTitle(workspaces) {
  const list = Array.isArray(workspaces) ? [...workspaces] : [];
  const untitled = list.filter((ws) => {
    const t = ws.title;
    return !t || (typeof t === "string" && t.trim() === "") || t === DEFAULT_UNTITLED;
  });
  untitled.sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime();
    const db = new Date(b.createdAt || 0).getTime();
    if (da !== db) return da - db;
    return (a.workspaceId || 0) - (b.workspaceId || 0);
  });
  const displayTitleMap = {};
  untitled.forEach((ws, idx) => {
    displayTitleMap[ws.workspaceId] = idx === 0 ? DEFAULT_UNTITLED : `${DEFAULT_UNTITLED} (${idx})`;
  });
  return list.map((ws) => ({
    ...ws,
    displayTitle: displayTitleMap[ws.workspaceId] ?? ws.displayTitle ?? ws.title ?? DEFAULT_UNTITLED,
  }));
}

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

// Menu dropdown cho mỗi workspace card - memo để tránh re-render không cần thiết
const WorkspaceMenu = memo(function WorkspaceMenu({ onEdit, onDelete, isDarkMode }) {
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
        <div
          className={`absolute right-0 top-8 z-20 w-36 rounded-lg border shadow-lg py-1 ${
            isDarkMode ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"
          }`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(); }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
              isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-50"
            }`}
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
});

// Card workspace - memo để tối ưu render khi list thay đổi
const WorkspaceCard = memo(function WorkspaceCard({ ws, idx, isDarkMode, onEdit, onDelete, locale }) {
  const navigate = useNavigateWithLoading();
  const cardBg = getCardColor(idx, isDarkMode);
  return (
    <div
      onClick={() => navigate(`/workspace/${ws.workspaceId}`)}
      className={`${cardBg} rounded-xl h-56 p-5 cursor-pointer hover:shadow-md transition-all flex flex-col justify-between relative group border ${
        isDarkMode ? "border-slate-800" : "border-gray-200"
      } overflow-hidden`}
    >
      <div className="flex items-start justify-between">
        <div className="text-3xl shrink-0">📝</div>
        <WorkspaceMenu isDarkMode={isDarkMode} onEdit={() => onEdit(ws)} onDelete={() => onDelete(ws)} />
      </div>
      <div className="flex-1 min-w-0 mt-2">
        <h3 className={`font-medium text-base line-clamp-2 leading-snug ${isDarkMode ? "text-white" : "text-[#1F1F1F]"}`}>
          {ws.displayTitle ?? ws.title ?? 'Không gian không có tiêu đề'}
        </h3>
        <p className={`text-xs mt-1 line-clamp-2 ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
          {ws.description || ws.topic?.title || '—'}
        </p>
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
        }`}>
          {ws.status}
        </span>
      </div>
    </div>
  );
});

function UserWorkspace({ viewMode, isDarkMode, workspaces, loading, pagination, onPageChange, onPageSizeChange, onOpenCreate, onOpenEdit, onOpenDelete }) {
  const navigate = useNavigateWithLoading();
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";
  const [searchQuery, setSearchQuery] = useState("");

  // Bổ sung displayTitle cho workspace không có tiêu đề (đánh số 1, 2, 3...)
  const enrichedWorkspaces = useMemo(() => enrichWorkspacesWithDisplayTitle(workspaces), [workspaces]);
  const workspaceList = enrichedWorkspaces;

  const isList = viewMode === "list";
  // Sắp xếp theo ngày tạo mới nhất
  const allSorted = useMemo(
    () => [...enrichedWorkspaces].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [enrichedWorkspaces]
  );

  // Lọc theo từ khóa tìm kiếm (dùng displayTitle cho workspace không có tiêu đề)
  const getDisplayTitle = (ws) => ws.displayTitle ?? ws.title ?? DEFAULT_UNTITLED;
  const sorted = searchQuery.trim()
    ? allSorted.filter((ws) =>
        getDisplayTitle(ws).toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.topic?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ws.subject?.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allSorted;

  // Thông tin pagination mặc định nếu không có
  const paginationInfo = pagination || { page: 0, size: 10, totalPages: 0, totalElements: 0 };

  // Trạng thái loading
  if (loading) {
    return (
      <section className={fontClass}>
        <h2 className={`text-xl font-medium mb-4 transition-colors duration-300 ${isDarkMode ? "text-white" : "text-[#303030]"}`}>
          {t("home.sections.myWorkspaces")}
        </h2>
        <ListSpinner variant="section" />
      </section>
    );
  }

  return (
    <section className={fontClass}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xl font-medium transition-colors duration-300 ${isDarkMode ? "text-white" : "text-[#303030]"}`}>
          {t("home.sections.myWorkspaces")}
        </h2>
      </div>

      {/* Thanh tìm kiếm */}
      <div className="mb-4">
        <div className={`relative max-w-md`}>
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("home.search.workspacePlaceholder")}
            className={`w-full pl-9 pr-9 py-2 rounded-xl text-sm border transition-colors outline-none ${isDarkMode
              ? "bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
              : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${isDarkMode ? "text-slate-400 hover:text-white" : "text-gray-400 hover:text-gray-700"}`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isList ? (
        <>
          <div className={`rounded-2xl border transition-colors duration-300 ${isDarkMode ? "border-slate-800 bg-slate-900" : "border-gray-200 bg-white"}`}>
            <div className={`grid grid-cols-[minmax(240px,2fr)_minmax(120px,0.8fr)_minmax(120px,0.8fr)_minmax(140px,0.8fr)_minmax(100px,0.5fr)_40px] gap-4 px-4 py-3 text-xs font-semibold ${
              isDarkMode ? "text-slate-500" : "text-gray-500"
            }`}>
              <span>{t("home.table.title")}</span>
              <span>{t("home.workspace.topic")}</span>
              <span>{t("home.workspace.subject")}</span>
              <span>{t("home.table.created")}</span>
              <span>{t("home.workspace.status")}</span>
              <span />
            </div>

            {sorted.length === 0 ? (
              <div className={`px-4 py-10 text-center ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{t("home.workspace.noWorkspaces")}</p>
                <p className="text-xs mt-1">{t("home.workspace.noWorkspacesDesc")}</p>
              </div>
            ) : (
              <div className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-gray-200"}`}>
                {sorted.map((ws) => (
                  <div
                    key={ws.workspaceId}
                    onClick={() => navigate(`/workspace/${ws.workspaceId}`)}
                    className={`grid grid-cols-[minmax(240px,2fr)_minmax(120px,0.8fr)_minmax(120px,0.8fr)_minmax(140px,0.8fr)_minmax(100px,0.5fr)_40px] gap-4 px-4 py-3 text-sm cursor-pointer group transition-colors ${
                      isDarkMode ? "text-slate-300 hover:bg-slate-800/50" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">📝</span>
                      <span className={`truncate font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>{ws.displayTitle ?? ws.title ?? 'Không gian không có tiêu đề'}</span>
                    </div>
                    <span className={`text-xs truncate ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{ws.description || ws.topic?.title || "—"}</span>
                    <span className={`text-xs truncate ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{ws.subject?.title || "—"}</span>
                    <span className={`text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>{formatDate(ws.createdAt, locale)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${
                      ws.status === "ACTIVE"
                        ? isDarkMode ? "bg-green-950/50 text-green-400" : "bg-green-50 text-green-700"
                        : isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"
                    }`}>
                      {ws.status}
                    </span>
                    <WorkspaceMenu
                      isDarkMode={isDarkMode}
                      onEdit={() => onOpenEdit(ws)}
                      onDelete={() => onOpenDelete(ws)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination cho list view */}
          {sorted.length > 0 && (
            <Pagination
              currentPage={paginationInfo.page}
              totalPages={paginationInfo.totalPages}
              totalElements={paginationInfo.totalElements}
              pageSize={paginationInfo.size}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              isDarkMode={isDarkMode}
            />
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Card tạo workspace mới */}
          <div
            className={`rounded-xl border-2 border-dashed h-56 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all overflow-hidden ${
              isDarkMode
                ? "border-slate-700 hover:border-blue-500 hover:bg-blue-950/30"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50/50"
            }`}
            onClick={onOpenCreate}
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

          {sorted.length === 0 && (
            <div className={`col-span-full flex flex-col items-center justify-center py-16 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              <FolderOpen className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">{t("home.workspace.noWorkspaces")}</p>
              <p className="text-xs mt-1">{t("home.workspace.noWorkspacesDesc")}</p>
            </div>
          )}

          {sorted.map((ws, idx) => (
            <WorkspaceCard
              key={ws.workspaceId}
              ws={ws}
              idx={idx}
              isDarkMode={isDarkMode}
              onEdit={onOpenEdit}
              onDelete={onOpenDelete}
              locale={locale}
            />
          ))}
          </div>

          {/* Pagination cho grid view */}
          {sorted.length > 0 && (
            <Pagination
              currentPage={paginationInfo.page}
              totalPages={paginationInfo.totalPages}
              totalElements={paginationInfo.totalElements}
              pageSize={paginationInfo.size}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              isDarkMode={isDarkMode}
            />
          )}
        </>
      )}
    </section>
  );
}

export default UserWorkspace;

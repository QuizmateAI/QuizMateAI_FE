import React, { useState, useRef, useEffect, memo, useMemo, useCallback } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import Pagination from "./Pagination";
import ListSpinner from "@/Components/ui/ListSpinner";
import { useNavigateWithLoading } from "@/hooks/useNavigateWithLoading";
import { preloadWorkspacePage } from "@/lib/routeLoaders";
import { buildWorkspacePath } from "@/lib/routePaths";

function enrichWorkspacesWithDisplayTitle(workspaces, untitledTitle) {
  const list = Array.isArray(workspaces) ? [...workspaces] : [];
  const untitledCandidates = ["Untitled workspace", "Không gian không có tiêu đề", "name null", untitledTitle]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  const untitled = list.filter((ws) => {
    const title = ws.title || ws.name;
    if (!title || (typeof title === "string" && title.trim() === "")) return true;
    return typeof title === "string" && untitledCandidates.includes(title.trim().toLowerCase());
  });

  untitled.sort((a, b) => {
    const left = toTimestamp(a.createdAt);
    const right = toTimestamp(b.createdAt);
    if (left !== right) return left - right;
    return (a.workspaceId || 0) - (b.workspaceId || 0);
  });

  const displayTitleMap = {};
  untitled.forEach((ws, idx) => {
    displayTitleMap[ws.workspaceId] = idx === 0 ? untitledTitle : `${untitledTitle} (${idx})`;
  });

  return list.map((ws) => ({
    ...ws,
    displayTitle: displayTitleMap[ws.workspaceId] ?? ws.displayTitle ?? ws.title ?? ws.name ?? untitledTitle,
  }));
}

function toTimestamp(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatDate(dateAt, locale = "vi-VN") {
  if (!dateAt) return "";
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateAt));
  } catch {
    return "";
  }
}

function getDisplayTitle(ws, fallback) {
  return ws?.displayTitle ?? ws?.title ?? ws?.name ?? fallback;
}

function getRecentSortTime(ws) {
  return toTimestamp(ws?.lastAccessedAt || ws?.createdAt);
}

function compareWorkspaces(sortMode) {
  return (left, right) => {
    const leftTime = sortMode === "created" ? toTimestamp(left?.createdAt) : getRecentSortTime(left);
    const rightTime = sortMode === "created" ? toTimestamp(right?.createdAt) : getRecentSortTime(right);
    if (rightTime !== leftTime) return rightTime - leftTime;
    return (right?.workspaceId || 0) - (left?.workspaceId || 0);
  };
}

const WORKSPACE_ACCENTS = [
  {
    bar: "bg-blue-500",
    header: "border-blue-200 bg-blue-100/70 dark:border-blue-800/70 dark:bg-blue-900/35",
    hover: "hover:border-blue-300 dark:hover:border-blue-500",
    source: "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200",
  },
  {
    bar: "bg-emerald-500",
    header: "border-emerald-200 bg-emerald-100/70 dark:border-emerald-800/70 dark:bg-emerald-900/35",
    hover: "hover:border-emerald-300 dark:hover:border-emerald-500",
    source: "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200",
  },
  {
    bar: "bg-amber-500",
    header: "border-amber-200 bg-amber-100/70 dark:border-amber-800/70 dark:bg-amber-900/35",
    hover: "hover:border-amber-300 dark:hover:border-amber-500",
    source: "border-amber-100 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200",
  },
  {
    bar: "bg-rose-500",
    header: "border-rose-200 bg-rose-100/70 dark:border-rose-800/70 dark:bg-rose-900/35",
    hover: "hover:border-rose-300 dark:hover:border-rose-500",
    source: "border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200",
  },
];

function getWorkspaceAccent(ws) {
  const id = Number(ws?.workspaceId);
  const index = Number.isInteger(id) && id > 0 ? id % WORKSPACE_ACCENTS.length : 0;
  return WORKSPACE_ACCENTS[index];
}

function getMetadataChipClass(key, isDarkMode) {
  if (key === "knowledge") {
    return isDarkMode
      ? "border-blue-900/60 bg-blue-950/30 text-blue-100"
      : "border-blue-100 bg-blue-50 text-blue-800";
  }
  return isDarkMode
    ? "border-emerald-900/60 bg-emerald-950/30 text-emerald-100"
    : "border-emerald-100 bg-emerald-50 text-emerald-800";
}

function cleanText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function getWorkspaceMetadata(ws) {
  return getWorkspaceMetadataParts(ws).map((item) => item.value).join(" • ");
}

function getWorkspaceMetadataParts(ws) {
  const knowledge = cleanText(ws?.knowledge ?? ws?.customKnowledge);
  const domain = cleanText(ws?.domain ?? ws?.customDomain);
  return [
    knowledge ? { key: "knowledge", value: knowledge } : null,
    domain ? { key: "domain", value: domain } : null,
  ].filter(Boolean);
}

function getSourceCount(ws) {
  const count = Number(ws?.sourceCount ?? ws?.materialCount ?? ws?.materialsCount ?? 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

function formatSourceCount(ws, t) {
  const count = getSourceCount(ws);
  return count > 0 ? t("home.workspace.sourceCount", { count }) : "";
}

const WorkspaceMenu = memo(function WorkspaceMenu({ onEdit, onDelete, onShare, isDarkMode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const itemClass = `w-full px-3 py-2 text-left text-sm transition-colors ${
    isDarkMode ? "text-slate-300 hover:bg-slate-800" : "text-gray-700 hover:bg-gray-50"
  }`;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={`h-8 min-w-8 rounded-lg px-2 text-sm font-semibold transition-colors ${
          isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-100"
        }`}
        aria-label={t("home.workspace.actions")}
      >
        ...
      </button>
      {open ? (
        <div
          className={`absolute right-0 top-8 z-20 w-36 rounded-lg border py-1 shadow-lg ${
            isDarkMode ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"
          }`}
        >
          {typeof onShare === "function" ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                onShare();
              }}
              className={itemClass}
            >
              {t("home.actions.share")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              onEdit();
            }}
            className={itemClass}
          >
            {t("home.workspace.edit")}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setOpen(false);
              onDelete();
            }}
            className="w-full px-3 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            {t("home.workspace.delete")}
          </button>
        </div>
      ) : null}
    </div>
  );
});

const SortDropdown = memo(function SortDropdown({ value, onChange, isDarkMode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const options = [
    { value: "recent", label: t("home.workspace.sortRecent") },
    { value: "created", label: t("home.workspace.sortCreated") },
  ];
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={dropdownRef} className="relative z-30 w-full sm:w-44">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex h-10 w-full items-center justify-between rounded-xl border px-3 text-sm font-medium shadow-sm transition-colors ${
          isDarkMode
            ? "border-slate-700 bg-slate-900 text-slate-100 hover:border-blue-500"
            : "border-gray-200 bg-white text-gray-800 hover:border-blue-300"
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown className={`ml-3 h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          role="listbox"
          className={`absolute right-0 top-11 z-40 w-full overflow-hidden rounded-xl border p-1 shadow-xl ${
            isDarkMode ? "border-slate-700 bg-slate-900" : "border-gray-200 bg-white"
          }`}
        >
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selected
                    ? isDarkMode
                      ? "bg-blue-950/50 text-blue-200"
                      : "bg-blue-50 text-blue-700"
                    : isDarkMode
                      ? "text-slate-300 hover:bg-slate-800"
                      : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
});

export const WorkspaceFilterControls = memo(function WorkspaceFilterControls({
  searchQuery,
  onSearchQueryChange,
  sortMode,
  onSortModeChange,
  isDarkMode,
}) {
  const { t } = useTranslation();

  const searchClass = `h-10 w-full rounded-xl border pl-9 pr-9 text-sm outline-none transition-colors ${
    isDarkMode
      ? "border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:border-blue-500"
      : "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-500"
  }`;

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <div className="relative w-full sm:w-80">
        <Search className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
          isDarkMode ? "text-slate-500" : "text-gray-400"
        }`} />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={t("home.search.workspacePlaceholder")}
          className={searchClass}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => onSearchQueryChange("")}
            className={`absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg ${
              isDarkMode ? "text-slate-400 hover:bg-slate-800 hover:text-white" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            }`}
            aria-label={t("home.search.clear")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <SortDropdown
        value={sortMode}
        onChange={onSortModeChange}
        isDarkMode={isDarkMode}
      />
    </div>
  );
});

const WorkspaceCard = memo(function WorkspaceCard({
  ws,
  isDarkMode,
  onEdit,
  onDelete,
  onShare,
  locale,
  untitledTitle,
  onOpenWorkspace,
  onPrefetchWorkspace,
}) {
  const { t } = useTranslation();
  const title = getDisplayTitle(ws, untitledTitle);
  const metadataParts = getWorkspaceMetadataParts(ws);
  const sourceLabel = formatSourceCount(ws, t);
  const createdAt = formatDate(ws.createdAt, locale);
  const accent = getWorkspaceAccent(ws);

  return (
    <article
      onClick={() => onOpenWorkspace(ws.workspaceId)}
      onMouseEnter={onPrefetchWorkspace}
      onFocus={onPrefetchWorkspace}
      onTouchStart={onPrefetchWorkspace}
      className={`group relative h-56 cursor-pointer overflow-hidden rounded-xl border transition-all hover:shadow-md ${accent.hover} ${
        isDarkMode ? "border-slate-800 bg-slate-900" : "border-gray-200 bg-white"
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-[70px] border-b px-5 pt-4 ${accent.header}`}>
        <div className={`absolute inset-x-0 top-0 h-1 ${accent.bar}`} />
        <div className="flex items-start justify-between gap-3">
          <h3 className={`line-clamp-2 h-[44px] min-w-0 flex-1 text-base font-semibold leading-snug ${isDarkMode ? "text-white" : "text-[#1F1F1F]"}`}>
            {title}
          </h3>
          <WorkspaceMenu
            isDarkMode={isDarkMode}
            onEdit={() => onEdit(ws)}
            onDelete={() => onDelete(ws)}
            onShare={typeof onShare === "function" ? () => onShare(ws) : null}
          />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[60px] top-[70px] flex min-w-0 flex-col justify-center px-5 py-4">
        {metadataParts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {metadataParts.map((item) => (
              <span
                key={item.key}
                className={`max-w-full rounded-md border px-2.5 py-1.5 text-xs ${
                  getMetadataChipClass(item.key, isDarkMode)
                }`}
              >
                <span className="break-words">{item.value}</span>
              </span>
            ))}
          </div>
        ) : null}
        {sourceLabel ? (
          <div className={`mt-3 inline-flex self-start rounded-md border px-2.5 py-1 text-xs font-semibold ${accent.source}`}>
            {sourceLabel}
          </div>
        ) : null}
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 flex h-[60px] items-center justify-between gap-3 border-t px-5 py-4 text-xs ${
          isDarkMode ? "border-slate-700 text-slate-400" : "border-gray-300 text-gray-600"
        }`}
      >
        <span className="truncate">
          {createdAt ? `${t("home.workspace.created")}: ${createdAt}` : ""}
        </span>
      </div>
    </article>
  );
});

function CreateWorkspaceCard({ isDarkMode, onOpenCreate, onPrefetchWorkspace }) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className={`flex h-56 flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center transition-colors ${
        isDarkMode
          ? "border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-500"
          : "border-gray-300 bg-white text-gray-800 hover:border-blue-500"
      }`}
      onClick={onOpenCreate}
      onMouseEnter={onPrefetchWorkspace}
      onFocus={onPrefetchWorkspace}
      onTouchStart={onPrefetchWorkspace}
    >
      <span className={`mb-5 flex h-16 w-16 items-center justify-center rounded-full border ${
        isDarkMode ? "border-slate-700 text-slate-300" : "border-gray-300 text-gray-600"
      }`}>
        <span className="text-3xl leading-none">+</span>
      </span>
      <span className="text-base font-semibold">{t("home.actions.createWorkspace")}</span>
      <span className={`mt-3 text-xs ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
        {t("home.workspace.createHint")}
      </span>
    </button>
  );
}

function UserWorkspace({
  viewMode,
  isDarkMode,
  workspaces,
  loading,
  pagination,
  onPageChange,
  onPageSizeChange,
  onOpenCreate,
  onOpenEdit,
  onOpenDelete,
  onShareWorkspace,
  sortMode = "recent",
  searchQuery = "",
}) {
  const navigate = useNavigateWithLoading();
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const locale = i18n.language === "en" ? "en-US" : "vi-VN";
  const untitledTitle = t("home.workspace.untitledTitle");
  const isList = viewMode === "list";

  const enrichedWorkspaces = useMemo(
    () => enrichWorkspacesWithDisplayTitle(workspaces, untitledTitle),
    [workspaces, untitledTitle]
  );

  const sorted = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...enrichedWorkspaces]
      .sort(compareWorkspaces(sortMode))
      .filter((ws) => {
        if (!query) return true;
        return [
          getDisplayTitle(ws, untitledTitle),
          getWorkspaceMetadata(ws),
          formatSourceCount(ws, t),
        ].some((value) => value.toLowerCase().includes(query));
      });
  }, [enrichedWorkspaces, searchQuery, sortMode, t, untitledTitle]);

  const paginationInfo = pagination || { page: 0, size: 10, totalPages: 0, totalElements: 0 };

  const handlePrefetchWorkspacePage = useCallback(() => {
    void preloadWorkspacePage();
  }, []);

  const handleOpenWorkspace = useCallback((workspaceId) => {
    void preloadWorkspacePage();
    navigate(buildWorkspacePath(workspaceId));
  }, [navigate]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let idleHandle = null;
    let timeoutHandle = null;

    if ("requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(() => {
        void preloadWorkspacePage();
      }, { timeout: 1500 });
    } else {
      timeoutHandle = window.setTimeout(() => {
        void preloadWorkspacePage();
      }, 400);
    }

    return () => {
      if (idleHandle !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, []);

  if (loading) {
    return (
      <section className={fontClass}>
        <ListSpinner variant="section" />
      </section>
    );
  }

  return (
    <section className={fontClass}>
      {isList ? (
        <>
          <div className={`overflow-x-auto rounded-xl border transition-colors ${
            isDarkMode ? "border-slate-800 bg-slate-900" : "border-gray-200 bg-white"
          }`}>
            <div className={`grid min-w-[800px] grid-cols-[minmax(230px,1.6fr)_minmax(300px,1.5fr)_minmax(100px,0.6fr)_minmax(130px,0.7fr)_40px] gap-4 px-4 py-3 text-xs font-semibold ${
              isDarkMode ? "text-slate-500" : "text-gray-500"
            }`}>
              <span>{t("home.table.title")}</span>
              <span>{t("home.table.learningInfo")}</span>
              <span>{t("home.table.sources")}</span>
              <span>{t("home.table.created")}</span>
              <span />
            </div>

            {sorted.length === 0 ? (
              <div className={`px-4 py-10 text-center ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                <p className="text-sm font-medium">{t("home.workspace.noWorkspaces")}</p>
                <p className="mt-1 text-xs">{t("home.workspace.noWorkspacesDesc")}</p>
              </div>
            ) : (
              <div className={`divide-y ${isDarkMode ? "divide-slate-800" : "divide-gray-200"}`}>
                {sorted.map((ws) => {
                  const metadata = getWorkspaceMetadata(ws);
                  const sourceLabel = formatSourceCount(ws, t);
                  const accent = getWorkspaceAccent(ws);
                  return (
                    <div
                      key={ws.workspaceId}
                      onClick={() => handleOpenWorkspace(ws.workspaceId)}
                      onMouseEnter={handlePrefetchWorkspacePage}
                      onFocus={handlePrefetchWorkspacePage}
                      onTouchStart={handlePrefetchWorkspacePage}
                      className={`group grid min-w-[800px] cursor-pointer grid-cols-[minmax(230px,1.6fr)_minmax(300px,1.5fr)_minmax(100px,0.6fr)_minmax(130px,0.7fr)_40px] gap-4 px-4 py-3 text-sm transition-colors ${
                        isDarkMode ? "text-slate-300 hover:bg-slate-800/50" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex min-w-0 items-center">
                        <span className={`truncate font-medium ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          {getDisplayTitle(ws, untitledTitle)}
                        </span>
                      </div>
                      <span className={`truncate text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                        {metadata}
                      </span>
                      <span>
                        {sourceLabel ? (
                          <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${accent.source}`}>
                            {sourceLabel}
                          </span>
                        ) : null}
                      </span>
                      <span className={`truncate text-xs ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                        {formatDate(ws.createdAt, locale)}
                      </span>
                      <WorkspaceMenu
                        isDarkMode={isDarkMode}
                        onEdit={() => onOpenEdit(ws)}
                        onDelete={() => onOpenDelete(ws)}
                        onShare={typeof onShareWorkspace === "function" ? () => onShareWorkspace(ws) : null}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {sorted.length > 0 ? (
            <Pagination
              currentPage={paginationInfo.page}
              totalPages={paginationInfo.totalPages}
              totalElements={paginationInfo.totalElements}
              pageSize={paginationInfo.size}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              isDarkMode={isDarkMode}
            />
          ) : null}
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <CreateWorkspaceCard
              isDarkMode={isDarkMode}
              onOpenCreate={onOpenCreate}
              onPrefetchWorkspace={handlePrefetchWorkspacePage}
            />

            {sorted.map((ws) => (
              <WorkspaceCard
                key={ws.workspaceId}
                ws={ws}
                isDarkMode={isDarkMode}
                onEdit={onOpenEdit}
                onDelete={onOpenDelete}
                onShare={onShareWorkspace}
                locale={locale}
                untitledTitle={untitledTitle}
                onOpenWorkspace={handleOpenWorkspace}
                onPrefetchWorkspace={handlePrefetchWorkspacePage}
              />
            ))}
          </div>

          {sorted.length === 0 ? (
            <div className={`mt-6 rounded-xl border px-4 py-10 text-center ${
              isDarkMode ? "border-slate-800 text-slate-500" : "border-gray-200 text-gray-400"
            }`}>
              <p className="text-sm font-medium">{t("home.workspace.noWorkspaces")}</p>
              <p className="mt-1 text-xs">{t("home.workspace.noWorkspacesDesc")}</p>
            </div>
          ) : null}

          {sorted.length > 0 ? (
            <Pagination
              currentPage={paginationInfo.page}
              totalPages={paginationInfo.totalPages}
              totalElements={paginationInfo.totalElements}
              pageSize={paginationInfo.size}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              isDarkMode={isDarkMode}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

export default UserWorkspace;

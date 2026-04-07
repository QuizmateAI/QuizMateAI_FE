import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  GitBranch,
  BadgeCheck,
  CreditCard,
  ChevronRight,
  ChevronDown,
  ChevronsRight,
  Crown,
  LayoutGrid,
  FileCheck,
  Map,
  Clock,
  History,
  BarChart3,
  Pencil,
} from "lucide-react";

function normalizeStudioLocale(lang) {
  return String(lang || "").toLowerCase().startsWith("en") ? "en-US" : "vi-VN";
}

function getOutputIcon(type) {
  const normalizedType = String(type || "").toLowerCase();

  if (normalizedType === "quiz") {
    return { icon: BadgeCheck, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-950/40" };
  }
  if (normalizedType === "flashcard") {
    return { icon: CreditCard, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-950/40" };
  }
  if (normalizedType === "roadmap") {
    return { icon: Map, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-950/40" };
  }
  if (normalizedType === "questionstats") {
    return { icon: BarChart3, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-950/40" };
  }

  return { icon: FileCheck, color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800" };
}

const STUDIO_ACTIONS = [
  { key: "roadmap", icon: GitBranch, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-950/40" },
  { key: "quiz", icon: BadgeCheck, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-950/40" },
  { key: "flashcard", icon: CreditCard, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-950/40" },
  { key: "questionStats", icon: BarChart3, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-950/40" },
];

function getActiveKey(view) {
  if (!view) return null;
  const map = {
    createRoadmap: "roadmap",
    createQuiz: "quiz",
    createFlashcard: "flashcard",
  };
  return map[view] || view;
}

function formatAccessTime(dateStr, t, lang) {
  if (!dateStr) return "";

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return t("workspace.studio.accessedNow");

  const locale = normalizeStudioLocale(lang);
  const relativeTimeFormatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (diffMin < 60) return relativeTimeFormatter.format(-diffMin, "minute");

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return relativeTimeFormatter.format(-diffHr, "hour");

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return relativeTimeFormatter.format(-diffDay, "day");

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function renderActionButton(action, ctx) {
  const { highlightKey, isDarkMode, fontClass, getIsActionDisabled, planLockedActions, canRenderRoadmapEditAction, onAction, onEditRoadmapConfig, t } = ctx;
  const Icon = action.icon;
  const isDisabled = getIsActionDisabled(action.key);
  const isPlanLocked = planLockedActions.includes(action.key);
  const canRenderRoadmapEdit = canRenderRoadmapEditAction(action.key, isDisabled, isPlanLocked);
  return (
    <div key={action.key} className="relative">
      <button
        disabled={isDisabled && !isPlanLocked}
        onClick={() => onAction?.(action.key)}
        className={`w-full rounded-xl px-3 py-2.5 flex items-center gap-3 text-left transition-all group ${canRenderRoadmapEdit ? "pr-12" : ""} ${
          isPlanLocked
            ? isDarkMode
              ? "bg-slate-800/40 border border-slate-800 opacity-60 cursor-pointer"
              : "bg-gray-50 border border-gray-100 opacity-60 cursor-pointer"
            : isDisabled
              ? isDarkMode
                ? "bg-slate-800/40 border border-slate-800 opacity-50 cursor-not-allowed"
                : "bg-gray-50 border border-gray-100 opacity-50 cursor-not-allowed"
              : highlightKey === action.key
                ? isDarkMode
                  ? "bg-slate-800 border border-blue-500/40 ring-1 ring-blue-500/20"
                  : "bg-blue-50 border border-blue-200"
                : isDarkMode
                  ? "bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700"
                  : "bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200"
        }`}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDisabled && !isPlanLocked ? "bg-gray-200 dark:bg-slate-700" : action.bg}`}>
          <Icon className={`w-4 h-4 ${isDisabled && !isPlanLocked ? "text-gray-400" : action.color}`} />
        </div>
        <span className={`text-sm font-medium flex-1 truncate ${isDisabled && !isPlanLocked ? "text-gray-400" : isDarkMode ? "text-slate-200" : "text-gray-700"} ${fontClass}`}>
          {action.label || t(`workspace.studio.actions.${action.key}`)}
        </span>
        {isPlanLocked && (
          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        )}
        {!isDisabled && !isPlanLocked && (
          <ChevronRight className={`w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
        )}
      </button>
      {canRenderRoadmapEdit && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEditRoadmapConfig();
          }}
          className={`absolute right-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
            isDarkMode
              ? "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              : "bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-700"
          }`}
          aria-label={t("workspace.roadmap.editConfig", "Edit roadmap config")}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function StudioPanel({
  isDarkMode = false,
  onAction,
  onEditRoadmapConfig,
  accessHistory = [],
  isCollapsed = false,
  onToggleCollapse,
  activeView = null,
  shouldDisableQuiz = false,
  shouldDisableFlashcard = false,
  shouldDisableRoadmap = false,
  hideAccessHistory = false,
  customActions = null,
  canEditRoadmapConfig = false,
  planLockedActions = [],
  completedQuizCount = 0,
  // Array of { label, keys[] } to group actions into collapsible sections
  actionGroups = null,
}) {
  const { t, i18n } = useTranslation();
  const fontClass = i18n.language === "en" ? "font-poppins" : "font-sans";
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const [canShowTooltip, setCanShowTooltip] = useState(false);
  const highlightKey = getActiveKey(activeView);
  const visibleActions = customActions || STUDIO_ACTIONS;
  const renderableActions = visibleActions.filter((action) => {
    if (action.key === "questionStats" && completedQuizCount < 3) return false;
    return true;
  });
  const visibleAccessHistory = Array.isArray(accessHistory) ? accessHistory : [];

  const groupedKeysSet = useMemo(() => {
    if (!actionGroups) return new Set();
    return new Set(actionGroups.flatMap((g) => g.keys));
  }, [actionGroups]);

  const ungroupedActions = useMemo(
    () => renderableActions.filter((a) => !groupedKeysSet.has(a.key)),
    [renderableActions, groupedKeysSet],
  );

  const initialExpandedGroups = useMemo(() => {
    if (!actionGroups) return {};
    const expanded = {};
    actionGroups.forEach((group, idx) => {
      expanded[idx] = highlightKey ? group.keys.includes(highlightKey) : idx === 0;
    });
    return expanded;
  }, [actionGroups, highlightKey]);

  const [expandedGroups, setExpandedGroups] = useState(initialExpandedGroups);
  const [highlightSyncProps, setHighlightSyncProps] = useState({ highlightKey, actionGroups });

  if (
    highlightKey !== highlightSyncProps.highlightKey
    || actionGroups !== highlightSyncProps.actionGroups
  ) {
    setHighlightSyncProps({ highlightKey, actionGroups });
    if (actionGroups && highlightKey) {
      setExpandedGroups((prev) => {
        const next = { ...prev };
        let changed = false;
        actionGroups.forEach((group, idx) => {
          if (group.keys.includes(highlightKey) && next[idx] !== true) {
            next[idx] = true;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }

  const toggleGroup = useCallback((idx) => {
    setExpandedGroups((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }, []);

  const actionLabelMap = useMemo(() => visibleActions.reduce((acc, action) => {
    acc[action.key] = action.label || t(`workspace.studio.actions.${action.key}`, action.key);
    return acc;
  }, {}), [visibleActions, t]);

  const getIsActionDisabled = (actionKey) => {
    const action = visibleActions.find((item) => item.key === actionKey);
    if (action?.disabled) return true;
    if (actionKey === "quiz") return shouldDisableQuiz;
    if (actionKey === "flashcard") return shouldDisableFlashcard;
    if (actionKey === "roadmap") return shouldDisableRoadmap;
    return false;
  };

  useEffect(() => {
    if (!isCollapsed) {
      const resetTimer = setTimeout(() => {
        setHoverTooltip(null);
        setCanShowTooltip(false);
      }, 0);
      return () => clearTimeout(resetTimer);
    }

    const timer = setTimeout(() => setCanShowTooltip(true), 180);
    return () => clearTimeout(timer);
  }, [isCollapsed]);

  const showTooltip = (event, text) => {
    if (!canShowTooltip) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverTooltip({
      text,
      x: rect.left - 10,
      y: rect.top + rect.height / 2,
    });
  };

  const getHistoryLabel = (item) => {
    if (item?.actionKey && actionLabelMap[item.actionKey]) {
      return actionLabelMap[item.actionKey];
    }
    return item?.name || item?.type || "";
  };

  const canRenderRoadmapEditAction = (actionKey, isDisabled, isPlanLocked) => (
    actionKey === "roadmap"
    && canEditRoadmapConfig
    && typeof onEditRoadmapConfig === "function"
    && !isDisabled
    && !isPlanLocked
  );

  if (isCollapsed) {
    return (
      <aside className={`rounded-2xl border h-full flex flex-col items-center transition-colors duration-300 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}`}>
        <div className={`w-full h-12 px-2 border-b flex items-center justify-center transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
          <button
            type="button"
            onClick={() => {
              setHoverTooltip(null);
              onToggleCollapse();
            }}
            onMouseEnter={(event) => showTooltip(event, t("workspace.studio.title"))}
            onMouseLeave={() => setHoverTooltip(null)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-700"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full flex-1 overflow-y-auto scrollbar-hide p-2 flex flex-col items-center gap-1.5">
          {(actionGroups ? ungroupedActions : renderableActions).map((action) => {
            const Icon = action.icon;
            const isDisabled = getIsActionDisabled(action.key);
            const isPlanLocked = planLockedActions.includes(action.key);
            const canRenderRoadmapEdit = canRenderRoadmapEditAction(action.key, isDisabled, isPlanLocked);
            return (
              <div key={action.key} className="relative">
                <button
                  type="button"
                  disabled={isDisabled && !isPlanLocked}
                  onClick={() => {
                    setHoverTooltip(null);
                    onAction?.(action.key);
                  }}
                  onMouseEnter={(event) => showTooltip(event, action.label || t(`workspace.studio.actions.${action.key}`))}
                  onMouseLeave={() => setHoverTooltip(null)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                    isPlanLocked
                      ? isDarkMode
                        ? "bg-slate-800 opacity-60 cursor-pointer"
                        : "bg-gray-50 opacity-60 cursor-pointer"
                      : isDisabled
                        ? isDarkMode
                          ? "bg-slate-800 opacity-50 cursor-not-allowed"
                          : "bg-gray-50 opacity-50 cursor-not-allowed"
                        : highlightKey === action.key
                          ? isDarkMode ? "bg-slate-700 ring-1 ring-blue-500/40" : "bg-blue-50 ring-1 ring-blue-300"
                          : isDarkMode
                            ? "bg-slate-800 text-slate-200 hover:bg-slate-700"
                            : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isDisabled && !isPlanLocked ? "text-gray-400" : action.color}`} />
                </button>
                {isPlanLocked && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center pointer-events-none z-10">
                    <Crown className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                {canRenderRoadmapEdit && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setHoverTooltip(null);
                      onEditRoadmapConfig();
                    }}
                    className={`absolute -bottom-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border shadow-sm transition-colors ${
                      isDarkMode
                        ? "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                    }`}
                    aria-label={t("workspace.roadmap.editConfig", "Edit roadmap config")}
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            );
          })}
          {actionGroups && actionGroups.map((group, groupIdx) => {
            const groupActions = group.keys
              .map((k) => renderableActions.find((a) => a.key === k))
              .filter(Boolean);
            if (groupActions.length === 0) return null;
            return (
              <React.Fragment key={group.label}>
                <div className={`w-8 border-t my-0.5 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`} />
                {groupActions.map((action) => {
                  const Icon = action.icon;
                  const isDisabled = getIsActionDisabled(action.key);
                  const isPlanLocked = planLockedActions.includes(action.key);
                  return (
                    <div key={action.key} className="relative">
                      <button
                        type="button"
                        disabled={isDisabled && !isPlanLocked}
                        onClick={() => { setHoverTooltip(null); onAction?.(action.key); }}
                        onMouseEnter={(event) => showTooltip(event, action.label || t(`workspace.studio.actions.${action.key}`))}
                        onMouseLeave={() => setHoverTooltip(null)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                          isPlanLocked
                            ? isDarkMode ? "bg-slate-800 opacity-60 cursor-pointer" : "bg-gray-50 opacity-60 cursor-pointer"
                            : isDisabled
                              ? isDarkMode ? "bg-slate-800 opacity-50 cursor-not-allowed" : "bg-gray-50 opacity-50 cursor-not-allowed"
                              : highlightKey === action.key
                                ? isDarkMode ? "bg-slate-700 ring-1 ring-blue-500/40" : "bg-blue-50 ring-1 ring-blue-300"
                                : isDarkMode ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <Icon className={`w-4.5 h-4.5 ${isDisabled && !isPlanLocked ? "text-gray-400" : action.color}`} />
                      </button>
                      {isPlanLocked && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center pointer-events-none z-10">
                          <Crown className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}

          {visibleAccessHistory.length > 0 && (
            <>
              <div className={`w-8 border-t my-1 ${isDarkMode ? "border-slate-700" : "border-gray-200"}`} />
              {visibleAccessHistory.slice(0, 5).map((item, index) => {
                const { icon: OutputIcon, color } = getOutputIcon(item.actionKey || item.type);
                return (
                  <div
                    key={index}
                    onMouseEnter={(event) => showTooltip(event, getHistoryLabel(item))}
                    onMouseLeave={() => setHoverTooltip(null)}
                    onClick={() => onAction?.(item.actionKey)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                      isDarkMode ? "bg-slate-800 hover:bg-slate-700" : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <OutputIcon className={`w-4 h-4 ${color}`} />
                  </div>
                );
              })}
            </>
          )}
        </div>

        {hoverTooltip && (
          <div
            className="fixed z-[120] px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-100 shadow-lg pointer-events-none transition-all duration-200 opacity-100 scale-100"
            style={{ left: hoverTooltip.x, top: hoverTooltip.y, transform: "translate(-100%, -50%)" }}
          >
            {hoverTooltip.text}
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside className={`rounded-2xl border h-full overflow-hidden flex flex-col transition-colors duration-300 ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"}`}>
      <div className={`px-4 h-12 border-b transition-colors duration-300 flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-gray-200"}`}>
        <p className={`text-base font-medium text-left ${isDarkMode ? "text-slate-100" : "text-gray-800"} ${fontClass}`}>
          {t("workspace.studio.title")}
        </p>
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-700"}`}
          title={t("workspace.studio.title")}
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-1.5 overflow-y-auto flex-1 scrollbar-hide">
        {actionGroups ? (
          <>
            {ungroupedActions.map((action) => renderActionButton(action, { highlightKey, isDarkMode, fontClass, getIsActionDisabled, planLockedActions, canRenderRoadmapEditAction, onAction, onEditRoadmapConfig, t }))}
            {actionGroups.map((group, groupIdx) => {
              const groupActions = group.keys
                .map((k) => renderableActions.find((a) => a.key === k))
                .filter(Boolean);
              if (groupActions.length === 0) return null;
              const isExpanded = !!expandedGroups[groupIdx];
              const hasActiveChild = groupActions.some((a) => highlightKey === a.key);
              return (
                <div key={group.label} className="mt-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupIdx)}
                    className={`w-full rounded-lg px-3 py-2 flex items-center gap-2 text-left transition-colors ${
                      hasActiveChild
                        ? isDarkMode ? "bg-slate-800/40" : "bg-blue-50/50"
                        : isDarkMode ? "hover:bg-slate-800/40" : "hover:bg-gray-50"
                    }`}
                  >
                    {isExpanded
                      ? <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />
                      : <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isDarkMode ? "text-slate-400" : "text-gray-400"}`} />}
                    <span className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-gray-400"} ${fontClass}`}>
                      {group.label}
                    </span>
                    <span className={`ml-auto text-[10px] tabular-nums ${isDarkMode ? "text-slate-500" : "text-gray-300"}`}>
                      {groupActions.length}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="mt-1 space-y-1 pl-1">
                      {groupActions.map((action) => renderActionButton(action, { highlightKey, isDarkMode, fontClass, getIsActionDisabled, planLockedActions, canRenderRoadmapEditAction, onAction, onEditRoadmapConfig, t }))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          renderableActions.map((action) => renderActionButton(action, { highlightKey, isDarkMode, fontClass, getIsActionDisabled, planLockedActions, canRenderRoadmapEditAction, onAction, onEditRoadmapConfig, t }))
        )}
      </div>

      {completedQuizCount >= 3 && completedQuizCount < 10 && (
        <div className={`mx-3 mb-1 rounded-xl border px-3 py-2 text-xs leading-relaxed ${
          isDarkMode
            ? "border-purple-900/50 bg-purple-950/30 text-purple-300"
            : "border-purple-200 bg-purple-50 text-purple-700"
        } ${fontClass}`}>
          {t("workspace.studio.questionStatsHint")}
        </div>
      )}

      {!hideAccessHistory && (
        <div className={`flex-1 px-4 pb-4 overflow-y-auto border-t mt-1 pt-3 ${isDarkMode ? "border-slate-800" : "border-gray-100"}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <History className={`w-3.5 h-3.5 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
            <p className={`text-xs font-semibold uppercase tracking-wide text-left ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
              {t("workspace.studio.accessHistory")}
            </p>
          </div>

          {visibleAccessHistory.length === 0 ? (
            <div className="text-center py-6">
              <p className={`text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"} ${fontClass}`}>
                {t("workspace.studio.noHistory")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleAccessHistory.map((item, index) => {
                const { icon: OutputIcon, color, bg } = getOutputIcon(item.actionKey || item.type);
                return (
                  <div
                    key={index}
                    onClick={() => onAction?.(item.actionKey)}
                    className={`rounded-lg px-3 py-2.5 flex items-center gap-3 text-sm cursor-pointer transition-colors ${
                      isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                      <OutputIcon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className={`font-medium truncate ${fontClass}`}>{getHistoryLabel(item)}</p>
                      <p className={`text-xs mt-0.5 flex items-center gap-1 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                        <Clock className="w-3 h-3" />
                        {formatAccessTime(item.accessedAt, t, i18n.language)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

export default StudioPanel;

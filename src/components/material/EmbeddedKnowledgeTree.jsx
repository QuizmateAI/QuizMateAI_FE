import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Flame,
  Loader2,
  MousePointerClick,
  Power,
  PowerOff,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import {
  getDocumentSections,
  setDocumentSectionActive,
} from "@/api/MaterialAPI";

function getNodeId(node) {
  return node?.id || node?.sectionId || node?.nodeId || "";
}

function getChildren(node) {
  return Array.isArray(node?.children) ? node.children : [];
}

function getChunkIds(node) {
  return Array.isArray(node?.chunkIds) ? node.chunkIds : [];
}

function isSectionActive(node) {
  return node?.isActive !== false;
}

function countChunks(node) {
  if (!node) return 0;
  return getChunkIds(node).length + getChildren(node).reduce((total, child) => total + countChunks(child), 0);
}

function countActiveChunks(node) {
  if (!node || !isSectionActive(node)) return 0;
  return getChunkIds(node).length + getChildren(node).reduce((total, child) => total + countActiveChunks(child), 0);
}

function countSections(nodes) {
  return (Array.isArray(nodes) ? nodes : []).reduce(
    (total, node) => total + 1 + countSections(getChildren(node)),
    0,
  );
}

function collectLeafSections(node, result = []) {
  const children = getChildren(node);
  if (children.length === 0) {
    result.push(node);
    return result;
  }
  children.forEach((child) => collectLeafSections(child, result));
  return result;
}

function normalizeResponse(response) {
  const data = response?.data ?? response ?? [];
  return Array.isArray(data) ? data : [];
}

function replaceNodeInTree(tree, replacementTree) {
  const replacements = new Map(
    normalizeResponse(replacementTree)
      .filter((node) => getNodeId(node))
      .map((node) => [getNodeId(node), node]),
  );

  if (replacements.size === 0) return tree;

  function walk(nodes) {
    return (Array.isArray(nodes) ? nodes : []).map((node) => {
      const replacement = replacements.get(getNodeId(node));
      if (replacement) return replacement;
      const children = getChildren(node);
      return children.length > 0 ? { ...node, children: walk(children) } : node;
    });
  }

  return walk(tree);
}

function ProgressCard({
  t,
  activeChunks,
  totalChunks,
  activeRoots,
  totalRoots,
  totalSections,
}) {
  const overallPct = totalChunks > 0 ? Math.round((activeChunks / totalChunks) * 100) : 0;

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-[18px] shadow-[0_2px_8px_-4px_rgba(37,99,235,0.08)]">
      <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate-500">
        <span>{t("workspace.material.tree.scope", "Phạm vi học liệu")}</span>
        <span className="inline-flex items-center gap-1 text-orange-700">
          <Flame size={12} /> {t("workspace.material.tree.aiScope", "AI scope")}
        </span>
      </div>
      <div className="mb-2.5 mt-1.5 flex items-baseline gap-1.5">
        <span className="text-[36px] font-black leading-none tracking-tight text-blue-700 tabular-nums">
          {overallPct}
        </span>
        <small className="text-sm font-bold text-slate-400">%</small>
        <span className="ml-auto text-xs font-bold text-slate-500">
          {activeRoots} / {totalRoots} {t("workspace.material.tree.rootOn", "mục ON")}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-blue-100">
        <div
          className="h-full rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)] transition-all duration-300"
          style={{
            width: `${overallPct}%`,
            background: "linear-gradient(90deg, #2563EB, #06B6D4)",
          }}
        />
      </div>
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <Stat3 value={`${activeChunks}/${totalChunks}`} label={t("workspace.material.tree.chunkOnLabel", "Chunk ON")} />
        <Stat3 value={totalSections} label={t("workspace.material.tree.section", "Section")} />
        <Stat3 value={totalRoots} label={t("workspace.material.tree.root", "Mục gốc")} />
      </div>
    </div>
  );
}

function Stat3({ value, label }) {
  return (
    <div className="rounded-[10px] bg-blue-50 px-1.5 py-2.5 text-center">
      <div className="text-lg font-black tracking-tight text-blue-900 tabular-nums">{value}</div>
      <div className="mt-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-slate-500">
        {label}
      </div>
    </div>
  );
}

function SectionToggle({ t, isEnabled, isLoading, onClick }) {
  return (
    <span
      role="switch"
      aria-checked={isEnabled}
      onClick={isLoading ? undefined : onClick}
      onKeyDown={(event) => {
        if (isLoading) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.(event);
        }
      }}
      tabIndex={0}
      title={isEnabled
        ? t("workspace.material.tree.toggleOnHint", "Đang bật trong phạm vi tạo câu hỏi")
        : t("workspace.material.tree.toggleOffHint", "Đang tắt khỏi phạm vi tạo câu hỏi")}
      className={`inline-flex cursor-pointer select-none items-center gap-1 rounded-full border px-1.5 py-1 transition ${
        isEnabled
          ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          : "border-slate-200 bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
      } ${isLoading ? "pointer-events-none opacity-70" : ""}`}
    >
      {isLoading ? (
        <Loader2 size={11} className="animate-spin" strokeWidth={3} />
      ) : isEnabled ? (
        <Power size={11} strokeWidth={3} />
      ) : (
        <PowerOff size={11} strokeWidth={3} />
      )}
      <span className="text-[9.5px] font-extrabold tracking-wider">
        {isEnabled ? "ON" : "OFF"}
      </span>
    </span>
  );
}

function LeafRow({ t, leaf, isToggling, onToggleActive }) {
  const active = isSectionActive(leaf);
  const chunkCount = getChunkIds(leaf).length;
  const leafId = getNodeId(leaf);

  return (
    <div
      className={`group flex items-start gap-2 rounded-lg px-2.5 py-2 transition ${
        active ? "hover:bg-blue-50" : "bg-slate-50/80 opacity-70"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggleActive?.(leaf, !active)}
        title={active
          ? t("workspace.material.tree.disableSection", "Tắt section này")
          : t("workspace.material.tree.enableSection", "Bật section này")}
        className={`mt-[2px] flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition ${
          active
            ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
            : "border-slate-300 bg-white hover:border-emerald-500"
        }`}
      >
        {isToggling ? <Loader2 size={10} className="animate-spin" /> : active && <Check size={11} strokeWidth={3.5} />}
      </button>

      <span
        className={`mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full ${
          active ? "bg-cyan-500" : "bg-slate-300"
        }`}
      />

      <div className="min-w-0 flex-1 text-left">
        <div
          className={`truncate text-[12.5px] font-bold leading-snug ${
            active ? "text-slate-800" : "text-slate-500 line-through decoration-slate-300"
          }`}
          title={leaf?.title}
        >
          {leaf?.title || t("workspace.material.tree.untitledSection", "Section không tên")}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold text-slate-500">
          <FileText size={10} />
          <span>{chunkCount} chunk</span>
          {leafId && <span className="truncate text-slate-400">#{String(leafId).slice(0, 8)}</span>}
        </div>
      </div>
    </div>
  );
}

function ChapterCard({
  t,
  chapter,
  leaves,
  isExpanded,
  isToggling,
  togglingId,
  onToggle,
  onToggleActive,
}) {
  const active = isSectionActive(chapter);
  const totalChunks = countChunks(chapter);
  const activeChunks = countActiveChunks(chapter);
  const progressPct = totalChunks > 0 ? Math.round((activeChunks / totalChunks) * 100) : 0;
  const isDone = active && totalChunks > 0 && activeChunks === totalChunks;

  const cardClass = !active
    ? "border-slate-200 bg-slate-50/60 opacity-75 hover:opacity-90"
    : isExpanded
      ? "border-blue-600 bg-white shadow-[0_12px_28px_-12px_rgba(37,99,235,0.4)]"
      : isDone
        ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
        : "border-blue-100 bg-white hover:border-blue-300 hover:-translate-y-px hover:shadow-[0_8px_18px_-10px_rgba(37,99,235,0.25)]";

  const numBadgeClass = !active
    ? "bg-slate-200 text-slate-400"
    : isExpanded
      ? "text-white shadow-[0_6px_14px_-6px_rgba(37,99,235,0.6)]"
      : isDone
        ? "bg-emerald-500 text-white"
        : "bg-slate-100 text-slate-600";

  return (
    <div className={`mb-2.5 overflow-hidden rounded-2xl border transition-all duration-150 ${cardClass}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] text-[13px] font-black tabular-nums ${numBadgeClass}`}
            style={active && isExpanded ? { background: "linear-gradient(135deg, #2563EB, #1D4ED8)" } : undefined}
          >
            {isDone ? <Check size={16} strokeWidth={3} /> : (chapter?.orderIndex ?? chapter?.level ?? 0) + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className={`truncate text-sm font-extrabold leading-tight ${active ? "text-slate-900" : "text-slate-500"}`}>
              {chapter?.title || t("workspace.material.tree.untitledSection", "Section không tên")}
            </div>
            <div className={`mt-0.5 text-[10.5px] font-bold ${active ? "text-slate-500" : "text-slate-400"}`}>
              {active
                ? `${activeChunks}/${totalChunks} ${t("workspace.material.tree.chunkOn", "chunk đang bật")}`
                : t("workspace.material.tree.outOfScope", "Đang tắt khỏi phạm vi")}
            </div>
          </div>

          <SectionToggle
            t={t}
            isEnabled={active}
            isLoading={isToggling}
            onClick={(event) => {
              event.stopPropagation();
              onToggleActive?.(chapter, !active);
            }}
          />

          <div className={`flex items-center gap-1 whitespace-nowrap text-[11px] font-bold ${
            active && isExpanded ? "text-blue-700" : active ? "text-slate-500" : "text-slate-400"
          }`}>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>

        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-blue-50">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: active ? `${progressPct}%` : "0%",
              background: isDone
                ? "linear-gradient(90deg, #10B981, #34D399)"
                : "linear-gradient(90deg, #2563EB, #06B6D4)",
            }}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-blue-100 px-3 pb-3">
          {leaves.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-1.5 py-2.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-[3px] text-[10px] font-extrabold text-blue-700">
                  {leaves.length} {t("workspace.material.tree.childSection", "section con")}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-[3px] text-[10px] font-extrabold text-cyan-700">
                  {totalChunks} {t("workspace.material.tree.chunkUnit", "chunk")}
                </span>
              </div>
              <div className="space-y-0.5">
                {leaves.map((leaf) => (
                  <LeafRow
                    key={getNodeId(leaf)}
                    t={t}
                    leaf={leaf}
                    isToggling={togglingId === getNodeId(leaf)}
                    onToggleActive={onToggleActive}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="py-3 text-center text-[11px] italic text-slate-400">
              {t("workspace.material.tree.noChildSection", "Section này chưa có mục con.")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EmbeddedKnowledgeTree({
  materialId,
  isDarkMode: _isDarkMode = false,
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expandedChapterId, setExpandedChapterId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const treeQuery = useQuery({
    queryKey: ["documentSectionsKnowledgeTree", materialId],
    queryFn: () => getDocumentSections(materialId),
    enabled: Boolean(materialId),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (error?.response?.status === 404) return false;
      if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") return false;
      return failureCount < 2;
    },
  });

  const sections = useMemo(() => normalizeResponse(treeQuery.data), [treeQuery.data]);

  const toggleMutation = useMutation({
    mutationFn: ({ sectionId, isActive }) => setDocumentSectionActive(materialId, sectionId, isActive),
    onMutate: ({ sectionId }) => {
      setTogglingId(sectionId);
    },
    onSuccess: (response) => {
      const updatedTree = normalizeResponse(response);
      queryClient.setQueryData(["documentSectionsKnowledgeTree", materialId], (current) => {
        const currentTree = normalizeResponse(current);
        if (updatedTree.length === 0) return current;
        return replaceNodeInTree(currentTree, updatedTree);
      });
    },
    onSettled: () => {
      setTogglingId(null);
    },
  });

  const handleChapterToggle = useCallback((chapter) => {
    const chapterId = getNodeId(chapter);
    setExpandedChapterId((previous) => (previous === chapterId ? null : chapterId));
  }, []);

  const handleToggleActive = useCallback(
    (section, isActive) => {
      const sectionId = getNodeId(section);
      if (!sectionId || !materialId) return;
      toggleMutation.mutate({ sectionId, isActive });
    },
    [materialId, toggleMutation],
  );

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["documentSectionsKnowledgeTree", materialId] });
  }, [materialId, queryClient]);

  const stats = useMemo(() => {
    const totalChunks = sections.reduce((total, section) => total + countChunks(section), 0);
    const activeChunks = sections.reduce((total, section) => total + countActiveChunks(section), 0);
    const totalRoots = sections.length;
    const activeRoots = sections.filter(isSectionActive).length;
    return {
      totalChunks,
      activeChunks,
      totalRoots,
      activeRoots,
      totalSections: countSections(sections),
    };
  }, [sections]);

  const treeMissing = treeQuery.error?.response?.status === 404;

  return (
    <div className="h-full space-y-0 overflow-y-auto px-5 py-5">
      {treeQuery.isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">{t("workspace.material.tree.loading", "Đang tải cây kiến thức...")}</span>
        </div>
      )}

      {!treeQuery.isLoading && treeQuery.isError && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-white px-4 py-12 text-center">
          <Sparkles className="h-10 w-10 text-rose-500" />
          <p className="text-sm font-bold text-slate-800">
            {treeMissing
              ? t("workspace.material.tree.emptyTitle", "Chưa có cây kiến thức")
              : t("workspace.material.tree.loadErrorTitle", "Không tải được cây kiến thức")}
          </p>
          <p className="text-xs text-slate-500">
            {t("workspace.material.tree.errorHint", "Cây kiến thức hiển thị dựa trên document sections từ BE.")}
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-extrabold text-white shadow hover:bg-rose-700"
          >
            <RefreshCw size={12} />
            {t("common.retry", "Thử lại")}
          </button>
        </div>
      )}

      {!treeQuery.isLoading && !treeQuery.isError && sections.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-12 text-center">
          <Sparkles className="h-10 w-10 text-amber-500" />
          <p className="text-sm font-bold text-slate-800">{t("workspace.material.tree.emptyTitle", "Chưa có cây kiến thức")}</p>
          <p className="text-xs text-slate-500">
            {t("workspace.material.tree.emptyHint", "BE chưa trả về document sections cho tài liệu này.")}
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-extrabold text-white shadow hover:from-amber-400 hover:to-orange-400"
          >
            <RefreshCw size={12} />
            {t("common.reload", "Tải lại")}
          </button>
        </div>
      )}

      {sections.length > 0 && (
        <>
          <ProgressCard
            t={t}
            activeChunks={stats.activeChunks}
            totalChunks={stats.totalChunks}
            activeRoots={stats.activeRoots}
            totalRoots={stats.totalRoots}
            totalSections={stats.totalSections}
          />

          <div className="mb-3 mt-5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
            {t("workspace.material.tree.title", "Cây kiến thức")}
            <span className="rounded-full bg-blue-100 px-2 py-[2px] text-[10px] font-extrabold text-blue-700">
              {stats.totalRoots} {t("workspace.material.tree.rootUnit", "mục")}
            </span>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={treeQuery.isFetching}
              className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-full bg-white px-2 py-[3px] text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              title={t("workspace.material.tree.reloadTitle", "Tải lại cây kiến thức")}
            >
              <RefreshCw size={11} className={treeQuery.isFetching ? "animate-spin" : ""} />
              {treeQuery.isFetching
                ? t("workspace.material.tree.loadingShort", "Đang tải")
                : t("common.refresh", "Làm mới")}
            </button>
          </div>

          {sections.map((section) => {
            const sectionId = getNodeId(section);
            const leaves = collectLeafSections(section, []).filter((leaf) => getNodeId(leaf) !== sectionId);
            const displayLeaves = leaves.length > 0 ? leaves : [section];
            return (
              <ChapterCard
                key={sectionId}
                chapter={section}
                t={t}
                leaves={displayLeaves}
                isExpanded={expandedChapterId === sectionId}
                isToggling={togglingId === sectionId}
                togglingId={togglingId}
                onToggle={() => handleChapterToggle(section)}
                onToggleActive={handleToggleActive}
              />
            );
          })}

          {sections.length === 0 && (
            <div className="rounded-xl border border-dashed border-blue-200 bg-white/50 px-4 py-6 text-center text-xs text-slate-400">
              <MousePointerClick className="mx-auto mb-2 h-6 w-6 opacity-60" />
              {t("workspace.material.tree.noSection", "Cây kiến thức chưa có section nào.")}
            </div>
          )}
        </>
      )}
    </div>
  );
}

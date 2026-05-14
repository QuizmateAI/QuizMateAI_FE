import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check, ChevronDown, ChevronUp, Flame, Loader2, MousePointerClick,
  RefreshCw, Sparkles, FileText, Power, PowerOff,
} from "lucide-react";

import {
  extractAndPersistKnowledgeTree,
  getKnowledgeTree,
} from "@/api/KnowledgeTreeAPI";
import ExtractionStatus from "@/components/knowledgeTree/ExtractionStatus";

// ============================================================================
// EmbeddedKnowledgeTree — Variant C v3 (chapter-based progress + on/off):
//   1. Progress card → chapter completion %, NOT PDF scroll
//   2. Each chapter has ON/OFF switch:
//      - ON  = chapter counts toward overall progress
//      - OFF = chapter skipped (grayed out, excluded from %)
//   3. Per-chapter progress = studied_leaves / total_leaves
//   4. Overall progress = mean(chapter_progress) for ON chapters only
//   5. Click chapter header → accordion dropdown (leaves inside card)
//   6. Each leaf row has "đã học" checkmark + click body to jump PDF
// ============================================================================

// Color cho leaf-type pill + dot
const LEAF_TYPE_PILL = {
  DEFINITION: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "#10B981", label: "Định nghĩa" },
  RULE:       { bg: "bg-blue-100",    text: "text-blue-700",    dot: "#3B82F6", label: "Quy tắc" },
  FORMULA:    { bg: "bg-rose-100",    text: "text-rose-700",    dot: "#EF4444", label: "Công thức" },
  EXAMPLE:    { bg: "bg-orange-100",  text: "text-orange-700",  dot: "#F97316", label: "Ví dụ" },
  PROCEDURE: { bg: "bg-violet-100",  text: "text-violet-700",  dot: "#A855F7", label: "Quy trình" },
  CONCEPT:    { bg: "bg-cyan-100",    text: "text-cyan-700",    dot: "#06B6D4", label: "Khái niệm" },
  OTHER:      { bg: "bg-slate-100",   text: "text-slate-700",   dot: "#94A3B8", label: "Khác" },
};

function groupLeavesByType(leaves) {
  const counts = {};
  for (const leaf of leaves) {
    const t = leaf.leafType || "OTHER";
    counts[t] = (counts[t] || 0) + 1;
  }
  return counts;
}

// --------------------------------------------------------------------------
// ProgressCard — chapter-based progress (not PDF scroll)
// --------------------------------------------------------------------------
function ProgressCard({
  overallPct, doneChapters, enabledChapters, totalChapters,
  studiedLeafCount, totalLeavesInEnabled, highlightCount = 0,
}) {
  return (
    <div className="p-[18px] bg-white border border-blue-100 rounded-2xl shadow-[0_2px_8px_-4px_rgba(37,99,235,0.08)]">
      <div className="flex justify-between items-center text-[11px] font-extrabold text-slate-500 uppercase tracking-[0.1em]">
        <span>Tiến độ học</span>
        <span className="inline-flex items-center gap-1 text-orange-700">
          <Flame size={12} /> Streak 0 ngày
        </span>
      </div>
      <div className="flex items-baseline gap-1.5 mt-1.5 mb-2.5">
        <span className="text-[36px] font-black text-blue-700 tabular-nums tracking-tight leading-none">
          {overallPct}
        </span>
        <small className="text-sm text-slate-400 font-bold">%</small>
        <span className="ml-auto text-xs text-slate-500 font-bold">
          {doneChapters} / {enabledChapters} chương xong
        </span>
      </div>
      <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)] transition-all duration-300"
          style={{
            width: `${overallPct}%`,
            background: "linear-gradient(90deg, #2563EB, #06B6D4)",
          }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3.5">
        <Stat3 value={`${enabledChapters}/${totalChapters}`} label="Chương ON" />
        <Stat3 value={totalLeavesInEnabled > 0 ? `${studiedLeafCount}/${totalLeavesInEnabled}` : "?"} label="Đã học" />
        <Stat3 value={highlightCount} label="Highlight" />
      </div>
    </div>
  );
}

function Stat3({ value, label }) {
  return (
    <div className="py-2.5 px-1.5 bg-blue-50 rounded-[10px] text-center">
      <div className="text-lg font-black text-blue-900 tabular-nums tracking-tight">{value}</div>
      <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-[0.06em] mt-0.5">
        {label}
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// LeafRow — clickable row inside expanded chapter
// --------------------------------------------------------------------------
function LeafRow({ leaf, isStudied, isActiveByPdf, onToggleStudied, onJumpToLeaf }) {
  const cfg = LEAF_TYPE_PILL[leaf.leafType] || LEAF_TYPE_PILL.OTHER;
  const pageLabel = leaf.pageStart === leaf.pageEnd
    ? `Trang ${leaf.pageStart}`
    : `Trang ${leaf.pageStart}-${leaf.pageEnd}`;

  return (
    <div
      className={`flex items-start gap-2 px-2.5 py-2 rounded-lg transition group ${
        isActiveByPdf
          ? "bg-blue-100/70 ring-1 ring-blue-300"
          : isStudied
            ? "bg-emerald-50/60 hover:bg-emerald-50"
            : "hover:bg-blue-50"
      }`}
    >
      {/* Studied toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleStudied?.(leaf);
        }}
        title={isStudied ? "Bỏ đánh dấu đã học" : "Đánh dấu đã học"}
        className={`mt-[2px] flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center border transition ${
          isStudied
            ? "bg-emerald-500 border-emerald-500 text-white shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
            : "border-slate-300 hover:border-emerald-500 bg-white"
        }`}
      >
        {isStudied && <Check size={11} strokeWidth={3.5} />}
      </button>

      {/* Type dot */}
      <span
        className="mt-[7px] flex-shrink-0 w-1.5 h-1.5 rounded-full"
        style={{ background: cfg.dot }}
      />

      {/* Title + page (clickable -> jump) */}
      <button
        type="button"
        onClick={() => onJumpToLeaf?.(leaf)}
        className="flex-1 text-left min-w-0"
      >
        <div className={`text-[12.5px] font-bold leading-snug truncate ${
          isStudied ? "text-slate-500 line-through decoration-emerald-300/70" : "text-slate-800"
        }`}>
          {leaf.title}
        </div>
        <div className="text-[10.5px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
          <FileText size={10} /> {pageLabel}
          <span className={`px-1.5 py-[1px] rounded-full text-[9.5px] font-extrabold ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
        </div>
      </button>
    </div>
  );
}

// --------------------------------------------------------------------------
// ChapterToggle — small ON/OFF pill switch for a chapter
// --------------------------------------------------------------------------
function ChapterToggle({ isEnabled, onClick }) {
  return (
    <span
      role="switch"
      aria-checked={isEnabled}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(e);
        }
      }}
      tabIndex={0}
      title={isEnabled ? "Đang học chương này — click để bỏ qua" : "Bỏ qua — click để học lại"}
      className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-full cursor-pointer transition select-none border ${
        isEnabled
          ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
          : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600"
      }`}
    >
      {isEnabled ? <Power size={11} strokeWidth={3} /> : <PowerOff size={11} strokeWidth={3} />}
      <span className="text-[9.5px] font-extrabold tracking-wider">
        {isEnabled ? "ON" : "OFF"}
      </span>
    </span>
  );
}

// --------------------------------------------------------------------------
// ChapterCard — collapsible accordion + on/off toggle
// --------------------------------------------------------------------------
function ChapterCard({
  chapter, leaves, isActive, isExpanded, isEnabled,
  studiedSet, onToggle, onToggleEnabled, onJumpToLeaf, onToggleStudied,
}) {
  const typeCounts = useMemo(() => groupLeavesByType(leaves || []), [leaves]);
  const leafCount = leaves?.length || 0;
  const studiedCount = useMemo(
    () => (leaves || []).filter((l) => studiedSet.has(l.nodeId)).length,
    [leaves, studiedSet],
  );
  const isDone = isEnabled && leafCount > 0 && studiedCount === leafCount;
  const progressPct = leafCount > 0 ? Math.round((studiedCount / leafCount) * 100) : 0;

  // Card visual state:
  //   - disabled → faded slate
  //   - expanded → blue strong border + shadow
  //   - active (PDF in range) → light blue tint
  //   - done → emerald tint
  //   - else → white
  const cardClass = !isEnabled
    ? "border-slate-200 bg-slate-50/60 opacity-70 hover:opacity-90"
    : isExpanded
      ? "border-blue-600 bg-white shadow-[0_12px_28px_-12px_rgba(37,99,235,0.4)]"
      : isActive
        ? "border-blue-300 bg-gradient-to-br from-blue-50 to-white"
        : isDone
          ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white"
          : "border-blue-100 bg-white hover:border-blue-300 hover:-translate-y-px hover:shadow-[0_8px_18px_-10px_rgba(37,99,235,0.25)]";

  const numBadgeClass = !isEnabled
    ? "bg-slate-200 text-slate-400"
    : isExpanded || isActive
      ? "text-white shadow-[0_6px_14px_-6px_rgba(37,99,235,0.6)]"
      : isDone
        ? "bg-emerald-500 text-white"
        : "bg-slate-100 text-slate-600";

  return (
    <div className={`mb-2.5 rounded-2xl border transition-all duration-150 overflow-hidden ${cardClass}`}>
      {/* HEADER (clickable -> toggle expand) */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 py-3.5"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-[13px] font-black tabular-nums flex-shrink-0 ${numBadgeClass}`}
            style={(isEnabled && (isExpanded || isActive)) ? { background: "linear-gradient(135deg, #2563EB, #1D4ED8)" } : undefined}
          >
            {isDone ? <Check size={16} strokeWidth={3} /> : (chapter.orderIndex != null ? chapter.orderIndex + 1 : "?")}
          </div>
          <div className="flex-1 min-w-0">
            <div className={`text-sm font-extrabold truncate leading-tight ${
              isEnabled ? "text-slate-900" : "text-slate-500"
            }`}>
              {chapter.title}
            </div>
            <div className={`text-[10.5px] font-bold mt-0.5 ${
              isEnabled ? "text-slate-500" : "text-slate-400"
            }`}>
              {!isEnabled
                ? "Bỏ qua chương này"
                : studiedCount > 0
                  ? `${studiedCount}/${leafCount} đã học`
                  : `${leafCount} lá`}
              {chapter.pageStart != null && (
                <> · trang {chapter.pageStart}{chapter.pageEnd && chapter.pageEnd !== chapter.pageStart ? `-${chapter.pageEnd}` : ""}</>
              )}
            </div>
          </div>

          {/* ON/OFF switch — click without expanding card */}
          <ChapterToggle
            isEnabled={isEnabled}
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled?.(chapter);
            }}
          />

          <div className={`text-[11px] font-bold whitespace-nowrap flex items-center gap-1 ${
            !isEnabled ? "text-slate-400"
              : isExpanded ? "text-blue-700"
              : isActive ? "text-blue-700"
              : isDone ? "text-emerald-700" : "text-slate-500"
          }`}>
            {isEnabled && isActive && !isExpanded && <span className="w-1 h-1 rounded-full bg-blue-500" />}
            {isEnabled && isActive && !isExpanded && "Đang đọc"}
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-blue-50 rounded-full overflow-hidden mt-2.5">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: !isEnabled ? "0%" : isDone ? "100%" : `${progressPct}%`,
              background: isDone
                ? "linear-gradient(90deg, #10B981, #34D399)"
                : "linear-gradient(90deg, #2563EB, #06B6D4)",
            }}
          />
        </div>
      </button>

      {/* DROPDOWN BODY (leaves list) — only when ON and expanded */}
      {isExpanded && isEnabled && (
        <div className="px-3 pb-3 border-t border-blue-100">
          {leafCount > 0 ? (
            <>
              {/* Leaf-type counts strip */}
              <div className="flex gap-1.5 flex-wrap py-2.5">
                {Object.entries(typeCounts).map(([type, count]) => {
                  const cfg = LEAF_TYPE_PILL[type] || LEAF_TYPE_PILL.OTHER;
                  return (
                    <span
                      key={type}
                      className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-extrabold ${cfg.bg} ${cfg.text}`}
                    >
                      {count} {cfg.label}
                    </span>
                  );
                })}
              </div>

              {/* Leaves */}
              <div className="space-y-0.5">
                {leaves.map((leaf) => (
                  <LeafRow
                    key={leaf.nodeId}
                    leaf={leaf}
                    isStudied={studiedSet.has(leaf.nodeId)}
                    isActiveByPdf={false /* TODO: derive from currentPdfPage if needed */}
                    onJumpToLeaf={onJumpToLeaf}
                    onToggleStudied={onToggleStudied}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="py-3 text-center text-[11px] text-slate-400 italic">
              Chương này chưa có lá kiến thức.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Main component
// --------------------------------------------------------------------------
export default function EmbeddedKnowledgeTree({
  materialId,
  isDarkMode: _isDarkMode = false,
  onLeafSelect,
  totalPdfPages: _totalPdfPages = 0,
  currentPdfPage = 1,
}) {
  const queryClient = useQueryClient();
  const [taskId, setTaskId] = useState(null);
  const [expandedChapterId, setExpandedChapterId] = useState(null);
  const [studiedLeafIds, setStudiedLeafIds] = useState(() => new Set());
  // Default: all chapters ON. We track DISABLED set instead (smaller, default empty).
  const [disabledChapterIds, setDisabledChapterIds] = useState(() => new Set());

  const treeQuery = useQuery({
    queryKey: ["knowledgeTree", materialId],
    queryFn: () => getKnowledgeTree(materialId),
    enabled: Boolean(materialId),
    // Cache 5 phút — tree không đổi nhiều; tránh refetch (+ tránh trigger ClientAbortException
    // ở BE khi component unmount/remount nhanh, vd toggle sidebar)
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      if (error?.response?.status === 404) return false;
      // Đừng retry khi user cancel request (CanceledError từ axios)
      if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") return false;
      return failureCount < 2;
    },
  });

  const extractMutation = useMutation({
    mutationFn: () => extractAndPersistKnowledgeTree(materialId),
    onSuccess: (response) => {
      const newTaskId = response?.data?.taskId || response?.taskId;
      if (newTaskId) setTaskId(newTaskId);
    },
  });

  const handleChapterToggle = useCallback((chapter) => {
    setExpandedChapterId((prev) => (prev === chapter.nodeId ? null : chapter.nodeId));
  }, []);

  const handleJumpToLeaf = useCallback((leaf) => {
    if (leaf.pageStart == null) return;
    onLeafSelect?.({
      pageStart: leaf.pageStart,
      pageEnd: leaf.pageEnd ?? leaf.pageStart,
      node: leaf,
    });
  }, [onLeafSelect]);

  const handleToggleStudied = useCallback((leaf) => {
    setStudiedLeafIds((prev) => {
      const next = new Set(prev);
      if (next.has(leaf.nodeId)) next.delete(leaf.nodeId);
      else next.add(leaf.nodeId);
      return next;
    });
  }, []);

  const handleToggleChapterEnabled = useCallback((chapter) => {
    setDisabledChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapter.nodeId)) next.delete(chapter.nodeId);
      else next.add(chapter.nodeId);
      return next;
    });
    // Auto-collapse if turning OFF an expanded chapter
    setExpandedChapterId((prev) => (prev === chapter.nodeId ? null : prev));
  }, []);

  const handleExtract = useCallback(() => extractMutation.mutate(), [extractMutation]);

  const handleExtractionComplete = useCallback(() => {
    setTaskId(null);
    queryClient.invalidateQueries({ queryKey: ["knowledgeTree", materialId] });
  }, [queryClient, materialId]);

  const handleExtractionError = useCallback(() => setTaskId(null), []);

  const tree = treeQuery.data?.tree;
  const nodes = treeQuery.data?.nodes ?? [];
  const treeMissing = treeQuery.error?.response?.status === 404;
  const isExtracting = Boolean(taskId);

  const { branches, leavesByBranch } = useMemo(() => {
    const list = nodes || [];
    const b = list.filter((n) => n.nodeType === "BRANCH");
    b.sort((x, y) => (x.orderIndex ?? 0) - (y.orderIndex ?? 0));
    const byParent = new Map();
    for (const leaf of list) {
      if (leaf.nodeType !== "LEAF") continue;
      const pid = leaf.parentNodeId;
      if (pid == null) continue;
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid).push(leaf);
    }
    for (const arr of byParent.values()) {
      arr.sort((x, y) => (x.orderIndex ?? 0) - (y.orderIndex ?? 0));
    }
    return { branches: b, leavesByBranch: byParent };
  }, [nodes]);

  // Auto-detect active chapter based on currentPdfPage (visual hint only — no longer drives progress)
  const autoActiveChapterId = useMemo(() => {
    if (!currentPdfPage || branches.length === 0) return null;
    for (const b of branches) {
      if (b.pageStart <= currentPdfPage && currentPdfPage <= (b.pageEnd ?? b.pageStart)) {
        return b.nodeId;
      }
    }
    return null;
  }, [currentPdfPage, branches]);

  // Chapter-based progress aggregation (the user's new "tiến độ học" definition)
  const progressStats = useMemo(() => {
    const total = branches.length;
    let enabledCount = 0;
    let doneCount = 0;
    let totalLeavesInEnabled = 0;
    let studiedLeavesInEnabled = 0;
    let sumRatios = 0;

    for (const branch of branches) {
      if (disabledChapterIds.has(branch.nodeId)) continue;
      enabledCount += 1;
      const leaves = leavesByBranch.get(branch.nodeId) || [];
      const leafTotal = leaves.length;
      totalLeavesInEnabled += leafTotal;
      const leafStudied = leaves.filter((l) => studiedLeafIds.has(l.nodeId)).length;
      studiedLeavesInEnabled += leafStudied;
      if (leafTotal > 0) {
        const ratio = leafStudied / leafTotal;
        sumRatios += ratio;
        if (ratio >= 1) doneCount += 1;
      }
    }

    const overallPct = enabledCount > 0
      ? Math.round((sumRatios / enabledCount) * 1000) / 10  // 1 decimal
      : 0;

    return {
      total,
      enabled: enabledCount,
      done: doneCount,
      totalLeavesInEnabled,
      studiedLeavesInEnabled,
      overallPct,
    };
  }, [branches, leavesByBranch, disabledChapterIds, studiedLeafIds]);

  return (
    <div className="h-full overflow-y-auto py-5 px-5 space-y-0">
      {/* Empty / loading states */}
      {treeQuery.isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
          <Loader2 className="animate-spin h-4 w-4" />
          <span className="text-xs">Đang tải cây kiến thức...</span>
        </div>
      )}

      {!tree && !treeQuery.isLoading && !isExtracting && (
        <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center bg-white border border-blue-100 rounded-2xl">
          <Sparkles className="h-10 w-10 text-amber-500" />
          <p className="text-sm font-bold text-slate-800">
            {treeMissing ? "Chưa có cây kiến thức" : "Tạo cây kiến thức"}
          </p>
          <p className="text-xs text-slate-500">
            AI sẽ trích xuất chương + lá kiến thức từ tài liệu.
          </p>
          <button
            type="button"
            onClick={handleExtract}
            disabled={extractMutation.isPending}
            className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-extrabold text-white hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 inline-flex items-center gap-2 shadow"
          >
            {extractMutation.isPending && <Loader2 className="animate-spin" size={12} />}
            Trích xuất ngay
          </button>
          {extractMutation.error && (
            <p className="text-xs text-rose-500">
              Lỗi: {extractMutation.error?.response?.data?.message || extractMutation.error?.message}
            </p>
          )}
        </div>
      )}

      {isExtracting && (
        <div className="p-4 bg-white border border-blue-100 rounded-2xl">
          <ExtractionStatus
            taskId={taskId}
            onComplete={handleExtractionComplete}
            onError={handleExtractionError}
          />
        </div>
      )}

      {tree && !treeQuery.isLoading && (
        <>
          {/* 1. Progress card — chapter-based */}
          <ProgressCard
            overallPct={progressStats.overallPct}
            doneChapters={progressStats.done}
            enabledChapters={progressStats.enabled}
            totalChapters={progressStats.total}
            studiedLeafCount={progressStats.studiedLeavesInEnabled}
            totalLeavesInEnabled={progressStats.totalLeavesInEnabled}
            highlightCount={0}
          />

          {/* 2. Section header */}
          <div className="flex items-center gap-1.5 mt-5 mb-3 text-[11px] font-extrabold tracking-[0.12em] uppercase text-slate-500">
            Cây kiến thức
            <span className="px-2 py-[2px] bg-blue-100 text-blue-700 rounded-full text-[10px] font-extrabold">
              {tree.totalBranches} chương
            </span>
            <button
              type="button"
              onClick={handleExtract}
              disabled={extractMutation.isPending}
              className="ml-auto inline-flex items-center gap-1 px-2 py-[3px] bg-white text-slate-600 rounded-full text-[10px] font-bold cursor-pointer hover:bg-slate-50 disabled:opacity-50"
              title="Re-extract"
            >
              <RefreshCw size={11} className={extractMutation.isPending ? "animate-spin" : ""} />
              {extractMutation.isPending ? "Đang chạy" : "Re-extract"}
            </button>
          </div>

          {/* 3. Chapter accordion */}
          {branches.length === 0 && (
            <div className="py-6 px-4 text-center text-xs text-slate-400 bg-white/50 rounded-xl border border-dashed border-blue-200">
              <MousePointerClick className="mx-auto h-6 w-6 mb-2 opacity-60" />
              Cây kiến thức chưa có nhánh nào.
            </div>
          )}

          {branches.map((branch) => (
            <ChapterCard
              key={branch.nodeId}
              chapter={branch}
              leaves={leavesByBranch.get(branch.nodeId) || []}
              isActive={autoActiveChapterId === branch.nodeId}
              isExpanded={expandedChapterId === branch.nodeId}
              isEnabled={!disabledChapterIds.has(branch.nodeId)}
              studiedSet={studiedLeafIds}
              onToggle={() => handleChapterToggle(branch)}
              onToggleEnabled={handleToggleChapterEnabled}
              onJumpToLeaf={handleJumpToLeaf}
              onToggleStudied={handleToggleStudied}
            />
          ))}
        </>
      )}
    </div>
  );
}

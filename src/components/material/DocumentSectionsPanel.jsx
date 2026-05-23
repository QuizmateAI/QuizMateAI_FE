import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  Loader2,
  RefreshCw,
} from "lucide-react";

import {
  getDocumentSections,
  setDocumentSectionActive,
} from "@/api/MaterialAPI";

function countLeafChunkIds(node) {
  if (!node) return 0;
  const ownChunks = Array.isArray(node.chunkIds) ? node.chunkIds.length : 0;
  const childrenCount = Array.isArray(node.children)
    ? node.children.reduce((total, child) => total + countLeafChunkIds(child), 0)
    : 0;
  return ownChunks + childrenCount;
}

function isLeaf(node) {
  return !Array.isArray(node?.children) || node.children.length === 0;
}

function replaceNodeInTree(tree, replacementNodes) {
  const replacements = new Map(
    (Array.isArray(replacementNodes) ? replacementNodes : [])
      .filter((node) => node && node.id)
      .map((node) => [node.id, node]),
  );
  if (replacements.size === 0) return tree;

  function walk(nodes) {
    return (Array.isArray(nodes) ? nodes : []).map((node) => {
      const replacement = replacements.get(node?.id);
      if (replacement) {
        return replacement;
      }
      if (Array.isArray(node?.children) && node.children.length > 0) {
        return { ...node, children: walk(node.children) };
      }
      return node;
    });
  }

  return walk(tree);
}

function SectionRow({
  node,
  depth,
  expanded,
  onToggleExpand,
  onToggleActive,
  togglingId,
  isDarkMode,
}) {
  const hasChildren = !isLeaf(node);
  const chunkCount = countLeafChunkIds(node);
  const leaf = !hasChildren;
  const directChunks = Array.isArray(node?.chunkIds) ? node.chunkIds.length : 0;
  const inactive = node?.isActive === false;
  const isToggling = togglingId === node?.id;

  return (
    <div
      className={`group flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors ${
        inactive
          ? "opacity-60"
          : isDarkMode
            ? "hover:bg-slate-800/60"
            : "hover:bg-blue-50/70"
      }`}
      style={{ paddingLeft: 8 + depth * 14 }}
    >
      <button
        type="button"
        onClick={() => hasChildren && onToggleExpand(node.id)}
        disabled={!hasChildren}
        className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded transition ${
          hasChildren
            ? isDarkMode
              ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              : "text-slate-500 hover:bg-blue-100 hover:text-blue-700"
            : "text-transparent"
        }`}
        aria-label={hasChildren ? (expanded ? "Thu gọn" : "Mở rộng") : undefined}
      >
        {hasChildren ? (
          expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
        ) : (
          <span className="block h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={`min-w-0 flex-1 truncate text-[13px] font-semibold ${
              isDarkMode ? "text-slate-100" : "text-slate-800"
            } ${inactive ? "line-through" : ""}`}
            title={node?.title}
          >
            {node?.title || "Mục không tên"}
          </p>
          {leaf && directChunks > 0 && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                isDarkMode
                  ? "bg-slate-800 text-cyan-300"
                  : "bg-blue-50 text-blue-700"
              }`}
              title="Số chunk trong mục"
            >
              {directChunks} chunk
            </span>
          )}
          {!leaf && chunkCount > 0 && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                isDarkMode
                  ? "bg-slate-800 text-slate-400"
                  : "bg-slate-100 text-slate-500"
              }`}
              title="Tổng chunk trong mục và mục con"
            >
              {chunkCount}
            </span>
          )}
        </div>
      </div>

      <label
        className={`inline-flex shrink-0 cursor-pointer items-center gap-2 text-[11px] font-semibold ${
          isDarkMode ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {isToggling ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <input
            type="checkbox"
            className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
            checked={node?.isActive !== false}
            onChange={(event) => onToggleActive(node, event.target.checked)}
            aria-label={`Bật/tắt mục ${node?.title || ""}`}
          />
        )}
      </label>
    </div>
  );
}

function SectionTree({
  nodes,
  depth,
  expandedIds,
  onToggleExpand,
  onToggleActive,
  togglingId,
  isDarkMode,
}) {
  if (!Array.isArray(nodes) || nodes.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      {nodes.map((node) => {
        const expanded = expandedIds.has(node?.id);
        return (
          <div key={node?.id || node?.title}>
            <SectionRow
              node={node}
              depth={depth}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onToggleActive={onToggleActive}
              togglingId={togglingId}
              isDarkMode={isDarkMode}
            />
            {!isLeaf(node) && expanded && (
              <SectionTree
                nodes={node.children}
                depth={depth + 1}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onToggleActive={onToggleActive}
                togglingId={togglingId}
                isDarkMode={isDarkMode}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DocumentSectionsPanel({
  materialId,
  isDarkMode = false,
}) {
  const [tree, setTree] = useState([]);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [toggleError, setToggleError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const fetchTree = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!materialId) return undefined;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getDocumentSections(materialId)
      .then((response) => {
        if (cancelled) return;
        const data = response?.data ?? response ?? [];
        const list = Array.isArray(data) ? data : [];
        setTree(list);
        setExpandedIds((current) => {
          if (current.size > 0) return current;
          const next = new Set();
          list.slice(0, 3).forEach((root) => {
            if (root?.id) next.add(root.id);
          });
          return next;
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(
          error?.response?.data?.message
            || error?.message
            || "Không tải được mục lục tài liệu.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [materialId, reloadKey]);

  const handleToggleExpand = useCallback((nodeId) => {
    if (!nodeId) return;
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const handleToggleActive = useCallback(
    async (node, nextActive) => {
      if (!node?.id || !materialId) return;
      setTogglingId(node.id);
      setToggleError(null);
      try {
        const response = await setDocumentSectionActive(
          materialId,
          node.id,
          nextActive,
        );
        const updated = response?.data ?? response ?? [];
        const list = Array.isArray(updated) ? updated : [];
        if (list.length > 0) {
          setTree((current) => replaceNodeInTree(current, list));
        } else {
          fetchTree();
        }
      } catch (error) {
        setToggleError(
          error?.response?.data?.message
            || error?.message
            || "Không cập nhật được trạng thái mục.",
        );
      } finally {
        setTogglingId(null);
      }
    },
    [materialId, fetchTree],
  );

  const totalChunks = useMemo(
    () => tree.reduce((total, root) => total + countLeafChunkIds(root), 0),
    [tree],
  );

  const activeChunks = useMemo(() => {
    function walk(node) {
      if (!node) return 0;
      if (node.isActive === false) return 0;
      const own = Array.isArray(node.chunkIds) ? node.chunkIds.length : 0;
      const children = Array.isArray(node.children)
        ? node.children.reduce((total, child) => total + walk(child), 0)
        : 0;
      return own + children;
    }
    return tree.reduce((total, root) => total + walk(root), 0);
  }, [tree]);

  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex items-center gap-2 px-4 pb-3 pt-1 text-[11px] font-extrabold uppercase tracking-[0.08em] ${
          isDarkMode ? "text-slate-400" : "text-slate-500"
        }`}
      >
        <Layers size={13} />
        Mục lục tài liệu
        {!loading && tree.length > 0 && (
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
              isDarkMode
                ? "bg-slate-800 text-cyan-300"
                : "bg-blue-50 text-blue-700"
            }`}
            title="Chunk đang được phép sử dụng / tổng chunk"
          >
            {activeChunks}/{totalChunks}
          </span>
        )}
        <button
          type="button"
          onClick={fetchTree}
          className={`ml-1 inline-flex h-6 w-6 items-center justify-center rounded transition ${
            isDarkMode
              ? "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              : "text-slate-500 hover:bg-blue-50 hover:text-blue-700"
          }`}
          title="Tải lại mục lục"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {toggleError && (
        <div
          className={`mx-4 mb-2 rounded-lg border px-3 py-2 text-xs font-medium ${
            isDarkMode
              ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {toggleError}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-6">
        {loading && tree.length === 0 && (
          <div
            className={`flex items-center justify-center gap-2 py-12 text-sm ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Đang tải mục lục...</span>
          </div>
        )}

        {!loading && loadError && (
          <div
            className={`mx-2 flex flex-col items-center gap-3 rounded-xl border px-4 py-6 text-center text-sm ${
              isDarkMode
                ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            <p className="font-semibold">{loadError}</p>
            <button
              type="button"
              onClick={fetchTree}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Thử lại
            </button>
          </div>
        )}

        {!loading && !loadError && tree.length === 0 && (
          <div
            className={`flex flex-col items-center gap-2 px-6 py-12 text-center text-sm ${
              isDarkMode ? "text-slate-400" : "text-slate-500"
            }`}
          >
            <FileText className="h-10 w-10 opacity-40" />
            <p className="font-semibold">Tài liệu chưa có cây mục lục.</p>
            <p className="text-xs opacity-80">
              AI cần trích xuất cấu trúc trước khi mục lục hiển thị tại đây.
            </p>
          </div>
        )}

        {tree.length > 0 && (
          <SectionTree
            nodes={tree}
            depth={0}
            expandedIds={expandedIds}
            onToggleExpand={handleToggleExpand}
            onToggleActive={handleToggleActive}
            togglingId={togglingId}
            isDarkMode={isDarkMode}
          />
        )}
      </div>
    </div>
  );
}

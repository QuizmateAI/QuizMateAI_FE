import { useMemo, useState } from 'react';
import { ChevronRight, FileText } from 'lucide-react';

// ============================================================================
// TreeViewer — collapsible chapter/branch accordion.
// Click branch row -> drop down leaves underneath.
// Replaces previous React Flow graph view — better UX for 44 branches +
// 410 leaves (graph view qua nhieu node thanh hang ngang khong doc duoc).
// ============================================================================

const LEAF_TYPE_COLOR = {
  DEFINITION: { dot: '#10b981', bg: '#d1fae5', text: '#065f46', label: 'Định nghĩa' },
  RULE: { dot: '#3b82f6', bg: '#dbeafe', text: '#1e40af', label: 'Quy tắc' },
  FORMULA: { dot: '#ef4444', bg: '#fee2e2', text: '#991b1b', label: 'Công thức' },
  EXAMPLE: { dot: '#f97316', bg: '#ffedd5', text: '#9a3412', label: 'Ví dụ' },
  PROCEDURE: { dot: '#a855f7', bg: '#f3e8ff', text: '#6b21a8', label: 'Quy trình' },
  CONCEPT: { dot: '#06b6d4', bg: '#cffafe', text: '#155e75', label: 'Khái niệm' },
  OTHER: { dot: '#94a3b8', bg: '#f1f5f9', text: '#475569', label: 'Khác' },
};

function PageRange({ start, end }) {
  if (start == null) return null;
  const text = start === end ? `trang ${start}` : `trang ${start}-${end}`;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <FileText size={11} /> {text}
    </span>
  );
}

function LeafTypeBadge({ type }) {
  const cfg = LEAF_TYPE_COLOR[type] || LEAF_TYPE_COLOR.OTHER;
  return (
    <span
      style={{ background: cfg.bg, color: cfg.text }}
      className="px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap"
    >
      {cfg.label}
    </span>
  );
}

function LeafRow({ leaf, onClick }) {
  const cfg = LEAF_TYPE_COLOR[leaf.leafType] || LEAF_TYPE_COLOR.OTHER;
  return (
    <button
      type="button"
      onClick={() => onClick?.(leaf)}
      className={`w-full text-left flex items-start gap-3 px-6 py-2 hover:bg-slate-50 border-l-2 transition ${
        leaf.isEnabled ? 'border-transparent' : 'opacity-50 border-slate-300'
      }`}
    >
      <span
        style={{ background: cfg.dot }}
        className="mt-1.5 w-2 h-2 rounded-full shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-800 break-words">{leaf.title}</span>
          <LeafTypeBadge type={leaf.leafType} />
        </div>
        {leaf.summary && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{leaf.summary}</p>
        )}
        <div className="mt-1">
          <PageRange start={leaf.pageStart} end={leaf.pageEnd} />
        </div>
      </div>
    </button>
  );
}

function BranchRow({ branch, leaves, expanded, onToggle, onLeafClick, onBranchClick }) {
  const leafCount = leaves.length;
  return (
    <div className={`border-b ${branch.isEnabled ? '' : 'opacity-50'}`}>
      <div className="flex items-center w-full hover:bg-sky-50 transition">
        <button
          type="button"
          onClick={() => onToggle(branch.nodeId)}
          className="flex items-center gap-2 px-3 py-3 flex-1 text-left"
          title={expanded ? 'Thu gọn' : 'Mở rộng'}
        >
          <ChevronRight
            size={16}
            className={`text-slate-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 break-words">{branch.title}</span>
              <span className="text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-medium">
                {leafCount} {leafCount === 1 ? 'lá' : 'lá'}
              </span>
            </div>
            <div className="mt-0.5">
              <PageRange start={branch.pageStart} end={branch.pageEnd} />
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={() => onBranchClick?.(branch)}
          className="px-3 py-3 text-xs text-slate-500 hover:text-slate-800 border-l"
          title="Xem chi tiết cành"
        >
          ⋯
        </button>
      </div>
      {expanded && (
        <div className="bg-slate-50/50">
          {leaves.length === 0 ? (
            <p className="px-6 py-3 text-xs text-slate-400 italic">Cành này chưa có lá kiến thức.</p>
          ) : (
            leaves.map((leaf) => (
              <LeafRow key={leaf.nodeId} leaf={leaf} onClick={onLeafClick} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function TreeViewer({ nodes, onNodeClick, onNodeToggle }) {
  const [expandedBranches, setExpandedBranches] = useState(() => new Set());

  const { branches, leavesByBranch } = useMemo(() => {
    const list = nodes || [];
    const b = list.filter((n) => n.nodeType === 'BRANCH');
    // Sort branches theo orderIndex (BE da save thu tu xuat hien trong PDF)
    b.sort((x, y) => (x.orderIndex ?? 0) - (y.orderIndex ?? 0));

    const byParent = new Map();
    for (const leaf of list) {
      if (leaf.nodeType !== 'LEAF') continue;
      const pid = leaf.parentNodeId;
      if (pid == null) continue;
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid).push(leaf);
    }
    // Sort leaves trong moi branch theo orderIndex
    for (const arr of byParent.values()) {
      arr.sort((x, y) => (x.orderIndex ?? 0) - (y.orderIndex ?? 0));
    }
    return { branches: b, leavesByBranch: byParent };
  }, [nodes]);

  const toggleBranch = (branchId) => {
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(branchId)) next.delete(branchId);
      else next.add(branchId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedBranches(new Set(branches.map((b) => b.nodeId)));
  };

  const collapseAll = () => {
    setExpandedBranches(new Set());
  };

  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Chưa có cây kiến thức.
      </div>
    );
  }

  const totalLeaves = Array.from(leavesByBranch.values()).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-slate-50">
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{branches.length}</span> chương ·{' '}
          <span className="font-semibold text-slate-800">{totalLeaves}</span> lá kiến thức
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs text-sky-600 hover:text-sky-800 hover:underline"
          >
            Mở tất cả
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs text-sky-600 hover:text-sky-800 hover:underline"
          >
            Thu gọn tất cả
          </button>
        </div>
      </div>

      {/* Branches list */}
      <div className="flex-1 overflow-y-auto">
        {branches.map((branch) => (
          <BranchRow
            key={branch.nodeId}
            branch={branch}
            leaves={leavesByBranch.get(branch.nodeId) || []}
            expanded={expandedBranches.has(branch.nodeId)}
            onToggle={toggleBranch}
            onLeafClick={onNodeClick}
            onBranchClick={onNodeClick}
          />
        ))}
      </div>
    </div>
  );
}

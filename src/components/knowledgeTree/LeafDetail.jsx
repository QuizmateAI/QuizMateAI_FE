// ============================================================================
// LeafDetail — side panel show noi dung 1 leaf + trang trong PDF.
// Click node trong TreeViewer -> mo panel nay.
// Hoi dong yeu cau "tu trang nao den trang nao" -> show pageStart/pageEnd here.
// ============================================================================

const LEAF_TYPE_COLORS = {
  DEFINITION: { bg: '#dbeafe', text: '#1e40af', label: 'Định nghĩa' },
  RULE: { bg: '#fce7f3', text: '#9d174d', label: 'Quy tắc' },
  FORMULA: { bg: '#ddd6fe', text: '#5b21b6', label: 'Công thức' },
  EXAMPLE: { bg: '#fef3c7', text: '#78350f', label: 'Ví dụ' },
  PROCEDURE: { bg: '#d1fae5', text: '#065f46', label: 'Quy trình' },
  CONCEPT: { bg: '#e0e7ff', text: '#3730a3', label: 'Khái niệm' },
  OTHER: { bg: '#f3f4f6', text: '#374151', label: 'Khác' },
};

function LeafTypeBadge({ type }) {
  const cfg = LEAF_TYPE_COLORS[type] || LEAF_TYPE_COLORS.OTHER;
  return (
    <span
      style={{
        background: cfg.bg,
        color: cfg.text,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {cfg.label}
    </span>
  );
}

export default function LeafDetail({ node, onClose, onToggleEnabled, onToggleSubtree }) {
  if (!node) return null;

  const isLeaf = node.nodeType === 'LEAF';
  const isBranch = node.nodeType === 'BRANCH';

  const pageRange = node.pageStart === node.pageEnd
    ? `Trang ${node.pageStart}`
    : `Trang ${node.pageStart}-${node.pageEnd}`;

  return (
    <div className="w-full md:w-96 rounded-lg border bg-white p-4 shadow-sm flex flex-col gap-3 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {isLeaf ? '🍃 Lá' : isBranch ? '🌿 Nhánh' : 'Node'}
            </span>
            {isLeaf && node.leafType && <LeafTypeBadge type={node.leafType} />}
          </div>
          <h3 className="font-semibold text-slate-800 break-words">{node.title || '(untitled)'}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-xl leading-none"
          aria-label="Đóng"
        >
          ×
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm text-slate-600">
        <span>📄 {pageRange}</span>
        {node.charOffsetStart != null && (
          <span className="text-xs text-slate-400">
            (offset {node.charOffsetStart}-{node.charOffsetEnd})
          </span>
        )}
      </div>

      {node.summary && (
        <div className="rounded bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Tóm tắt</div>
          <p className="text-sm text-slate-700 leading-relaxed">{node.summary}</p>
        </div>
      )}

      {node.rawExcerpt && (
        <div className="rounded border-l-4 border-amber-400 bg-amber-50 p-3 max-h-64 overflow-y-auto">
          <div className="text-xs font-semibold text-amber-700 uppercase mb-1">Trích nguyên văn</div>
          <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{node.rawExcerpt}</p>
        </div>
      )}

      {isBranch && node.leafCount != null && (
        <div className="text-xs text-slate-500">
          Chứa <strong>{node.leafCount}</strong> lá kiến thức
        </div>
      )}

      <div className="mt-2 flex flex-col gap-2 border-t pt-3">
        <button
          type="button"
          onClick={() => onToggleEnabled?.(node)}
          className={`w-full rounded px-3 py-2 text-sm font-semibold transition ${
            node.isEnabled
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          {node.isEnabled ? 'Tắt node này' : 'Bật node này'}
        </button>
        {isBranch && (
          <button
            type="button"
            onClick={() => onToggleSubtree?.(node)}
            className={`w-full rounded px-3 py-2 text-sm font-semibold transition ${
              node.isEnabled
                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {node.isEnabled ? 'Tắt toàn bộ nhánh + lá con' : 'Bật toàn bộ nhánh + lá con'}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ObservabilityPanel — show metadata extraction cho hoi dong:
//   - AI model dung de extract
//   - Trang thai tree (READY | EXTRACTING | FAILED | OUTDATED)
//   - So branch + so leaf
//   - Thoi diem extract gan nhat
//
// Hoi dong yeu cau "biet duoc bai quiz tao tu dau, model nao xu li" — panel
// nay show transparency layer.
// ============================================================================

const STATUS_COLORS = {
  READY: { bg: '#d1fae5', border: '#10b981', text: '#065f46', label: 'Sẵn sàng' },
  EXTRACTING: { bg: '#fef3c7', border: '#f59e0b', text: '#78350f', label: 'Đang extract' },
  FAILED: { bg: '#fee2e2', border: '#ef4444', text: '#7f1d1d', label: 'Thất bại' },
  OUTDATED: { bg: '#e5e7eb', border: '#6b7280', text: '#374151', label: 'Cũ — cần re-extract' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_COLORS[status] || STATUS_COLORS.OUTDATED;
  return (
    <span
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.text,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {cfg.label}
    </span>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-lg font-semibold text-slate-800">{value}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ObservabilityPanel({ tree }) {
  if (!tree) {
    return (
      <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-500">
        Chưa có cây kiến thức cho tài liệu này.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-700">Thông tin extract</h3>
        <StatusBadge status={tree.status} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stat label="Mô hình AI" value={tree.extractionModel || '—'} hint="Local Ollama" />
        <Stat label="Phiên bản" value={tree.extractionVersion || 'v1'} hint="Schema rawExtraction" />
        <Stat label="Số nhánh" value={tree.totalBranches ?? 0} hint="Branches trong cây" />
        <Stat label="Số lá" value={tree.totalLeaves ?? 0} hint="Atomic knowledge units" />
        <Stat label="Tổng trang" value={tree.totalPages ?? '—'} hint="PDF page count" />
        <Stat label="Extract lúc" value={formatDate(tree.extractedAt)} hint={tree.status === 'OUTDATED' ? 'Cần re-extract' : null} />
      </div>

      {tree.errorMessage && (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <strong>Lỗi:</strong> {tree.errorMessage}
        </div>
      )}
    </div>
  );
}

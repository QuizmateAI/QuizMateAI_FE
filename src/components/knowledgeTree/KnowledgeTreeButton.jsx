import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Network, Sparkles } from 'lucide-react';

import { getKnowledgeTreeSummary } from '@/api/KnowledgeTreeAPI';

// ============================================================================
// KnowledgeTreeButton — entry point tu Material detail view sang trang
// /knowledge-trees/material/:id.
//
// Adaptive UI:
//   - Chua co tree (404) -> "Trích xuất cây kiến thức" (sparkles icon, primary)
//   - Tree READY -> "Xem cây kiến thức (X nhánh)" (network icon, secondary)
//   - Tree EXTRACTING -> "Đang trích xuất..." (disabled, spinner)
//   - Tree FAILED -> "Trích xuất lại" (sparkles, warning tone)
//
// Re-use trong SourceDetailView (Individual + Group) hoac Material list card.
// ============================================================================

const VARIANT = {
  primary: 'bg-sky-600 text-white hover:bg-sky-700',
  secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200',
  warning: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200',
  disabled: 'bg-slate-100 text-slate-400 cursor-not-allowed',
};

export default function KnowledgeTreeButton({ materialId, size = 'sm', className = '' }) {
  const navigate = useNavigate();

  const summaryQuery = useQuery({
    queryKey: ['knowledgeTreeSummary', materialId],
    queryFn: () => getKnowledgeTreeSummary(materialId),
    enabled: Boolean(materialId),
    // 404 = chua co tree → khong retry, treat as missing
    retry: (failureCount, error) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 1;
    },
    staleTime: 30_000, // poll moi 30s tu cache
  });

  const summary = summaryQuery.data?.data || summaryQuery.data;
  const isMissing = summaryQuery.error?.response?.status === 404;
  const isExtracting = summary?.status === 'EXTRACTING';
  const isReady = summary?.status === 'READY';
  const isFailed = summary?.status === 'FAILED';

  let label = 'Trích xuất cây kiến thức';
  let variant = 'primary';
  let Icon = Sparkles;

  if (isExtracting) {
    label = 'Đang trích xuất...';
    variant = 'disabled';
    Icon = Sparkles;
  } else if (isReady) {
    const branchCount = summary?.branchCount ?? summary?.totalBranches ?? 0;
    label = `Xem cây (${branchCount} nhánh)`;
    variant = 'secondary';
    Icon = Network;
  } else if (isFailed) {
    label = 'Trích xuất lại';
    variant = 'warning';
    Icon = Sparkles;
  } else if (isMissing) {
    label = 'Trích xuất cây kiến thức';
    variant = 'primary';
    Icon = Sparkles;
  }

  const sizeClass = size === 'xs'
    ? 'px-2 py-1 text-xs gap-1'
    : 'px-3 py-1.5 text-sm gap-1.5';

  const handleClick = () => {
    if (variant === 'disabled') return;
    navigate(`/knowledge-trees/material/${materialId}`);
  };

  if (!materialId) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={variant === 'disabled'}
      className={`inline-flex items-center rounded-md font-medium transition ${sizeClass} ${VARIANT[variant]} ${className}`}
      title={isReady ? `Cây có ${summary?.leafCount ?? 0} lá kiến thức` : label}
    >
      <Icon className={size === 'xs' ? 'w-3 h-3' : 'w-4 h-4'} />
      <span>{label}</span>
    </button>
  );
}
